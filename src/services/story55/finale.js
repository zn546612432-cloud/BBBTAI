import {isStory55} from './state.js';

// D55 authored chat chronology. The voice bubble is SENT at 22:46;
// Xitai's last call-out is delivered after three game minutes, not on playback.
export const ENDING_CLOCKS=Object.freeze(['21:00','21:00','21:16','21:49','22:25','22:46','22:49']);
export const ENDING_FINAL_REPLY='熙蒙！熙蒙！';
export const ENDING_NEXT_DATE='2025-07-13';
export const FAST_FORWARD_MS=12000;
export const ONE_PERCENT_MS=4000;
export const ZERO_PERCENT_MS=1000;
export const RECHARGE_MS=4000;

const minutes=value=>Number(value.slice(0,2))*60+Number(value.slice(3));
const hhmm=value=>{
 const minute=((Math.floor(value)%1440)+1440)%1440;
 return String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
};
export const secondView55=s=>isStory55(s)&&s.story55?.secondView===true;
export const finalePhase55=s=>isStory55(s)?s.story55?.finalTransition?.phase||null:null;
export const finaleInProgress55=s=>!!finalePhase55(s)&&!secondView55(s);
export const endingReplyDue55=s=>isStory55(s)&&!s.story55.ended
 &&s.story55?.scenes?.ending?.index===6
 &&s.story55?.endingVoiceSent===true
 &&s.day===55&&s.clock>='22:49';

export function stampEnding55(s,index){
 if(!isStory55(s)||s.day!==55)return null;
 const scheduled=ENDING_CLOCKS[index];
 if(!scheduled)return null;
 // Advance to authored time, never wind the user's current clock backwards.
 if(s.clock<scheduled)s.clock=scheduled;
 s.worldMinuteFraction=0;
 return scheduled;
}

export function startFinale55(s,now=Date.now()){
 if(!isStory55(s)||s.story55.finalTransition)return false;
 const start=minutes(s.clock);
 s.story55.finalTransition={phase:'accelerating',startedAt:now,fromMinute:start,
  fromBattery:Math.max(2,Number(s.batteryPercent)||20)};
 s.story55.ended=true;
 s.deathPhase='s55-accelerating';
 s.powerMode='idle';s.poweredOff=false;s.emergencyCharge=false;
 s.alarmRinging=null;s.dayChargeRemainingMs=0;s.worldMinuteFraction=0;
 return true;
}

export function startSecondCharge55(s,now=Date.now()){
 if(!isStory55(s)||s.deathPhase!=='s55-off')return false;
 const t=s.story55.finalTransition;
 if(!t)return false;
 t.phase='charging';t.chargeAt=now;
 s.deathPhase='s55-charging';
 s.batteryPercent=0;
 s.powerMode='charging';
 return true;
}

export function syncSecondClock55(s,now=new Date()){
 if(!secondView55(s))return false;
 const year=now.getFullYear(),month=String(now.getMonth()+1).padStart(2,'0'),day=String(now.getDate()).padStart(2,'0');
 const date=year+'-'+month+'-'+day;
 const clock=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
 const changed=s.realDate!==date||s.clock!==clock||s.batteryPercent!==100;
 s.realDate=date;s.clock=clock;s.batteryPercent=100;
 s.powerMode='idle';s.poweredOff=false;s.emergencyCharge=false;
 return changed;
}

export function tickFinale55(s,now=Date.now()){
 if(!finaleInProgress55(s))return false;
 const t=s.story55.finalTransition,elapsed=Math.max(0,now-t.startedAt);
 if(t.phase==='accelerating'||t.phase==='one-percent'||t.phase==='zero-percent'){
  const fast=Math.min(1,elapsed/FAST_FORWARD_MS);
  const from=t.fromMinute??(22*60+49);
  const to=27*60;
  const total=from+(to-from)*fast;
  s.clock=hhmm(total);
  if(total>=1440)s.story55.finalDate=ENDING_NEXT_DATE;
  s.batteryPercent=Math.max(1,Math.ceil((t.fromBattery-1)*(1-fast)+1));
  if(elapsed>=FAST_FORWARD_MS+ONE_PERCENT_MS+ZERO_PERCENT_MS){
   t.phase='off';s.deathPhase='s55-off';s.batteryPercent=0;s.unlocked=false;
   s.nav.current={appId:'home',route:'/',params:{}};s.nav.stack=[];
  }else if(elapsed>=FAST_FORWARD_MS+ONE_PERCENT_MS){
   t.phase='zero-percent';s.deathPhase='s55-zero-percent';s.batteryPercent=0;
  }else if(elapsed>=FAST_FORWARD_MS){
   t.phase='one-percent';s.deathPhase='s55-one-percent';s.batteryPercent=1;
  }
  return true;
 }
 if(t.phase==='charging'){
  const progress=Math.min(1,Math.max(0,(now-(t.chargeAt??now))/RECHARGE_MS));
  s.batteryPercent=Math.min(100,Math.floor(progress*100));
  if(progress>=1){
   t.phase='complete';s.story55.secondView=true;s.deathPhase='recovered';
   s.unlocked=false;s.powerMode='idle';s.batteryPercent=100;
   s.story55.finalDate=undefined;
   s.nav.current={appId:'home',route:'/',params:{}};s.nav.stack=[];
   syncSecondClock55(s,new Date(now));
  }
  return true;
 }
 return false;
}
