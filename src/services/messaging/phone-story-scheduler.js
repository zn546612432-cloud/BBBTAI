// One coordination path for authored WeChat messages and generic missed replies.
// Game time determines story relevance; real time only spaces incoming bubbles.
import {tickD01WeChat,d01WeChatDue} from '../../story/d01/wechat.js';
import {AUTHORED_CHAT_TRACKS} from './lifecycle/registry.js';
import {tickGenericMissedReplies,genericMissedRepliesDue} from './lifecycle/missed-replies.js';
import {reviseDeliveredStoryCopy} from './lifecycle/copy-revision.js';

const tracks=[
 {name:'D01',day:1,tick:tickD01WeChat,due:d01WeChatDue,carryForward:true},
 ...AUTHORED_CHAT_TRACKS.map(({name,track,tick})=>({
  name,day:track.day,tick:tick||track.tick,due:track.due,carryForward:true
 }))
];
export const PHONE_CHAT_TRACKS=tracks.map(({name,day,carryForward})=>({name,day,carryForward:!!carryForward}));

// One-time authored-content migration. Only retired D03-D06 Hu Feng scripts
// are removed; private free text, pre-D01 history, money and other chats remain.
function retireHuFengPlot(s){
 if(s.story55?.legacyHuFengPlotRetired)return false;
 const retired=/^(?:d03-hufeng-|d04-hufeng-(?:am|pm)-|d05-hufeng-check-|d06-shoes-|wish-shoes-)/;
 const chats=s.content?.conversations?.wechat||[];
 const c=chats.find(x=>x.id==='hufeng');
 let changed=false;
 if(c?.messages?.length){
  const removed=c.messages.filter(m=>retired.test(String(m.id||'')));
  if(removed.length){
   c.messages=c.messages.filter(m=>!retired.test(String(m.id||'')));
   c.unread=Math.max(0,(Number(c.unread)||0)-removed.filter(m=>m.from!=='me'&&!m.historical).length);
   changed=true;
  }
 }
 const before=s.notifications?.length||0;
 if(s.notifications)s.notifications=s.notifications.filter(n=>!retired.test(String(n.messageId||'')));
 if((s.notifications?.length||0)!==before)changed=true;
 const oldEvents=s.events?.length||0;
 if(s.events)s.events=s.events.filter(e=>!retired.test(String(e.messageId||'')));
 if((s.events?.length||0)!==oldEvents)changed=true;
 s.story55.legacyHuFengPlotRetired=true;
 return true;
}

export function tickPhoneStoryMessages(s,now=Date.now(),{dueOnly=false}={}){
 if(s.story55?.version!==1)return false;
 let changed=retireHuFengPlot(s);
 changed=reviseDeliveredStoryCopy(s)||changed;
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
