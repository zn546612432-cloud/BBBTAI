// The browser talks only to our same-origin gateway; never to provider APIs or API keys.
async function requestJSON(path,body){
  let response;
  try{response=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});}
  catch{throw Error('AI 接口未启动：请使用本机开发服务');}
  let data;
  try{data=await response.json();}catch{throw Error('此公开预览仅供审阅，未部署付费 AI 后端');}
  if(!response.ok)throw Error(data.error||'接口请求失败');
  return data;
}
export const aiStatus=()=>requestJSON('/api/ai/status');
export const askTai=({channel,day,messages,profile,memories})=>requestJSON('/api/ai/chat',{channel,day,messages,profile,memories});
export async function voicePreview({text,voiceId,model='speech-2.8-turbo',language='Chinese',speed=1}){
  let response;
  try{response=await fetch('/api/voice/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voiceId,model,language,speed})});}
  catch{throw Error('本地 MiniMax 接口未启动');}
  if(!response.ok){let data={};try{data=await response.json();}catch{}throw Error(data.error||'MiniMax 语音接口失败');}
  if(!response.headers.get('Content-Type')?.includes('audio/'))throw Error('语音服务没有返回音频');
  return response.blob();
}
