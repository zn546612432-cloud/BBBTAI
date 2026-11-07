import {D05_GROUP,D05_PRIVATE} from './dialogue.js';
import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';
import {LATE_REPLIES} from '../../services/messaging/lifecycle/replies.js';
const scenes=[...D05_GROUP,...D05_PRIVATE].map(scene=>({...scene,
 ...(scene.id==='breakfast'?{lines:s=>scene.lines.map((l,i)=>i===16&&!s.content.conversations.wechat.find(c=>c.id==='wang')?.messages.some(m=>m.storyD05&&m.from==='me')?{...l,text:'粥放桌上了，等他起來吃。'}:l)}:{}),
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
  text:'内存、硬盘的报价再对一遍。\n先整理备份，旧盘里的东西不要急着删。\n机房那台风扇有异响，找时间拆开看看。'
 });
 s.story55.d05NoteSeeded=true;return true;
}
export const tickD05Chats=(s,now)=>{const seeded=seedNote(s);return d05Track.tick(s,now)||seeded;};
export const d05ChatDue=d05Track.due;
export const d05Draft=d05Track.draft;
export const d05ComposerDisabled=d05Track.disabled;
export const sendD05WeChat=d05Track.send;
