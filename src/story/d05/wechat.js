import {D05_GROUP,D05_PRIVATE} from './dialogue.js';
import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';
import {LATE_REPLIES} from '../../services/messaging/lifecycle/replies.js';
const scenes=[...D05_GROUP,...D05_PRIVATE].map(scene=>({...scene,
 replies:LATE_REPLIES.d05[scene.id],
 ...(scene.id==='wang-morning'?{until:'11:00'}:{}),
 ...(scene.id==='zaizai-paris'?{lateDays:7}:{}),
}));
export const d05Track=createConversationTrack({day:5,prefix:'d05',lockChats:'all',scenes,progress:s=>s.story55.d05Chats??={}});
function seedNote(s){
 if(s.story55?.version!==1||s.day<5||s.story55.d05NoteSeeded)return false;
 const notes=s.content.notes??=[];
 if(!notes.some(n=>n.id==='xm-note-d05-workshop'))notes.unshift({
  id:'xm-note-d05-workshop',title:'机房 · 待整理',createdDay:5,updatedDay:5,updatedClock:'08:00',
  text:'机房周末要把备份核对一遍。\n旧盘先别动，先记下型号。\n网卡的报价再看几家。\n\n胡枫在韩国的学校电脑：先问他要系统日志。'
 });
 s.story55.d05NoteSeeded=true;return true;
}
export const tickD05Chats=(s,now)=>{const seeded=seedNote(s);return d05Track.tick(s,now)||seeded;};
export const d05ChatDue=d05Track.due;
export const d05Draft=d05Track.draft;
export const d05ComposerDisabled=d05Track.disabled;
export const sendD05WeChat=d05Track.send;
