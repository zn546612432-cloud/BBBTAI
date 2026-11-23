// D55 · retire the superseded 21:00–22:25 ending without losing the
// confirmed 22:46 watch audio, 22:49 last call-out, or player-written chat.
export const D55_ENDING_REVISION=1;
export const D55_ENDING_LINES=Object.freeze([
 ['watch','手表同步：最后一段语音'],
 ['tai','熙蒙！熙蒙！']
]);
const oldMessage=id=>/^s55-ending-[0-4]$/.test(String(id||''));
export function retireLegacyD55Ending(s){
 const story=s.story55,c=story?.config;
 if(!c||c.d55EndingRevision>=D55_ENDING_REVISION)return false;
 const node=c.nodes.find(n=>n.id==='ending');
 if(!node)return false;
 node.at='22:46';
 c.scenes.ending=D55_ENDING_LINES.map(line=>[...line]);
 // Old 0–5 = pre-watch dialogue; 6 = watch played; 7 = final call-out.
 const progress=story.scenes?.ending;
 if(progress){
  progress.index=progress.index>=7?2:progress.index>=6?1:0;
  delete progress.nextAt;
 }
 if(story.chatSceneEdits)delete story.chatSceneEdits['node:ending'];
 for(const list of Object.values(s.content?.conversations||{})){
  for(const chat of list||[]){
   if(!Array.isArray(chat.messages))continue;
   const removed=chat.messages.filter(m=>oldMessage(m.id));
   if(removed.length){
    chat.messages=chat.messages.filter(m=>!oldMessage(m.id));
    chat.unread=Math.max(0,(Number(chat.unread)||0)-removed.filter(m=>m.from!=='me').length);
   }
   const final=chat.messages.find(m=>m.id==='s55-ending-6');
   if(final&&!chat.messages.some(m=>m.id==='s55-ending-1'))final.id='s55-ending-1';
  }
 }
 if(Array.isArray(s.notifications)){
  s.notifications=s.notifications.filter(n=>!oldMessage(n.messageId)
   &&!Array.from({length:5},(_,i)=>'s55-ending-'+i).some(id=>String(n.id||'').endsWith(id)));
  for(const n of s.notifications)if(n.messageId==='s55-ending-6')n.messageId='s55-ending-1';
 }
 if(Array.isArray(story.developerChatArchive)){
  story.developerChatArchive=story.developerChatArchive.filter(e=>!oldMessage(e.message?.id));
  for(const e of story.developerChatArchive)if(e.message?.id==='s55-ending-6')e.message.id='s55-ending-1';
 }
 c.d55EndingRevision=D55_ENDING_REVISION;
 return true;
}
