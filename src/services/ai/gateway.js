import {prepareXitaiSpeech} from '../voice/voice-regex.js';
import {readableTaiVoiceText} from './format.js';
import {deepseekModelOptions,normalizeDeepSeekModel} from './model-config.js';
// Shared AI gateway. Production deployments should use a protected same-origin server.
// For the user's isolated phone preview, keys may be entered per browser tab and
// are sent directly to DeepSeek/MiniMax; never commit, log, or export these keys.
export const BYOK_SESSION='ximeng-ai-session-keys-v1';
export const XITAI_VOICE_ID='moss_audio_708f60ef-d45e-11f1-ac36-1658c5812fe4';
export function apiConfig(){
 try{const c=JSON.parse(sessionStorage.getItem(BYOK_SESSION)||'{}');return {...c,model:normalizeDeepSeekModel(c.model),voiceId:XITAI_VOICE_ID};}catch{return {model:normalizeDeepSeekModel(),voiceId:XITAI_VOICE_ID};}
}
export function saveApiConfig(config){
 const out={deepseek:String(config.deepseek||'').trim(),minimax:String(config.minimax||'').trim(),
 model:normalizeDeepSeekModel(config.model),
 region:config.region==='intl'?'intl':'cn',
 voiceId:XITAI_VOICE_ID,
 ttsModel:['speech-2.8-hd','speech-2.8-turbo'].includes(config.ttsModel)?config.ttsModel:'speech-2.8-hd'};
 sessionStorage.setItem(BYOK_SESSION,JSON.stringify(out));return out;
}
export function clearApiConfig(){sessionStorage.removeItem(BYOK_SESSION);}
async function localJSON(path,body){
 let r;
 try{r=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});}
 catch{throw Error('本机 AI 后端未连接');}
 const text=await r.text();let obj;
 try{obj=JSON.parse(text);}catch{throw Error('当前网页没有 AI 服务端，请先在 NoApp 配置个人 API Key');}
 if(!r.ok)throw Error(obj.error||'AI 服务请求失败');return obj;
}
async function directJSON(url,key,body){
 let r;
 try{r=await fetch(url,{method:'POST',mode:'cors',credentials:'omit',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),referrerPolicy:'no-referrer'});}
 catch{throw Error('供应商请求被网络或浏览器跨域策略拦截；请使用同源安全网关');}
 const content=await r.text();let data;
 try{data=JSON.parse(content);}catch{throw Error('供应商未返回合法 JSON，HTTP '+r.status);}
 if(!r.ok||data.error)throw Error(data.error?.message||data.base_resp?.status_msg||'供应商 HTTP '+r.status);
 if(data.base_resp&&data.base_resp.status_code!==0)throw Error('MiniMax '+data.base_resp.status_code+'：'+data.base_resp.status_msg);
 return data;
}
export async function aiStatus(){
 const c=apiConfig();if(c.deepseek||c.minimax)return {mode:'session-direct',deepseek:!!c.deepseek,minimax:!!c.minimax};
 return localJSON('/api/ai/status');
}
export async function askTai({channel,day,messages,profile,memories,outputMode='text',scene='',relationshipContext='',behavior}){
 const {buildTaiPrompt,visibleTaiMemories}=await import('./tai-profile.js');
 const c=apiConfig(),req={channel,day,messages,profile,memories:visibleTaiMemories(memories,day,channel),outputMode,scene,relationshipContext,behavior,model:c.model};
 if(!c.deepseek)return localJSON('/api/ai/chat',req);
 const system=buildTaiPrompt(req);
 const base={...deepseekModelOptions(c.model),
  messages:[{role:'system',content:system},...messages],max_tokens:4096,stream:false};
 // DeepSeek warns that JSON mode can return whitespace/empty content.
 // Retry once without JSON response_format; never save empty chat bubbles.
 let result=await directJSON('https://api.deepseek.com/chat/completions',c.deepseek,
  {...base,response_format:{type:'json_object'}});
 let text=String(result.choices?.[0]?.message?.content||'').trim();
 if(!text||text==='{}'||text==='{"messages":[]}'){
  result=await directJSON('https://api.deepseek.com/chat/completions',c.deepseek,{
   ...base,response_format:{type:'text'},
   messages:[...base.messages,{role:'system',content:'上一个回答是空的。请直接给出非空的角色聊天回复；可以用自然文字，不要空JSON。不要解释错误原因。'}]
  });
  text=String(result.choices?.[0]?.message?.content||'').trim();
 }
 if(!text)throw Error('DeepSeek 两次均没有返回有效文字；消息未发送给熙蒙，请重试。');
 return {text,channel,day};
}
export async function voicePreview({text,voiceId,model='speech-2.8-hd',language='Chinese',speed=null,tone='neutral'}){
 const c=apiConfig();
 const prepared=prepareXitaiSpeech(text,{tone,autoTags:true});
 text=prepared.text;
 speed=speed!==null&&Number.isFinite(Number(speed))?Math.max(0.78,Math.min(0.92,Number(speed))):Math.max(0.78,Math.min(0.92,prepared.speed));
 if(!c.minimax){
  let r;
  try{r=await fetch('/api/voice/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voiceId:XITAI_VOICE_ID,model,language,speed,emotion:prepared.emotion})});}
  catch{throw Error('MiniMax 语音接口未配置');}
  if(!r.ok){let v={};try{v=await r.json();}catch{}throw Error(v.error||'MiniMax 语音接口失败');}
  if(!r.headers.get('Content-Type')?.includes('audio/'))throw Error('未返回音频');
  return r.blob();
 }
 const endpoint=c.region==='intl'?'https://api.minimax.io/v1/t2a_v2':'https://api.minimaxi.com/v1/t2a_v2';
 const spoken=String(text||'').trim().slice(0,3000);
 if(!spoken)throw Error('语音文字不能为空');
 const audio=await directJSON(endpoint,c.minimax,{
  model:c.ttsModel||model,text:spoken,stream:false,output_format:'hex',
  language_boost:language,
  voice_setting:{voice_id:XITAI_VOICE_ID,speed:Number(speed),vol:1,pitch:0,emotion:prepared.emotion},
  audio_setting:{sample_rate:32000,bitrate:128000,format:'mp3',channel:1}
 });
 const hex=audio.data?.audio;
 if(typeof hex!=='string'||!hex.length||hex.length%2||!/^[0-9a-f]+$/i.test(hex))throw Error('MiniMax 没有返回有效的 MP3 数据');
 const bytes=new Uint8Array(hex.length/2);
 for(let i=0;i<bytes.length;i++)bytes[i]=parseInt(hex.slice(i*2,i*2+2),16);
 return new Blob([bytes],{type:'audio/mpeg'});
}

/** MiniMax ASR 1.0: converts the player's recorded NoApp voice message to text. */
export async function speechToText(blob){
 if(!(blob instanceof Blob)||!blob.size||blob.size>25_000_000)throw Error('语音上传大小必须小于25MB');
 const c=apiConfig();
 if(!c.minimax)throw Error('语音识别需要在 NoApp 设置 MiniMax Key');
 const root=c.region==='intl'?'https://api.minimax.io':'https://api.minimaxi.com';
 const form=new FormData();form.append('model','asr-1.0');
 const type=blob.type.toLowerCase(),ext=type.includes('mp4')?'m4a':type.includes('ogg')?'ogg':type.includes('webm')?'webm':'wav';
 // Official ASR supports m4a/ogg and common audio containers. WebM support varies by account.
 form.append('file',blob,'ximeng-voice.'+ext);form.append('response_format','json');
 let r;
 try{r=await fetch(root+'/v1/speech_to_text',{method:'POST',mode:'cors',credentials:'omit',headers:{Authorization:'Bearer '+c.minimax},body:form,referrerPolicy:'no-referrer'});}
 catch{throw Error('语音识别请求受网络或浏览器 CORS 限制');}
 let data;try{data=await r.json();}catch{throw Error('ASR 没有返回 JSON');}
 if(!r.ok||data.base_resp?.status_code&&data.base_resp.status_code!==0)
  throw Error('MiniMax ASR：'+(data.base_resp?.status_msg||data.error?.message||r.status));
 const text=String(data.text||data.data?.text||data.result?.text||'').trim();
 if(!text)throw Error('没有识别到可用语音文字');
 return text;
}
