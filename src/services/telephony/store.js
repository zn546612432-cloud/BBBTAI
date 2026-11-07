// All public mutations commit through the existing PhoneStore transaction.
import {ensurePhoneData} from '../phone-data.js';
export const activePhoneCall=s=>['ringing','connected'].includes(s.phoneCall?.state)?s.phoneCall:null;
export const canPresentPhoneCall=s=>!!s.unlocked&&!s.poweredOff&&!s.emergencyCharge&&!s.alarmRinging&&Number(s.batteryPercent)>1&&!s.dayChargeRemainingMs&&!['off','passcode','draining','s55-off','s55-charging','s55-one-percent','s55-zero-percent','s55-accelerating'].includes(s.deathPhase)&&!['sleeping','charging'].includes(s.powerMode);
export function receiveCall(store,{id,source='phone',direction='incoming',number='',displayName='未知號碼',forced=false,node=null,autoAnswerMs=8000},now=Date.now()){
 if(!id||!Number.isFinite(autoAnswerMs)||autoAnswerMs<0)throw Error('來電資料無效');
 const s=store.get();
 if(activePhoneCall(s)||s.content.phone?.calls?.some(c=>c.id===id)||s.phoneCall?.id===id)return false;
 store.update(s=>{s.phoneCall={id,source,direction,number,displayName,forced:!!forced,state:'ringing',startedAt:now,answeredAt:null,node,autoAnswerMs,presentedAt:canPresentPhoneCall(s)?now:null};});
 return true;
}
export function answerCall(store,id,now=Date.now(),{remote=false}={}){
 const c=store.get().phoneCall;
 if(c?.id!==id||c.state!=='ringing'||!canPresentPhoneCall(store.get()))return false;
 store.update(s=>{Object.assign(s.phoneCall,{state:'connected',answeredAt:now,remoteOverride:remote,showControls:!c.node});});return true;
}
export function endCall(store,id,now=Date.now(),{remote=false,reason='ended'}={}){
 const c=activePhoneCall(store.get());
 if(!c||c.id!==id||c.forced&&!remote)return false;
 store.update(s=>{
  const call=s.phoneCall;Object.assign(call,{state:'ended',endedAt:now,reason,speaking:false});
  ensurePhoneData(s);
  if(!s.content.phone.calls.some(x=>x.id===id))s.content.phone.calls.unshift({
   id,number:call.number||'UNKNOWN',name:call.displayName,direction:call.direction,
   missed:call.answeredAt===null,connected:call.answeredAt!==null,
   duration:call.answeredAt===null?0:Math.max(0,Math.floor((now-call.answeredAt)/1000)),
   day:s.day,time:s.clock,place:'',source:call.source
  });
 });return true;
}
export function declineCall(store,id,now=Date.now()){return endCall(store,id,now,{reason:'declined'});}
export function outgoingCall(store,number,now=Date.now()){
 if(!/^[+\d*# ()-]{1,40}$/.test(String(number||''))||activePhoneCall(store.get()))return false;
 return receiveCall(store,{id:`phone-outgoing-${now}`,direction:'outgoing',number,displayName:number,autoAnswerMs:0},now);
}
