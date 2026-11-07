import {isStory55} from '../../services/story55/state.js';
import {secondView55,finaleInProgress55,endingAwaitingVoice55} from '../../services/story55/finale.js';
import {deathLocked} from '../power/story.js';
import {drainBattery,tickShortChargeBattery} from '../power/battery.js';
import {tickWorld} from '../time/clock.js';

export function phoneRuntimePaused(s,{hidden=false,restarting=false}={}){
 return hidden||restarting||endingAwaitingVoice55(s)||finaleInProgress55(s)||secondView55(s)
  ||['ringing','connected'].includes(s.phoneCall?.state)||s.story55?.d13?.phase==='green'
  ||['off','passcode'].includes(s.deathPhase)||!!s.alarmRinging||!!s.emergencyCharge||!!s.poweredOff
  ||s.nav.current.appId==='editor'&&!deathLocked(s)&&s.powerMode!=='short-charging';
}
// One entry point for foreground clock, charge and discharge. Message delivery,
// animations and audio keep their real-time schedulers and never use this budget.
export function tickPhoneRuntime(s,frame,options={}){
 if(!frame||phoneRuntimePaused(s,options))return {minutes:0};
 if(s.powerMode==='short-charging')tickShortChargeBattery(s,frame.elapsedMs);
 const outcome=tickWorld(s,frame.elapsedMs,{...options,elapsedGameMinutes:frame.gameMinutes});
 if(!isStory55(s))drainBattery(s,frame.elapsedMs);
 return outcome;
}
