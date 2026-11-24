import {esc} from '../../../../system/ui.js';
import {sendSaveEmail,verifySaveEmail} from '../../../../services/storage/cloud/api.js';

const ui=new WeakMap();
const verificationKey=store=>store.cloud?.enabled?store.cloud.key+':email-verification:'+store.cloud.slot:null;
const local=store=>{
 if(!ui.has(store)){
  let verification=null;
  try{verification=JSON.parse(store.storage?.getItem(verificationKey(store))||'null');}catch{}
  ui.set(store,{verification:verification?.email&&['magiclink','email_change'].includes(verification.type)?verification:null});
 }
 return ui.get(store);
};
const rememberVerification=(store,verification)=>{
 const key=verificationKey(store);if(!key)return;
 try{verification?store.storage?.setItem(key,JSON.stringify(verification)):store.storage?.removeItem(key);}catch{}
};
const labels={local:'本機存檔',connecting:'正在連線',pending:'已保存至本機',saving:'正在同步',synced:'已同步',offline:'已保存至本機，待連線後同步',conflict:'有另一份進度，需要選擇', 'media-pending':'進度已同步，部分舊語音僅在原裝置可用'};
const stamp=s=>s?'D'+s.day+' · '+s.clock:'';
const button=(action,label,attrs='')=>`<button type="button" class="settings-row" data-action="cloud-${action}" ${attrs}>${esc(label)}</button>`;
export function cloudSaveView(store){
 const cloud=store.cloud,state=local(store),status=cloud?.status||{phase:'local'},conflict=status.conflict;
 const player=status.player,email=player?.email_confirmed_at&&!player?.is_anonymous?player.email:null;
 const message=status.phase==='offline'&&status.message?status.message:state.message==='已確認同步至雲端。'&&status.phase!=='synced'?'':state.message;
 const header='<button class="settings-back" data-action="settings-back">‹ 设置</button><h1>存檔與備份</h1>';
 const emailForm=(recover=false)=>`<form data-form="cloud-email" class="cloud-save-form"><input type="hidden" name="recover" value="${recover?'1':'0'}"><label>郵箱<input name="email" type="email" autocomplete="email" required placeholder="你的郵箱"></label><button class="button-primary" ${state.busy?'disabled':''}>${recover?'發送找回郵件':'綁定郵箱'}</button></form>`;
 return `<div class="settings-page settings-detail cloud-save-page">${header}<section><div class="settings-row"><strong>${esc(stamp(store.get()))}</strong><small role="status">${esc(labels[status.phase]||labels.offline)}</small></div>${email?`<div class="settings-row"><strong>已綁定</strong><small>${esc(email)}</small></div>`:''}${cloud?.enabled?button('sync','立即同步'):''}</section>
 ${message?`<p class="settings-caption" role="status">${esc(message)}</p>`:''}
 ${!cloud?.enabled?'<p class="settings-caption">此預覽的進度只保存在本機。</p>':`
 ${conflict?`<section><p class="settings-caption">本機：${esc(stamp(conflict.local))}<br>雲端：${esc(conflict.remote?stamp(conflict.remote.game_state):'尚無存檔')}</p>${button('choose-local','保留本機進度，更新雲端')}${conflict.remote?button('choose-remote','使用雲端進度'):''}</section>`:''}
 ${state.verification?`<section><p class="settings-caption">去郵件中長按「Sign in」或確認按鈕，複製完整連結，回到這裡貼上。不要直接在郵件內打開；若已打開而無法返回，重新發送一封郵件。</p><form data-form="cloud-verify" class="cloud-save-form"><label>郵件連結或驗證碼<input name="token" type="text" autocomplete="one-time-code" required></label><button class="button-primary" ${state.busy?'disabled':''}>驗證並繼續</button></form></section>`:''}
 ${!email?`<section><p class="settings-caption">首次使用先綁定郵箱。已在另一台裝置綁定過，請使用下方的找回入口。</p>${emailForm()}</section>`:''}
 <section><details><summary class="settings-row">已有綁定郵箱？找回進度</summary>${emailForm(true)}</details></section>
 <section>${button('history','歷史備份')}${(state.history||[]).map((r,i)=>button('restore-backup',stamp(r.game_state),'data-index="'+i+'"')).join('')}</section>`}</div>`;
}
async function perform(ctx,action){
 const state=local(ctx.store);if(state.busy)return;
 state.busy=true;state.message='';ctx.refresh();
 try{await action(state);}
 catch(error){state.message=error.message||'暫時無法連線，原進度已保留。';}
 finally{state.busy=false;ctx.refresh();}
}
export function cloudSaveAction(action,target,ctx){
 if(!action.startsWith('cloud-'))return false;
 const cloud=ctx.store.cloud;if(!cloud?.enabled)return true;
 void perform(ctx,async state=>{
  if(action==='cloud-sync'){
   if(cloud.revision===null)await cloud.start();
   if(cloud.revision===null){state.message=cloud.status.message||'尚未連上雲端，本機進度已保留。';return;}
   const success=await cloud.flush();
   state.message=success?'已確認同步至雲端。':cloud.status.phase==='conflict'?'雲端有另一份進度，請先選擇。':cloud.status.message||'尚未確認同步成功；本機進度已保留，稍後會自動重試。';
  }
  if(action==='cloud-choose-local')await cloud.resolve('local');
  if(action==='cloud-choose-remote')await cloud.resolve('remote');
  if(action==='cloud-history')state.history=await cloud.history();
  if(action==='cloud-restore-backup'){
   const row=state.history?.[Number(target.dataset.index)];if(row){const synced=await cloud.restoreBackup(row);state.message=synced?'已恢復所選備份。':'已恢復至本機，待連線後同步。';state.history=null;}
  }
 });return true;
}
export function cloudSaveSubmit(form,ctx){
 if(!['cloud-email','cloud-verify'].includes(form.dataset.form))return false;
 const data=new FormData(form),cloud=ctx.store.cloud;if(!cloud?.enabled)return true;
 void perform(ctx,async state=>{
  if(form.dataset.form==='cloud-email'){
   state.verification=await sendSaveEmail(String(data.get('email')||'').trim(),{recover:data.get('recover')==='1'});
   rememberVerification(ctx.store,state.verification);
   state.message='郵件已發送。請複製郵件中的完整連結，回到這裡驗證。';
  }else{
   if(!state.verification)throw Error('請先發送驗證郵件。');
   const session=await verifySaveEmail(state.verification,String(data.get('token')||'').trim());
   await cloud.acceptSession(session);state.verification=null;rememberVerification(ctx.store,null);state.message='郵箱已驗證。';
  }
 });return true;
}
