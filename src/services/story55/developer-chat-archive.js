// Developer date reconstruction must not erase manually sent player messages.
// This is an idempotent save reconciliation, NOT a second chat scheduler.
// Runtime scripted NPC copy is reconstructed by the normal daily tracks.
const clone=x=>structuredClone(x);
const START=Date.UTC(2025,4,19);
const authored=m=>m.authored===true||m.storyImported===true||m.schedule?.mode==='game-time'||
 (typeof m.sentDate==='string'&&m.sentDate<'2025-05-19');
const key=(channel,id,messageId)=>JSON.stringify([channel,id,messageId]);
function messageDay(m,fallback){
 if(Number.isInteger(m.day)&&m.day>=1)return m.day;
 if(typeof m.sentDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(m.sentDate)){
  const d=Date.parse(m.sentDate+'T00:00:00Z');
  if(Number.isFinite(d))return Math.floor((d-START)/86400000)+1;
 }
 return fallback;
}
function preserve(m){
 if(!m||typeof m.id!=='string'||!m.id||m.demo||m.developerSimulated||authored(m))return false;
 if(m.from==='me'||m.from==='熙蒙')return true;
 // Include unscripted NPC/AI conversation replies, but not canonical scenes,
 // missed-reply tracks or scheduled story banners (those must be replayed).
 return m.actual===true&&!m.story55&&!m.lifecycleId&&!m.ouroborosScript&&
  !Object.keys(m).some(k=>/^storyD\d+/.test(k))&&!/^(?:s55-|d\d{2}-|preset-)/.test(m.id);
}
export function collectDeveloperChatArchive(s){
 const all=new Map();
 for(const entry of s.story55?.developerChatArchive||[])
  if(entry?.channel&&entry?.conversationId&&entry.message?.id)
   all.set(key(entry.channel,entry.conversationId,entry.message.id),clone(entry));
 for(const [channel,items] of Object.entries(s.content?.conversations||{})){
  for(const chat of items||[])for(const m of chat.messages||[]){
   if(!preserve(m))continue;
   const day=messageDay(m,s.day);
   if(day<1)continue;
   const entry={channel,conversationId:chat.id,day,
    contact:{id:chat.id,name:chat.name,avatar:chat.avatar,group:chat.group,members:clone(chat.members||[])},
    message:clone(m)};
   all.set(key(channel,chat.id,m.id),entry);
  }
 }
 return [...all.values()];
}
export function markDeveloperSimulatedMessages(s){
 // Player lines auto-filled by the developer's prior-day simulation are not
 // genuine Send actions; don't mistake them for user messages on the NEXT jump.
 for(const chats of Object.values(s.content?.conversations||{}))
  for(const chat of chats||[])for(const m of chat.messages||[])
   if((m.from==='me'||m.from==='熙蒙')&&!authored(m))
    m.developerSimulated=true;
}
export function restoreDeveloperChatArchive(s){
 const entries=s.story55?.developerChatArchive;
 if(!Array.isArray(entries)||!entries.length)return false;
 let changed=false;
 const touched=new Set();
 const indexes=new Map();
 for(const entry of entries){
  if(!entry?.message?.id||!Number.isInteger(entry.day)||entry.day>s.day)continue;
  const time=typeof entry.message.time==='string'&&/^\d\d:\d\d$/.test(entry.message.time)?entry.message.time:'00:00';
  if(entry.day===s.day&&time>s.clock)continue;
  const chats=s.content?.conversations?.[entry.channel];
  if(!Array.isArray(chats))continue;
  let chat=chats.find(c=>c.id===entry.conversationId);
  if(!chat){
   const meta=entry.contact||{};
   chat={id:entry.conversationId,name:meta.name||entry.conversationId,avatar:meta.avatar,
    group:meta.group,members:clone(meta.members||[]),messages:[],unread:0};
   chats.push(chat);
  }
  chat.messages??=[];
  let index=indexes.get(chat);
  if(!index){index=new Map(chat.messages.map((m,i)=>[m.id,i]));indexes.set(chat,index);}
  const at=index.get(entry.message.id);
  if(at!==undefined){
   // Never overwrite a newer genuine send/custom message. A synthesized copy
   // at the same ID may be replaced with the actual original record.
   if(!chat.messages[at].developerSimulated)continue;
   chat.messages[at]=clone(entry.message);
  }else{
   index.set(entry.message.id,chat.messages.length);
   chat.messages.push(clone(entry.message));
  }
  touched.add(chat);changed=true;
 }
 for(const chat of touched)chat.messages.sort((a,b)=>
  String(a.sentDate||'').localeCompare(String(b.sentDate||''))||
  String(a.time||'').localeCompare(String(b.time||'')));
 return changed;
}
