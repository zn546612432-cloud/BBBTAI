import {appendAuthoredPhoneMessage} from '../phone-messages.js';
// Authored-message lifecycle. Game time decides relevance; real time only spaces
// LIVE bubbles. Daily content registers definitions and never implements timers.
export const CHAT_LIFECYCLE_POLICY=Object.freeze({version:1,pauseMs:1900,initialDelayMs:450,lateDays:3,groupLiveMinutes:30,lateReplyMinutes:60});
const minute=clock=>Number(clock.slice(0,2))*60+Number(clock.slice(3));
export const conversationMinute=s=>(s.day-1)*1440+minute(s.clock)+(s.day===1&&s.story55?.d01?.nightAfterMidnight?1440:0);
const date=day=>new Date(Date.UTC(2025,4,19)+(day-1)*86400000).toISOString().slice(0,10);
const stamp=n=>({day:Math.floor(n/1440)+1,clock:String(Math.floor(n%1440/60)).padStart(2,'0')+':'+String(Math.floor(n%60)).padStart(2,'0')});
const value=(x,s,q)=>typeof x==='function'?x(s,q):x;
const qDue=q=>q.nextAt!==undefined?q.nextAt:q.dueAt;
const setDue=(q,t)=>{q.nextAt=t;q.dueAt=t;q.awaitingPlayer=t===null&&!q.completed;};
const supported=s=>s.story55?.version===1&&!s.story55.ended;

export function createConversationTrack(config){
 if(!Number.isInteger(config.day)||config.day<1||!config.prefix||!Array.isArray(config.scenes))throw Error('Invalid conversation track');
 const ids=new Set();
 for(const d of config.scenes){
  if(!d.id||!d.chat||ids.has(d.id))throw Error('Missing or duplicate conversation scene: '+d.id);
  ids.add(d.id);
  if(d.unanswered?.some(l=>l.who==='me'))throw Error('Unanswered closure cannot send player messages: '+d.id);
 }
 const defs=config.scenes.map((scene,i)=>({channel:'wechat',...scene,day:config.day,ordinal:i}));
 const root=s=>config.progress(s);
 const pause=(s,d,q)=>value(d.pauseMs,s,q)??CHAT_LIFECYCLE_POLICY.pauseMs;
 const chatId=(s,d)=>config.chatId?.(s,d)||d.chat;
 const get=(s,d)=>root(s)[d.id];
 const lines=(s,d,q)=>value(d.lines,s,q)||[];
 const starts=(s,d,q)=>value(d.at,s,q)||d.fallback||d.early||'08:00';
 const startMinute=(s,d,q)=>(d.day-1)*1440+minute(starts(s,d,q));
 const endMinute=(s,d,q)=>{
  if(d.until)return (d.day-1)*1440+minute(value(d.until,s,q));
  const next=defs.filter(x=>x.chat===d.chat&&x.ordinal>d.ordinal&&!x.optional);
  const end=next.length?startMinute(s,next[0],get(s,next[0])):d.day*1440;
  const latest=d.historyClock?Math.max(startMinute(s,d,q),...lines(s,d,q).map((_,i)=>(d.day-1)*1440+minute(d.historyClock(i,s,q)))):startMinute(s,d,q);
  return d.chat==='group'?Math.min(end,Math.max(latest+1,startMinute(s,d,q)+(d.liveMinutes??CHAT_LIFECYCLE_POLICY.groupLiveMinutes))):end;
 };
 const allowed=(s,d)=>!d.condition||d.condition(s);
 const canStart=(s,d,q)=>allowed(s,d)&&(!d.enabled||d.enabled(s,q))&&conversationMinute(s)>=startMinute(s,d,q);
 const messageId=(s,d,i)=>d.messageId?.(s,i)||config.prefix+'-'+d.id+'-'+i;
 function ensure(s){
  const map=root(s);
  for(const d of defs){
   const q=map[d.id]??={started:false,index:0,nextAt:null,completed:false};
   if(q.nextAt===undefined)q.nextAt=q.dueAt??null;
   if(d.migrate)d.migrate(s,q);
  }
  return map;
 }
 function sendLine(s,d,q,i,line,{history=false,branch=null,at=null}={}){
  const id=branch?config.prefix+'-'+d.id+'-late-'+branch+'-'+i:messageId(s,d,i);
  let when=at||{day:history?d.day:s.day,clock:history?(d.historyClock?.(i,s,q)||starts(s,d,q)):s.clock};
  // Reconciled replies cannot precede a player message that was really sent.
  if(history&&!branch){
   const c=s.content.conversations?.[d.channel]?.find(c=>c.id===chatId(s,d));
   const previous=c?.messages?.filter(m=>m.id===messageId(s,d,i-1)).at(-1);
   if(previous&&previous.day===when.day&&previous.time>when.clock)when={day:previous.day,clock:previous.time};
  }
  return !!appendAuthoredPhoneMessage(s,{
   channel:d.channel,conversationId:chatId(s,d),messageId:id,from:line.who,text:line.text,kind:line.kind||'text',
   day:when.day,clock:when.clock,sentDate:date(when.day),storyTag:'storyD'+String(d.day).padStart(2,'0'),
   silent:history,lifecycleId:config.prefix+':'+d.id
  });
 }
 function finish(s,d,q){q.completed=true;q.status='complete';setDue(q,null);q.awaitingPlayer=false;d.onComplete?.(s,q);}
 function history(s,d,q){
  if(q.historySettled)return false;
  const parts=lines(s,d,q);
  // An unstarted, player-initiated thread never happened.
  if(!q.started&&parts[0]?.who==='me'){q.historySettled=true;q.status='unstarted';setDue(q,null);return true;}
  if(!allowed(s,d)){q.skipped=true;q.historySettled=true;q.status='skipped';setDue(q,null);return true;}
  q.started=true;
  while(q.index<parts.length&&parts[q.index].who!=='me'){
   sendLine(s,d,q,q.index,parts[q.index],{history:true});q.index++;
  }
  if(q.index>=parts.length)finish(s,d,q);
  else{q.status='waiting-late';setDue(q,null);}
  if(!q.completed&&d.unanswered?.length&&!q.unansweredSent){
   const at=stamp(endMinute(s,d,q));
   for(let i=0;i<d.unanswered.length;i++)sendLine(s,d,q,i,d.unanswered[i],{history:true,branch:'unanswered',at});
   q.unansweredSent=true;
  }
  q.historySettled=true;q.lifecycleVersion=CHAT_LIFECYCLE_POLICY.version;
  return true;
 }
 function lateChoice(s,d,q){
  if(!q?.historySettled||q.completed||q.skipped||q.lateHandled||q.status==='unstarted'||!d.replies)return null;
  const gap=s.day-d.day;
  if(gap<0||gap>(d.lateDays??CHAT_LIFECYCLE_POLICY.lateDays)||d.closed?.(s))return null;
  const kind=d.resolved?.(s)?'resolved':gap===0?'sameDay':gap===1?'nextDay':'later';
  const text=value(d.replies[kind]??d.replies.later,s,q);
  return text?.length?{kind,lines:text}:null;
 }
 function isPast(s,d,q){return !d.mandatory&&(!!d.endWhen?.(s)||conversationMinute(s)>=endMinute(s,d,q));}
 function reconcile(s,now){
  if(!supported(s)||s.day<config.day)return false;
  const map=ensure(s);let changed=false;
  // Cancel stored banners too. A queued copy is checked against this saved flag.
  for(const n of s.notifications||[]){
   const d=defs.find(d=>n.lifecycleId===config.prefix+':'+d.id||String(n.messageId||'').startsWith(config.prefix+'-'+d.id+'-')||d.messageId?.(s,0)===n.messageId);
   const run=d&&map[d.id].lateRun;
   const activeLate=run&&s.day===run.day&&conversationMinute(s)<run.validUntil&&String(n.messageId||'').startsWith(config.prefix+'-'+d.id+'-late-'+run.kind+'-');
   if(d&&!activeLate&&isPast(s,d,map[d.id])&&!n.silent){n.silent=true;changed=true;}
  }
  for(const d of defs){
   const q=map[d.id];
   if(q.lateRun&&!q.lateHandled){
    const run=q.lateRun;
    if(s.day>run.day||conversationMinute(s)>=run.validUntil){
     while(run.index<run.lines.length&&run.lines[run.index].who!=='me'){
      sendLine(s,d,q,run.index,run.lines[run.index],{history:true,branch:run.kind,at:{day:run.day,clock:run.clock}});run.index++;
     }
     q.lateHandled=true;q.status='closed';setDue(q,null);changed=true;
    }
    continue;
   }
   if(q.completed||q.skipped)continue;
   if(isPast(s,d,q))changed=history(s,d,q)||changed;
   if(q.historySettled&&!lateChoice(s,d,q)&&q.status==='waiting-late'){q.status='expired';changed=true;}
  }
  return changed;
 }
 function tick(s,now=Date.now()){
  if(!supported(s)||s.day<config.day)return false;
  let changed=reconcile(s,now);const map=ensure(s),spoken=new Set();
  s.story55.conversationDelivery??={};
  for(const d of defs){
   const q=map[d.id],key=d.channel+':'+chatId(s,d);
   if(q.lateRun&&!q.lateHandled){
    const r=q.lateRun;if(qDue(q)==null||now<qDue(q)||spoken.has(key))continue;
    const last=s.story55.conversationDelivery[key];
    if(Number.isFinite(last)&&now-last<pause(s,d,q))continue;
    const line=r.lines[r.index];if(!line||line.who==='me')continue;
    sendLine(s,d,q,r.index,line,{branch:r.kind});r.index++;spoken.add(key);
    s.story55.conversationDelivery[key]=now;
    if(r.index===r.lines.length){q.lateHandled=true;q.status='closed';setDue(q,null);}
    else setDue(q,now+pause(s,d,q));
    changed=true;continue;
   }
   if(q.completed||q.skipped||q.historySettled||isPast(s,d,q))continue;
   if(!q.started){
    if(!canStart(s,d,q))continue;
    if(lines(s,d,q)[q.index]?.who==='me')continue; // Offering a draft does not start a conversation.
    // Preserve ordering only within the current valid scene window.
    if(defs.some(x=>x.chat===d.chat&&x.ordinal<d.ordinal&&!map[x.id].historySettled&&!map[x.id].completed&&!map[x.id].skipped&&!x.optional&&allowed(s,x)))continue;
    q.started=true;q.status='live';q.startedClock=s.clock;
    setDue(q,lines(s,d,q)[q.index]?.who==='me'?null:now+(d.initialDelayMs??CHAT_LIFECYCLE_POLICY.initialDelayMs));
    d.onStart?.(s,q);changed=true;
   }
   const line=lines(s,d,q)[q.index];
   if(!line){finish(s,d,q);changed=true;continue;}
   if(line.who==='me'){q.status='waiting';setDue(q,null);continue;}
   if(qDue(q)==null||now<qDue(q)||spoken.has(key))continue;
   const last=s.story55.conversationDelivery[key];
   if(Number.isFinite(last)&&now-last<pause(s,d,q))continue;
   sendLine(s,d,q,q.index,line);q.index++;spoken.add(key);s.story55.conversationDelivery[key]=now;changed=true;
   if(q.index>=lines(s,d,q).length)finish(s,d,q);
   else setDue(q,lines(s,d,q)[q.index].who==='me'?null:now+pause(s,d,q));
  }
  return changed;
 }
 function candidate(s,id){
  if(!supported(s)||s.day<config.day)return null;
  const map=ensure(s),available=[];
  for(const d of defs){
   if(chatId(s,d)!==id&&d.chat!==id)continue;
   const q=map[d.id];if(!q||q.completed||q.skipped||q.lateHandled)continue;
   if(q.lateRun){const r=q.lateRun,line=r.lines[r.index];if(s.day!==r.day||conversationMinute(s)>=r.validUntil)continue;if(line?.who==='me')available.push({d,q,line,late:r.kind,rank:1});continue;}
   if(!q.historySettled&&!isPast(s,d,q)&&(q.started||canStart(s,d,q))){
    const line=lines(s,d,q)[q.index];
    if(line?.who==='me'&&qDue(q)==null)available.push({d,q,line,rank:d.mandatory?3:2});
   }else{
    const late=lateChoice(s,d,q);
    if(late?.lines[0]?.who==='me')available.push({d,q,line:late.lines[0],late:late.kind,lateLines:late.lines,rank:0});
   }
  }
  const livePending=defs.some(d=>(chatId(s,d)===id||d.chat===id)&&!map[d.id].completed&&!map[d.id].historySettled&&!isPast(s,d,map[d.id])&&canStart(s,d,map[d.id])&&lines(s,d,map[d.id])[map[d.id].index]?.who!=='me');
  return available.filter(c=>c.rank>0||!livePending).sort((a,b)=>b.rank-a.rank||b.d.day-a.d.day||a.d.ordinal-b.d.ordinal)[0]||null;
 }
 function draft(s,id){const c=candidate(s,id);return c?{text:c.line.text,stage:config.prefix+':'+c.d.id+':'+(c.late?'late-'+c.late+':'+(c.q.lateRun?.index??0):c.q.index),priority:c.rank,day:c.d.day}:null;}
 function send(store,id,text,now=Date.now()){
  const s=store.get(),c=candidate(s,id);
  if(!c)return disabled(s,id)?{handled:true,reason:'請等待當前有效的預設訊息'}:{handled:false};
  if(String(text||'').trim()!==c.line.text.trim())return {handled:true,reason:config.invalidReplyText||'請發送輸入框裡完整的預設台詞'};
  let messageId=null;
  store.update(next=>{
   const current=candidate(next,id);if(!current||current.line.text!==c.line.text)return;
   const {d,q}=current;
   if(!q.started){q.started=true;q.startedClock=next.clock;d.onStart?.(next,q);}
   if(current.late){
    q.lateRun??={kind:current.late,lines:current.lateLines,index:0,day:next.day,clock:next.clock,validUntil:conversationMinute(next)+(d.lateReplyMinutes??CHAT_LIFECYCLE_POLICY.lateReplyMinutes)};
    const r=q.lateRun,i=r.index;
    messageId=config.prefix+'-'+d.id+'-late-'+r.kind+'-'+i;
    sendLine(next,d,q,i,r.lines[i],{branch:r.kind});r.index++;q.status='late-live';
    if(r.index===r.lines.length){q.lateHandled=true;q.status='closed';setDue(q,null);}
    else setDue(q,r.lines[r.index].who==='me'?null:now+pause(s,d,q));
   }else{
    messageId=messageIdFor(next,d,q.index);sendLine(next,d,q,q.index,lines(next,d,q)[q.index]);
    d.onSend?.(next,q,q.index,now);q.index++;
    if(q.index===lines(next,d,q).length)finish(next,d,q);
    else setDue(q,lines(next,d,q)[q.index].who==='me'?null:now+pause(s,d,q));
   }
   if(next.drafts)delete next.drafts[id];
  });
  return {handled:true,messageId};
 }
 const messageIdFor=(s,d,i)=>messageId(s,d,i);
 function due(s,now=Date.now()){
  if(!supported(s)||s.day<config.day)return false;
  const map=root(s);
  return defs.some(d=>{const q=map[d.id];return !q||(!q.completed&&!q.skipped&&!q.historySettled&&isPast(s,d,q))
   ||q.lateRun&&!q.lateHandled&&qDue(q)!=null&&now>=qDue(q)
   ||!q.completed&&!q.skipped&&!q.historySettled&&(q.started?qDue(q)!=null&&now>=qDue(q):canStart(s,d,q)&&lines(s,d,q)[q.index]?.who!=='me');});
 }
 function busy(s,id){
  if(!supported(s)||s.day<config.day)return false;
  return defs.some(d=>{const q=get(s,d);return chatId(s,d)===id&&q&&!q.completed&&!q.lateHandled&&(q.lateRun||q.started&&!q.historySettled&&!isPast(s,d,q))&&qDue(q)!=null;});
 }
 function disabled(s,id){
  if(!supported(s)||s.day<config.day)return false;
  const locked=s.day===config.day&&(config.lockChats==='all'||config.lockChats?.includes(id));
  return !!(locked||busy(s,id))&&!draft(s,id);
 }
 // Shared overdue acknowledgement inspects historical conversation state, not
 // hard-coded text or per-day special cases. Player-led unstarted scenes and
 // mandatory plot nodes are explicitly excluded.
 function pendingCatchup(s,id){
  if(!supported(s)||s.day<=config.day)return [];
  const map=root(s);
  return defs.filter(d=>{
   if(d.mandatory||d.chat==='group'||id&&(chatId(s,d)!==id&&d.chat!==id))return false;
   const q=map[d.id];
   if(!q||!q.historySettled||q.completed||q.skipped||q.lateHandled||q.lateRun||q.status==='unstarted')return false;
   return q.index>0&&s.day>d.day&&lines(s,d,q)[q.index]?.who==='me';
  }).map(d=>({track:config.prefix,id:d.id,day:d.day,conversationId:chatId(s,d)}));
 }
 function settleCatchup(s,id){
  const items=pendingCatchup(s,id),map=root(s);
  for(const item of items){
   const q=map[item.id];
   q.lateHandled=true;q.status='closed';q.catchupSettled={day:s.day,clock:s.clock};
   setDue(q,null);
  }
  return items;
 }
 return {name:config.prefix,day:config.day,defs,tick,due,draft,send,disabled,busy,reconcile,ensure,pendingCatchup,settleCatchup};
}
