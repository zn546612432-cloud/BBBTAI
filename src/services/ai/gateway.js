// The browser talks only to our same-origin gateway; never to provider APIs or API keys.
async function requestJSON(path,body){
  let response;
  try{response=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});}
  catch{throw Error('本地 AI 接口未启动：请用 npm run dev 打开 localhost:5173');}
  let data;
  try{data=await response.json();}catch{throw Error('接口未返回 JSON：GitHub Pages 没有后端服务');}
  if(!response.ok)throw Error(data.error||'接口请求失败');
  return data;
}
export const aiStatus=()=>requestJSON('/api/ai/status');
export const askTai=({channel,day,messages})=>requestJSON('/api/ai/chat',{channel,day,messages});
export async function voicePreview({text,voiceId,model='speech-2.8-turbo',language='Chinese',speed=1}){
  let response;
  try{response=await fetch('/api/voice/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voiceId,model,language,speed})});}
  catch{throw Error('本地 MiniMax 接口未启动');}
  if(!response.ok){let data={};try{data=await response.json();}catch{}throw Error(data.error||'MiniMax 语音接口失败');}
  if(!response.headers.get('Content-Type')?.includes('audio/'))throw Error('语音服务没有返回音频');
  return response.blob();
}
