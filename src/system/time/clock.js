import {isStory55,story55ChargeGate} from '../../services/story55/state.js';
import {secondView55,finaleInProgress55,endingAwaitingVoice55,endingAwaitingReply55} from '../../services/story55/finale.js';
import {DEATH_START,DEATH_END,chargingBlock,deathLocked,syncDeathNight} from '../power/story.js';
import {endShortCharge,isShortCharging} from '../power/battery.js';
// Civil game time, story day and battery are deliberately independent.
// 24 in-game hours = 30 real minutes; plugged-in: 1 hour per 3 seconds.
export const NORMAL_MINUTES_PER_MS=1440/1_800_000;
export const CHARGING_MINUTES_PER_MS=60/3000;
export const SHORT_CHARGE_MINUTES_PER_MS=180/60_000; // 1 real min = 3 game hours
export const SLEEPING_MINUTES_PER_MS=60/1000;
export const TYPING_MINUTES_PER_MS=2/60000;
export const TAI_CHAT_MINUTES_PER_MS=1/60000; // real 1 min = game 1 min
// Confirmed pacing for the current 55-day campaign; legacy saves keep their
// original pacing so compatibility/recovery behavior does not change.
export const STORY55_NORMAL_MINUTES_PER_MS=1/3000;
export const STORY55_CHAT_MINUTES_PER_MS=2/60000;
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
 if(secondView55(s)||finaleInProgress55(s)||endingAwaitingVoice55(s))return {minutes:0};
 syncDeathNight(s);
 if(['off','passcode'].includes(s.deathPhase)||s.dayChargeRemainingMs>0||s.emergencyCharge||s.poweredOff)return {minutes:0};
 // Short charging never crosses midnight or skips into the next story day.
 const short=isShortCharging(s);
 if(short&&s.clock==='23:59'){endShortCharge(s);return {minutes:0,event:'short-charge-end'};}
 // D01 is a story-day, not a midnight boundary. Only charging enters D02.
 // Keep the phone fully operable if compulsory D01 settlements are unfinished
 // at 03:00 instead of triggering an emergency battery overlay.
 if(isStory55(s)&&s.day===1){
  const d=s.story55.d01??={},from=clockMinutes(s.clock)+(d.nightAfterMidnight?1440:0);
  const target=Math.min(short?1439:1440+180,from+Math.max(0,Math.floor(requested)));
  if(target<=from)return {minutes:0,event:'d01-hold'};
  s.clock=isoTime(target%1440);d.nightAfterMidnight=target>=1440;
  if(short&&target===1439)endShortCharge(s);
  if(target===1440+180){d.frozenAt03=true;return {minutes:target-from,event:'d01-hold'};}
  return {minutes:target-from,event:short&&target===1439?'short-charge-end':'none'};
 }
 const from=absoluteMinute(s);let target=from+Math.max(0,Math.floor(requested));
 if(short)target=Math.min(target,s.day*DAY_MINUTES-1);
 if(isStory55(s)){target=Math.min(target,55*1440-1);for(let d=s.day;d<=Math.min(55,Math.floor(target/1440)+1);d++)if(story55ChargeGate({...s,day:d})){target=Math.min(target,d*1440-1);break;}}
 if(target<=from){if(short){endShortCharge(s);return {minutes:0,event:'short-charge-end'};}return {minutes:0};}
 if(s.deathPhase==='draining'){
  const at=Math.min(target,DEATH_END);setAbsoluteMinute(s,at);syncDeathNight(s);
  return {minutes:at-from,event:at===DEATH_END?'death-off':'none'};
 }
 let stop={at:target,type:'none'};
 const alarm=nextAlarm(s,from,target);
 if(alarm&&alarm.at<=stop.at)stop={...alarm,type:'alarm'};
 if(s.powerMode==='sleeping'&&Number.isFinite(s.sleepWakeAt)&&s.sleepWakeAt<stop.at)stop={at:s.sleepWakeAt,type:'wake'};
 // Only an unplugged phone is driven to an emergency 1% at 03:00.
 if(!chargingBlock(s)&&s.powerMode!=='charging'&&s.powerMode!=='short-charging'&&s.powerMode!=='sleeping'){
  const at=nextClockOccurrence(from,'03:00');
  if(at<=stop.at)stop={at,type:'emergency'};
 }
 if(!isStory55(s)&&s.deathPhase!=='recovered'&&from<DEATH_START&&target>=DEATH_START&&DEATH_START<=stop.at)stop={at:DEATH_START,type:'death-start'};
 const advanced=stop.at-from;
 setAbsoluteMinute(s,stop.at);
 const reachedShortEnd=short&&clockMinutes(s.clock)===1439;
 if(reachedShortEnd)endShortCharge(s);
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
 return {minutes:advanced,event:stop.type==='none'&&reachedShortEnd?'short-charge-end':stop.type};
}
export function isTaiConversation(s){const n=s.nav?.current||{};return (n.appId==='noapp'&&(n.route==='/chat/tai'||n.route==='/call'))||(n.appId==='mirage'&&/^\/chat\//.test(n.route)&&/ouroboros/i.test(n.route));}
export function worldMinuteRate(s,{focused=false,taiChat=false}={}){
 // D55: after the 23-second recording actually finishes, 3 game minutes
 // take 9 real seconds. Do not use the normal 90-second NoApp chat pacing.
 if(endingAwaitingReply55(s))return STORY55_NORMAL_MINUTES_PER_MS;
 const normal=isStory55(s)?STORY55_NORMAL_MINUTES_PER_MS:NORMAL_MINUTES_PER_MS;
 return s.deathPhase==='draining'?normal:isShortCharging(s)?SHORT_CHARGE_MINUTES_PER_MS:taiChat?(isStory55(s)?STORY55_CHAT_MINUTES_PER_MS:TAI_CHAT_MINUTES_PER_MS):focused?TYPING_MINUTES_PER_MS:s.powerMode==='charging'?CHARGING_MINUTES_PER_MS:s.powerMode==='sleeping'?SLEEPING_MINUTES_PER_MS:normal;
}
export function tickWorld(s,realMilliseconds,{focused=false,taiChat=false}={}){
 if(secondView55(s)||finaleInProgress55(s)||endingAwaitingVoice55(s))return {minutes:0};
 syncDeathNight(s);
 if(s.dayChargeRemainingMs>0){s.dayChargeRemainingMs=Math.max(0,s.dayChargeRemainingMs-realMilliseconds);return {minutes:0};}
 if(['off','passcode'].includes(s.deathPhase)||s.alarmRinging||s.emergencyCharge)return {minutes:0};
 const rate=worldMinuteRate(s,{focused,taiChat});
 const total=(Number(s.worldMinuteFraction)||0)+Math.max(0,realMilliseconds)*rate;
 // Decimal floating-point can put 2999ms + 1ms just below 1 minute.
 // Account for sub-nanominute rounding without fast-forwarding normal play.
 const whole=Math.floor(total+1e-9);
 if(!whole){s.worldMinuteFraction=total;return {minutes:0};}
 const outcome=advanceGameMinutes(s,whole);
 s.worldMinuteFraction=outcome.event&&outcome.event!=='none'?0:Math.max(0,total-whole);
 return outcome;
}
export function setSleeping(s){
 if(deathLocked(s)||(isStory55(s)?s.day===55:s.day===90)||s.powerMode!=='charging'||s.alarmRinging)return false;
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
