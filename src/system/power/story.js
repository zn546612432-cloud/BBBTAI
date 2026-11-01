import {isStory55,story55ChargeGate} from '../../services/story55/state.js';
import {secondView55,finaleInProgress55,syncSecondClock55} from '../../services/story55/finale.js';
// One durable state machine owns the death-night boundaries, including reloads.
export const DEATH_DAY=90;
export const DEATH_START=90*1440-1; // D90 23:59
export const DEATH_END=90*1440+180; // D91 03:00
export const storyMinute=s=>(s.day-1)*1440+Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3));
export const deathLocked=s=>['draining','off','passcode','s55-accelerating','s55-one-percent','s55-zero-percent','s55-off','s55-charging'].includes(s.deathPhase);
export const phoneBlocked=s=>deathLocked(s)||(s.dayChargeRemainingMs||0)>0;

export function syncDeathNight(s){
 if(isStory55(s)){
  s.day=Math.min(55,s.day);
  // Recover old D55 saves previously stranded in an immediate 'off' phase.
  // Preserve already-recovered saves and all authored phone content.
  if(s.story55?.ended&&!s.story55?.finalTransition){
   if(s.deathPhase==='recovered'){
    s.story55.finalTransition={phase:'complete',startedAt:Date.now()};
    s.story55.secondView=true;syncSecondClock55(s);
   }else{
    s.story55.finalTransition={phase:'off',startedAt:Date.now()-17000,fromMinute:22*60+49,fromBattery:20};
    s.deathPhase='s55-off';s.batteryPercent=0;s.unlocked=false;
    s.nav.current={appId:'home',route:'/',params:{}};s.nav.stack=[];
   }
  }
  if(secondView55(s)){s.deathPhase='recovered';s.batteryPercent=100;return;}
  if(finaleInProgress55(s))return;
  if(s.story55.ended&&s.deathPhase!=='recovered'){
   s.day=55;s.batteryPercent=1;s.unlocked=false;
   if(s.deathPhase!=='passcode')s.deathPhase='off';
  }
  return;
 }
 if(s.deathPhase==='recovered'||s.day<DEATH_DAY)return;
 s.powerMode='idle';s.sleepWakeAt=null;s.emergencyCharge=false;s.poweredOff=false;
 const at=storyMinute(s);
 if(at<DEATH_START){s.batteryPercent=Math.max(20,s.batteryPercent??20);return;}
 s.alarmRinging=null;s.dayChargeRemainingMs=0;
 if(at<DEATH_END){
  s.deathPhase='draining';
  s.batteryPercent=20-Math.floor(19*(at-DEATH_START)/(DEATH_END-DEATH_START));
 }else{
  s.day=91;s.clock='03:00';s.batteryPercent=1;
  if(s.deathPhase!=='passcode')s.deathPhase='off';
  s.unlocked=false;s.nav.stack=[];s.nav.current={appId:'home',route:'/',params:{}};
 }
}

export function chargingBlock(s){
 if(isStory55(s))return story55ChargeGate(s);
 if(s.day===DEATH_DAY||deathLocked(s))return 'death';
 const flags=s.storyPresets?.flags||[];
 const gate=(s.storyChargeGates||[]).find(g=>g.day===s.day&&!flags.includes(g.untilFlag));
 return gate?'plot':null;
}

export function recoverPhone(s,code){
 if(s.deathPhase!=='passcode'||code!=='6180')return false;
 s.deathPhase='recovered';s.powerMode='charging';s.poweredOff=false;s.emergencyCharge=false;
 s.powerActiveMs=0;s.worldMinuteFraction=0;s.chargeFraction=0;s.unlocked=true;
 s.nav.stack=[];s.nav.current={appId:'home',route:'/',params:{}};
 return true;
}
