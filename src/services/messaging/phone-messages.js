// ONE write path for authored phone messages across D01-D55.
// Story files own words and timing. This module owns persistence, read state,
// unread increments and the notification event. No authored reply is sent
// by the scheduler; 'me' can be committed only on an explicit user action.
import {deliverAuthoredIncoming} from './authored-incoming.js';

export function appendAuthoredPhoneMessage(s,{
 channel='wechat',conversationId,messageId,from,text,kind='text',
 day=s.day,clock=s.clock,sentDate,storyTag,notify=true
}){
 if(!messageId||!conversationId||typeof from!=='string'||typeof text!=='string')return null;
 const conversation=s.content?.conversations?.[channel]?.find(c=>c.id===conversationId);
 if(!conversation)return null;
 conversation.messages??=[];
 if(conversation.messages.some(m=>m.id===messageId))return null;
 const message={
  id:messageId,from,text,kind,
  day,time:clock,...(sentDate?{sentDate}:{}),
  actual:true,...(storyTag?{[storyTag]:true}:{})
 };
 conversation.messages.push(message);
 if(notify&&from!=='me'){
  deliverAuthoredIncoming(s,{channel,conversationId,from,text,kind,messageId,day,clock});
 }
 s.events??=[];
 if(!s.events.some(e=>e.messageId===messageId&&e.channel===channel)){
  s.events.push({type:from==='me'?'message_sent':'authored_message_delivered',
   channel,conversationId,messageId,day,clock});
 }
 return message;
}

export function currentConversation(s,channel,id){
 return s.content?.conversations?.[channel]?.find(c=>c.id===id)||null;
}

export const isNativeConversationOpen=(s,channel,id)=>
 !!(s.unlocked&&s.nav?.current?.appId===channel&&s.nav.current.route==='/chat/'+id);
