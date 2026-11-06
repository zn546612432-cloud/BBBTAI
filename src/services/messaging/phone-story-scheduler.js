// One coordination path for authored WeChat messages and generic missed replies.
// Game time determines story relevance; real time only spaces incoming bubbles.
import {tickD01WeChat,d01WeChatDue} from '../../story/d01/wechat.js';
import {AUTHORED_CHAT_TRACKS} from './lifecycle/registry.js';
import {tickGenericMissedReplies,genericMissedRepliesDue} from './lifecycle/missed-replies.js';

const tracks=[
 {name:'D01',day:1,tick:tickD01WeChat,due:d01WeChatDue,carryForward:true},
 ...AUTHORED_CHAT_TRACKS.map(({name,track})=>({
  name,day:track.day,tick:track.tick,due:track.due,carryForward:true
 }))
];
export const PHONE_CHAT_TRACKS=tracks.map(({name,day,carryForward})=>({name,day,carryForward:!!carryForward}));

export function tickPhoneStoryMessages(s,now=Date.now(),{dueOnly=false}={}){
 if(s.story55?.version!==1)return false;
 let changed=false;
 for(const track of tracks){
  if(s.day!==track.day&&!(track.carryForward&&s.day>track.day))continue;
  if(dueOnly&&!track.due(s,now))continue;
  changed=!!track.tick(s,now)||changed;
 }
 if(!dueOnly||genericMissedRepliesDue(s,now))
  changed=!!tickGenericMissedReplies(s,now)||changed;
 return changed;
}

export function phoneStoryMessagesDue(s,now=Date.now()){
 if(s.story55?.version!==1)return false;
 return tracks.some(track=>
  (s.day===track.day||(track.carryForward&&s.day>track.day))&&track.due(s,now)
 )||genericMissedRepliesDue(s,now);
}
