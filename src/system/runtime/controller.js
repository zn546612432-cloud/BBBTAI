import {isStory55,story55Config,nodeStatus} from '../../services/story55/state.js';
import {secondView55,finaleInProgress55,endingAwaitingVoice55} from '../../services/story55/finale.js';
import {deathLocked} from '../power/story.js';
import {drainBattery,tickShortChargeBattery,settleOfflineShortCharge} from '../power/battery.js';
import {tickWorld,worldMinuteRate} from '../time/clock.js';
import {d01Gate} from '../../story/d01/runtime.js';

// Reuse authored readiness and gates. A later deadline (e.g. D24 deployment)
// does not stop earlier days, and waiting for a future mail never stops time.
export function backgroundStoryBlocked(s){
 if(!isStory55(s))return false;
 if(s.story55.activeScene||d01Gate(s))return true;
 const share=s.story55.ghostShare;
 if(share?.phase==='controlling'&&share.remote?.active)return true;
 return story55Config(s).nodes.some(n=>
  (Number.isInteger(n.gateDay)&&n.gateDay<=s.day||n.kind==='scene'&&n.at)
  &&nodeStatus(s,n.id).state==='ready');
}
export function phoneRuntimePaused(s,{hidden=false,background=false,restarting=false,callActive=false}={}){
 return hidden&&!background||restarting||background&&(backgroundStoryBlocked(s)||s.dayChargeRemainingMs>0||callActive)||endingAwaitingVoice55(s)||finaleInProgress55(s)||secondView55(s)
  ||['ringing','connected'].includes(s.phoneCall?.state)||s.story55?.d13?.phase==='green'
  ||['off','passcode'].includes(s.deathPhase)||!!s.alarmRinging||!!s.emergencyCharge||!!s.poweredOff
  ||s.nav.current.appId==='editor'&&!deathLocked(s)&&s.powerMode!=='short-charging';
}
// One entry point for clock, charge and discharge. Message delivery,
// animations and audio keep their real-time schedulers and never use this budget.
export function tickPhoneRuntime(s,frame,options={}){
 if(!frame||phoneRuntimePaused(s,options))return {minutes:0};
 // Background settlement credits real charging once, including blocked time.
 if(s.powerMode==='short-charging'&&!options.background)tickShortChargeBattery(s,frame.elapsedMs);
 const outcome=tickWorld(s,frame.elapsedMs,{...options,elapsedGameMinutes:frame.gameMinutes});
 if(!isStory55(s))drainBattery(s,frame.elapsedMs);
 return outcome;
}

// Reconcile a suspended page through the SAME clock and battery controller.
// Minute checkpoints let the existing story tick release mail/messages at their
// authored times and expose a gate before the next minute can be consumed.
// Unused time at a gate is discarded, never replayed after the player replies.
export function settlePhoneBackground(s,elapsedMs,{now=Date.now(),reconcile=()=>{},...runtimeOptions}={}){
 settleOfflineShortCharge(s,now);
 if(!isStory55(s)||!Number.isFinite(elapsedMs)||elapsedMs<=0)return {minutes:0};
 const options={...runtimeOptions,hidden:true,background:true};
 let remaining=elapsedMs,minutes=0,outcome={minutes:0};
 while(remaining>1e-7&&!phoneRuntimePaused(s,options)){
  const rate=worldMinuteRate(s,options);
  if(rate<=0)break;
  const fraction=Number(s.worldMinuteFraction)||0;
  const step=Math.min(remaining,Math.max(1e-7,(1-fraction)/rate));
  const from={day:s.day,clock:s.clock};
  outcome=tickPhoneRuntime(s,{elapsedMs:step,gameMinutes:step*rate},options);
  remaining=Math.max(0,remaining-step);minutes+=outcome.minutes;
  if(outcome.minutes>0)reconcile(s,from);
  if(outcome.event&&outcome.event!=='none'||outcome.minutes===0&&step<remaining)break;
 }
 return {...outcome,minutes};
}
