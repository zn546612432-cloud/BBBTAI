import {visibleMessages} from '../../services/messaging/delivery.js';
export const TAI_ID='T.';
export const taiDisplayName=s=>String(s?.aiDraft?.taiRemark||'').trim()||TAI_ID;
// Old saves predate persisted read receipts. A delivered response to an old
// free message, or the next authored story line, is positive read evidence.
export function taiReadIds(s,c){
 const messages=visibleMessages(c,s),read=new Set(),authoredPending=[];
 for(const m of messages){
  if(m.from==='me'){
   if(m.taiReadAt)read.add(m.id);
   if(m.story55)authoredPending.push(m.id);
  }else if(m.from==='tai'){
   if(m.replySourceId)read.add(m.replySourceId);
   if(m.story55){for(const id of authoredPending)read.add(id);authoredPending.length=0;}
  }
 }
 return read;
}
export function markTaiRead(s,sourceId,at=Date.now(),{keepPending=false}={}){
 const c=s.content.conversations.noapp?.find(c=>c.id==='tai');
 const messages=visibleMessages(c||{messages:[]},s),index=messages.findIndex(m=>m.id===sourceId);
 if(index<0)return;
 for(const msg of messages.slice(0,index+1)){
  if(msg.from!=='me'||msg.demo||msg.kind==='call')continue;
  const m=c.messages.find(x=>x.id===msg.id);if(!m)continue;
  m.taiReadAt??=at;
  if(!keepPending||m.id!==sourceId){delete m.taiPending;delete m.taiDeferredGameMinute;delete m.taiDeferredUntil;}
 }
}
