import {validDate} from '../../../../services/calendar.js';
import {date55} from '../../../../services/story55/state.js';
import {conversations,selectedConversation,isGroup,actorName} from './model.js';

export const STORY_START='2025-05-19';
export const HISTORY_START='2024-03-10';
export const PAGE_SIZE=24;
export const dayDate=day=>date55(Math.max(1,Math.min(55,Number(day)||1)));
const firstTimestamp=Date.parse(STORY_START+'T00:00:00Z');
export function dayOfDate(iso){
 if(!validDate(iso))return null;
 const day=Math.round((Date.parse(iso+'T00:00:00Z')-firstTimestamp)/86400000)+1;
 return day>=1&&day<=55?day:null;
}
export const isProtectedMessage=m=>!m||m.actual===true||m.systemOwned===true||
 m.developerSimulated===true||m.story55===true||!!m.lifecycleId||!!m.ouroborosScript||
 Object.keys(m).some(k=>/^storyD\d+/.test(k))||
 (typeof m.id==='string'&&/^s55-/.test(m.id)&&m.authored!==true&&m.storyImported!==true);
// The legacy editor allowed unflagged fixture bubbles to be edited. Keep that UI
// compatibility, but treat only explicitly authored/imported records as portable.
export const isEditableMessage=m=>!isProtectedMessage(m);
export const isPortableMessage=m=>isEditableMessage(m)&&(m.authored===true||m.storyImported===true);

export function messageEditorDate(m){
 // The day a timed script will actually fire is the editing date; its
 // separately displayed message timestamp can legitimately differ.
 if(m?.schedule?.mode==='game-time'&&Number.isInteger(m.schedule.day)&&m.schedule.day>=1&&m.schedule.day<=55)return dayDate(m.schedule.day);
 if(validDate(m?.sentDate))return m.sentDate;
 if(Number.isInteger(m?.day)&&m.day>=1&&m.day<=55)return dayDate(m.day);
 return null;
}
export function historyDates(s){
 const dates=new Set();
 for(const {c} of conversations(s))for(const m of c.messages||[]){
  const d=messageEditorDate(m);
  if(d&&d>=HISTORY_START&&d<STORY_START)dates.add(d);
 }
 return [...dates].sort();
}
export function selection(s){
 const e=s.editor||{},scope=['history','story','other'].includes(e.chatScope)?e.chatScope:'story';
 const day=Number.isInteger(e.chatDay)&&e.chatDay>=1&&e.chatDay<=55?e.chatDay:(s.day>=1&&s.day<=55?s.day:1);
 const dates=scope==='history'?historyDates(s):[];
 const historyDate=validDate(e.chatDate)&&e.chatDate>=HISTORY_START&&e.chatDate<STORY_START?e.chatDate:(dates[0]||HISTORY_START);
 return {scope,day,historyDate,date:scope==='story'?dayDate(day):scope==='history'?historyDate:null,search:String(e.chatSearch||'').trim().toLocaleLowerCase(),kind:['all','group','direct'].includes(e.chatKind)?e.chatKind:'all',page:Number.isInteger(e.chatPage)&&e.chatPage>=0?e.chatPage:0};
}
export function rowsFor(s,channel,c,{ignoreSearch=false}={}){
 const view=selection(s);
 if(view.kind==='group'&&!isGroup(c)||view.kind==='direct'&&isGroup(c))return [];
 return (c.messages||[]).map((m,index)=>({m,index})).filter(({m})=>{
  const d=messageEditorDate(m);
  const inScope=view.scope==='other'?(!d||d<HISTORY_START||d>dayDate(55)):d===view.date;
  if(!inScope)return false;
  if(ignoreSearch||!view.search)return true;
  const haystack=[m.text,m.from,actorName(c,m.from),c.name,c.id,channel,m.id].join(' ').toLocaleLowerCase();
  return haystack.includes(view.search);
 });
}
export function activeConversation(s){
 const list=conversations(s),picked=selectedConversation(s);
 if(s.editor?.chatExplicitSelection)return picked;
 return list.find(({channel,c})=>rowsFor(s,channel,c).length>0)||picked;
}
export function selectDate(s,values){
 s.editor??={};
 Object.assign(s.editor,values,{chatPage:0,chatExplicitSelection:false});
}
export function addDatedMessage(s,c,kind,newMessage){
 const m=newMessage(s,c,kind),v=selection(s);
 if(v.date){m.sentDate=v.date;m.sentDateMode='custom';}
 if(v.scope==='story'){m.day=v.day;m.schedule={mode:'game-time',day:v.day,clock:m.time};}
 return m;
}
