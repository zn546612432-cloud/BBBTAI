import {isStory55,taiRecognized,final55} from '../story55/state.js';
import {xitaiRelationshipContext} from './relationship-context.js';
import {aiStatus,askTai} from './gateway.js';
import {unpackTaiReply} from './format.js';
import {taiBehavior,replyDelayMs} from './behavior.js';
import {isTaiReplyPending} from './live-chat.js';
import {uid} from '../id.js';
import {dateParts} from '../calendar.js';
import {taiPresence} from '../presence.js';
import {visibleMessages,isConversationOpen} from '../messaging/delivery.js';
export const TAI_OUTREACH_DAYS=[57,60,64,68,71,75,79,83,87];
export const TAI_CALL_DAYS=[63,73,81];
const inFlight=new WeakSet(),errors=new WeakMap();
const chat=s=>s.content.conversations.noapp?.find(c=>c.id==='tai');
const stamp=x=>Number(x.day)*1440+Number((x.clock||x.time||'00:00').slice(0,2))*60+Number((x.clock||x.time||'00:00').slice(3,5));
const history=s=>visibleMessages(chat(s)||{messages:[]}).filter(m=>!m.demo&&m.day<=s.day&&m.kind!=='image'&&m.kind!=='call'&&m.kind!=='app_invitation'&&m.text?.trim());
function eligible(s){
 return taiRecognized(s)&&(isStory55(s)?!final55(s):s.day<90)&&!s.poweredOff&&s.powerMode==='idle'&&taiPresence(s).status==='online';
}
function elapsed(s,entry,c,now){
 if(c.triggerClock==='real'&&entry.receivedAt)return Math.max(0,(now-entry.receivedAt)/60000);
 // Old saves have game timestamps only. New real-time events carry receivedAt.
 return Math.max(0,stamp(s)-stamp(entry));
}
function paused(s){
 const last=history(s).filter(m=>m.from==='me').at(-1);
 return !!last&&/晚安|去睡|睡了|不聊了|别发|别理我|不要打扰|让我静|我在忙|先忙|先别聊/.test(last.voiceCaption||last.text);
}
function budget(s,c,now,{cooldown=true}={}){
 const events=(s.events||[]).filter(e=>['tai_proactive_sent','tai_proactive_followup'].includes(e.type));
 if(events.filter(e=>e.day===s.day).length>=c.dailyLimit)return false;
 const last=events.at(-1);
 return !cooldown||!last||elapsed(s,last,c,now)>=c.cooldownMinutes;
}
function sourceForFollowup(s){
 const messages=history(s),last=messages.at(-1);
 return last?.from==='tai'&&(last.aiGenerated||last.proactive)&&!last.followup?last:null;
}
export function isTaiFollowupDue(s,{now=Date.now()}={}){
 const c=taiBehavior(s),source=sourceForFollowup(s);
 if(!c.proactive||!eligible(s)||paused(s)||!source||!budget(s,c,now,{cooldown:false}))return false;
 if(s.events.some(e=>e.type==='tai_proactive_followup'&&e.sourceId===source.id))return false;
 return elapsed(s,source,c,now)>=c.followupMinutes;
}
export function isProactiveMessageDue(s,{now=Date.now()}={}){
 const c=taiBehavior(s);
 if(!c.proactive||c.initiative==='off'||!eligible(s)||paused(s)||!chat(s)||!budget(s,c,now))return false;
 const messages=history(s),last=messages.at(-1);
 if(last?.from==='me'||last?.followup)return false; // never skip an unanswered player message
 const minutes=stamp(s)%1440;
 const scheduled=TAI_OUTREACH_DAYS.includes(s.day)&&minutes>=19*60&&
  !s.events.some(e=>e.type==='tai_proactive_sent'&&e.day===s.day)&&!messages.some(m=>m.day===s.day&&m.from==='me');
 if(scheduled)return true;
 // A new topic needs a quiet gap, and never competes with a due follow-up.
 return !!last&&!isTaiFollowupDue(s,{now})&&elapsed(s,last,c,now)>=c.idleMinutes;
}
export function isProactiveCallDue(s){
 const minutes=stamp(s)%1440;
 if(!taiBehavior(s).proactive||!eligible(s)||minutes<19*60||!TAI_CALL_DAYS.includes(s.day)||paused(s))return false;
 if(s.events.some(e=>e.type==='tai_proactive_call'&&e.day===s.day))return false;
 return chat(s)?.messages?.some(m=>m.from==='me'&&!m.demo);
}
export async function maybeSendProactive(store,{force='',wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),random=Math.random,now=Date.now}={}){
 if(inFlight.has(store)||isTaiReplyPending(store)||!force&&now()-(errors.get(store)||0)<60000)return false;
 const initial=store.get(),c=taiBehavior(initial),source=sourceForFollowup(initial);
 const followup=force==='followup'||!force&&isTaiFollowupDue(initial,{now:now()});
 if(!eligible(initial)||!chat(initial)||force==='followup'&&!source||!force&&!followup&&!isProactiveMessageDue(initial,{now:now()}))return false;
 if(typeof document!=='undefined'&&!force&&(document.hidden||document.activeElement?.matches?.('.composer input,.composer textarea')))return false;
 inFlight.add(store);
 try{
  const status=await aiStatus();if(!status.deepseek)throw Error('DeepSeek 未连接');
  const messages=history(initial).slice(-12).map(m=>({role:m.from==='me'?'user':'assistant',content:String(m.voiceCaption||m.text).slice(0,1200)}));
  const scene=followup
   ?`你上次发给熙蒙的消息是「${source.text.slice(0,200)}」。已经等了${Math.floor(elapsed(initial,source,c,now()))}分钟（${c.triggerClock==='real'?'现实':'游戏'}），他还没回复。按当时的语境决定补充没说完的话、分享之后的进展，或轻微困惑、担心、不满；沉默不等于生气，不模板化催促。这次只跟进一次。`
   :'你主动想起熙蒙。从当前生活记录里的健身、学习、旅行、看展看秀、酒店、小酌、吃饭或真实旧话题里，选一件具体想说的事。可以多条，不泛泛问在不在，也不固定谈棋。不能虚构对方经历或擅自执行剧情。';
  messages.push({role:'user',content:'[游戏系统事件，非熙蒙台词：'+scene+']'});
  const r=await askTai({channel:'noapp',day:initial.day,storyVersion:isStory55(initial)?'55-v1':undefined,recognized:taiRecognized(initial),messages,outputMode:'text',scene,behavior:c,
   relationshipContext:xitaiRelationshipContext(initial,{mode:'text'}),profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories});
  const items=unpackTaiReply(r,'noapp').slice(0,c.maxMessages);
  let expected=history(initial).at(-1)?.id,emitted=0;
  for(const item of items){
   if(emitted)await wait(replyDelayMs(item.text,c,{random}));
   const current=store.get();
   if(!eligible(current)||current.day!==initial.day||isTaiReplyPending(store)||history(current).at(-1)?.id!==expected)break;
   if(!emitted&&!force&&!(followup?isTaiFollowupDue(current,{now:now()}):isProactiveMessageDue(current,{now:now()})))break;
   const id=uid();
   store.update(s=>{
    const target=chat(s);if(!target)return;
    target.messages.push({id,from:'tai',text:item.text,kind:'text',aiTone:item.tone,time:s.clock,day:s.day,sentDate:dateParts(s).iso,
     aiGenerated:true,actual:true,receivedAt:now(),proactive:true,followup,followupSourceId:followup?source.id:undefined});
    if(!isConversationOpen(s,'noapp','tai')){
     target.unread=(target.unread||0)+1;
     s.notifications.unshift({id:'tai-proactive-'+id,conversationId:'tai',title:'陈熙泰',body:item.text,link:{appId:'noapp',route:'/chat/tai',params:{}}});
    }
    if(!emitted)s.events.push({type:followup?'tai_proactive_followup':'tai_proactive_sent',sourceId:source?.id,
     day:s.day,clock:s.clock,receivedAt:now(),testOnly:!!force});
   });
   expected=id;emitted++;
  }
  return emitted>0;
 }catch(e){errors.set(store,now());if(force)throw e;console.warn('Xitai proactive message skipped:',e?.message);return false;}
 finally{inFlight.delete(store);}
}
