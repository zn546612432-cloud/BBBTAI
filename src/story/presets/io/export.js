import {BUNDLE_FORMAT,DAY_FORMAT,parsePresetPayload} from './format.js';

const FIRST_GAME_DAY=Date.parse('2025-05-19T00:00:00Z');
const validDay=n=>Number.isInteger(n)&&n>=1&&n<=90;
function messageDay(message,state){
 if(validDay(message.schedule?.day))return message.schedule.day;
 if(message.storyImported&&validDay(message.day))return message.day;
 if(message.sentDate&&/^\d{4}-\d{2}-\d{2}$/.test(message.sentDate)){
  const timestamp=Date.parse(message.sentDate+'T00:00:00Z');
  if(Number.isFinite(timestamp))return Math.max(1,Math.min(90,Math.round((timestamp-FIRST_GAME_DAY)/86400000)+1));
 }
 if(validDay(message.day))return message.day;
 return validDay(state.day)?state.day:1;
}
/** Export manually edited and imported scripted text; never a player's live replies. */
export function exportPresetPacks(state,{day=null}={}){
 const buckets=new Map();
 const bucket=(d,ch)=>{const key=`${String(d).padStart(3,'0')}:${ch}`;if(!buckets.has(key))buckets.set(key,{format:DAY_FORMAT,day:d,channel:ch,label:`D${String(d).padStart(3,'0')} · ${ch}`,rules:[],history:[]});return buckets.get(key);};
 for(const r of state.storyPresets?.rules||[]){if(day!==null&&r.day!==day)continue;bucket(r.day,r.channel).rules.push(structuredClone(r));}
 for(const [channel,conversations] of Object.entries(state.content?.conversations||{})){
  for(const conversation of conversations){
   const perDay=new Map();
   for(const message of conversation.messages||[]){
    if((!message.storyImported&&!message.authored)||message.actual||message.kind&&message.kind!=='text'||typeof message.text!=='string'||!message.text.trim())continue;
    const authoredDay=messageDay(message,state);
    if(day!==null&&authoredDay!==day)continue;
    const rows=perDay.get(authoredDay)||[];
    rows.push({id:message.id,from:message.from,text:message.text,time:message.time,...(message.sentDate?{sentDate:message.sentDate}:{}),...(message.schedule?.mode==='game-time'?{appearance:'game-time'}:{})});
    perDay.set(authoredDay,rows);
   }
   for(const [d,messages] of perDay){bucket(d,channel).history.push({conversationId:conversation.id,conversationName:conversation.name,messages});}
  }
 }
 const packs=[...buckets.values()].sort((a,b)=>a.day-b.day||a.channel.localeCompare(b.channel));
 if(!packs.length&&day!==null)packs.push({format:DAY_FORMAT,day,channel:'wechat',label:`D${String(day).padStart(3,'0')} · 微信`,rules:[],history:[]});
 if(packs.length)parsePresetPayload({format:BUNDLE_FORMAT,packs});
 return packs;
}

export function serializePresetExport(state,{day=null}={}){
 const packs=exportPresetPacks(state,{day});
 return JSON.stringify({format:BUNDLE_FORMAT,packs},null,2);
}
