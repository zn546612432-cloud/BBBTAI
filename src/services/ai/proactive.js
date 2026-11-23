import {isStory55,taiRecognized,final55,completed,nodeStatus} from '../story55/state.js';
import {xitaiRelationshipContext} from './relationship-context.js';
import {taiRelationshipDirector} from './relationship-director.js';
import {romanceSceneAwaitingPlayer} from './romance-scene/index.js';
import {aiStatus,askTai,chooseTaiAction} from './gateway.js';
import {captureTaiWorldbook} from './worldbook/index.js';
import {rememberTaiMood} from './worldbook/mood.js';
import {rememberTaiDelivered} from './memory.js';
import {unpackTaiReply} from './format.js';
import {taiBehavior,replyDelayMs} from './behavior.js';
import {isTaiReplyPending} from './live-chat.js';
import {prepareTaiVoice} from './voice-delivery.js';
import {taiSocialEnergy,canTaiCall,socialEnergyPrompt} from './social-energy.js';
import {hasBannedTaiConstruction} from './expression-style.js';
import {taiDisplayName} from '../../apps/noapp/contact.js';
import {startIncoming,callState} from '../../apps/noapp/voice-call.js';
import {uid} from '../id.js';
import {dateParts} from '../calendar.js';
import {taiPresence} from '../presence.js';
import {visibleMessages,isConversationOpen} from '../messaging/delivery.js';
import {combineTaiVoiceThoughts} from './voice-request-v11.js';
import {researchTaiPhone} from './phone-mcp/curiosity.js';
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
 const p=taiPresence(s);
 return taiRecognized(s)&&(isStory55(s)?!final55(s):s.day<90)&&!s.poweredOff&&s.powerMode==='idle'&&p.contactable&&['online','busy'].includes(p.status);
}
function elapsed(s,entry,c,now){
 if(c.triggerClock==='real'&&entry.receivedAt)return Math.max(0,(now-entry.receivedAt)/60000);
 // Old saves have game timestamps only. New real-time events carry receivedAt.
 return Math.max(0,stamp(s)-stamp(entry));
}
function paused(s){
 // The author-written optional NoApp dialogue is controlled by the existing
 // Story55 queue. Proactive DeepSeek must not interrupt its fixed lines.
 if(isStory55(s)&&!completed(s,'d54-paris-future')&&
  (nodeStatus(s,'d54-paris-future').state==='ready'||
   (s.story55?.scenes?.['d54-paris-future']?.index||0)>0))return true;
 // A two-person scene is waiting for the player; automatic outreach would
 // write the next line for them and spoil the authored pause.
 if(romanceSceneAwaitingPlayer(history(s)))return true;
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
export async function maybeSendProactive(store,{force='',postCall=null,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),random=Math.random,now=Date.now}={}){
 if(inFlight.has(store)||isTaiReplyPending(store)||!force&&now()-(errors.get(store)||0)<60000)return false;
 const initial=store.get(),c=taiBehavior(initial),source=sourceForFollowup(initial);
 const afterCall=force==='postcall'&&postCall?.kind==='call'&&postCall.callStatus==='ended'&&postCall.endedBy==='player'&&postCall.endReason==='manual';
 if(force==='postcall'&&(!afterCall||chat(initial)?.messages.at(-1)?.id!==postCall.id||initial.events.some(e=>e.type==='tai_postcall_handled'&&e.sourceId===postCall.id)))return false;
 const followup=force==='followup'||!force&&isTaiFollowupDue(initial,{now:now()});
 if(!eligible(initial)||!chat(initial)||force==='followup'&&!source||!force&&!followup&&!isProactiveMessageDue(initial,{now:now()}))return false;
 if(typeof document!=='undefined'&&!force&&(document.hidden||document.activeElement?.matches?.('.composer input,.composer textarea')))return false;
 inFlight.add(store);
 try{
  const status=await aiStatus();if(!status.deepseek)throw Error('DeepSeek 未连接');
  const allowVoice=!afterCall&&!!status.minimax&&c.autonomousVoice&&taiSocialEnergy(initial,'message').stage==='normal';
  const messages=history(initial).slice(-12).map(m=>({role:m.from==='me'?'user':'assistant',content:String(m.voiceCaption||m.text).slice(0,1200)}));
  let scene=afterCall?'【真實通話回執】熙蒙親自按下掛斷鍵。實際聽見的通話如下：\n'+String(postCall.transcript||'（沒有已播放對白）').slice(0,900)+'\n判斷是否正常告別或突然中斷，若正常則不發；若確有話沒說完、對方突然終止或自己說重了，可以發一至三條實際文字，語氣符合此刻的心情。不能把按鍵者直接等同於過錯者。不發語音、不另撥電話。':followup
   ?`你上次发给熙蒙的消息是「${source.text.slice(0,200)}」。已经等了${Math.floor(elapsed(initial,source,c,now()))}分钟（${c.triggerClock==='real'?'现实':'游戏'}），他还没回复。可以选择不发、适度关心，或补充真正没说完的内容；不要报备自己的行程，也不要机械催促。这次最多跟进一次。`
   :'熙泰考虑是否主动联系熙蒙。只关注熙蒙真实提过、尚有意义的具体经历、技术进展、困难、家人或约定；也可以决定不联系。不要主动汇报自己的行程、健身、酒店、研究或社交。不主动重提或邀请国际象棋，棋局只能由固定剧情触发。不能虚构对方经历或擅自执行剧情。';
  // On an already-due proactive turn, he may very occasionally inspect a
  // topic from actual past dialogue. No background polling or 24/7 watcher.
  const userSource=history(initial).filter(m=>m.from==='me').at(-1);
  const phoneEvidence=!afterCall&&userSource?await researchTaiPhone(store,{
   text:String(userSource.text||''),sourceMessageId:'proactive-'+String(userSource.id||''),
   random,now
  }):null;
  if(phoneEvidence&&eligible(store.get())&&store.get().day===initial.day)scene+='\\n'+phoneEvidence;
  scene=[socialEnergyPrompt(initial,'message'),socialEnergyPrompt(initial,'call'),scene].filter(Boolean).join('\n');
  messages.push({role:'user',content:'[游戏系统事件，非熙蒙台词：'+scene+']'});
  const relationshipContext=xitaiRelationshipContext(initial,{mode:'text'});
  const relationshipPlan=taiRelationshipDirector(initial,{initiative:true});
  const worldbookEvents=afterCall?['call_ended_player','social_energy']:['proactive','social_energy'];
  const turnId=afterCall?'postcall:'+postCall.id:`proactive:${initial.day}:${initial.clock}:${history(initial).at(-1)?.id||''}`;
  const worldbookSnapshot=captureTaiWorldbook(store,{channel:'noapp',day:initial.day,recognized:taiRecognized(initial),messages,outputMode:'text',scenario:scene,worldbookEvents,trigger:'quiet',turnId,messageIndex:history(initial).length});
  const decision=await chooseTaiAction({channel:'noapp',day:initial.day,recognized:taiRecognized(initial),messages,outputMode:'text',scene,worldbookEvents,worldbookSnapshot,
   relationshipContext,sourceMessageId:afterCall?postCall.id:'',hasIncoming:false,allowDefer:false,allowVoice,
   allowCall:!afterCall&&canTaiCall(initial)&&!!status.minimax&&!['ringing','dialing','connected'].includes(callState().state)});
  if(afterCall){if(!decision||chat(store.get())?.messages.at(-1)?.id!==postCall.id||isTaiReplyPending(store)||['ringing','dialing','connected'].includes(callState().state))return false;store.update(s=>{s.events.push({type:'tai_postcall_handled',sourceId:postCall.id,day:s.day,clock:s.clock,responsibility:decision.call_responsibility,reason:decision.call_reason});});}
  if(decision&&eligible(store.get())&&history(store.get()).at(-1)?.id===history(initial).at(-1)?.id)rememberTaiMood(store,decision,turnId,{evidence:afterCall?postCall.transcript:''});
  if(decision?.action==='end_session'){
   if(!afterCall)store.update(s=>s.events.push({type:'tai_proactive_skipped',day:s.day,clock:s.clock,receivedAt:now()}));
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
  const turnPlan=sampleTaiTurnPlan({random,maxMessages:afterCall?3:followup?2:c.maxMessages,messages:visibleHistory,
   mode:approvedDecision?.action==='send_voice'?'voice':'text'});
  const r=await askTai({channel:'noapp',day:initial.day,storyVersion:isStory55(initial)?'55-v1':undefined,recognized:taiRecognized(initial),messages,
   outputMode:approvedDecision?.action==='send_voice'?'voice':'text',scene,behavior:c,allowVoice,approvedDecision,turnPlan,worldbookEvents,worldbookSnapshot,
   relationshipContext,profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories,relationshipPlan});
  let items=dedupeTaiTurnEntries(unpackTaiReply(r,'noapp'),turnPlan.target);
  if(!afterCall&&taiTurnNeedsMore({plan:turnPlan,entries:items,messages:visibleHistory,
   action:approvedDecision?.action==='send_voice'?'send_voice':'send_text'})){
   const remaining=turnPlan.target-items.length;
   const r2=await askTai({channel:'noapp',day:initial.day,storyVersion:isStory55(initial)?'55-v1':undefined,recognized:taiRecognized(initial),messages,
    outputMode:approvedDecision?.action==='send_voice'?'voice':'text',scene:scene+' 已拟台词：'+items.map(x=>x.text).join(' / ').slice(0,500)+'。请自然续'+remaining+'条具体内容，不重复，不自述行程。',
    behavior:c,allowVoice,approvedDecision,turnPlan:{...turnPlan,target:remaining,semicolonBurst:false},relationshipContext,worldbookEvents,worldbookSnapshot,
    profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories,relationshipPlan});
   items=mergeTaiTurnEntries(items,unpackTaiReply(r2,'noapp'),turnPlan.target);
  }
  if(!afterCall&&taiGuidanceNeedsRepair({plan:turnPlan,entries:items,messages:visibleHistory})){
   const r3=await askTai({channel:'noapp',day:initial.day,storyVersion:isStory55(initial)?'55-v1':undefined,recognized:taiRecognized(initial),messages,
    outputMode:approvedDecision?.action==='send_voice'?'voice':'text',
    scene:scene+' 【本轮引导已触发】现有台词：'+items.map(x=>x.text).join(' / ').slice(0,500)+'。只补一条对熙蒙已有事实具体好奇的自然问句，用问号结尾；不要空问“还在吗”“在干嘛”，不要突然谈棋局或自我报备。',
    behavior:c,allowVoice,approvedDecision,turnPlan:{...turnPlan,target:1,guide:true,semicolonBurst:false},relationshipContext,worldbookEvents,worldbookSnapshot,
    profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories,relationshipPlan});
   const candidate=unpackTaiReply(r3,'noapp').find(x=>/[？?]/.test(x.text));
   if(candidate)items=taiIntegrateGuidingQuestion(items,candidate,turnPlan.target);
  }
  items=dedupeTaiTurnEntries(items,turnPlan.target);
  if(approvedDecision?.action==='send_voice'||!approvedDecision&&allowVoice&&items.every(m=>m.mode==='voice'))items=combineTaiVoiceThoughts(items);
  if((hasBannedTaiConstruction(items.map(e=>e.text))||hasBannedTaiConstruction(items.map(e=>e.speechText||e.text))))return false;
  let expected=history(initial).at(-1)?.id,emitted=0;
  for(const item of items){
   if(emitted)await wait(replyDelayMs(item.text,c,{random}));
   const current=store.get();
   if(!eligible(current)||current.day!==initial.day||isTaiReplyPending(store)||history(current).at(-1)?.id!==expected)break;
   if(!emitted&&!force&&!(followup?isTaiFollowupDue(current,{now:now()}):isProactiveMessageDue(current,{now:now()})))break;
   const id=uid();
   const voiceMode=approvedDecision?approvedDecision.action==='send_voice':allowVoice&&item.mode==='voice';
   let message={id,from:'tai',text:item.text,kind:'text',aiTone:item.tone,vocalCue:item.vocalCue&&item.vocalCue!=='none'?item.vocalCue:approvedDecision?.vocal_cue||'none',aiGenerated:true,actual:true,proactive:true,followup,followupSourceId:followup?source.id:undefined,voiceRequested:false};
   if(voiceMode)message=await prepareTaiVoice(message,{speechText:item.speechText||item.text,tone:item.tone,store});
   const after=store.get();
   if(!eligible(after)||after.day!==initial.day||isTaiReplyPending(store)||history(after).at(-1)?.id!==expected||afterCall&&['ringing','dialing','connected'].includes(callState().state))break;
   store.update(s=>{
    const target=chat(s);if(!target)return;
    target.messages.push({...message,time:s.clock,day:s.day,sentDate:dateParts(s).iso,receivedAt:now()});
    rememberTaiDelivered(s,message.voiceCaption||message.text,{sourceId:id});
    if(!isConversationOpen(s,'noapp','tai')){
     target.unread=(target.unread||0)+1;
     s.notifications.unshift({id:'tai-proactive-'+id,conversationId:'tai',title:taiDisplayName(s),body:message.kind==='voice'?'語音訊息':message.text,link:{appId:'noapp',route:'/chat/tai',params:{}}});
    }
    if(!emitted)s.events.push({type:afterCall?'tai_postcall_sent':followup?'tai_proactive_followup':'tai_proactive_sent',sourceId:afterCall?postCall.id:source?.id,
     day:s.day,clock:s.clock,receivedAt:now(),testOnly:!!force&&!afterCall});
   });
   expected=id;emitted++;
  }
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
