// The single policy for D01–D55. No App or story day owns a clock rate.
// Timed messages, audio and minigame deadlines continue to use real time.
export const PHONE_RUNTIME_POLICY=Object.freeze({
 version:1,
 appMinutesPerRealMinute:5,
 homeMinutesPerRealSecond:2.5,
 backgroundMinutesPerRealMinute:10,
 shortChargeHomeMinutesPerRealSecond:3.75,
 batteryGameMinutesPerPoint:900/80, // 08:00–23:00: 100% -> 20%
 shortChargeFillMs:60_000,
 shortChargeMaxGain:10
});
export const phoneHomeSpeed=s=>{
 const n=s?.story55?.minutesPerSecond;
 return typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=10?n:PHONE_RUNTIME_POLICY.homeMinutesPerRealSecond;
};

// A real reply is being prepared/queued or has arrived unread. Tai being
// online by itself is NOT a reason to slow the home screen. This is a view of
// existing native messaging/Story55 state, not another clock or reply queue.
export function taiReplyTriggered(s,now=Date.now()){
 if(s?.story55?.version!==1)return false;
 const mirage=s.content?.conversations?.mirage?.find(c=>c.id==='s55-ouroboros');
 const noapp=s.content?.conversations?.noapp?.find(c=>c.id==='tai');
 const lastMirage=mirage?.messages?.at(-1),lastNoapp=noapp?.messages?.at(-1);
 const unreadTai=(c,actor,last)=>Number(c?.unread)>0&&last?.from===actor&&!last.demo;
 if(unreadTai(mirage,'s55-ouroboros',lastMirage)||unreadTai(noapp,'tai',lastNoapp))return true;
 const p=s.story55.ghostShare;
 if(p?.phase==='dialogue'||p?.phase==='ready-control'){
  if(p.pendingIds?.some(id=>mirage?.messages?.some(m=>m.id===id&&m.from==='s55-ouroboros'&&m.schedule?.mode==='chat-delay'&&!m.delivery)))
   return true;
 }
 const pg=s.story55.d23Postgame;
 if(pg&&!pg.closed&&!pg.replyFailed&&
    ['intro','intro-delivering','awaiting','reply-delivering'].includes(pg.phase))return true;
 const pendingAt=Number(lastMirage?.taiReplyRequestAt);
 if(lastMirage?.from==='me'&&Number.isFinite(pendingAt)&&pendingAt>0&&
    now>=pendingAt&&now-pendingAt<120000)return true;
 // NoApp already persists this on the actual AI reply path; an offline or
 // deferred outgoing message has no taiReadAt and must not trigger slowdown.
 const noappPendingAt=Number(lastNoapp?.taiReadAt);
 if(lastNoapp?.from==='me'&&lastNoapp.taiPending&&Number.isFinite(noappPendingAt)&&
    noappPendingAt>0&&now>=noappPendingAt&&now-noappPendingAt<120000&&
    !lastNoapp.taiHandledAction&&!lastNoapp.taiDeferredGameMinute&&!lastNoapp.taiDeferredUntil)
  return true;
 return false;
}

export function phoneRuntimeScene(s,{hidden=false,background=false,restarting=false,overlay=false,callActive=false,fastForward=true}={}){
 if(restarting||hidden&&!background)return 'paused';
 if(s.nav?.current?.appId==='editor'&&s.powerMode!=='short-charging')return 'paused';
 if(background)return 'background';
 if(!s.unlocked)return 'locked';
 if(overlay||callActive||!fastForward)return 'interaction';
 return s.nav?.current?.appId==='home'?'home':'app';
}
export function phoneSceneMinuteRate(s,options={}){
 const scene=phoneRuntimeScene(s,options),home=phoneHomeSpeed(s);
 if(scene==='paused'||home===0)return 0;
 // Explicit short charging always outranks the background and Tai-reply rates.
 if(s.powerMode==='short-charging'&&(scene==='home'||scene==='background'))
  return PHONE_RUNTIME_POLICY.shortChargeHomeMinutesPerRealSecond/1000;
 if(scene==='background')return PHONE_RUNTIME_POLICY.backgroundMinutesPerRealMinute/60000;
 if(scene==='home')return taiReplyTriggered(s)?PHONE_RUNTIME_POLICY.appMinutesPerRealMinute/60000:home/1000;
 return PHONE_RUNTIME_POLICY.appMinutesPerRealMinute/60000;
}
