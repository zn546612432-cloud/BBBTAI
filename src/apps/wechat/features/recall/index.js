/** Revoke a message sent by the player, retaining a non-editable system notice. */
export function recallWeChatMessage(store,conversationId,messageId){
  let recalled=false;
  store.update(s=>{
    const conversation=s.content.conversations.wechat?.find(c=>c.id===conversationId);
    const message=conversation?.messages.find(m=>m.id===messageId);
    if(!message)throw Error('消息不存在');
    if(message.from!=='me')throw Error('只能撤回自己发送的消息');
    if(message.kind==='recalled')throw Error('这条消息已经撤回');
    message.kind='recalled';
    message.text='';
    message.recalledBy='me';
    message.recalledAt={day:s.day,clock:s.clock};
    s.events.push({type:'wechat_message_recalled',conversationId,messageId,day:s.day,clock:s.clock});
    recalled=true;
  });
  return recalled;
}
