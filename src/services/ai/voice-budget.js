import {hasBannedTaiReassurance} from './expression-style.js';
import {isTaiCloudHost,activateTaiPrivateTest} from './supabase-gateway.js';
export const TAI_VOICE_LIMITS=Object.freeze({call:30,message:15});
const active=new WeakMap();
export function taiVoiceRemaining(s,type){
 if(s.aiDraft?.taiVoiceUnlimited)return Infinity;
 return Math.max(0,TAI_VOICE_LIMITS[type]-(Number(s.aiDraft?.taiVoiceUsage?.[s.day]?.[type])||0));
}
export function unlockTaiVoice(store,text){
 if(String(text).trim()!=='草莓是香蕉')return false;
 store.update(s=>{s.aiDraft??={};s.aiDraft.taiVoiceUnlimited=true;if(s.drafts)delete s.drafts.tai;});
 return true;
}
// Private activation codes are consumed before chat/history/model delivery.
// The public phrase unlocks gameplay only; a one-time server-issued code
// authorizes this specific authenticated browser for a larger cloud budget.
export function taiVoiceUnlockCommand(value){
 const text=String(value||'').trim();
 if(text==='草莓是香蕉')return {code:''};
 const match=text.match(/^草莓是香蕉\s+TEST-([\s\S]*)$/i);
 return match?{code:'TEST-'+match[1]}:null;
}
export function submitTaiVoiceUnlock(form,ctx,{activate=activateTaiPrivateTest,cloud=isTaiCloudHost()}={}){
 const command=taiVoiceUnlockCommand(form.elements?.text?.value);
 if(!command)return false;
 form.elements.text.value='';
 unlockTaiVoice(ctx.store,'草莓是香蕉');
 ctx.refresh?.();
 if(!command.code){ctx.toast?.('遊戲內電話及語音額度已解除');return true;}
 if(!cloud){ctx.toast?.('遊戲內額度已解除；私人授權需在正式網頁使用');return true;}
 void (async()=>{
  try{
   const result=await activate(command.code);
   if(result?.tester!==true)throw Error('授權未完成');
   ctx.store.update(s=>{s.aiDraft??={};s.aiDraft.taiCloudTester=true;});
   ctx.toast?.('私人測試授權成功，遊戲內語音額度已解除');
  }catch{ctx.toast?.('私人測試授權失敗，請核對授權碼；遊戲內額度已解除');}
  ctx.refresh?.();
 })();
 return true;
}
// Reserve before awaiting TTS, including parallel call prefetch.
export async function synthesizeTaiVoice(store,type,options,synthesize){
 if(hasBannedTaiReassurance([options.text]))throw Object.assign(Error('Blocked dialogue'),{code:'TAI_STYLE'});
 const s=store.get(),day=s.day,key=day+':'+type;
 let pending=active.get(store);if(!pending){pending=new Map();active.set(store,pending);}
 if(taiVoiceRemaining(s,type)<=(pending.get(key)||0))throw Object.assign(Error('Daily voice limit'),{code:'TAI_VOICE_LIMIT'});
 pending.set(key,(pending.get(key)||0)+1);
 try{
  const clip=await synthesize(options);
  store.update(state=>{state.aiDraft??={};state.aiDraft.taiVoiceUsage??={};const usage=state.aiDraft.taiVoiceUsage[day]??={};usage[type]=(Number(usage[type])||0)+1;});
  return clip;
 }finally{const n=(pending.get(key)||1)-1;if(n)pending.set(key,n);else pending.delete(key);}
}
