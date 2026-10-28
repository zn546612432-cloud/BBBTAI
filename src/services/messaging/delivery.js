import {actorName} from '../../editor/conversations/model.js';
export const visibleMessages=c=>c.messages.filter(m=>!m.schedule||m.schedule.mode==='immediate'||m.delivery);
export function isConversationOpen(s,channel,id){return s.unlocked&&s.nav.current.appId===channel&&s.nav.current.route==='/chat/'+id;}
const enabled=(s,channel)=>channel!=='noapp'||s.day>=56;
export class MessageDelivery {
 constructor(store){this.store=store;this.waiting=new Map();}
 tick(now=Date.now(),pageVisible=true){
  const s=this.store.get(),due=[],waiting=new Map();
  if(s.unlocked&&s.nav.current.appId==='editor'){this.waiting.clear();return [];}
  for(const [channel,list] of Object.entries(s.content.conversations)){
   if(!enabled(s,channel))continue;
   for(const c of list)for(const m of c.messages){
    const schedule=m.schedule;if(!schedule||schedule.mode==='immediate'||m.delivery)continue;
    let ready=false;
    if(schedule.mode==='game-time')ready=s.day>schedule.day||(s.day===schedule.day&&s.clock>=schedule.clock);
    if(schedule.mode==='chat-delay'&&pageVisible&&isConversationOpen(s,channel,c.id)){
     const key=JSON.stringify([channel,c.id,m.id,schedule,m.deliveryRevision||0]),start=this.waiting.get(key)??now;
     waiting.set(key,start);ready=now-start>=schedule.seconds*1000;
    }
    if(ready)due.push({channel,conversationId:c.id,id:m.id,title:(c.id==='group'||c.group)?`${c.name} · ${actorName(c,m.from)}`:c.name,body:m.kind==='image'?'[图片]':m.kind==='app_invitation'?'[国际象棋邀请]':m.text,from:m.from});
   }
  }
  this.waiting=waiting;if(!due.length)return [];
  this.store.update(next=>{for(const item of due){
   const c=next.content.conversations[item.channel]?.find(c=>c.id===item.conversationId),m=c?.messages.find(m=>m.id===item.id);if(!m||m.delivery)continue;
   // Fast-forward can cross several authored timestamps in one tick. Keep the
   // original delivery time in the chat history even if it was observed later.
   const at=m.schedule?.mode==='game-time'?{day:m.schedule.day,clock:m.schedule.clock}:{day:next.day,clock:next.clock};
   m.delivery=at;
   if(item.from!=='me'&&!isConversationOpen(next,item.channel,c.id)){
    c.unread=Math.max(0,Number(c.unread)||0)+1;
    next.notifications.unshift({id:`message-${item.channel}-${c.id}-${m.id}`,messageId:m.id,conversationId:c.id,title:item.title,body:item.body,link:{appId:item.channel,route:'/chat/'+c.id,params:{}},demo:!!m.demo});
   }
   next.events.push({type:'authored_message_delivered',channel:item.channel,conversationId:c.id,messageId:m.id,day:at.day,clock:at.clock});
  }});
  return due;
 }
}
