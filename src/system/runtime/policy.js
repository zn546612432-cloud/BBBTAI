// The single policy for D01–D55. No App or story day owns a clock rate.
// Timed messages, audio and minigame deadlines continue to use real time.
export const PHONE_RUNTIME_POLICY=Object.freeze({
 version:1,
 appMinutesPerRealMinute:5,
 homeMinutesPerRealSecond:5,
 batteryGameMinutesPerPoint:900/80, // 08:00–23:00: 100% -> 20%
 shortChargeFillMs:60_000,
 shortChargeMaxGain:10
});
export const phoneHomeSpeed=s=>{
 const n=s?.story55?.minutesPerSecond;
 return typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=10?n:PHONE_RUNTIME_POLICY.homeMinutesPerRealSecond;
};
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
 return scene==='home'||scene==='background'?home/1000:PHONE_RUNTIME_POLICY.appMinutesPerRealMinute/60_000;
}
