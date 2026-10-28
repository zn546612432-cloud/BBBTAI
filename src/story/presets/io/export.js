import {BUNDLE_FORMAT,DAY_FORMAT,parsePresetPayload} from './format.js';

/** Only authored imported history is exported; never actual player chat logs. */
export function exportPresetPacks(state,{day=null}={}){
 const buckets=new Map();
 const bucket=(d,ch)=>{const key=`${String(d).padStart(3,'0')}:${ch}`;if(!buckets.has(key))buckets.set(key,{format:DAY_FORMAT,day:d,channel:ch,label:`D${String(d).padStart(3,'0')} · ${ch}`,rules:[],history:[]});return buckets.get(key);};
 for(const r of state.storyPresets?.rules||[]){if(day!==null&&r.day!==day)continue;bucket(r.day,r.channel).rules.push(structuredClone(r));}
 for(const [channel,conversations] of Object.entries(state.content?.conversations||{})){
  for(const conversation of conversations){
   const perDay=new Map();
   for(const message of conversation.messages||[]){
    if(!message.storyImported||message.actual||!Number.isInteger(message.day))continue;
    if(day!==null&&message.day!==day)continue;
    const rows=perDay.get(message.day)||[];
    rows.push({id:message.id,from:message.from,text:message.text,time:message.time,...(message.sentDate?{sentDate:message.sentDate}:{}),...(message.schedule?.mode==='game-time'?{appearance:'game-time'}:{})});
    perDay.set(message.day,rows);
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
