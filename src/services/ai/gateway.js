import {normalizeTtsSettings,ttsProviderSettings,ttsCueText} from '../voice/tts-settings.js';
import {isTaiCloudHost,taiCloudCall} from './supabase-gateway.js';
import {prepareTaiVoicePerformance,normalizeVoiceStyle} from '../voice/voice-performance.js';
import {containsPortuguese} from './portuguese.js';
import {readableTaiVoiceText} from './format.js';
import {deepseekModelOptions,normalizeDeepSeekModel,normalizeAiParameters} from './model-config.js';
import {explainMinimaxFailure,minimaxUnavailableOnGithubPages} from '../voice/minimax-diagnostics.js';
// Shared AI gateway. Production deployments should use a protected same-origin server.
// For the user's isolated phone preview, keys may be entered per browser tab and
// are sent directly to DeepSeek/MiniMax; never commit, log, or export these keys.
export const BYOK_SESSION='ximeng-ai-session-keys-v1';
export const XITAI_VOICE_ID='moss_audio_708f60ef-d45e-11f1-ac36-1658c5812fe4';
export const XITAI_VOICE_OPTIONS=Object.freeze([[XITAI_VOICE_ID,'原音色'],['moss_audio_4e461be0-d6d5-11f1-9dac-d60bed5a35f4','新增音色']]);
export const normalizeXitaiVoiceId=id=>XITAI_VOICE_OPTIONS.some(([value])=>value===id)?id:XITAI_VOICE_ID;
export const AI_PREFERENCES='ximeng-ai-preferences-v2';
function savedPreferences(){try{return JSON.parse(globalThis.localStorage?.getItem(AI_PREFERENCES)||'{}');}catch{return {};}}
export function apiConfig(){
 let c={};try{c=JSON.parse(sessionStorage.getItem(BYOK_SESSION)||'{}');}catch{}
 const merged={...savedPreferences(),...c};
 return {...merged,...normalizeAiParameters(merged),...normalizeTtsSettings(merged),model:normalizeDeepSeekModel(merged.model),ttsModel:['speech-2.8-hd','speech-2.8-turbo'].includes(merged.ttsModel)?merged.ttsModel:'speech-2.8-hd',voiceStyle:normalizeVoiceStyle(merged.voiceStyle),voiceId:normalizeXitaiVoiceId(merged.voiceId)};
}
export function saveApiConfig(config){
 const out={deepseek:String(config.deepseek||'').trim(),minimax:String(config.minimax||'').trim(),
 model:normalizeDeepSeekModel(config.model),region:config.region==='intl'?'intl':'cn',voiceId:normalizeXitaiVoiceId(config.voiceId),voiceStyle:normalizeVoiceStyle(config.voiceStyle),
 ttsModel:['speech-2.8-hd','speech-2.8-turbo'].includes(config.ttsModel)?config.ttsModel:'speech-2.8-hd',
 ...normalizeAiParameters(config),...normalizeTtsSettings(config)};
 sessionStorage.setItem(BYOK_SESSION,JSON.stringify(out));
 const {deepseek,minimax,...preferences}=out;
 try{globalThis.localStorage?.setItem(AI_PREFERENCES,JSON.stringify(preferences));}catch{}
 return out;
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
async function directJSON(url,key,body,{timeoutMs=60000}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
 let r;
 try{r=await fetch(url,{method:'POST',mode:'cors',credentials:'omit',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),referrerPolicy:'no-referrer',signal:controller.signal});}
 catch{throw Error(controller.signal.aborted?'供应商请求超时（60秒）':'供应商请求被网络或浏览器跨域策略拦截；请使用同源安全网关');}
 const content=await r.text();let data;
 try{data=JSON.parse(content);}catch{throw Error('供应商未返回合法 JSON，HTTP '+r.status);}
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('供应商返回空响应，HTTP '+r.status);
 const code=data.base_resp?.status_code;
 if(!r.ok||data.error||code!=null&&Number(code)!==0){
  const detail=data.error?.message||data.base_resp?.status_msg||'未返回错误说明';
  throw Error('供应商 HTTP '+r.status+(code!=null?' · MiniMax '+code:'')+'：'+detail);
 }
 return data;
 }catch(error){if(controller.signal.aborted)throw Error('供应商请求超时（60秒）');throw error;}finally{clearTimeout(timer);}
}
export async function aiStatus(){
 if(isTaiCloudHost())return taiCloudCall('status');
 const c=apiConfig();if(c.deepseek||c.minimax)return {mode:'session-direct',deepseek:!!c.deepseek,minimax:!!c.minimax};
 return localJSON('/api/ai/status');
}
export async function askTai({channel,day,messages,profile,memories,outputMode='text',scene='',relationshipContext='',behavior,recognized,storyVersion,approvedDecision=null,turnPlan=null,allowVoice=false}){
 const {buildTaiPrompt,visibleTaiMemories}=await import('./tai-profile.js');
 const c=apiConfig(),req={channel,day,messages,profile,memories:visibleTaiMemories(memories,day,channel),outputMode,scene,relationshipContext,behavior,recognized,storyVersion,approvedDecision,turnPlan,allowVoice,model:c.model,parameters:normalizeAiParameters(c)};
 if(isTaiCloudHost()){
  const {loadApprovedTaiV8,formatApprovedTaiV8}=await import('./supabase-persona.js');
  const v8=formatApprovedTaiV8(await loadApprovedTaiV8(),{recognized:recognized===true,outputMode});
  const system=buildTaiPrompt(req)+(v8?'\n\n'+v8:'');
  const params=deepseekModelOptions(c.model,c);
  const answer=await taiCloudCall('chat',{...params,model:c.model,
   messages:[{role:'system',content:system},...messages],max_tokens:Math.min(2800,c.maxTokens)});
  return {text:answer.text,channel,day};
 }
 if(!c.deepseek)return localJSON('/api/ai/chat',req);
 // Cloud V8 is additive and read-only; offline or fetch failure uses current local rules.
 const {loadApprovedTaiV8,formatApprovedTaiV8}=await import('./supabase-persona.js');
 const v8=formatApprovedTaiV8(await loadApprovedTaiV8(),{recognized:recognized===true,outputMode});
 const system=buildTaiPrompt(req)+(v8?'\n\n'+v8:'');
 const base={...deepseekModelOptions(c.model,c),
  messages:[{role:'system',content:system},...messages],max_tokens:c.maxTokens,stream:false};
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
// Dedicated photo perception uses Flash regardless of the chat model.
// A single validated local photo is the ONLY image. Never send other phone
// apps, conversation history, schedule, or full save to this model.
export async function describeTaiImage({dataUrl,authorLabel=''}={}){
 if(typeof dataUrl!=='string'||!/^data:image\/(?:jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(dataUrl)||dataUrl.length>7_000_000)
  throw Error('图片编码无效或过大');
 const c=apiConfig();
 if(!c.deepseek)throw Error('请先在 NoApp AI 设置中输入 DeepSeek API Key');
 const instruction=[
  '你是一个谨慎、客观的图片理解引擎。只描述实际看得见的画面，不基于外貌猜测真实姓名或人物关系。',
  '以下作者标签仅作为可能的人物提示，不代表已经视觉验证：'+String(authorLabel).slice(0,100),
  '不要假定这张照片发生在玩家今天、不要推断拍摄地点、秘密关系、未来剧情或人物心理。',
  '看不清的细节明确说明不确定，照片里若有文字，仅摘录确实可辨认的部分。',
  '必须输出 JSON 对象：{"summary":"可客观观察到的构图、人物数量、动作及环境，不超过150字","visibleText":"真正看清的图片中文字","uncertainty":"无法确定的地方"}。',
  '只回复 JSON，不要markdown、身份识别或其他解释。'
 ].join('\\n');
 const body={model:'deepseek-flash',temperature:0.2,max_tokens:500,
  messages:[{role:'user',content:[
    {type:'text',text:instruction},
    {type:'image_url',image_url:{url:dataUrl,detail:'low'}}
  ]}],response_format:{type:'json_object'},stream:false};
 const response=await directJSON('https://api.deepseek.com/chat/completions',c.deepseek,body,{timeoutMs:55000});
 const raw=String(response.choices?.[0]?.message?.content||'').trim();
 if(!raw)throw Error('视觉模型未返回图片描述；未保存结果');
 let output;
 try{output=JSON.parse(raw);}catch{throw Error('视觉模型返回格式错误；未保存结果');}
 if(!output||typeof output!=='object'||Array.isArray(output)||typeof output.summary!=='string'||!output.summary.trim())throw Error('视觉模型没有返回可用描述');
 return {summary:output.summary.slice(0,680),visibleText:String(output.visibleText||'').slice(0,260),
  uncertainty:String(output.uncertainty||'').slice(0,200)};
}

// One optional model-directed read. We never send a whole phone save to DeepSeek.
// The server-side/browse executor separately enforces the allowlist and day gates.
export async function selectTaiPhoneTool({text='',channel='noapp'}={}){
 const c=apiConfig();
 if((!c.deepseek&&!isTaiCloudHost())||channel!=='noapp')return null;
 const system=[
  '你在扮演陈熙泰的好奇心决策器。只决定此刻要不要使用一项工具查看已获权限的熙蒙虚拟手机，不输出对玩家的台词。',
  '默认不查。只有话题确实与真实聊天或相册相关，或你有清楚的好奇、怀疑、担心动机时，才偶尔选择查询。不是持续监控。',
  '可选工具：search_messages 参数 query(人名/话题关键词),channel可为wechat/messages/mirage/noapp；list_conversations 参数可选channel；',
  'read_conversation 参数channel和conversation_id（必须明确已知，否则不要猜）；check_new_messages 无参数；list_photos无参数；inspect_photo参数photo_id（须有确切已知ID）。',
  '禁止读取日程、日记、未来剧情、未发生对话、系统内部数据、银行或其他App；不因对方提到哥哥便必须查看。',
  '以JSON对象返回 {"name":"search_messages","arguments":{"query":"熙旺"}} 或 {"name":"none","arguments":{}}，不要其他文字。',
 ].join('\\n');
 try{
  const body={...deepseekModelOptions(c.model,c),
   messages:[{role:'system',content:system},{role:'user',content:String(text).slice(0,400)}],
   response_format:{type:'json_object'},max_tokens:170,stream:false};
  const response=isTaiCloudHost()?{choices:[{message:{content:(await taiCloudCall('decision',body)).text}}]}:
   await directJSON('https://api.deepseek.com/chat/completions',c.deepseek,body,{timeoutMs:15000});
  const raw=String(response.choices?.[0]?.message?.content||'').trim();
  const parsed=JSON.parse(raw);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return null;
  const valid=['search_messages','list_conversations','read_conversation','check_new_messages','list_photos','inspect_photo'];
  if(!valid.includes(parsed.name))return null;
  const args=parsed.arguments&&typeof parsed.arguments==='object'&&!Array.isArray(parsed.arguments)?parsed.arguments:{};
  if(Object.keys(args).length>3)return null;
  return {name:parsed.name,arguments:args};
 }catch{return null;}
}

// Phase 1 is available for the isolated GitHub Pages BYOK test runtime.
// A proxy which has not implemented this endpoint stays on the legacy path,
// rather than pretending it has executed a two-stage decision.
export async function chooseTaiAction(args={}){
 const c=apiConfig();
 if(!c.deepseek&&!isTaiCloudHost())return null;
 const {taiActionDecisionPrompt,validateTaiAction}=await import('./action-protocol-v10.js');
 const {taiKnowledgeContext}=await import('./tai-profile.js');
 const mode=args.outputMode==='call'?'call':'text';
 const context={...args,mode,channel:args.channel||'noapp'};
 const {loadApprovedTaiV8,formatApprovedTaiV8}=await import('./supabase-persona.js');
 const approvedV8=formatApprovedTaiV8(await loadApprovedTaiV8(),{recognized:args.recognized===true,outputMode:mode});
 const director=taiActionDecisionPrompt({...context,allowVoice:args.allowVoice!==false&&!!c.minimax,
  relationshipContext:(taiKnowledgeContext({day:args.day,channel:context.channel,recognized:args.recognized})+'\\n'+String(args.relationshipContext||'')).slice(0,4100)});
 // Persona informs intent; the action protocol remains last and authoritative.
 const system=(approvedV8?approvedV8+'\n\n':'')+director;
 let raw;
 try{
  const body={...deepseekModelOptions(c.model,c),
   messages:[{role:'system',content:system},...(Array.isArray(args.messages)?args.messages.slice(-16):[])],
   response_format:{type:'json_object'},max_tokens:450,stream:false};
  const response=isTaiCloudHost()?{choices:[{message:{content:(await taiCloudCall('decision',body)).text}}]}:
   await directJSON('https://api.deepseek.com/chat/completions',c.deepseek,body);
  raw=response.choices?.[0]?.message?.content;
 }catch(error){
  console.warn('Xitai decision phase unavailable; safe legacy response path:',error?.message);
  return null;
 }
 const result=validateTaiAction(raw,{mode,channel:context.channel,
  recognized:args.recognized===true,sourceMessageId:args.sourceMessageId||'',
  allowCall:args.allowCall!==false,allowVoice:args.allowVoice!==false&&!!c.minimax,
  allowDefer:args.allowDefer!==false,hasIncoming:args.hasIncoming!==false,
  playerDeclinedCall:args.playerDeclinedCall===true,callConnected:args.callConnected===true});
 if(!result.ok){console.warn('Xitai rejected invalid behavior decision:',result.reason);return null;}
 return result.decision;
}

export async function voicePreview({text,voiceId,model,tone='neutral',...overrides}){
 const c=apiConfig(),settings=normalizeTtsSettings(overrides,c);
 let language=settings.language;
 model=model||c.ttsModel||'speech-2.8-hd';
 const prepared=prepareTaiVoicePerformance(text,{tone,style:c.voiceStyle});
 text=ttsCueText(prepared.text,settings.cue);
 if(!String(prepared.text||'').trim())throw Error('语音文字不能为空');
 // Calm remains the default; explicit user tuning overrides it.
 // Code-switch to the provider's multilingual pronunciation mode only when
 // actual Latin words occur outside native Speech 2.8 sound tags.
 if(language==='Chinese'){
  const spokenWithoutTags=text.replace(/\([a-z-]+\)/gi,'');
  if(containsPortuguese(spokenWithoutTags)&&!/[\u3400-\u9fff]/u.test(spokenWithoutTags))language='Portuguese';
  else if(/\b[A-Za-z]{2,}\b/.test(spokenWithoutTags))language='auto';
 }
 if(isTaiCloudHost()){
  const opts=ttsProviderSettings({...settings,language});
  return taiCloudCall('tts',{text:String(text).slice(0,1400),
   voiceId:normalizeXitaiVoiceId(voiceId||c.voiceId),model,
   region:c.region,settings:opts});
 }
 if(!c.minimax){
  // GitHub Pages does not have a /api/voice/tts server route. Never mistake
  // that HTML 404 for an audio-generation failure or a broken cloned voice.
  if(minimaxUnavailableOnGithubPages(globalThis.location?.hostname))
   throw Error(explainMinimaxFailure(new Error('未配置 MiniMax API Key')));
  let r;
  try{r=await fetch('/api/voice/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voiceId:normalizeXitaiVoiceId(voiceId||c.voiceId),model,...settings,language})});}
  catch{throw Error('MiniMax 语音接口未配置');}
  if(!r.ok){let v={};try{v=await r.json();}catch{}throw Error(v.error||'MiniMax 语音接口失败');}
  if(!r.headers.get('Content-Type')?.includes('audio/'))throw Error('未返回音频');
  return r.blob();
 }
 const endpoint=c.region==='intl'?'https://api.minimax.io/v1/t2a_v2':'https://api.minimaxi.com/v1/t2a_v2';
 const spoken=String(text||'').trim().slice(0,3000);
 if(!spoken)throw Error('语音文字不能为空');
 let audio;
 try{audio=await directJSON(endpoint,c.minimax,{
  model,text:spoken,stream:false,output_format:'hex',
  ...ttsProviderSettings({...settings,language}),
  voice_setting:{voice_id:normalizeXitaiVoiceId(voiceId||c.voiceId),...ttsProviderSettings(settings).voice_setting}
 });}
 catch(error){throw Error(explainMinimaxFailure(error,{region:c.region}));}
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
