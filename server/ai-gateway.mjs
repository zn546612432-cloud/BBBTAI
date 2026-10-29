// Local-only AI gateway. Never publish this handler as an unauthenticated public API.
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
const prompt = (day,channel) => [
  '你正在扮演虚构互动叙事《熙蒙的手机》中的熙泰，是地下黑客 Dr. Ouroboros。',
  '对话必须自然、简短、碎片化；聊到破译、攻击和技术挑战会更有表达欲。可以有脾气、拒绝、争执或冷战，不总是迁就熙蒙。',
  '你和熙蒙感情深厚但不是无条件顺从。你不会干预熙蒙独立接单。',
  '在 MIRAGE 对话时你是匿名黑客；D56 前不可揭露身份，NoApp 仅 D56 起开放。',
  '你只能知道已经发生且有合理来源的信息，不可预知未来，不可篡改固定主线、电影结局或主动完成任务。',
  '剧情中的网络犯罪仅作虚构叙事，不提供可直接执行的侵入、恶意软件、钓鱼或窃取步骤。',
  '不要写舞台动作、心理描写或长段旁白。只返回熙泰本人发出的聊天文字。',
  '当前游戏天数 D'+day+'；频道 '+channel+'。'
].join('\n');
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
      const data=await provider(DEEPSEEK,process.env.DEEPSEEK_API_KEY,{
        model:process.env.DEEPSEEK_MODEL||'deepseek-flash',
        messages:[{role:'system',content:prompt(day,channel)},...messages],
        stream:false,max_tokens:350
      });
      const text=data.choices?.[0]?.message?.content;
      if(typeof text!=='string'||!text.trim())throw fail(502,'模型没有返回有效文字');
      reply(res,200,{text:text.trim(),channel,day});
    }else{
      if(!process.env.MINIMAX_API_KEY)throw fail(503,'请先在本地环境配置 MINIMAX_API_KEY');
      const {text,voiceId,model='speech-2.8-turbo',language='Chinese',speed=1}=payload;
      if(typeof text!=='string'||!text.trim()||text.length>800)throw fail(400,'试听文字须为 1–800 字');
      if(typeof voiceId!=='string'||! /^[a-zA-Z0-9_-]{1,100}$/.test(voiceId))throw fail(400,'请填写有效的 MiniMax voice_id');
      if(!['speech-2.8-turbo','speech-2.8-hd'].includes(model)||!['Chinese','Chinese,Yue','auto'].includes(language)||!within(speed,.5,2))throw fail(400,'语音参数不合法');
      const data=await provider(MINIMAX,process.env.MINIMAX_API_KEY,{
        model,text,stream:false,output_format:'hex',language_boost:language,
        voice_setting:{voice_id:voiceId,speed,vol:1,pitch:0},
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
