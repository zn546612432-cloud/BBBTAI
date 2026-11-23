import {nextStoryEventClock55} from '../../services/story55/state.js';
import {nextAuthoredChatBoundary} from '../../services/messaging/lifecycle/registry.js';
import {isFriendsTest} from '../runtime/friends-test.js';
import {advanceGameMinutes,clockMinutes} from '../time/clock.js';
import {beginShortCharge,endShortCharge,isShortCharging,tickShortChargeBattery,SHORT_CHARGE_FILL_MS} from './battery.js';
import {tickStory55} from '../../services/story55/runtime.js';
import {deliverMissedScheduled} from '../../story/presets/engine.js';

// One explicit cheat action; never assign the game date or clock.
export function jumpShortChargeToNextEvent(s,{includeAuthoredChats=isFriendsTest}={}){
 if(s.editor?.cheatMode!==true)return {ok:false,reason:'disabled'};
 const chat=includeAuthoredChats?nextAuthoredChatBoundary(s):null;
 if(chat?.kind==='reply')return {ok:false,reason:'pending-reply',channel:chat.channel,conversationId:chat.conversationId};
 if(chat?.kind==='delivering')return {ok:false,reason:'chat-delivering',channel:chat.channel,conversationId:chat.conversationId};
 const story=nextStoryEventClock55(s);
 const target=chat?.kind==='upcoming'&&(!story||clockMinutes(chat.clock)<clockMinutes(story))?chat.clock:story;
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
