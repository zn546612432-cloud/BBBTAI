import {closeD01WeChat} from '../../story/d01/wechat.js';
import {chargingBlock,deathLocked,syncDeathNight,phoneBlocked} from './story.js';
import {secondView55} from '../../services/story55/finale.js';
// Battery and civil game clock evolve independently.
// From 08:00 at 100%, ordinary use reaches 20% around 23:00.
export const LOW_BATTERY_PERCENT=20;
export const SHORT_CHARGE_MAX_GAIN=10;
export const SHORT_CHARGE_FILL_MS=60_000;
export const isShortCharging=s=>s?.powerMode==='short-charging';
export const BATTERY_DRAIN_INTERVAL_MS=1_125_000/80;
export const batteryPercent=s=>Number.isFinite(Number(s.batteryPercent))?Math.max(0,Math.min(100,Math.round(Number(s.batteryPercent)))):82;
export const needsCharge=s=>batteryPercent(s)<=LOW_BATTERY_PERCENT;
export function drainBattery(s,ms){
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
export const canCharge=s=>!!s&&!phoneBlocked(s)&&!chargingBlock(s)&&s.powerMode!=='charging'&&s.powerMode!=='short-charging'&&s.powerMode!=='sleeping';
// The phone stays usable while short charging. At most +10% per session
// arrives gradually over the first real minute; time continues accelerating.
export function beginShortCharge(s){
 // Plot gates prevent skipping to tomorrow, not fast-forwarding WITHIN today.
 if(!s||phoneBlocked(s)||deathLocked(s)||secondView55(s)||chargingBlock(s)==='death'||s.powerMode!=='idle'||s.emergencyCharge||s.poweredOff||s.story55?.ended||(s.story55?.version===1&&(s.day===55||s.day===1&&s.story55?.d01?.nightAfterMidnight))||s.clock==='23:59')return false;
 s.powerMode='short-charging';s.shortCharge={startPercent:batteryPercent(s),elapsedMs:0};
 s.worldMinuteFraction=0;
 return true;
}
export function endShortCharge(s){
 if(!isShortCharging(s))return false;
 s.powerMode='idle';s.shortCharge=null;s.worldMinuteFraction=0;
 return true;
}
export function tickShortChargeBattery(s,elapsedMs){
 if(!isShortCharging(s)||!s.shortCharge||!Number.isFinite(elapsedMs)||elapsedMs<=0)return 0;
 const session=s.shortCharge;
 session.elapsedMs=Math.min(SHORT_CHARGE_FILL_MS,Math.max(0,Number(session.elapsedMs)||0)+elapsedMs);
 const before=batteryPercent(s);
 const points=Math.floor(session.elapsedMs*SHORT_CHARGE_MAX_GAIN/SHORT_CHARGE_FILL_MS+1e-9);
 s.batteryPercent=Math.min(100,Math.max(before,session.startPercent+points));
 return s.batteryPercent-before;
}
export function plugIn(s){
 if(!canCharge(s))return false;
 // Midnight already advanced the civil date. Charging at 03:00 wakes on
 // that same date; charging before midnight starts the next date.
 if(s.story55?.version===1&&s.day===1){closeD01WeChat(s);s.day=2;s.story55.d01.nightAfterMidnight=false;}
 else if(Number(s.clock.slice(0,2))>=8)s.day+=1;
 s.clock='08:00';s.batteryPercent=100;s.dayChargeRemainingMs=1200;s.shortCharge=null;
 s.powerMode='idle';s.emergencyCharge=false;s.poweredOff=false;s.powerActiveMs=0;s.worldMinuteFraction=0;s.chargeFraction=0;
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
