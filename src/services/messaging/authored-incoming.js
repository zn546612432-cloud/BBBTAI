// Shared incoming-event bookkeeping for hand-authored in-game conversations.
// Each delivered NPC bubble is one real unread message, not one "scene".
// The visual notification banner is queued separately by the phone shell.
import {isConversationOpen} from './conversation-open.js';

export function deliverAuthoredIncoming(s,{
 channel='wechat',conversationId,from,text,kind='text',messageId,day=s.day,clock=s.clock,
 notificationId=null,title=null,body=null,demo=null
}){
 if(from==='me'||!messageId)return false;
 const c=s.content?.conversations?.[channel]?.find(item=>item.id===conversationId);
 if(!c||isConversationOpen(s,channel,conversationId))return false;
 const id=notificationId||'authored-'+channel+'-'+messageId;
 // Replays and restored timeline ticks never count twice.
 if(s.notifications.some(n=>n.id===id))return false;
 c.unread=Math.max(0,Number(c.unread)||0)+1;
 const who=String(from||c.name||'');
 s.notifications.unshift({
  id,messageId,conversationId,day,clock,
  title:title|| (channel==='wechat'&&(c.group||conversationId==='group')
   ?(c.name||'狼崽團')+' · '+who:(c.name||who)),
  body:body??(kind==='image'?'[圖片]':String(text||'')),
  ...(demo!==null?{demo:!!demo}:{}),
  link:{appId:channel,route:'/chat/'+conversationId,params:{}}
 });
 return true;
}
