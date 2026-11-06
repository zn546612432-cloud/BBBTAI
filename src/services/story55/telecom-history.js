// One-time additive migration of PRE-D01 SMS from the old 90-day phone.
// Keep only authored historical bubbles and never replace a 55-day SMS edit.
// No gameplay progress or D01+ messages are imported.
export function restorePreviousSMSHistory(storage,state){
 if(state.story55?.legacySMSImported)return false;
 let previous=null;
 try{previous=JSON.parse(storage?.getItem?.('ximeng-phone-v2')||'null');}catch{}
 const conversations=previous?.content?.conversations?.messages;
 let changed=false;
 if(Array.isArray(conversations)){
  const target=state.content.conversations.messages??=[];
  for(const source of conversations){
   if(typeof source?.id!=='string'||!Array.isArray(source.messages))continue;
   const historical=source.messages.filter(m=>
    typeof m?.id==='string'&&typeof m?.sentDate==='string'&&
    m.sentDate<'2025-05-19'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(m.sentDate)&&
    !m.demo&&!m.schedule&&typeof m.text==='string'
   );
   if(!historical.length)continue;
   if(state.content.deletedSmsConversationIds?.includes(source.id))continue;
   let dest=target.find(c=>c.id===source.id);
   if(!dest){
    dest={id:source.id,name:source.name||source.id,avatar:source.avatar||'',messages:[],unread:0};
    target.push(dest);changed=true;
   }
   const ids=new Set(dest.messages.map(m=>m.id));
   for(const m of historical)if(!ids.has(m.id)){
    dest.messages.push(structuredClone(m));ids.add(m.id);changed=true;
   }
  }
 }
 state.story55.legacySMSImported=true;
 return changed;
}
