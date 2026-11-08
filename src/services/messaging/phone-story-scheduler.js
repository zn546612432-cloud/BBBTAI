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
 const c=s.content?.conversations?.wechat?.find(x=>x.id==='hufeng');
 // Old plot bubbles are NPC-authored only. Never delete a real player's
 // message, a historical (pre-D01) message, or an unrelated free-chat entry.
 const retiredNpc=m=>retired.test(String(m.id||''))&&m.from!=='me'&&m.from!=='熙蒙'&&
  !(typeof m.sentDate==='string'&&m.sentDate<'2025-05-19');
 const removed=(c?.messages||[]).filter(retiredNpc);
 if(removed.length){
  s.story55.contentArchives??=[];
  for(const m of removed)s.story55.contentArchives.push({
   id:m.id,channel:'wechat',conversationId:'hufeng',
   revision:'retired-hufeng-npc-plot',original:structuredClone(m)
  });
  const removedIds=new Set(removed.map(m=>m.id));
  c.messages=c.messages.filter(m=>!retiredNpc(m));
  c.unread=Math.max(0,(Number(c.unread)||0)-removed.filter(m=>!m.historical).length);
  s.notifications=(s.notifications||[]).filter(n=>!(n.conversationId==='hufeng'&&removedIds.has(n.messageId)));
  s.events=(s.events||[]).filter(e=>!(e.conversationId==='hufeng'&&removedIds.has(e.messageId)));
 }
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
