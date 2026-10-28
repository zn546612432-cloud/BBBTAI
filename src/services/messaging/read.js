// A conversation is read only when the player actually opens it. Remove
// notifications for that conversation at the same time as its unread badge.
export function readConversationInState(s,channel,id){
 const conversation=s.content.conversations?.[channel]?.find(c=>c.id===id);
 if(!conversation)return false;
 const unread=Math.max(0,Number(conversation.unread)||0);
 const oldCount=s.notifications.length;
 conversation.unread=0;
 s.notifications=s.notifications.filter(n=>!((n.link?.appId===channel)&&
  (n.conversationId===id||n.link?.route==='/chat/'+id)));
 return unread>0||s.notifications.length!==oldCount;
}

export function readNotification(store,id){
 if(!id||!store.get().notifications.some(n=>n.id===id))return false;
 store.update(s=>{s.notifications=s.notifications.filter(n=>n.id!==id);});
 return true;
}
