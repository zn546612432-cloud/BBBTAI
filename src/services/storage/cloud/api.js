import {TAI_CLOUD_URL,TAI_PUBLIC_KEY,taiCloudSession,saveTaiCloudSession} from '../../ai/supabase-gateway.js';

export async function cloudRequest(path,{method='GET',body,token,headers={},timeout=9000,auth=true,expectedPlayer}={}){
 const session=token?{access_token:token}:auth?await taiCloudSession():{};
 if(expectedPlayer){
  let id=session.user?.id;
  if(!id)try{id=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub;}catch{}
  if(id!==expectedPlayer)throw Error('登入身份已變更，請重新載入；本機進度已保留。');
 }
 const response=await fetch(TAI_CLOUD_URL+path,{method,headers:{apikey:TAI_PUBLIC_KEY,
  ...(session.access_token?{Authorization:'Bearer '+session.access_token}:{}),...(body&&!(body instanceof Blob)?{'Content-Type':'application/json'}:{}),...headers},
  ...(body?{body:body instanceof Blob?body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(timeout)});
 if(!response.ok){
  let detail={};try{detail=await response.json();}catch{}
  throw Object.assign(Error(response.status===429?'操作太頻繁，請稍後再試。':response.status===401?'請重新驗證郵箱以恢復雲端身份。':detail.msg||detail.message||'雲端暫時無法連線，進度已保存在本機。'),{status:response.status,code:detail.code||detail.error_code||detail.error});
 }
 return response;
}
export const currentCloudPlayer=async()=>await (await cloudRequest('/auth/v1/user')).json();
export const readCloudSave=async(slot=1,player)=>{
 const rows=await (await cloudRequest('/rest/v1/game_saves?slot=eq.'+slot+'&select=id,user_id,revision,game_state,updated_at',{expectedPlayer:player})).json();
 if(!Array.isArray(rows)||rows.length>1)throw Error('雲端存檔資料不完整，已保留本機進度。');
 const row=rows[0];return row?{...row,client_write_id:row.game_state?._cloudWriteId}:null;
};
export const writeCloudSave=async({slot=1,revision,writeId,state,player})=>await (await cloudRequest('/rest/v1/rpc/sync_phone_save',{
 method:'POST',body:{p_slot:slot,p_expected_revision:revision,p_write_id:writeId,p_state:state},timeout:20000,expectedPlayer:player})).json();
// 0000 is a destructive new-game command, never an ordinary save conflict.
// RLS limits DELETE to the authenticated owner; FKs cascade to backup rows.
export const eraseCloudSave=async({slot=1,player,id})=>{
 if(!Number.isInteger(slot)||slot<1||slot>2||!player||!id)throw Error('缺少要刪除的雲端存檔身份。');
 const query='slot=eq.'+slot+'&user_id=eq.'+encodeURIComponent(player)+'&id=eq.'+encodeURIComponent(id)+'&select=id';
 const response=await cloudRequest('/rest/v1/game_saves?'+query,{
  method:'DELETE',expectedPlayer:player,timeout:20000,headers:{Prefer:'return=representation'}
 });
 const rows=await response.json();
 if(!Array.isArray(rows)||rows.length>1)throw Error('雲端刪除結果異常，未開始新存檔。');
 return {status:rows.length?'deleted':'conflict'};
};
export const cloudBackups=async(id,player)=>await (await cloudRequest('/rest/v1/game_save_backups?save_id=eq.'+encodeURIComponent(id)+'&select=revision,game_state,saved_at&order=revision.desc&limit=3',{expectedPlayer:player})).json();

export async function sendSaveEmail(email,{recover=false}={}){
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('請填寫有效郵箱。');
 const query='?redirect_to='+encodeURIComponent(globalThis.location?.origin+globalThis.location?.pathname);
 if(recover)await cloudRequest('/auth/v1/otp'+query,{method:'POST',body:{email,create_user:false},auth:false});
 else await cloudRequest('/auth/v1/user'+query,{method:'PUT',body:{email}});
 return {email,type:recover?'magiclink':'email_change'};
}
export async function verifySaveEmail({email,type},token){
 let body={email,type,token};
 if(/^https:\/\//i.test(token)){
  const url=new URL(token),actualType=url.searchParams.get('type'),token_hash=url.searchParams.get('token')||url.searchParams.get('token_hash');
  if(url.origin!==TAI_CLOUD_URL||url.pathname!=='/auth/v1/verify'||actualType!==type||!token_hash)throw Error('請貼上這封驗證郵件內的完整連結。');
  body={type,token_hash};
 }else if(!/^\d{6,10}$/.test(token))throw Error('請填寫驗證碼，或貼上郵件中的驗證連結。');
 return await (await cloudRequest('/auth/v1/verify',{method:'POST',body,auth:false})).json();
}
// Confirmation email links use the same existing session store as AI/TTS.
export function takeEmailCallback(location=globalThis.location,history=globalThis.history){
 const hash=new URLSearchParams(String(location?.hash||'').replace(/^#/,''));
 if(!hash.has('access_token'))return false;
 const access_token=hash.get('access_token'),refresh_token=hash.get('refresh_token');
 history?.replaceState(null,'',location.pathname+location.search);
 if(!refresh_token)throw Error('驗證連結不完整，原存檔已保留。');
 saveTaiCloudSession({access_token,refresh_token,expires_in:Number(hash.get('expires_in'))||3600});
 return true;
}
