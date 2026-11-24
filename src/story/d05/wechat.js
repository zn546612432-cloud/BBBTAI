import {D05_GROUP,D05_PRIVATE} from './dialogue.js';
import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';
import {LATE_REPLIES} from '../../services/messaging/lifecycle/replies.js';
// Exact approved copy migration; free chat and custom edits remain untouched.
const oldBreakfast=[{"who":"熙旺","kind":"text","text":"誰還沒吃早飯"},{"who":"阿威","kind":"text","text":"我吃了"},{"who":"小辛","kind":"text","text":"我"},{"who":"小辛","kind":"text","text":"哥你在哪"},{"who":"熙旺","kind":"text","text":"買粥"},{"who":"小辛","kind":"text","text":"有油條嗎"},{"who":"熙旺","kind":"text","text":"有"},{"who":"小辛","kind":"text","text":"那我要兩根"},{"who":"仔仔","kind":"text","text":"你不是說今天開始減肥"},{"who":"小辛","kind":"text","text":"早上不算"},{"who":"胡枫","kind":"text","text":"一天才剛開始你就先排除一頓"},{"who":"小辛","kind":"text","text":"不吃飽哪有力氣減"},{"who":"阿威","kind":"text","text":"有道理"},{"who":"仔仔","kind":"text","text":"你別信他"},{"who":"熙旺","kind":"text","text":"阿蒙那份我帶回去"},{"who":"小辛","kind":"text","text":"他還沒醒？"},{"who":"熙旺","kind":"text","text":"醒了，剛回我"},{"who":"小辛","kind":"text","text":"那他怎麼不理我"},{"who":"胡枫","kind":"text","text":"你反省一下😂"}];
const oldMorning=[{"who":"熙旺","kind":"text","text":"阿蒙，醒了？"},{"who":"me","kind":"text","text":"嗯"},{"who":"熙旺","kind":"text","text":"粥跟油條放桌上了，趁熱吃"},{"who":"me","kind":"text","text":"哥你吃了沒"},{"who":"熙旺","kind":"text","text":"吃了，我等下出車"},{"who":"me","kind":"text","text":"衣服還在洗衣機裡"},{"who":"熙旺","kind":"text","text":"看到了，我晚點幫你晾"},{"who":"me","kind":"text","text":"😘"},{"who":"熙旺","kind":"text","text":"別光發這個，先去吃飯"},{"who":"me","kind":"text","text":"收到哥哥"},{"who":"熙旺","kind":"text","text":"😂"}];
function migrateBreakfastCopy(s,q,scene){
 if(q.breakfastCopy20261124)return;
 const chat=s.content?.conversations?.wechat?.find(c=>c.id===scene.chat);
 if(!chat)return;
 const old=scene.id==='breakfast'?oldBreakfast:oldMorning;
 const prefix='d05-'+scene.id+'-';
 const matches=(l,i)=>l.text===old[i]?.text||scene.id==='breakfast'&&i===16&&l.text==='粥放桌上了，等他起來吃。';
 const removed=new Set();
 for(const m of chat.messages||[]){
  if(!m.id?.startsWith(prefix)||!m.storyD05||m.edited||m.kind!=='text')continue;
  const suffix=m.id.slice(prefix.length);if(!/^\d+$/.test(suffix))continue;
  const i=Number(suffix),before=old[i],after=scene.lines[i];
  if(!before||m.from!==before.who||!matches(m,i))continue;
  if(!after){
   (s.story55.contentArchives??=[]).push({revision:'d05-breakfast-20261124',channel:'wechat',conversationId:chat.id,original:structuredClone(m)});
   removed.add(m.id);
  }else if(m.text!==after.text){
   m.text=after.text;
   for(const n of s.notifications||[])if(n.messageId===m.id)n.body=m.text;
  }
 }
 if(removed.size){
  chat.messages=chat.messages.filter(m=>!removed.has(m.id));
  const notices=(s.notifications||[]).filter(n=>removed.has(n.messageId));
  s.notifications=(s.notifications||[]).filter(n=>!removed.has(n.messageId));
  if(s.events)s.events=s.events.filter(e=>!removed.has(e.messageId));
  chat.unread=Math.max(0,(Number(chat.unread)||0)-notices.length);
 }
 if(q.index>=scene.lines.length){
  q.index=scene.lines.length;q.completed=true;q.status='complete';q.nextAt=null;q.dueAt=null;q.awaitingPlayer=false;
 }
 const edit=s.story55.chatSceneEdits?.['d05:'+scene.id];
 if(edit?.lines?.length===old.length&&edit.lines.every((l,i)=>l.who===old[i].who&&matches(l,i))){
  edit.lines=structuredClone(scene.lines);edit.at=scene.at;delete edit.baseline;delete edit.lineTimes;
 }
 if(scene.id==='wang-morning'&&q.completed&&s.drafts?.wang==='收到哥哥')delete s.drafts.wang;
 q.breakfastCopy20261124=true;
}
const scenes=[...D05_GROUP,...D05_PRIVATE].map(scene=>({...scene,
 ...(['breakfast','wang-morning'].includes(scene.id)?{migrate:(s,q)=>migrateBreakfastCopy(s,q,scene)}:{}),
 replies:LATE_REPLIES.d05[scene.id],
 ...(scene.id==='wang-morning'?{until:'11:00',expireReply:true,enabled:s=>!!s.story55.d05Chats?.breakfast?.completed}:{}),
 ...(scene.id==='wang-evening'?{expireReply:true}:{}),
 ...(scene.id==='zaizai-paris'?{lateDays:7,preserveLate:true}:{}),
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
export const tickD05Chats=(s,now)=>{
 const seeded=seedNote(s);
 // An existing D05 save may still contain the deleted computer-repair line.
 // Remove only that exact authored sentence, not the player's own note edits.
 const note=s.content?.notes?.find(n=>n.id==='xm-note-d05-workshop');
 const obsolete='胡枫的电脑：提醒他自己留备份。';
 const cleaned=!!(note?.text?.includes(obsolete));
 if(cleaned)note.text=note.text.replace('\n\n'+obsolete,'').replace(obsolete,'');
 return d05Track.tick(s,now)||seeded||cleaned;
};
export const d05ChatDue=d05Track.due;
export const d05Draft=d05Track.draft;
export const d05ComposerDisabled=d05Track.disabled;
export const sendD05WeChat=d05Track.send;
