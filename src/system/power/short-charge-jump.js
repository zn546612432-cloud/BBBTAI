import {nextStoryEventClock55} from '../../services/story55/state.js';
import {advanceGameMinutes,clockMinutes} from '../time/clock.js';
import {beginShortCharge,endShortCharge,isShortCharging,tickShortChargeBattery,SHORT_CHARGE_FILL_MS} from './battery.js';
import {tickStory55} from '../../services/story55/runtime.js';
import {deliverMissedScheduled} from '../../story/presets/engine.js';

// One explicit cheat action; never assign the game date or clock.
export function jumpShortChargeToNextEvent(s){
 if(s.editor?.cheatMode!==true)return {ok:false,reason:'disabled'};
 const target=nextStoryEventClock55(s);
 if(!target)return {ok:false,reason:'no-event'};
 const startedShort=isShortCharging(s),from={day:s.day,clock:s.clock};
 if(!startedShort&&!beginShortCharge(s))return {ok:false,reason:'blocked'};
 const outcome=advanceGameMinutes(s,clockMinutes(target)-clockMinutes(from.clock));
 if(outcome.minutes<=0){if(!startedShort)endShortCharge(s);return {ok:false,reason:'blocked'};}
 tickShortChargeBattery(s,SHORT_CHARGE_FILL_MS);
 endShortCharge(s);
 tickStory55(s);
 deliverMissedScheduled(s,from);
 return {ok:true,clock:s.clock,event:outcome.event};
}
