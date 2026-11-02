import {isStory55,taiRecognized,final55} from '../story55/state.js';
import {xitaiRelationshipContext} from './relationship-context.js';
import {aiStatus,askTai,chooseTaiAction} from './gateway.js';
import {unpackTaiReply} from './format.js';
import {taiBehavior,replyDelayMs} from './behavior.js';
import {isTaiReplyPending,synthesizeVoiceNotes} from './live-chat.js';
import {startIncoming,callState} from '../../apps/noapp/voice-call.js';
import {uid} from '../id.js';
import {dateParts} from '../calendar.js';
import {taiPresence} from '../presence.js';
import {visibleMessages,isConversationOpen} from '../messaging/delivery.js';
import {combineTaiVoiceThoughts} from './voice-request-v11.js';
import {sampleTaiTurnPlan,taiTurnNeedsMore,mergeTaiTurnEntries,dedupeTaiTurnEntries,taiGuidanceNeedsRepair,taiIntegrateGuidingQuestion} from './conversation-shape-v12.js';
export const TAI_OUTREACH_DAYS=[57,60,64,68,71,75,79,83,87];
export const TAI_CALL_DAYS=[63,73,81];
export const TAI_55_OUTREACH_DAYS=[32,34,37,41,44,47,50,53];
export const TAI_55_CALL_DAYS=[36,45,52];
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
 const events=(s.events||[]).filter(e=>['tai_proactive_sent','tai_proactive_followup','tai_proactive_skipped','tai_proactive_call'].includes(e.type));
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
 const scheduled=(isStory55(s)?TAI_55_OUTREACH_DAYS:TAI_OUTREACH_DAYS).includes(s.day)&&minutes>=19*60&&
  !s.events.some(e=>['tai_proactive_sent','tai_proactive_skipped','tai_proactive_call'].includes(e.type)&&e.day===s.day)&&!messages.some(m=>m.day===s.day&&m.from==='me');
 if(scheduled)return true;
 // A new topic needs a quiet gap, and never competes with a due follow-up.
 return !!last&&!isTaiFollowupDue(s,{now})&&elapsed(s,last,c,now)>=c.idleMinutes;
}
export function isProactiveCallDue(s){
 // Story55 free calls belong to v10 independent action decisions, not calendar roulette.
 if(isStory55(s))return false;
 const minutes=stamp(s)%1440;
 if(!taiBehavior(s).proactive||!eligible(s)||minutes<19*60||!(isStory55(s)?TAI_55_CALL_DAYS:TAI_CALL_DAYS).includes(s.day)||paused(s))return false;
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
   ?`你上次发给熙蒙的消息是「${source.text.slice(0,200)}」。已经等了${Math.floor(elapsed(initial,source,c,now()))}分钟（${c.triggerClock==='real'?'现实':'游戏'}），他还没回复。可以选择不发、适度关心，或补充真正没说完的内容；不要报备自己的行程，也不要机械催促。这次最多跟进一次。`
   :'熙泰考虑是否主动联系熙蒙。只关注熙蒙真实提过、尚有意义的具体经历、技术进展、困难、家人或约定；也可以决定不联系。不要主动汇报自己的行程、健身、酒店、研究或社交。不主动重提或邀请国际象棋，棋局只能由固定剧情触发。不能虚构对方经历或擅自执行剧情。';
  messages.push({role:'user',content:'[游戏系统事件，非熙蒙台词：'+scene+']'});
  const relationshipContext=xitaiRelationshipContext(initial,{mode:'text'});
  const decision=await chooseTaiAction({channel:'noapp',day:initial.day,recognized:taiRecognized(initial),messages,outputMode:'text',scene,
   relationshipContext,sourceMessageId:'',hasIncoming:false,allowDefer:false,allowVoice:!!status.minimax,
   allowCall:!!status.minimax&&!['ringing','dialing','connected'].includes(callState().state)});
  if(decision?.action==='end_session'){
   store.update(s=>s.events.push({type:'tai_proactive_skipped',day:s.day,clock:s.clock,receivedAt:now()}));
   return false;
  }
  if(decision?.action==='start_call'){
   if(!eligible(store.get())||store.get().day!==initial.day||isTaiReplyPending(store)||history(store.get()).at(-1)?.id!==history(initial).at(-1)?.id)return false;
   const called=startIncoming({store},'陈熙泰发起语音通话',{reason:'【熙泰主动联系熙蒙】'+(decision.intent||'想听听熙蒙的近况')});
   if(called)store.update(s=>s.events.push({type:'tai_proactive_call',day:s.day,clock:s.clock,receivedAt:now(),protocol:'v10'}));
   return called;
  }
  const approvedDecision=decision?.action==='send_voice'||decision?.action==='send_text'?decision:null;
  // An unsolicited follow-up stays compact to avoid hounding the player.
  // A substantive new outreach may use the full author-selected rhythm.
  const visibleHistory=messages.filter(m=>!String(m.content||'').startsWith('[游戏系统事件'));
  const turnPlan=sampleTaiTurnPlan({random,maxMessages:followup?2:c.maxMessages,messages:visibleHistory,
   mode:approvedDecision?.action==='send_voice'?'voice':'text'});
  const r=await askTai({channel:'noapp',day:initial.day,storyVersion:isStory55(initial)?'55-v1':undefined,recognized:taiRecognized(initial),messages,
   outputMode:approvedDecision?.action==='send_voice'?'voice':'text',scene,behavior:c,approvedDecision,turnPlan,
   relationshipContext,profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories});
  let items=dedupeTaiTurnEntries(unpackTaiReply(r,'noapp'),turnPlan.target);
  if(taiTurnNeedsMore({plan:turnPlan,entries:items,messages:visibleHistory,
   action:approvedDecision?.action==='send_voice'?'send_voice':'send_text'})){
   const remaining=turnPlan.target-items.length;
   const r2=await askTai({channel:'noapp',day:initial.day,storyVersion:isStory55(initial)?'55-v1':undefined,recognized:taiRecognized(initial),messages,
    outputMode:approvedDecision?.action==='send_voice'?'voice':'text',scene:scene+' 已拟台词：'+items.map(x=>x.text).join(' / ').slice(0,500)+'。请自然续'+remaining+'条具体内容，不重复，不自述行程。',
    behavior:c,approvedDecision,turnPlan:{...turnPlan,target:remaining,semicolonBurst:false},relationshipContext,
    profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories});
   items=mergeTaiTurnEntries(items,unpackTaiReply(r2,'noapp'),turnPlan.target);
  }
  if(taiGuidanceNeedsRepair({plan:turnPlan,entries:items,messages:visibleHistory})){
   const r3=await askTai({channel:'noapp',day:initial.day,storyVersion:isStory55(initial)?'55-v1':undefined,recognized:taiRecognized(initial),messages,
    outputMode:approvedDecision?.action==='send_voice'?'voice':'text',
    scene:scene+' 【本轮引导已触发】现有台词：'+items.map(x=>x.text).join(' / ').slice(0,500)+'。只补一条对熙蒙已有事实具体好奇的自然问句，用问号结尾；不要空问“还在吗”“在干嘛”，不要突然谈棋局或自我报备。',
    behavior:c,approvedDecision,turnPlan:{...turnPlan,target:1,guide:true,semicolonBurst:false},relationshipContext,
    profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories});
   const candidate=unpackTaiReply(r3,'noapp').find(x=>/[？?]/.test(x.text));
   if(candidate)items=taiIntegrateGuidingQuestion(items,candidate,turnPlan.target);
  }
  items=dedupeTaiTurnEntries(items,turnPlan.target);
  if(approvedDecision?.action==='send_voice')items=combineTaiVoiceThoughts(items);
  let expected=history(initial).at(-1)?.id,emitted=0;
  const voiceJobs=[];
  for(const item of items){
   if(emitted)await wait(replyDelayMs(item.text,c,{random}));
   const current=store.get();
   if(!eligible(current)||current.day!==initial.day||isTaiReplyPending(store)||history(current).at(-1)?.id!==expected)break;
   if(!emitted&&!force&&!(followup?isTaiFollowupDue(current,{now:now()}):isProactiveMessageDue(current,{now:now()})))break;
   const id=uid();
   const voiceMode=approvedDecision?.action==='send_voice';
   store.update(s=>{
    const target=chat(s);if(!target)return;
    target.messages.push({id,from:'tai',text:item.text,kind:'text',aiTone:item.tone,vocalCue:item.vocalCue&&item.vocalCue!=='none'?item.vocalCue:approvedDecision?.vocal_cue||'none',time:s.clock,day:s.day,sentDate:dateParts(s).iso,
     aiGenerated:true,actual:true,receivedAt:now(),proactive:true,followup,followupSourceId:followup?source.id:undefined,
     voiceRequested:voiceMode});
    if(!isConversationOpen(s,'noapp','tai')){
     target.unread=(target.unread||0)+1;
     s.notifications.unshift({id:'tai-proactive-'+id,conversationId:'tai',title:'陈熙泰',body:item.text,link:{appId:'noapp',route:'/chat/tai',params:{}}});
    }
    if(!emitted)s.events.push({type:followup?'tai_proactive_followup':'tai_proactive_sent',sourceId:source?.id,
     day:s.day,clock:s.clock,receivedAt:now(),testOnly:!!force});
   });
   if(voiceMode)voiceJobs.push({id,text:item.speechText||item.text,tone:item.tone,day:initial.day});
   expected=id;emitted++;
  }
  if(voiceJobs.length)void synthesizeVoiceNotes(store,voiceJobs).catch(error=>console.warn('Tai proactive voice failed:',error?.message));
  if(emitted>0)store.update(s=>{
   s.events??=[];
   s.events.push({type:'tai_v12_turn_plan',channel:'text',day:s.day,clock:s.clock,
    sourceId:source?.id||'proactive',target:turnPlan.target,guided:turnPlan.guide,semicolonBurst:!!turnPlan.semicolonBurst,
    emitted,receivedAt:now(),proactive:true});
  });
  return emitted>0;
 }catch(e){errors.set(store,now());if(force)throw e;console.warn('Xitai proactive message skipped:',e?.message);return false;}
 finally{inFlight.delete(store);}
}
