import {isStory55,taiRecognized} from '../story55/state.js';
import {unheardReply} from '../voice/unheard.js';
import {xitaiRelationshipContext} from './relationship-context.js';
import {uid} from '../id.js';
import {dateParts} from '../calendar.js';
import {absoluteMinute} from '../../system/time/clock.js';
import {hasBannedTaiConstruction,isTaiDirectAffectionRequest,TAI_DIRECT_AFFECTION_LINE,TAI_DIRECT_AFFECTION_PROMPT} from './expression-style.js';
import {taiDisplayName,markTaiRead} from '../../apps/noapp/contact.js';
import {taiPresence,markTaiEngaged} from '../presence.js';
import {isConversationOpen,visibleMessages} from '../messaging/delivery.js';
import {deathLocked} from '../../system/power/story.js';
import {aiStatus,askTai,chooseTaiAction,apiConfig} from './gateway.js';
import {prepareTaiVoice,waitForTaiVoiceQueue,voiceFailureLine} from './voice-delivery.js';
import {taiSocialEnergy,canTaiCall,socialEnergyPrompt} from './social-energy.js';
import {unpackTaiReply} from './format.js';
import {callBridgeNote,isRecentTaiCall,shouldRecallTaiCall} from './humanize.js';
import {captureTaiWorldbook} from './worldbook/index.js';
import {rememberTaiMood} from './worldbook/mood.js';
import {rememberTaiConversation,rememberTaiDelivered} from './memory.js';
import {taiBehavior,replyDelayMs} from './behavior.js';
import {taiPlayerRequestedCall,taiPlayerDeclinedCall,taiShouldCallAfterText,taiCallAvailabilityQuestion,taiShortCallBoundaryPrompt,shortTaiCallReply,taiExistingCallReply} from './call-intent.js';
import {startIncoming,callState} from '../../apps/noapp/voice-call.js';
import {taiMomentumPrompt,needsTaiMomentumRepair} from './conversation-momentum-v11.js';
import {taiExplicitVoiceRequest,honorTaiVoiceRequest,combineTaiVoiceThoughts} from './voice-request-v11.js';
import {sampleTaiTurnPlan,taiTurnNeedsMore,mergeTaiTurnEntries,dedupeTaiTurnEntries,taiGuidanceNeedsRepair,taiIntegrateGuidingQuestion} from './conversation-shape-v12.js';
import {researchTaiPhone} from './phone-mcp/curiosity.js';
import {incomingTaiBatch,incomingBatchPrompt,TAI_INCOMING_QUIET_MS} from './incoming-turn.js';
import {taiRelationshipDirector} from './relationship-director.js';
import {selectTaiMemoryPreset,alreadyRecentlyUsedTaiPreset} from '../../apps/noapp/memory-replies.js';
import {musicListeningContext} from '../../apps/music/features/shared/listening.js';

const conversation=s=>s.content.conversations.noapp?.find(c=>c.id==='tai');
function finishSilentTaiTurn(store,sourceId,now){
 store.update(s=>{markTaiRead(s,sourceId,now());const m=conversation(s)?.messages.find(x=>x.id===sourceId);if(m)m.taiHandledAction='read_no_reply';
  s.events.push({type:'tai_action_read_no_reply',sourceId,day:s.day,clock:s.clock});});
 return {status:'read_no_reply',count:0};
}
const replyAfter=(c,id)=>{
 if(!c)return true;
 if(c.messages.some(m=>m.from==='tai'&&m.replySourceId===id))return true;
 const source=c.messages.find(m=>m.id===id);
 const messages=visibleMessages(c).filter(m=>!m.demo&&(!Number.isInteger(source?.day)||!Number.isInteger(m.day)||m.day<=source.day));
 const i=messages.findIndex(m=>m.id===id);
 return i<0||messages.slice(i+1).some(m=>m.from!=='me'&&m.kind!=='app_invitation');
};
const pendingRequests=new WeakSet();
export const isTaiReplyPending=store=>pendingRequests.has(store);
export function isCurrentTaiTurn(s,sourceMessageId,day){
 const c=conversation(s);
 const source=c?.messages.find(m=>m.id===sourceMessageId);
 return !!c&&source?.taiHandledAction!=='absorbed_by_call'&&s.day===day&&!deathLocked(s)&&!s.poweredOff&&s.powerMode==='idle'&&
  taiPresence(s).contactable&&visibleMessages(c).filter(m=>m.from==='me'&&!m.demo&&m.day<=s.day).at(-1)?.id===sourceMessageId;
}
// Recover persisted deferrals after a page reload while the game is active.
// New deferrals follow the game clock; old wall-clock saves remain readable.
const deferredResumes=new WeakSet(),deferredFailures=new WeakMap();
export function maybeResumeTaiDeferred(store,{now=Date.now,wait}={}){
 const current=store.get(),c=conversation(current);
 if(!c||deferredResumes.has(store)||pendingRequests.has(store)||now()<(deferredFailures.get(store)||0))return false;
 if(!taiRecognized(current)||deathLocked(current)||current.poweredOff||current.powerMode!=='idle')return false;
 const source=visibleMessages(c).filter(m=>m.from==='me'&&!m.demo&&m.actual!==false&&m.day<=current.day).at(-1);
 if(!source?.taiPending&&!source?.taiDeferredUntil&&!source?.taiDeferredGameMinute)return false;
 if(source.receivedAt&&now()-source.receivedAt<TAI_INCOMING_QUIET_MS)return false;
 if(source.taiDeferredUntil>now()||source.taiDeferredGameMinute>absoluteMinute(current)||source.taiHandledAction||replyAfter(c,source.id))return false;
 const presence=taiPresence(current);
 if(!presence.contactable||presence.status==='away')return false;
 deferredResumes.add(store);
 const task=replyToTaiMessage(store,source.id,{retryDeferred:!!(source.taiDeferredGameMinute||source.taiDeferredUntil),now,...(wait?{wait}:{})}).catch(error=>{
  deferredFailures.set(store,now()+60000);
  console.warn('Tai persisted deferred reply retry failed:',error?.message);
 }).finally(()=>deferredResumes.delete(store));
 return task;
}

export function synthesizeVoiceNotes(){return waitForTaiVoiceQueue();}

export async function replyToTaiMessage(store,sourceMessageId,{wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),random=Math.random,now=Date.now,refresh=()=>{},retryDeferred=false,onTyping=()=>{}}={}){
 const initial=store.get(),c=conversation(initial);
 if(!c||!c.messages.some(m=>m.id===sourceMessageId)||replyAfter(c,sourceMessageId)||c.messages.some(m=>m.id===sourceMessageId&&['read_no_reply','end_session','start_call','absorbed_by_call'].includes(m.taiHandledAction))||initial.events?.some(e=>e.type==='tai_text_call_trigger'&&e.sourceId===sourceMessageId))return {status:'scripted'};
 const pendingSource=c.messages.find(m=>m.id===sourceMessageId);
 if(pendingSource?.taiDeferredUntil&&now()<pendingSource.taiDeferredUntil)return {status:'deferred',retryAfterMs:pendingSource.taiDeferredUntil-now()};
 if(pendingSource?.taiDeferredGameMinute>absoluteMinute(initial))return {status:'deferred'};
 if(!taiRecognized(initial)||deathLocked(initial))return {status:'unavailable',message:'当前剧情暂不能回复'};
 const presence=taiPresence(initial);
 if(!presence.contactable||presence.status==='away'){
  store.update(s=>{const m=conversation(s)?.messages.find(x=>x.id===sourceMessageId);if(m)m.taiPending=true;});
  return {status:'offline',message:'熙泰暫時不在線，訊息已保存'};
 }
 markTaiEngaged();
 if(pendingRequests.has(store))return {status:'busy',message:'熙泰正在输入'};
 const history=visibleMessages(c).filter(m=>!m.demo&&m.day<=initial.day);
 const batch=incomingTaiBatch(history,sourceMessageId);
 // A bare share is an ordinary acknowledgment, not an invitation to quiz the
 // sender. Persist delivery through the same receipt/notification path.
 const activeReply=taiExistingCallReply(pendingSource?.voiceCaption||pendingSource?.text,callState().state);
 if(activeReply||pendingSource?.kind==='music'&&batch.every(m=>m.kind==='music')){
  pendingRequests.add(store);
  try{
   const text=activeReply||(presence.status==='busy'?'等會聽':'好');
   await wait(replyDelayMs(text,taiBehavior(initial),{first:true,random}));
   if(!isCurrentTaiTurn(store.get(),sourceMessageId,initial.day)||replyAfter(conversation(store.get()),sourceMessageId))return {status:'superseded'};
   const id=uid();store.update(s=>{const target=conversation(s);if(!target)return;
    markTaiRead(s,sourceMessageId,now());
    target.messages.push({id,from:'tai',text,kind:'text',actual:true,replySourceId:sourceMessageId,day:s.day,time:s.clock,sentDate:dateParts(s).iso,receivedAt:now()});
    if(!isConversationOpen(s,'noapp','tai')){target.unread=(target.unread||0)+1;s.notifications.unshift({id:'tai-reply-'+id,conversationId:'tai',title:taiDisplayName(s),body:text,link:{appId:'noapp',route:'/chat/tai',params:{}}});}
   });return {status:'replied',count:1,text};
  }finally{pendingRequests.delete(store);}
 }
 if(pendingSource?.kind==='image'){store.update(s=>{markTaiRead(s,sourceMessageId,now());const m=conversation(s)?.messages.find(x=>x.id===sourceMessageId);if(m)m.taiHandledAction='read_no_reply';});return {status:'read_no_reply',count:0};}
 // Only author-confirmed facts already unlocked by the real Story55 scenes
 // bypass DeepSeek. No action/voice/call requests can be handled by this path.
 const memoryPreset=batch.length<=1&&pendingSource?.kind!=='voice'
  ?selectTaiMemoryPreset(initial,pendingSource?.text):null;
 if(memoryPreset&&!alreadyRecentlyUsedTaiPreset(history,memoryPreset.id)&&!['connected','ringing','dialing'].includes(callState().state)){
  pendingRequests.add(store);
  try{
   await wait(280);
   if(!isCurrentTaiTurn(store.get(),sourceMessageId,initial.day)||replyAfter(conversation(store.get()),sourceMessageId))return {status:'superseded'};
   const id=uid(),text=memoryPreset.text;
   store.update(s=>{
    const target=conversation(s);if(!target)return;
    markTaiRead(s,sourceMessageId,now());
    target.messages.push({id,from:'tai',text,kind:'text',actual:true,aiPresetId:memoryPreset.id,replySourceId:sourceMessageId,day:s.day,time:s.clock,sentDate:dateParts(s).iso,receivedAt:now()});
    rememberTaiDelivered(s,text,{sourceId:id});
    if(!isConversationOpen(s,'noapp','tai')){target.unread=(target.unread||0)+1;s.notifications.unshift({id:'tai-reply-'+id,conversationId:'tai',title:taiDisplayName(s),body:text,link:{appId:'noapp',route:'/chat/tai',params:{}}});}
   });
   return {status:'replied',count:1,text,presetId:memoryPreset.id};
  }finally{pendingRequests.delete(store);}
 }
 const messages=visibleMessages(c).filter(m=>m.kind!=='image'&&m.kind!=='app_invitation'&&!m.demo&&typeof m.text==='string'&&m.text.trim()&&m.day<=initial.day&&(m.kind!=='call'||shouldRecallTaiCall(m,initial,pendingSource?.voiceCaption||pendingSource?.text)))
  .slice(-20).map(m=>m.kind==='call'?{role:'user',content:callBridgeNote(m,initial)||m.text}:({role:m.from==='me'?'user':'assistant',content:m.kind==='voice'?m.voiceCaption||'[语音消息；未提供转写，无法识别内容]':m.text.slice(0,2000)})).filter(m=>m.content);
 if(messages.at(-1)?.role!=='user')return {status:'scripted'};
 pendingRequests.add(store);
 store.update(s=>{const m=conversation(s)?.messages.find(x=>x.id===sourceMessageId);if(m)m.taiPending=true;});
 const startedAt=now(),behavior=taiBehavior(initial);
 try{
  const source=c.messages.find(m=>m.id===sourceMessageId);
  const unheard=source?.kind==='voice'&&!source?.voiceCaption;
  const status=unheard?{}:await aiStatus();if(!unheard&&!status.deepseek)throw Error('请在 NoApp 的 AI 设置中输入 DeepSeek Key');
  const lastUser=source?.voiceCaption||source?.text||'';
  const batchText=batch.map(m=>m.voiceCaption||m.text).filter(Boolean).join('\n')||lastUser;
  const musicContext=musicListeningContext(history,batchText);
  const consolidated=batch.length>1||!!musicContext;
  const directAffection=!unheard&&isTaiDirectAffectionRequest(lastUser);
  const relationshipPlan=taiRelationshipDirector(initial,{input:lastUser});
  const approvedAffection=directAffection&&relationshipPlan.canDeclareLove;
  // A telephone request is not a request for one prerecorded voice bubble.
  const requestedCall=taiPlayerRequestedCall(lastUser);
  const shortCallReply=requestedCall||taiCallAvailabilityQuestion(lastUser);
  const voiceRequested=!directAffection&&!requestedCall&&taiExplicitVoiceRequest(lastUser);
  const voiceEnergy=taiSocialEnergy(initial,'message'),callAllowed=canTaiCall(initial);
  const socialRefusal=requestedCall&&!callAllowed?'現在不方便打電話，晚點再說。':voiceRequested&&voiceEnergy.stage==='rest'?'現在不方便發語音，打字說。':'';
  const lastCallIndex=c.messages.findLastIndex(m=>m.kind==='call'&&m.callStatus==='ended');
  const lastEndedCall=lastCallIndex>=0?c.messages[lastCallIndex]:null;
  const messagesAfterCall=lastCallIndex<0?[]:c.messages.slice(lastCallIndex+1).filter(m=>m.from==='me'&&m.actual!==false);
  const callActive=['connected','ringing','dialing'].includes(callState().state);
  const firstTextAfterCall=!callActive&&!!lastEndedCall&&isRecentTaiCall(lastEndedCall,initial)&&messagesAfterCall[0]?.id===sourceMessageId;
  const worldbookEvents=[batch.length>1?'incoming_batch':null,musicContext?'music_context':null,voiceRequested?'voice_requested':null,requestedCall?'call_requested':null,
   firstTextAfterCall?({player:'call_ended_player',tai:'call_ended_tai',connection_error:'call_ended_error'}[lastEndedCall.endedBy]):null,'social_energy'].filter(Boolean);
  // After a real hangup, the first new line is TEXT unless the player
  // explicitly asks for a fresh voice note or another phone call.
  const voiceAvailable=!!status.minimax&&voiceEnergy.remaining>0;
  const allowVoice=!callActive&&!directAffection&&!shortCallReply&&voiceAvailable&&(voiceRequested||behavior.autonomousVoice&&voiceEnergy.stage==='normal')&&(!firstTextAfterCall||voiceRequested);
  const voiceTurn=!callActive&&(unheard?!!apiConfig().minimax&&voiceEnergy.remaining>0:voiceAvailable&&voiceRequested);
  const postCallTextContext=callActive?'【當前真實狀態】NoApp 電話尚未結束，熙蒙切回聊天框打字。以文字回答，不要假裝電話已結束、拒絕已接通的電話或承諾另撥。不相關的舊通話不必提起。':lastEndedCall&&isRecentTaiCall(lastEndedCall,initial)?
   '【当前媒介核验】刚刚的 NoApp 电话已经真正结束。'+
   (lastEndedCall.endedBy==='player'?'是熙蒙自己按了挂断键。':lastEndedCall.endedBy==='tai'?'是你陈熙泰自己按了挂断键。':lastEndedCall.endedBy==='connection_error'?'连接异常导致电话断开，不是任何一方主动挂断。':'系统已结束电话。')+
   '熙蒙现在是在 NoApp 私聊框打字，而不是在电话里继续说话，更不是挂断后还能传输电话语音。你只通过文字回复，不要把通话中未听到的内容当作真实发言。':
   '【当前媒介核验】现在是 NoApp 文字聊天，不是电话。';
  const request={day:initial.day,channel:'noapp',storyVersion:isStory55(initial)?'55-v1':undefined,recognized:taiRecognized(initial),messages,outputMode:voiceTurn?'voice':'text',
   behavior,allowVoice,worldbookEvents,
   scene:postCallTextContext+(firstTextAfterCall?' 【刚挂电话后第一条文字】优先给出针对性的完整回应，不执行文字气泡数抽签，也不主动发送一条新语音或发起新来电，除非熙蒙明确要求。':'')+' 熙蒙刚通过文字聊天发来：'+String(lastUser).slice(0,400)+'。认真接住他的意思：能继续聊就给具体内容，不用把一段完整想法拆成四个只有几个字的短气泡，也不要反复换词重复同一件事。你可以发表实际看法、适度解释、主动推进话题，有时候说几句完整的话；简单回应仍可短。'+taiMomentumPrompt(messages,{mode:'text'})+(voiceRequested&&voiceAvailable?' 熙蒙明确希望收到一条可播放的语音消息，不是只要你用文字说几句。如果你愿意回应且MiniMax可用，优先选择真正的send_voice；确实不愿意可明说，不要用文字冒充语音。':'')+(requestedCall?' 如果你同意现在立刻给熙蒙打电话，回复的最后一项必须以 (phone) 开头，后面写接通时你准备说的第一句话，不要把「我现在打」当普通文字就结束；如果不方便就正常发文字说明，不要用 (phone)。':''),
   callActive,relationshipContext:xitaiRelationshipContext(initial,{mode:'text',callActive}),
   profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories,relationshipPlan};
  request.scene+='\n'+incomingBatchPrompt(batch)+(musicContext?'\n'+musicContext:'');
  request.scene=[socialEnergyPrompt(initial,'message'),socialEnergyPrompt(initial,'call'),request.scene].filter(Boolean).join('\n');
  if(batch.length>1)request.scene+='\n【本輪完整連發】\n'+batchText.slice(-4000);
  if(shortCallReply)request.scene+='\n'+taiShortCallBoundaryPrompt;
  if(approvedAffection){request.scene=TAI_DIRECT_AFFECTION_PROMPT+'\n'+request.scene;request.directAffection=true;}
  const availableCall=!['ringing','dialing','connected'].includes(callState().state);
  if(!unheard)request.worldbookSnapshot=captureTaiWorldbook(store,{...request,turnId:'text:'+sourceMessageId,messageIndex:visibleMessages(c).length,characterDescription:Object.entries(initial.aiDraft?.profile||{}).filter(([k])=>k!=='story').map(([,v])=>v).join('\n'),scenario:request.scene});
  let decision=unheard||socialRefusal?null:await chooseTaiAction({...request,sourceMessageId,hasIncoming:true,
   allowCall:callAllowed&&!directAffection&&availableCall&&!!status.minimax&&(!firstTextAfterCall||requestedCall),allowVoice,
   allowDefer:!retryDeferred&&!(source?.taiDeferredCount>0),
   playerDeclinedCall:taiPlayerDeclinedCall(lastUser)});
  decision=honorTaiVoiceRequest(decision,{text:lastUser,available:voiceAvailable});
  if(!unheard&&decision?.action!=='defer_reply'&&isCurrentTaiTurn(store.get(),sourceMessageId,initial.day)&&!replyAfter(conversation(store.get()),sourceMessageId)){
   store.update(s=>rememberTaiConversation(s,batchText,{sourceId:sourceMessageId}));
   if(decision)rememberTaiMood(store,decision,'text:'+sourceMessageId,{evidence:lastUser});
  }
  if(decision&&['read_no_reply','defer_reply','end_session','start_call'].includes(decision.action)){
   if(!isCurrentTaiTurn(store.get(),sourceMessageId,initial.day)||replyAfter(conversation(store.get()),sourceMessageId))return {status:'superseded'};
   if(decision.action==='start_call'){
    const called=startIncoming({store,refresh},'陈熙泰发起语音通话',{reason:'【熙泰本轮主动决定来电】'+(decision.intent||'想亲自听熙蒙说话'),requestedByPlayer:requestedCall});
    if(called){store.update(s=>{const m=conversation(s)?.messages.find(x=>x.id===sourceMessageId);if(m){markTaiRead(s,sourceMessageId,now());m.taiHandledAction='start_call';}
      s.events.push({type:'tai_text_call_trigger',sourceId:sourceMessageId,day:s.day,clock:s.clock,protocol:'v10'});});
     return {status:'called',count:0,action:'start_call'};}
    // A failed real call is NOT replaced by a false spoken promise.
   }else if(decision.action==='defer_reply'){
    const until=absoluteMinute(store.get())+Math.max(1,Math.ceil(decision.delay_seconds/60));
    store.update(s=>{const m=conversation(s)?.messages.find(x=>x.id===sourceMessageId);if(m){delete m.taiDeferredUntil;m.taiDeferredGameMinute=until;m.taiDeferredCount=(m.taiDeferredCount||0)+1;}
     s.events.push({type:'tai_deferred_reply',sourceId:sourceMessageId,day:s.day,clock:s.clock,dueAt:until});});
    return {status:'deferred'};
   }else{
    store.update(s=>{const m=conversation(s)?.messages.find(x=>x.id===sourceMessageId);if(m){markTaiRead(s,sourceMessageId,now());m.taiHandledAction=decision.action;}
     s.events.push({type:'tai_action_'+decision.action,sourceId:sourceMessageId,day:s.day,clock:s.clock});});
    return {status:decision.action,count:0};
   }
  }
  const actualDecision=decision?.action==='start_call'?null:decision;
  if(actualDecision){request.approvedDecision=actualDecision;
   request.outputMode=actualDecision.action==='send_voice'?'voice':'text';}
  // V12 is sampled ONLY for an actual speaking action, never for read/no-reply,
  // a scripted message, an unheard voice, or an explicit call request.
  const turnPlan=!socialRefusal&&!consolidated&&!directAffection&&!unheard&&!shortCallReply&&!firstTextAfterCall?sampleTaiTurnPlan({random,maxMessages:behavior.maxMessages,messages,
   mode:request.outputMode==='voice'?'voice':'text'}):null;
  if(turnPlan)request.turnPlan=turnPlan;
  // A real but rare tool lookup, scoped to the user's CURRENT visible save.
  // It is not a background watcher and never reads schedule / future story data.
  const observed=!socialRefusal&&!directAffection&&!unheard&&!shortCallReply&&!firstTextAfterCall?await researchTaiPhone(store,{
   text:lastUser,sourceMessageId,random,now
  }):null;
  if(observed&&isCurrentTaiTurn(store.get(),sourceMessageId,initial.day)){
   request.scene+='\\n'+observed;
  }
  if(!isCurrentTaiTurn(store.get(),sourceMessageId,initial.day))return {status:'superseded'};
  store.update(s=>markTaiRead(s,sourceMessageId,now(),{keepPending:true}));
  if(!unheard)onTyping();
  const result=unheard||socialRefusal?null:await askTai({...request,relationshipContext:xitaiRelationshipContext(store.get(),{mode:'text',callActive})});
  if(approvedAffection){
   if(!isCurrentTaiTurn(store.get(),sourceMessageId,initial.day)||replyAfter(conversation(store.get()),sourceMessageId))return {status:'superseded'};
   if(!result?.directAffectionAccepted)return finishSilentTaiTurn(store,sourceMessageId,now);
  }
  let draftEntries=socialRefusal?[{text:socialRefusal,mode:'text',tone:'neutral'}]:approvedAffection?[{text:TAI_DIRECT_AFFECTION_LINE,mode:'text',tone:'neutral'}]:unheard?[unheardReply(sourceMessageId)]:dedupeTaiTurnEntries(unpackTaiReply(result,'noapp'));
  // A bare mirrored greeting is a model-continuation artifact, not a choice
  // rooted in Tai's personality. Repair it only when he replied with nothing
  // but the exact same greeting; preserve other genuine one-line replies.
  const greeting=s=>/^(?:hi|hello|hey|嗨|你好)[!！?.。\s]*$/i.test(String(s||'').trim());
  if(!unheard&&greeting(lastUser)&&draftEntries.length===1&&
    draftEntries[0].text.trim().toLowerCase().replace(/[!！?.。\s]/g,'')===
    lastUser.trim().toLowerCase().replace(/[!！?.。\s]/g,'')){
    const retry=await askTai({...request,scene:request.scene+' 上一稿只机械复述了对方的问候词，请按你当前生活和态度自然接话，仍可以短，不要机械复制。'});
    draftEntries=dedupeTaiTurnEntries(unpackTaiReply(retry,'noapp'));
  }
  if(!socialRefusal&&!consolidated&&!directAffection&&!unheard&&!shortCallReply&&needsTaiMomentumRepair({messages,entries:draftEntries,mode:'text'})){
    const retry=await askTai({...request,scene:request.scene+' 上一稿又把话题交还给熙蒙：'+draftEntries.map(x=>x.text).join(' ').slice(0,150)+'。只有在已连续多次追问的情况下才可简短透露一个相关事实，或平静表示希望在见面时再谈，不要机械反问。'});
    if(!isCurrentTaiTurn(store.get(),sourceMessageId,initial.day))return {status:'superseded'};
    draftEntries=dedupeTaiTurnEntries(unpackTaiReply(retry,'noapp'));
  }
  if(turnPlan&&taiTurnNeedsMore({plan:turnPlan,entries:draftEntries,messages,
   action:actualDecision?.action==='send_voice'?'send_voice':'send_text'})){
   // One meaningful continuation attempt. Avoid manufactured filler when the
   // actor has drawn a boundary; don't make more than one extra provider call.
   const remaining=turnPlan.target-draftEntries.length;
   const already=draftEntries.map(x=>x.text).join(' / ').slice(0,650);
   const continuation=await askTai({...request,turnPlan:{...turnPlan,target:remaining,semicolonBurst:false},
    scene:request.scene+' 【本轮自然连发补充】已经拟好并保留的台词：'+already+'。接着这几句再补'+remaining+'条新内容，不重复旧句，不自发报备行程。'+(turnPlan.guide?'本轮引导型人格已触发；前面还没顺势问出具体问题的话，请把一条自然好奇的问题放在补充内容里。':'')+' 如果确实已经结束、需要保护隐私或熙蒙要求别聊，就只输出自然边界，无须凑数。'});
   if(!isCurrentTaiTurn(store.get(),sourceMessageId,initial.day))return {status:'superseded'};
   draftEntries=mergeTaiTurnEntries(draftEntries,unpackTaiReply(continuation,'noapp'),turnPlan.target);
  }
  if(turnPlan&&taiGuidanceNeedsRepair({plan:turnPlan,entries:draftEntries,messages})){
   // Independent guide roll actually affects delivered words, not just a
   // prompt paragraph. Regenerate only one context-grounded question;
   // do not replace any substantive response or invent Ximeng's activities.
   const followup=await askTai({...request,turnPlan:{...turnPlan,target:1,guide:true,semicolonBurst:false},
    scene:request.scene+' 【本轮引导确实触发但上稿尚未问出具体问题】已经拟好的回答：'+draftEntries.map(m=>m.text).join(' / ').slice(0,600)+'。请只给出一条新的、完整且自然的追问，用问号结尾，紧贴熙蒙实际说过的内容，体现真实的好奇；不要问“在干什么”“还有呢”，也不要提国际象棋、自己的行程或不存在的事实。'});
   if(!isCurrentTaiTurn(store.get(),sourceMessageId,initial.day))return {status:'superseded'};
   const candidate=unpackTaiReply(followup,'noapp').find(x=>/[？?]/.test(x.text));
   if(candidate)draftEntries=taiIntegrateGuidingQuestion(draftEntries,candidate,turnPlan.target);
  }
  // A second pass may accidentally repeat the answer in different words.
  // Retain only genuinely new clauses before any text reaches the phone.
  if(!unheard)draftEntries=dedupeTaiTurnEntries(draftEntries);
  if(shortCallReply&&!taiShouldCallAfterText({lastUser,entries:draftEntries}))draftEntries=shortTaiCallReply(draftEntries);
  // One v10 send_voice decision should be one playable MiniMax clip, not
  // five fragile calls. The selected 1-5 thoughts remain audible inside it.
  if(!unheard&&!requestedCall&&(actualDecision?.action==='send_voice'||!actualDecision&&(voiceTurn||allowVoice&&draftEntries.every(m=>m.mode==='voice')))){
   draftEntries=combineTaiVoiceThoughts(draftEntries);
  }
  // Keep an explicit phone action even if the model returned the configured
  // maximum number of text bubbles before it. Never interpret it as a voice
  // bubble; the first phone utterance is played only after the player answers.
  // An unheard voice uses the existing authored network-repair line, not an AI draft.
  if(!unheard&&(hasBannedTaiConstruction(draftEntries.map(e=>e.text))||hasBannedTaiConstruction(draftEntries.map(e=>e.speechText||e.text))))throw Object.assign(Error('Blocked combined dialogue'),{code:'TAI_STYLE'});
  const limit=Math.max(1,behavior.maxMessages);
  const phoneAt=draftEntries.findIndex(item=>item.action==='phone');
  const selected=phoneAt>=limit?[...draftEntries.slice(0,limit-1),draftEntries[phoneAt]]:draftEntries.slice(0,limit);
  const entries=selected.map(item=>actualDecision?
    ({...item,action:undefined,mode:actualDecision.action==='send_voice'?'voice':'text',
      tone:item.tone==='neutral'&&actualDecision.tone!=='neutral'?actualDecision.tone:item.tone,
      ...(actualDecision.action==='send_voice'?{speechText:item.speechText||item.text}:{})}):
    item.action==='phone'?{...item,mode:'text'}:requestedCall?{...item,mode:'text'}:voiceTurn?{...item,mode:'voice',speechText:item.speechText||item.text}:!allowVoice?{...item,mode:'text'}:item);
  const unavailableVoice=!socialRefusal&&voiceRequested&&!status.minimax&&!entries.some(item=>item.action==='phone')&&actualDecision?.strategy!=='set_boundary';
  let emitted=0;
  let phoneCommand=null;
  for(const item of entries){
   if(!isCurrentTaiTurn(store.get(),sourceMessageId,initial.day))break;
   const delay=replyDelayMs(item.text,behavior,{first:emitted===0,random})+(emitted===0&&actualDecision?actualDecision.delay_seconds*1000:0);
   await wait(emitted===0?Math.max(0,delay-(now()-startedAt)):delay);
   const current=store.get(),chat=conversation(current);
   if(!isCurrentTaiTurn(current,sourceMessageId,initial.day))break;
   if(emitted===0&&replyAfter(chat,sourceMessageId))break;
   if(item.action==='phone'){
    phoneCommand=item;
    break;
   }
   const id=uid();
   let msg={id,from:'tai',text:item.text,kind:'text',aiTone:item.tone,vocalCue:item.vocalCue&&item.vocalCue!=='none'?item.vocalCue:actualDecision?.vocal_cue||'none',aiGenerated:true,actual:true,replySourceId:sourceMessageId,voiceRequested:false,...(item.translation?{translation:item.translation}:{})};
   if(item.mode==='voice')msg=await prepareTaiVoice(msg,{speechText:item.speechText||item.text,tone:item.tone,store});
   if(unavailableVoice)msg={...msg,text:voiceFailureLine(id),translation:undefined};
   if(!isCurrentTaiTurn(store.get(),sourceMessageId,initial.day)||emitted===0&&replyAfter(conversation(store.get()),sourceMessageId))break;
   store.update(s=>{
    const target=conversation(s);if(!target)return;
    markTaiRead(s,sourceMessageId,now());
    target.messages.push({...msg,time:s.clock,day:s.day,sentDate:dateParts(s).iso,receivedAt:now()});
    if(!unheard&&!unavailableVoice)rememberTaiDelivered(s,msg.voiceCaption||msg.text,{sourceId:id});
    if(!isConversationOpen(s,'noapp','tai')){
     target.unread=Math.max(0,Number(target.unread)||0)+1;
     s.notifications.unshift({id:'tai-reply-'+id,conversationId:'tai',title:taiDisplayName(s),
       body:msg.kind==='voice'?'語音訊息':msg.text,link:{appId:'noapp',route:'/chat/tai',params:{}}});
    }
   });
   emitted++;
   if(unavailableVoice)break;
  }
  // Make an actual incoming call only after a current, explicit player request
  // AND Tai's last emitted message commits to calling immediately.
  const delivered=conversation(store.get())?.messages.filter(m=>m.replySourceId===sourceMessageId&&m.from==='tai')||[];
  // (phone) has priority over fragile sentence regexes. The old phrase
  // detector remains as compatibility for models that forget the marker.
  const alreadyCalled=store.get().events.some(e=>e.type==='tai_text_call_trigger'&&e.sourceId===sourceMessageId);
  const shouldCall=canTaiCall(store.get())&&!actualDecision&&!alreadyCalled&&!taiPlayerDeclinedCall(lastUser)&&isCurrentTaiTurn(store.get(),sourceMessageId,initial.day)&&(
   !!phoneCommand||emitted>0&&delivered.length===emitted&&taiShouldCallAfterText({lastUser,entries:delivered}));
  let called=false;
  if(shouldCall){
   const reason='【刚才的通话约定】熙蒙刚刚说「'+String(lastUser).slice(0,140)+'」，熙泰决定立即拨号。'+(phoneCommand?.text?'接通后第一句话已准备好。':'文字中明确答应「'+String(delivered.at(-1)?.text||'').slice(0,120)+'」。')+'请自然承接正在发生的话题，不是陌生人初次通话。';
   called=startIncoming({store,refresh},'陈熙泰发起语音通话',{reason,openingText:phoneCommand?.text||'',requestedByPlayer:requestedCall});
   if(called)store.update(s=>s.events.push({type:'tai_text_call_trigger',sourceId:sourceMessageId,day:s.day,clock:s.clock,protocol:phoneCommand?'phone':'legacy'}));
  }
  // Developer-only audit: the actual length may be lower than the sampled
  // target when the actor refuses, the model repeats itself or the player
  // intervenes. Never pretend the requested distribution is exact delivery.
  if(turnPlan)store.update(s=>{
   s.events??=[];
   s.events.push({type:'tai_v12_turn_plan',channel:'text',sourceId:sourceMessageId,day:s.day,clock:s.clock,
    target:turnPlan.target,guided:turnPlan.guide,semicolonBurst:!!turnPlan.semicolonBurst,emitted,receivedAt:now()});
  });
  return {status:called?'called':'replied',count:emitted,text:delivered.map(x=>x.text).join('\n')};
 }catch(error){
  console.warn('NoApp reply unavailable:',error?.message);
  if(!isCurrentTaiTurn(store.get(),sourceMessageId,initial.day)||replyAfter(conversation(store.get()),sourceMessageId))return {status:'superseded'};
  if(['TAI_STYLE','TAI_ROMANCE_GATE'].includes(error?.code))return finishSilentTaiTurn(store,sourceMessageId,now);
  // Transport failures are not Tai's speech and must not consume this turn.
  // Keep diagnostics with the source message; a later real request can retry.
  store.update(s=>{
   const target=conversation(s);if(!target)return;
   const source=target.messages.find(m=>m.id===sourceMessageId);
   if(source){delete source.taiPending;delete source.taiDeferredGameMinute;delete source.taiDeferredUntil;}
   s.events.push({type:'tai_reply_failed',sourceId:sourceMessageId,day:s.day,clock:s.clock,
    code:error?.code||'AI_REQUEST_FAILED',reason:String(error?.message||'AI unavailable').slice(0,300)});
  });
  return {status:'error',count:0,message:'連線暫時中斷，請稍後再試。'};
 }finally{pendingRequests.delete(store);}
}
