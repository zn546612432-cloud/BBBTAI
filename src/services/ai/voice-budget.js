import {hasBannedTaiReassurance} from './expression-style.js';
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
