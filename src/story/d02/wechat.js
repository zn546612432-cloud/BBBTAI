import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';
import {LATE_REPLIES} from '../../services/messaging/lifecycle/replies.js';
import {appendAuthoredPhoneMessage} from '../../services/messaging/phone-messages.js';
import {D02_DIALOGUES,D02_BUILD_DIALOGUE} from './dialogue.js';
const DAY=2;
const gameMinute=s=>s.day*1440+Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3));
const chat=(s,id)=>s.content.conversations.wechat?.find(c=>c.id===id||(id==='wang'&&c.name==='熙旺')||(id==='xin'&&c.name==='小辛'));
export function seedD02Wechat(s){
 if(s.story55?.version!==1||s.day<DAY||!s.story55.d02)return false;
 const d=s.story55.d02;
 if(!d.wechat)d.wechat={version:2,wang:{index:0,dueAt:null,completed:false},xin:{index:0,dueAt:null,initialSent:false,completed:false}};
 if(d.wechat.version===2&&d.wechat.migrated)return false;
 // Remove only the old auto-seeded six bubbles per chat, including the
 // fake player messages. Do not touch history, free messages or editor records.
 const deleted=new Set();
 for(const key of ['wang','xin']){
  const c=chat(s,key);if(!c)continue;
  c.messages=c.messages.filter(m=>{
   const legacy=m.storyD02&&new RegExp('^d02-'+key+'-0[1-6]$').test(m.id)&&
    // Protect genuine old player sends even when their IDs overlap the
    // six legacy auto-seeded placeholder IDs.
    (m.from!=='me'&&m.from!=='熙蒙'||m.actual!==true&&m.playerSent!==true&&m.authored!==true);
   if(legacy)deleted.add(m.id);
   return !legacy;
  });
 }
 if(deleted.size){
  for(const n of s.notifications||[]){
   if(deleted.has(n.messageId)){
    const c=s.content.conversations.wechat?.find(c=>c.id===n.conversationId);
    if(c)c.unread=Math.max(0,(Number(c.unread)||0)-1);
   }
  }
  s.notifications=s.notifications.filter(n=>!deleted.has(n.messageId));
  s.events=(s.events||[]).filter(e=>!deleted.has(e.messageId));
 }
 d.wechat.migrated=true;
 return true;
}

// The nine approved Xiao Xin bubbles are a single player-driven exchange.
// Keep the original unsent turns playable after midnight instead of converting
// them into the short late-reply branch. This also repairs older save states.
function restoreXiaoXinDialogue(s,q){
 if(s.day!==3||q.completed)return;
 const c=chat(s,'xin');
 if(!c)return;
 if(q.historySettled){
  // Never interrupt an already-sent late reply's pending NPC response.
  if(q.lateRun&&!q.lateHandled)return;
  q.historySettled=false;q.lateHandled=false;q.skipped=false;
  delete q.lateRun;
  q.nextAt=null;q.dueAt=null;q.awaitingPlayer=true;
  q.status='waiting';
  q.originalDialogueRestored=true;
 }
 if(q.started)return;
 // A fast-forwarded D02 should retain the actual 16:08 incoming message,
 // not deliver it as a new D03 text. Never manufacture a player bubble.
 if(!c.messages?.some(m=>m.id==='d02-xin-script-0')){
  appendAuthoredPhoneMessage(s,{
   channel:'wechat',conversationId:c.id,messageId:'d02-xin-script-0',
   from:'小辛',text:D02_DIALOGUES.xin[0][1],day:2,clock:'16:08',
   sentDate:'2025-05-20',storyTag:'storyD02',lifecycleId:'d02:xin',
   silent:true,notify:false
  });
 }
 q.started=true;q.startedClock='16:08';q.initialSent=true;
 q.index=Math.max(1,q.index||0);
 q.nextAt=null;q.dueAt=null;q.awaitingPlayer=true;q.status='waiting';
}

const specs=['wang','xin'].map(key=>({id:key,chat:key,
 at:(s,q)=>q?.startedClock|| (key==='wang'?(s.day===2&&Number.isFinite(s.story55?.d02?.wechat?.earlyAt)?s.clock:'12:16'):s.day===2&&Number.isFinite(s.story55?.d02?.wechat?.earlyAt)&&gameMinute(s)>=s.story55.d02.wechat.earlyAt+15?s.clock:'16:08'),
 // Xiao Xin's optional shopping advice is still a required *conversation* once
 // his opening text exists; only the player may send the three protagonist lines.
 ...(key==='xin'?{mandatory:true,endWhen:s=>s.day>=4,migrate:restoreXiaoXinDialogue}:{}),
 initialDelayMs:key==='xin'?0:450,
 pauseMs:(s,q)=>q.index>0&&D02_DIALOGUES[key][q.index-1]?.[0]!=='me'?2200:1800,
 enabled:s=>key==='wang'||s.day>2||s.clock>='16:08'||Number.isFinite(s.story55?.d02?.wechat?.earlyAt)&&gameMinute(s)>=s.story55.d02.wechat.earlyAt+15,
 lines:D02_DIALOGUES[key].map(([who,text])=>({who,text})),
 messageId:(s,i)=>'d02-'+key+'-script-'+i,
 replies:LATE_REPLIES.d02[key],resolved:key==='wang'?s=>!!s.story55?.d02?.purchased?.length:undefined,
 onStart:(s,q)=>{if(key==='xin')q.initialSent=true;},
 onComplete:(s,q)=>{q.completedAt=gameMinute(s);}
}));
specs.push({
 id:'newpc',chat:'group',optional:true,mandatory:true,
 at:s=>s.story55.d02.buildReadyClock||'08:00',
 condition:s=>!!s.story55.d02.buildReady&&!s.story55.d02.buildCelebrated,
 lines:D02_BUILD_DIALOGUE.map(([who,text])=>({who,text})),
 messageId:(s,i)=>'d02-newpc-group-'+i,
 onComplete:s=>{s.story55.d02.buildCelebrated=true;}
});
export const d02Track=createConversationTrack({day:2,prefix:'d02',scenes:specs,invalidReplyText:'请发送输入框里完整的预设台词',
 progress:s=>{s.story55.d02??={};s.story55.d02.wechat??={version:2};return s.story55.d02.wechat;},
 chatId:(s,d)=>chat(s,d.chat)?.id||d.chat
});
export const d02Draft=d02Track.draft;
export const d02ComposerDisabled=d02Track.disabled;
export const sendD02WeChat=d02Track.send;
export const d02WeChatDue=d02Track.due;
export const tickD02Wechat=d02Track.tick;
