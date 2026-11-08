import {isStory55} from '../../services/story55/state.js';
import {PHONE_RUNTIME_POLICY} from '../runtime/policy.js';
import {closeD01WeChat} from '../../story/d01/wechat.js';
import {chargingBlock,shortChargeBlock,deathLocked,syncDeathNight,phoneBlocked} from './story.js';
import {secondView55} from '../../services/story55/finale.js';
// Story55 discharge follows the accepted game minutes, never a second real-time timer.
// From 08:00 at 100%, ordinary use reaches 20% around 23:00.
export const LOW_BATTERY_PERCENT=20;
export const SHORT_CHARGE_MAX_GAIN=PHONE_RUNTIME_POLICY.shortChargeMaxGain;
export const SHORT_CHARGE_FILL_MS=PHONE_RUNTIME_POLICY.shortChargeFillMs;
export const isShortCharging=s=>s?.powerMode==='short-charging';
// Persist actual percentage points gained per story day. Unplugging/reloading
// never grants a fresh 10%, including after a developer jumps back in time.
export const shortChargeGainToday=s=>Math.max(0,Math.min(SHORT_CHARGE_MAX_GAIN,Number(s?.shortChargeGains?.[String(s?.day)])||0));
export const shortChargeStoryInterrupted=s=>isShortCharging(s)&&!!(shortChargeBlock(s)||s?.story55?.activeScene||s?.story55?.ended);
export const BATTERY_DRAIN_INTERVAL_MS=1_125_000/80;
export const batteryPercent=s=>Number.isFinite(Number(s.batteryPercent))?Math.max(0,Math.min(100,Math.round(Number(s.batteryPercent)))):82;
export const needsCharge=s=>batteryPercent(s)<=LOW_BATTERY_PERCENT;
// Lazy migration retains the displayed percentage and the old partial point.
// Never recalculate a loaded battery from its clock/date or award charge on rewind.
export function drainGameBattery(s,minutes){
 if(!isStory55(s)||!Number.isFinite(minutes)||minutes<=0||secondView55(s)||deathLocked(s)||s.dayChargeRemainingMs>0||s.emergencyCharge||s.poweredOff||['charging','sleeping','short-charging'].includes(s.powerMode))return 0;
 const unit=PHONE_RUNTIME_POLICY.batteryGameMinutesPerPoint;
 if(s.powerClockVersion!==PHONE_RUNTIME_POLICY.version){
  const old=Number.isFinite(s.powerActiveMs)?Math.max(0,s.powerActiveMs)%BATTERY_DRAIN_INTERVAL_MS:0;
  s.powerGameMinuteFraction=old/BATTERY_DRAIN_INTERVAL_MS*unit;
  s.powerClockVersion=PHONE_RUNTIME_POLICY.version;s.powerActiveMs=0;
 }
 const saved=Number.isFinite(s.powerGameMinuteFraction)?Math.max(0,s.powerGameMinuteFraction):0;
 const total=saved+minutes,points=Math.floor(total/unit+1e-9),before=batteryPercent(s);
 s.powerGameMinuteFraction=Math.max(0,total-points*unit);
 // A story protection floor must never increase an already lower saved battery.
 s.batteryPercent=Math.min(before,Math.max(chargingBlock(s)?20:2,before-points));
 return before-s.batteryPercent;
}
export function drainBattery(s,ms){
 // All Story55 callers settle inside advanceGameMinutes; prevent double debit.
 if(isStory55(s))return 0;
 if(secondView55(s)||deathLocked(s)||s.dayChargeRemainingMs>0)return 0;
 if(!Number.isFinite(ms)||ms<=0||s.powerMode==='charging'||s.powerMode==='sleeping'||isShortCharging(s)||s.emergencyCharge)return 0;
 const before=batteryPercent(s),saved=Number.isFinite(s.powerActiveMs)?Math.max(0,s.powerActiveMs):0;
 const total=saved+ms,points=Math.floor(total/BATTERY_DRAIN_INTERVAL_MS);
 s.powerActiveMs=total%BATTERY_DRAIN_INTERVAL_MS;
 // The forced 1% state belongs to the 03:00 clock boundary, not elapsed
 // foreground time (which can differ while someone is typing).
 s.batteryPercent=Math.max(chargingBlock(s)?20:2,before-points);
 return before-s.batteryPercent;
}
export const canShortCharge=s=>!!s&&!phoneBlocked(s)&&!shortChargeBlock(s)&&!s.story55?.activeScene&&!['charging','short-charging','sleeping'].includes(s.powerMode);
export const canCharge=s=>!!s&&!phoneBlocked(s)&&!chargingBlock(s)&&!s.story55?.activeScene&&s.powerMode!=='charging'&&s.powerMode!=='short-charging'&&s.powerMode!=='sleeping';
// Short charge respects the original wet-port/story gate for BOTH modes.
export function beginShortCharge(s,now=Date.now()){
 if(!canShortCharge(s)||s.emergencyCharge||s.poweredOff||s.story55?.ended||(s.story55?.version===1&&(s.day===55||s.day===1&&s.story55?.d01?.nightAfterMidnight))||s.clock==='23:59')return false;
 s.powerMode='short-charging';
 s.shortCharge={startPercent:batteryPercent(s),elapsedMs:0,credited:0,lastAccruedAt:now};
 s.shortChargeGains??={};
 s.worldMinuteFraction=0;
 return true;
}
export function endShortCharge(s){
 if(!isShortCharging(s))return false;
 s.powerMode='idle';s.shortCharge=null;s.worldMinuteFraction=0;
 return true;
}
// Charge for one real minute, but credit no more than the unused allowance
// for this GAME day. When full, stay connected and keep any time acceleration.
export function tickShortChargeBattery(s,elapsedMs,now=Date.now()){
 if(!isShortCharging(s)||!s.shortCharge||!Number.isFinite(elapsedMs)||elapsedMs<=0)return 0;
 const session=s.shortCharge;
 s.shortChargeGains??={};
 // Migration: a saved short session from the previous preview already
 // consumed some of the quota, even without a ledger yet.
 if(!Number.isFinite(Number(session.credited))){
  session.credited=Math.max(0,Math.min(SHORT_CHARGE_MAX_GAIN,batteryPercent(s)-Number(session.startPercent||0)));
  s.shortChargeGains[String(s.day)]=Math.max(shortChargeGainToday(s),session.credited);
 }
 session.lastAccruedAt=now;
 session.elapsedMs=Math.min(SHORT_CHARGE_FILL_MS,Math.max(0,Number(session.elapsedMs)||0)+elapsedMs);
 const potential=Math.floor(session.elapsedMs*SHORT_CHARGE_MAX_GAIN/SHORT_CHARGE_FILL_MS+1e-9);
 const available=Math.max(0,SHORT_CHARGE_MAX_GAIN-shortChargeGainToday(s));
 const gain=Math.max(0,Math.min(potential-session.credited,available,100-batteryPercent(s)));
 if(gain>0){
  s.batteryPercent=batteryPercent(s)+gain;
  session.credited+=gain;
  s.shortChargeGains[String(s.day)]=shortChargeGainToday(s)+gain;
 }
 return gain;
}
// Resuming a background tab or reopening a closed browser credits only
// real charging time, never lost game minutes or a missed story event.
export function settleOfflineShortCharge(s,now=Date.now()){
 if(!isShortCharging(s)||!s.shortCharge)return 0;
 const last=Number(s.shortCharge.lastAccruedAt);
 if(!Number.isFinite(last)||last<=0){s.shortCharge.lastAccruedAt=now;return 0;}
 if(now<=last)return 0;
 return tickShortChargeBattery(s,Math.min(SHORT_CHARGE_FILL_MS,now-last),now);
}
export function plugIn(s){
 if(!canCharge(s))return false;
 // Midnight already advanced the civil date. Charging at 03:00 wakes on
 // that same date; charging before midnight starts the next date.
 if(s.story55?.version===1&&s.day===1){closeD01WeChat(s);s.day=2;s.story55.d01.nightAfterMidnight=false;}
 else if(Number(s.clock.slice(0,2))>=8)s.day+=1;
 s.clock='08:00';s.batteryPercent=100;s.dayChargeRemainingMs=1200;s.shortCharge=null;
 s.powerMode='idle';s.emergencyCharge=false;s.poweredOff=false;s.powerActiveMs=0;s.powerGameMinuteFraction=0;s.powerClockVersion=PHONE_RUNTIME_POLICY.version;s.worldMinuteFraction=0;s.chargeFraction=0;
 s.sleepWakeAt=null;s.alarmRinging=null;s.unlocked=false;s.nav.stack=[];s.nav.current={appId:'home',route:'/',params:{}};
 syncDeathNight(s);
 return true;
}
export function unplug(s){
 if(isShortCharging(s))return endShortCharge(s);
 if(phoneBlocked(s)||chargingBlock(s)||s.powerMode!=='charging'||s.batteryPercent<=1)return false;
 s.powerMode='idle';s.sleepWakeAt=null;s.chargeFraction=0;s.worldMinuteFraction=0;
 return true;
}
