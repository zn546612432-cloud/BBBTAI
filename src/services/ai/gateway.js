// Shared AI gateway. Production deployments should use a protected same-origin server.
// For the user's isolated phone preview, keys may be entered per browser tab and
// are sent directly to DeepSeek/MiniMax; never commit, log, or export these keys.
export const BYOK_SESSION='ximeng-ai-session-keys-v1';
export function apiConfig(){
 try{return JSON.parse(sessionStorage.getItem(BYOK_SESSION)||'{}');}catch{return {};}
}
export function saveApiConfig(config){
 const out={deepseek:String(config.deepseek||'').trim(),minimax:String(config.minimax||'').trim(),
 region:config.region==='intl'?'intl':'cn',
 voiceId:String(config.voiceId||'male-qn-qingse').trim(),
 ttsModel:['speech-2.8-hd','speech-2.8-turbo'].includes(config.ttsModel)?config.ttsModel:'speech-2.8-turbo'};
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
export async function askTai({channel,day,messages,profile,memories}){
 const c=apiConfig(),req={channel,day,messages,profile,memories};
 if(!c.deepseek)return localJSON('/api/ai/chat',req);
 const {buildTaiPrompt}=await import('./tai-profile.js');
 const s=buildTaiPrompt(req);
 const result=await directJSON('https://api.deepseek.com/chat/completions',c.deepseek,{
  model:'deepseek-chat',messages:[{role:'system',content:s},...messages],
  response_format:{type:'json_object'},max_tokens:1600,stream:false
 });
 const text=String(result.choices?.[0]?.message?.content||'').trim();
 if(!text)throw Error('DeepSeek 返回了空消息');
 return {text,channel,day};
}
export async function voicePreview({text,voiceId,model='speech-2.8-turbo',language='Chinese',speed=1,tone='neutral'}){
 const c=apiConfig();
 if(!c.minimax){
  let r;
  try{r=await fetch('/api/voice/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voiceId,model,language,speed})});}
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
  voice_setting:{voice_id:voiceId||c.voiceId||'male-qn-qingse',speed:Number(speed),vol:1,pitch:0,...(tone==='serious'?{emotion:'calm'}:{})},
  audio_setting:{sample_rate:32000,bitrate:128000,format:'mp3',channel:1}
 });
 const hex=audio.data?.audio;
 if(typeof hex!=='string'||!hex.length||hex.length%2||!/^[0-9a-f]+$/i.test(hex))throw Error('MiniMax 没有返回有效的 MP3 数据');
 const bytes=new Uint8Array(hex.length/2);
 for(let i=0;i<bytes.length;i++)bytes[i]=parseInt(hex.slice(i*2,i*2+2),16);
 return new Blob([bytes],{type:'audio/mpeg'});
}
