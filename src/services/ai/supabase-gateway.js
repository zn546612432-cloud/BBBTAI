// Public Supabase publishable key ONLY. Never place DEEPSEEK_API_KEY,
// MINIMAX_API_KEY or a service-role key in client bundles.
// The same anonymous Supabase auth session is reused across Mirage/NoApp/phone
// navigation; Ghost sharing does not prompt for another login.
export const TAI_CLOUD_URL='https://zmnufhswpnreeseyamlv.supabase.co';
export const TAI_PUBLIC_KEY="sb_publishable_g5uRIZdBaY36VqtoZXAS_A_3exgtfs9";
export const TAI_PROVIDER_ENDPOINT=TAI_CLOUD_URL+'/functions/v1/tai-provider-gateway';
const SESSION_KEY='ximeng-tai-gateway-auth-v1';
let flight=null;
export const isTaiCloudHost=(hostname=globalThis.location?.hostname)=>hostname==='zn546612432-cloud.github.io';
const stored=()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch{return null;}};
const save=session=>{
 const value={access_token:session.access_token,refresh_token:session.refresh_token,
  expires_at:session.expires_at||Math.floor(Date.now()/1000)+Number(session.expires_in||3600)};
 try{localStorage.setItem(SESSION_KEY,JSON.stringify(value));}catch{}
 return value;
};
const fetchAuth=async(url,body)=>{
 const response=await fetch(TAI_CLOUD_URL+url,{method:'POST',
  headers:{apikey:TAI_PUBLIC_KEY,'Content-Type':'application/json'},
  body:JSON.stringify(body),cache:'no-store'});
 let json;try{json=await response.json();}catch{throw Error('云端登录返回了无效响应');}
 if(!response.ok||json?.error||json?.error_code)
  throw Error('云端匿名身份验证不可用：'+String(json?.msg||json?.error_description||json?.error||response.status).slice(0,150));
 return json;
};
export async function taiCloudSession(){
 const current=stored();
 if(current?.access_token&&current.expires_at>Date.now()/1000+90)return current;
 if(flight)return flight;
 flight=(async()=>{
  if(current?.refresh_token){
   try{
    const refreshed=await fetchAuth('/auth/v1/token?grant_type=refresh_token',{refresh_token:current.refresh_token});
    if(refreshed?.access_token)return save(refreshed);
   }catch{ /* Expired anonymous session: create a fresh one without touching game saves. */ }
  }
  const result=await fetchAuth('/auth/v1/signup',{data:{},gotrue_meta_security:{}});
  const session=result.session||result;
  if(!session.access_token||!session.refresh_token)throw Error('云端匿名登录尚未开启，请在 Supabase Auth 设置中启用匿名登录');
  return save(session);
 })().finally(()=>{flight=null;});
 return flight;
}
export async function taiCloudCall(op,payload={}){
 const session=await taiCloudSession();
 let r;
 try{
  r=await fetch(TAI_PROVIDER_ENDPOINT,{method:'POST',mode:'cors',
   headers:{apikey:TAI_PUBLIC_KEY,Authorization:'Bearer '+session.access_token,
    'Content-Type':'application/json'},
   body:JSON.stringify({op,payload}),cache:'no-store'});
 }catch{throw Error('无法连接 Supabase 熙泰 AI 后端');}
 if(op==='tts'&&r.ok){
  const type=r.headers.get('content-type')||'';
  if(!type.includes('audio/'))throw Error('云端语音未返回音频');
  return r.blob();
 }
 let data;try{data=await r.json();}catch{throw Error('云端 AI 返回了无效响应');}
 if(!r.ok){
  const reason=String(data?.error||'AI 暂时不可用');
  if(reason==='empty_model_reply')throw Error('暫時未收到有效回覆，請稍後再試。');
  if(r.status===429)throw Error('今日 AI 使用额度已达到上限，明天可以继续');
  if(r.status===401)throw Error('熙泰 AI 云端会话已失效，请重新打开网页');
  if(r.status===503)throw Error('Supabase 后端未完成配置：'+reason);
  throw Error('云端 AI：'+reason);
 }
 return data;
}

/** Player's recording is sent only to the authenticated Supabase ASR route. */
export async function taiCloudTranscribe(blob,{region='cn'}={}){
 if(!(blob instanceof Blob)||!blob.size||blob.size>8_000_000)
  throw Error('语音上传大小需小于 8MB');
 const session=await taiCloudSession();
 const form=new FormData();form.append('op','asr');form.append('region',region);
 const mime=String(blob.type||'audio/wav').toLowerCase();
 const ext=mime.includes('mp4')?'m4a':mime.includes('ogg')?'ogg':mime.includes('webm')?'webm':'wav';
 form.append('file',blob,'ximeng-voice.'+ext);
 let response;
 try{response=await fetch(TAI_PROVIDER_ENDPOINT,{method:'POST',mode:'cors',
  headers:{apikey:TAI_PUBLIC_KEY,Authorization:'Bearer '+session.access_token},
  body:form,cache:'no-store'});}
 catch{throw Error('无法连接云端语音识别服务');}
 let value;try{value=await response.json();}catch{throw Error('语音识别返回了无效响应');}
 if(!response.ok)throw Error(response.status===429?'今日语音服务已达到使用额度':'语音识别失败：'+String(value?.error||response.status));
 if(typeof value?.text!=='string'||!value.text.trim())throw Error('未识别出文字');
 return value.text.trim();
}
