import {DEATH_START,DEATH_END,chargingBlock,deathLocked,syncDeathNight} from '../power/story.js';
// Civil game time, story day and battery are deliberately independent.
// 24 in-game hours = 30 real minutes; plugged-in: 1 hour per 3 seconds.
export const NORMAL_MINUTES_PER_MS=1440/1_800_000;
export const CHARGING_MINUTES_PER_MS=60/3000;
export const SLEEPING_MINUTES_PER_MS=60/1000;
export const TYPING_MINUTES_PER_MS=2/60000;
const DAY_MINUTES=1440;
export const clockMinutes=clock=>Number(clock.slice(0,2))*60+Number(clock.slice(3));
export const absoluteMinute=s=>(s.day-1)*DAY_MINUTES+clockMinutes(s.clock);
const isoTime=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
export function setAbsoluteMinute(s,minute){
 const elapsed=Math.max(0,Math.floor(minute));
 s.day=Math.floor(elapsed/DAY_MINUTES)+1;
 s.clock=isoTime(elapsed%DAY_MINUTES);
}
export function nextClockOccurrence(from,clock){
 const within=clockMinutes(clock),day=Math.floor(from/DAY_MINUTES);
 const today=day*DAY_MINUTES+within;
 return today>from?today:today+DAY_MINUTES;
}
export const wakeMinute = s => nextClockOccurrence(absoluteMinute(s),'08:00');
function nextAlarm(s,from,end){
 let found=null;
 for(const alarm of s.content.alarms||[]){
  if(!alarm.enabled||!/^([01]\d|2[0-3]):[0-5]\d$/.test(alarm.time))continue;
  if(alarm.repeat==='永不'&&alarm.lastFiredDay!==undefined)continue;
  const at=nextClockOccurrence(from,alarm.time),day=Math.floor(at/DAY_MINUTES)+1;
  if(at>end||alarm.lastFiredDay===day)continue;
  if(!found||at<found.at)found={at,alarm};
 }
 return found;
}
export function advanceGameMinutes(s,requested){
 syncDeathNight(s);
 if(['off','passcode'].includes(s.deathPhase)||s.dayChargeRemainingMs>0)return {minutes:0};
 const from=absoluteMinute(s),target=from+Math.max(0,Math.floor(requested));
 if(target<=from)return {minutes:0};
 if(s.deathPhase==='draining'){
  const at=Math.min(target,DEATH_END);setAbsoluteMinute(s,at);syncDeathNight(s);
  return {minutes:at-from,event:at===DEATH_END?'death-off':'none'};
 }
 let stop={at:target,type:'none'};
 const alarm=nextAlarm(s,from,target);
 if(alarm&&alarm.at<=stop.at)stop={...alarm,type:'alarm'};
 if(s.powerMode==='sleeping'&&Number.isFinite(s.sleepWakeAt)&&s.sleepWakeAt<stop.at)stop={at:s.sleepWakeAt,type:'wake'};
 // Only an unplugged phone is driven to an emergency 1% at 03:00.
 if(!chargingBlock(s)&&s.powerMode!=='charging'&&s.powerMode!=='sleeping'){
  const at=nextClockOccurrence(from,'03:00');
  if(at<=stop.at)stop={at,type:'emergency'};
 }
 if(s.deathPhase!=='recovered'&&from<DEATH_START&&target>=DEATH_START&&DEATH_START<=stop.at)stop={at:DEATH_START,type:'death-start'};
 const advanced=stop.at-from;
 setAbsoluteMinute(s,stop.at);
 if(s.powerMode==='charging'||s.powerMode==='sleeping'){
  const old=s.batteryPercent??82,total=(Number(s.chargeFraction)||0)+advanced*(80/360);
  const points=Math.floor(total);
  s.chargeFraction=old+points>=100?0:total-points;
  s.batteryPercent=Math.min(100,old+points);
 }
 if(stop.type==='alarm'){
  const a=(s.content.alarms||[]).find(x=>x.id===stop.alarm.id);
  if(a){a.lastFiredDay=s.day;if(a.repeat==='永不')a.enabled=false;}
  s.alarmRinging={id:stop.alarm.id,label:stop.alarm.label||'闹钟',clock:s.clock,day:s.day,fromSleep:s.powerMode==='sleeping'};
  s.notifications.unshift({id:`alarm-${stop.alarm.id}-${s.day}`,title:'闹钟',body:s.alarmRinging.label,link:{appId:'clock',route:'/',params:{}}});
  if(!chargingBlock(s)&&s.powerMode==='idle'&&s.clock==='03:00'){s.batteryPercent=1;s.emergencyCharge=true;}
 }else if(stop.type==='wake'){
  s.powerMode='idle';s.sleepWakeAt=null;s.unlocked=false;
  s.nav.stack=[];s.nav.current={appId:'home',route:'/',params:{}};
 }else if(stop.type==='emergency'){
  s.batteryPercent=1;s.powerActiveMs=0;s.emergencyCharge=true;
 }
 syncDeathNight(s);
 return {minutes:advanced,event:stop.type};
}
export function tickWorld(s,realMilliseconds,{focused=false}={}){
 syncDeathNight(s);
 if(s.dayChargeRemainingMs>0){s.dayChargeRemainingMs=Math.max(0,s.dayChargeRemainingMs-realMilliseconds);return {minutes:0};}
 if(['off','passcode'].includes(s.deathPhase)||s.alarmRinging||s.emergencyCharge)return {minutes:0};
 const mode=s.powerMode||'idle';
 const rate=s.deathPhase==='draining'?NORMAL_MINUTES_PER_MS:focused?TYPING_MINUTES_PER_MS:mode==='charging'?CHARGING_MINUTES_PER_MS:mode==='sleeping'?SLEEPING_MINUTES_PER_MS:NORMAL_MINUTES_PER_MS;
 const total=(Number(s.worldMinuteFraction)||0)+Math.max(0,realMilliseconds)*rate;
 const whole=Math.floor(total);
 if(!whole){s.worldMinuteFraction=total;return {minutes:0};}
 const outcome=advanceGameMinutes(s,whole);
 s.worldMinuteFraction=outcome.event&&outcome.event!=='none'?0:total-whole;
 return outcome;
}
export function setSleeping(s){
 if(deathLocked(s)||s.day===90||s.powerMode!=='charging'||s.alarmRinging)return false;
 s.powerMode='sleeping';s.sleepWakeAt=wakeMinute(s);s.worldMinuteFraction=0;
 s.unlocked=false;s.nav.stack=[];s.nav.current={appId:'home',route:'/',params:{}};
 return true;
}
export function dismissAlarm(s,{continueSleep=false}={}){
 if(!s.alarmRinging)return false;
 const wasSleeping=s.alarmRinging.fromSleep;
 s.alarmRinging=null;s.worldMinuteFraction=0;
 if(wasSleeping&&!continueSleep){s.powerMode='charging';s.sleepWakeAt=null;}
 return true;
}
