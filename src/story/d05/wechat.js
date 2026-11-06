// D05 content/progress provider. Uses the existing phone scheduler, message
// writer, unread rules and native composer; never owns clock, UI or AI logic.
import {D05_GROUP,D05_PRIVATE} from './dialogue.js';
import {D04_GROUP} from '../d04/dialogue.js';
import {appendAuthoredPhoneMessage} from '../../services/messaging/phone-messages.js';
const DAY=5,DATE='2025-05-23',PAUSE=1900;
const active=s=>s.story55?.version===1&&s.day===DAY;
const inTimeline=s=>s.story55?.version===1&&s.day>=DAY;
const scenes=[...D05_GROUP,...D05_PRIVATE];
const ensure=s=>{
 const progress=s.story55.d05Chats??={};
 for(const scene of scenes)progress[scene.id]??={started:false,index:0,nextAt:null,completed:false};
 return progress;
};
const push=(s,scene,index,line)=>appendAuthoredPhoneMessage(s,{
 conversationId:scene.chat,messageId:'d05-'+scene.id+'-'+index,
 from:line.who,text:line.text,kind:line.kind,day:DAY,
 clock:s.day===DAY?s.clock:scene.at,sentDate:DATE,storyTag:'storyD05'
});
function advance(s,scene,q,now){
 const line=scene.lines[q.index];
 if(!line){q.completed=true;q.nextAt=null;return false;}
 if(line.who==='me'){q.nextAt=null;return false;}
 if(!push(s,scene,q.index,line))return false;
 q.index++;
 q.completed=q.index>=scene.lines.length;
 q.nextAt=q.completed||scene.lines[q.index].who==='me'?null:now+PAUSE;
 return true;
}
function seedNote(s){
 if(s.story55.d05NoteSeeded)return false;
 const notes=s.content.notes??=[];
 if(!notes.some(n=>n.id==='xm-note-d05-workshop'))notes.unshift({
  id:'xm-note-d05-workshop',title:'机房 · 待整理',createdDay:5,updatedDay:5,updatedClock:'08:00',
  text:'内存、硬盘的报价再对一遍。\n先整理备份，旧盘里的东西不要急着删。\n机房那台风扇有异响，找时间拆开看看。\n\n胡枫的电脑：提醒他自己留备份。'
 });
 s.story55.d05NoteSeeded=true;return true;
}
export function tickD05Chats(s,now=Date.now()){
 if(!inTimeline(s))return false;
 const progress=ensure(s);let changed=seedNote(s);
 // Same ordered group delivery as D04: one incoming bubble per real tick.
 for(const scene of D05_GROUP){
  // Old messages retain their chronology; D05 cannot speak over a D04 backlog.
  const old=s.story55.d04Chats;
  if(old&&D04_GROUP.some(x=>!old[x.id]?.completed&&!old[x.id]?.skipped))break;
  const q=progress[scene.id];if(q.completed)continue;
  if(!q.started){
   if(s.day===DAY&&s.clock<scene.at)break;
   q.started=true;q.nextAt=now+450;changed=true;
  }
  if(q.nextAt!=null&&now>=q.nextAt)changed=advance(s,scene,q,now)||changed;
  break;
 }
 if(!active(s))return changed;
 for(const scene of D05_PRIVATE){
  const q=progress[scene.id];if(q.completed||s.clock<scene.at)continue;
  if(!q.started){
   if(D05_PRIVATE.some(x=>x.chat===scene.chat&&x.at<scene.at&&progress[x.id]?.started&&!progress[x.id]?.completed))continue;
   q.started=true;q.nextAt=now+450;changed=true;
  }
  if(q.nextAt!=null&&now>=q.nextAt)changed=advance(s,scene,q,now)||changed;
 }
 return changed;
}
export function d05ChatDue(s,now=Date.now()){
 if(!inTimeline(s))return false;
 return scenes.some(scene=>{
  if(scene.chat!=='group'&&!active(s))return false;
  const q=s.story55?.d05Chats?.[scene.id];
  return q?.started&&!q.completed&&q.nextAt!=null&&now>=q.nextAt;
 });
}
function selected(s,id){
 return D05_PRIVATE.find(scene=>scene.chat===id&&s.story55?.d05Chats?.[scene.id]?.started&&!s.story55.d05Chats[scene.id].completed);
}
export function d05Draft(s,id){
 if(!active(s))return null;
 const scene=selected(s,id),q=scene&&s.story55.d05Chats[scene.id],line=scene?.lines[q?.index];
 return line?.who==='me'&&q.nextAt===null?{text:line.text,stage:'d05:'+scene.id+':'+q.index}:null;
}
export function d05ComposerDisabled(s,id){
 return active(s)&&!d05Draft(s,id);
}
export function sendD05WeChat(store,id,text,now=Date.now()){
 const s=store.get();if(!active(s))return {handled:false};
 const draft=d05Draft(s,id);
 if(!draft||String(text||'').trim()!==draft.text)return {handled:true,reason:'請發送輸入框裡完整的預設台詞'};
 let messageId=null;
 store.update(next=>{
  const scene=selected(next,id),q=next.story55.d05Chats[scene.id];
  messageId=push(next,scene,q.index,scene.lines[q.index])?.id||null;
  if(!messageId)return;
  q.index++;q.completed=q.index>=scene.lines.length;
  q.nextAt=q.completed||scene.lines[q.index].who==='me'?null:now+PAUSE;
  if(next.drafts)delete next.drafts[id];
 });
 return {handled:true,messageId};
}
