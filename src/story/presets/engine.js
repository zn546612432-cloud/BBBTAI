import {deathLocked} from '../../system/power/story.js';
import {dateParts} from '../../services/calendar.js';
import {starterPresetState} from './defaults.js';

export const ensurePresets=s=>s.storyPresets||(s.storyPresets=starterPresetState());
const used=(state,r)=>r.once&&(state.usedIds.includes(r.id)||(r.group&&state.usedGroups.includes(r.group)));
const inWindow=(r,day,clock)=>r.day===day&&clock>=r.from&&clock<=r.to;
const sameConversation=(r,channel,conversationId)=>r.channel===channel&&r.conversationId===conversationId;
const normal=text=>String(text||'').toLocaleLowerCase().replace(/\s+/g,'');
const hasKeywords=(r,text)=>{
 const words=(r.keywords||[]).map(normal).filter(Boolean);
 if(r.condition==='keywords-any')return words.length>0&&words.some(w=>text.includes(w));
 if(r.condition==='keywords-all')return words.length>0&&words.every(w=>text.includes(w));
 return true;
};
export function matchReplyRule(state,{day,clock,channel,conversationId,messages},{ignoreUsed=false,ignoreFlags=false}={}){
 const presets=state.storyPresets||starterPresetState(),joined=normal(messages.join(''));
 const candidates=presets.rules.filter(r=>r.enabled&&r.kind==='reply'&&sameConversation(r,channel,conversationId)&&inWindow(r,day,clock));
 const available=candidates.filter(r=>{
  if(!ignoreUsed&&used(presets,r))return false;
  if(!ignoreFlags&&r.requiresFlag&&!presets.flags.includes(r.requiresFlag))return false;
  if(r.condition==='message-count'&&messages.length<Number(r.minMessages||1))return false;
  return hasKeywords(r,joined);
 }).sort((a,b)=>Number(b.priority||0)-Number(a.priority||0)||a.id.localeCompare(b.id));
 return {rule:available[0]||null,candidates,candidateCount:candidates.length};
}
const replyCountToday=(s,r)=>{
 const c=s.content.conversations[r.channel]?.find(c=>c.id===r.conversationId);
 if(!c)return 0;
 const lastNpcIndex=c.messages.findLastIndex(m=>m.from!=='me'&&m.actual&&m.day===s.day);
 return c.messages.slice(lastNpcIndex+1).filter(m=>m.from==='me'&&m.actual&&m.day===s.day).length;
};
export function dueProactiveRule(s){
 const p=s.storyPresets||starterPresetState();
 return p.rules.filter(r=>r.enabled&&r.kind==='proactive'&&!used(p,r)&&!(p.firedProactiveDays||[]).includes(`${r.id}:${s.day}`)&&inWindow(r,s.day,s.clock)&&(!r.requiresFlag||p.flags.includes(r.requiresFlag))&&(r.mode==='scheduled'||replyCountToday(s,r)>=Number(r.minMessages||1))).sort((a,b)=>Number(b.priority||0)-Number(a.priority||0))[0]||null;
}

export function deliverRule(s,r){
 const preset=ensurePresets(s),conversation=s.content.conversations[r.channel]?.find(c=>c.id===r.conversationId);
 if(!conversation||used(preset,r))return false;
 const lines=(r.messages||[]).map(x=>x.trim()).filter(Boolean);
 if(!lines.length)return false;
 const from=r.conversationId==='group'?'熙旺':r.conversationId;
 for(let i=0;i<lines.length;i++){
  const id=`preset-${r.id}-${s.day}-${i}`;
  if(conversation.messages.some(m=>m.id===id))continue;
  conversation.messages.push({id,from,text:lines[i],time:s.clock,day:s.day,sentDate:dateParts(s).iso,kind:'text',actual:true,authored:true});
 }
 if(r.once){preset.usedIds.push(r.id);if(r.group&&!preset.usedGroups.includes(r.group))preset.usedGroups.push(r.group);}
 if(r.kind==='proactive'){preset.firedProactiveDays??=[];preset.firedProactiveDays.push(`${r.id}:${s.day}`);}
 if(r.setsFlag&&!preset.flags.includes(r.setsFlag))preset.flags.push(r.setsFlag);
 s.events.push({type:r.kind==='proactive'?'story_proactive':'story_reply',ruleId:r.id,day:s.day,clock:s.clock});
 if(!(s.unlocked&&s.nav.current.appId===r.channel&&s.nav.current.route==='/chat/'+r.conversationId)){
  s.notifications.unshift({id:`preset-notice-${r.id}-${s.day}`,title:conversation.name,body:lines.at(-1),link:{appId:r.channel,route:'/chat/'+r.conversationId,params:{}}});
 }
 return true;
}

// Batches are deliberately ephemeral: unsent drafts never count as spoken words.
// Their underlying sent messages are durable in the saved conversation.
export class PresetConversationEngine{
 constructor(store,{settleMs=3000}={}){this.store=store;this.pending=new Map();this.settleMs=settleMs;}
 onOutgoing(channel,conversationId){
  const s=this.store.get(),c=s.content.conversations[channel]?.find(c=>c.id===conversationId);
  const last=c?.messages.at(-1);if(!last||last.from!=='me'||!last.actual)return;
  const key=`${channel}:${conversationId}`;
  const existing=this.pending.get(key);
  if(existing)clearTimeout(existing.timer);
  const entry={day:s.day,clock:s.clock,channel,conversationId,messages:[...(existing?.messages||[]),last.text],timer:null};
  entry.timer=setTimeout(()=>{
   this.pending.delete(key);
   const state=this.store.get(),{rule}=matchReplyRule(state,entry);
   if(!rule||deathLocked(state))return; // silence is a deliberate, valid result.
   this.store.update(next=>{if(!used(ensurePresets(next),rule))deliverRule(next,rule);});
  },this.settleMs);
  this.pending.set(key,entry);
 }
 tick(){
  const rule=dueProactiveRule(this.store.get());
  if(rule)this.store.update(s=>deliverRule(s,rule));
 }
 dispose(){for(const entry of this.pending.values())clearTimeout(entry.timer);this.pending.clear();}
}
