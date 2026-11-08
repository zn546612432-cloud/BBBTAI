import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';
import {LATE_REPLIES} from '../../services/messaging/lifecycle/replies.js';
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
    // Old seed-only placeholders have no genuine player Send receipt.
    // Legacy IDs can also belong to actual user messages: protect those.
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

const specs=['wang','xin'].map(key=>({id:key,chat:key,
 at:(s,q)=>q?.startedClock|| (key==='wang'?(s.day===2&&Number.isFinite(s.story55?.d02?.wechat?.earlyAt)?s.clock:'12:16'):s.day===2&&Number.isFinite(s.story55?.d02?.wechat?.earlyAt)&&gameMinute(s)>=s.story55.d02.wechat.earlyAt+15?s.clock:'16:08'),
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
).test(m.id)&&
    // Original seed-only placeholders lack an actual player Send receipt.
    // Older legitimate user sends sometimes share these legacy IDs: preserve
    // any marked actual/player-authored line, even if its copy is outdated.
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

const specs=['wang','xin'].map(key=>({id:key,chat:key,
 at:(s,q)=>q?.startedClock|| (key==='wang'?(s.day===2&&Number.isFinite(s.story55?.d02?.wechat?.earlyAt)?s.clock:'12:16'):s.day===2&&Number.isFinite(s.story55?.d02?.wechat?.earlyAt)&&gameMinute(s)>=s.story55.d02.wechat.earlyAt+15?s.clock:'16:08'),
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
