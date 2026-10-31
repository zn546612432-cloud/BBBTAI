// Local-only AI gateway. Never publish this handler as an unauthenticated public API.
import {normalizeTaiBehavior} from '../src/services/ai/behavior.js';
import {deepseekModelOptions} from '../src/services/ai/model-config.js';
import {buildTaiPrompt,taiProfileFields} from '../src/services/ai/tai-profile.js';
const DEEPSEEK = 'https://api.deepseek.com/chat/completions';
const MINIMAX = 'https://api.minimax.io/v1/t2a_v2';
const reply = (res, status, payload) => {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(payload));
};
const fail = (status, message) => Object.assign(new Error(message), {status});
async function bodyJSON(req) {
  let size=0, chunks=[];
  for await (const part of req) {
    size+=part.length;
    if(size>48_000)throw fail(413,'请求内容过大');
    chunks.push(part);
  }
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail(400,'无效 JSON');}
}
const within = (n,min,max) => typeof n==='number' && Number.isFinite(n) && n>=min && n<=max;
async function provider(url,key,input) {
  let response;
  try {response=await fetch(url,{
    method:'POST', headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify(input),signal:AbortSignal.timeout(30000)
  });}catch{throw fail(502,'服务商连接超时或不可访问');}
  let json;
  try {json=await response.json();}catch{throw fail(502,'服务商返回了无效数据');}
  if(!response.ok)throw fail(502,'服务商请求失败（HTTP '+response.status+'）');
  return json;
}
function reviewDraft(payload){
 const profile=payload.profile??{},memories=payload.memories??[];
 if(!profile||typeof profile!=='object'||Array.isArray(profile))throw fail(400,'人物设定格式不合法');
 for(const field of taiProfileFields)if(profile[field.key]!==undefined&&
   (typeof profile[field.key]!=='string'||!profile[field.key].trim()||profile[field.key].length>1800))throw fail(400,'人物设定内容不合法');
 if(!Array.isArray(memories)||memories.length>30)throw fail(400,'记忆数量不合法');
 for(const memory of memories)if(!memory||!Number.isInteger(memory.day)||memory.day<1||memory.day>90||
   typeof memory.text!=='string'||!memory.text.trim()||memory.text.length>600||
   typeof memory.source!=='string'||memory.source.length>80||
   !['shared','mirage','noapp','chess'].includes(memory.visibility))throw fail(400,'记忆格式不合法');
 return {profile,memories};
}
export async function handleAIGateway(req,res,pathname) {
  if(!pathname.startsWith('/api/'))return false;
  if(pathname==='/api/ai/status'&&req.method==='GET'){
    reply(res,200,{mode:'local-only',deepseek:!!process.env.DEEPSEEK_API_KEY,minimax:!!process.env.MINIMAX_API_KEY,ttsModels:['speech-2.8-turbo','speech-2.8-hd']});
    return true;
  }
  if(req.method!=='POST'||!['/api/ai/chat','/api/voice/tts'].includes(pathname)){
    reply(res,404,{error:'接口不存在'});return true;
  }
  const host=req.headers.host||'';
  const origin=req.headers.origin;
  if(origin&&new URL(origin).host!==host){reply(res,403,{error:'只允许本机同源请求'});return true;}
  try {
    const payload=await bodyJSON(req);
    if(pathname==='/api/ai/chat'){
      if(!process.env.DEEPSEEK_API_KEY)throw fail(503,'请先在本地环境配置 DEEPSEEK_API_KEY');
      const day=Number(payload.day),channel=payload.channel;
      if(!Number.isInteger(day)||day<1||day>90)throw fail(400,'游戏天数不合法');
      if(!['mirage','noapp','chess'].includes(channel)||channel==='noapp'&&day<56)throw fail(400,'当前频道或天数不可使用');
      if(!Array.isArray(payload.messages)||payload.messages.length<1||payload.messages.length>24)throw fail(400,'聊天消息数量不合法');
      const messages=payload.messages.map(m=>{
        if(!['user','assistant'].includes(m?.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>2000)throw fail(400,'消息格式不合法');
        return {role:m.role,content:m.content};
      });
      if(messages.at(-1).role!=='user')throw fail(400,'最后一条必须是玩家消息');
      const {profile,memories}=reviewDraft(payload);
      const outputMode=['text','voice','call'].includes(payload.outputMode)?payload.outputMode:'text';
      const scene=typeof payload.scene==='string'?payload.scene.slice(0,2000):'';
      const relationshipContext=typeof payload.relationshipContext==='string'?payload.relationshipContext.slice(0,8000):'';
      const behavior=normalizeTaiBehavior(payload.behavior);
      const recognized=typeof payload.recognized==='boolean'?payload.recognized:undefined;
      const data=await provider(DEEPSEEK,process.env.DEEPSEEK_API_KEY,{
        ...deepseekModelOptions(payload.model??process.env.DEEPSEEK_MODEL),
        messages:[{role:'system',content:buildTaiPrompt({day,channel,profile,memories,outputMode,scene,relationshipContext,behavior,messages,recognized})},...messages],
        stream:false,max_tokens:4096,response_format:{type:'json_object'}
      });
      const text=data.choices?.[0]?.message?.content;
      if(typeof text!=='string'||!text.trim())throw fail(502,'模型没有返回有效文字');
      reply(res,200,{text:text.trim(),channel,day});
    }else{
      if(!process.env.MINIMAX_API_KEY)throw fail(503,'请先在本地环境配置 MINIMAX_API_KEY');
      const {text,voiceId,model='speech-2.8-hd',language='Chinese',speed=1,emotion='fluent'}=payload;
      if(typeof text!=='string'||!text.trim()||text.length>3000)throw fail(400,'试听文字须为 1–3000 字');
      if(typeof voiceId!=='string'||! /^[a-zA-Z0-9_-]{1,100}$/.test(voiceId))throw fail(400,'请填写有效的 MiniMax voice_id');
      if(!['speech-2.8-turbo','speech-2.8-hd'].includes(model)||!['Chinese','Chinese,Yue','auto'].includes(language)||!within(speed,.5,2)||!['calm','fluent','sad','angry','surprised','fearful'].includes(emotion))throw fail(400,'语音参数不合法');
      const data=await provider(MINIMAX,process.env.MINIMAX_API_KEY,{
        model,text,stream:false,output_format:'hex',language_boost:language,
        voice_setting:{voice_id:voiceId,speed,vol:1,pitch:0,emotion},
        audio_setting:{sample_rate:32000,bitrate:128000,format:'mp3',channel:1}
      });
      const hex=data.data?.audio;
      if(data.base_resp?.status_code!==0||typeof hex!=='string'||!hex||hex.length%2||!/^[a-f\d]+$/i.test(hex))throw fail(502,'MiniMax 未返回可播放音频，请检查音色 ID 与账户额度');
      const audio=Buffer.from(hex,'hex');
      if(audio.length>8_000_000)throw fail(502,'音频文件过大');
      res.writeHead(200,{'Content-Type':'audio/mpeg','Cache-Control':'no-store','Content-Length':audio.length,'X-Content-Type-Options':'nosniff'});
      res.end(audio);
    }
  }catch(error){
    reply(res,error.status||500,{error:error.status?error.message:'接口处理失败'});
  }
  return true;
}
