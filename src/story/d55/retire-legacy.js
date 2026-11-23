// D55 · retire the superseded ending without losing the 22:46
// watch audio or real player-written chat.
export const D55_ENDING_REVISION=2;
export const D55_ENDING_LINES=Object.freeze([['watch','手表同步：最后一段语音']]);
const oldMessage=id=>/^s55-ending-(?:[0-4]|6)$/.test(String(id||''));
export function retireLegacyD55Ending(s){
 const story=s.story55,c=story?.config;
 if(!c||c.d55EndingRevision>=D55_ENDING_REVISION)return false;
 const node=c.nodes.find(n=>n.id==='ending');
 if(!node)return false;
 node.at='22:46';
 c.scenes.ending=D55_ENDING_LINES.map(line=>[...line]);
 // Old indices 0–5 were pre-watch chat; old index 6 was the watch itself.
 const progress=story.scenes?.ending;
 if(progress){
  progress.index=progress.index>=6?1:0;
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
  }
 }
 if(Array.isArray(s.notifications)){
  s.notifications=s.notifications.filter(n=>!oldMessage(n.messageId)
   &&![0,1,2,3,4,6].some(i=>String(n.id||'').endsWith('s55-ending-'+i)));
 }
 if(Array.isArray(story.developerChatArchive)){
  story.developerChatArchive=story.developerChatArchive.filter(e=>!oldMessage(e.message?.id));
 }
 c.d55EndingRevision=D55_ENDING_REVISION;
 return true;
}
