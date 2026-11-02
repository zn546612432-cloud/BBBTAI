import {isStory55,taiRecognized} from '../story55/state.js';
import {unheardReply} from '../voice/unheard.js';
import {xitaiRelationshipContext} from './relationship-context.js';
import {uid} from '../id.js';
import {dateParts} from '../calendar.js';
import {taiPresence,markTaiEngaged} from '../presence.js';
import {isConversationOpen,visibleMessages} from '../messaging/delivery.js';
import {deathLocked} from '../../system/power/story.js';
import {aiStatus,askTai,chooseTaiAction,voicePreview,apiConfig} from './gateway.js';
import {saveClip} from '../voice/audio-store.js';
import {unpackTaiReply} from './format.js';
import {callBridgeNote} from './humanize.js';
import {taiBehavior,replyDelayMs} from './behavior.js';
import {taiPlayerRequestedCall,taiPlayerDeclinedCall,taiShouldCallAfterText} from './call-intent.js';
import {startIncoming,callState} from '../../apps/noapp/voice-call.js';

const conversation=s=>s.content.conversations.noapp?.find(c=>c.id==='tai');
const replyAfter=(c,id)=>{
 if(!c)return true;
 const source=c.messages.find(m=>m.id===id);
 const messages=visibleMessages(c).filter(m=>!m.demo&&(!Number.isInteger(source?.day)||!Number.isInteger(m.day)||m.day<=source.day));
 const i=messages.findIndex(m=>m.id===id);
 return i<0||messages.slice(i+1).some(m=>m.from!=='me'&&m.kind!=='app_invitation');
};
const pendingRequests=new WeakSet();
export const isTaiReplyPending=store=>pendingRequests.has(store);
export function isCurrentTaiTurn(s,sourceMessageId,day){
 const c=conversation(s);
 return !!c&&s.day===day&&!deathLocked(s)&&!s.poweredOff&&s.powerMode==='idle'&&
  taiPresence(s).status!=='away'&&visibleMessages(c).filter(m=>m.from==='me'&&!m.demo&&m.day<=s.day).at(-1)?.id===sourceMessageId;
}
// Recover persisted deferrals after a page reload while the game is active.
// Real time is persisted on the source message, but NO background web worker is used.
const deferredResumes=new WeakSet(),deferredFailures=new WeakMap();
export function maybeResumeTaiDeferred(store,{now=Date.now}={}){
 const current=store.get(),c=conversation(current);
 if(!c||deferredResumes.has(store)||pendingRequests.has(store)||now()<(deferredFailures.get(store)||0))return false;
 if(!taiRecognized(current)||deathLocked(current)||current.poweredOff||current.powerMode!=='idle')return false;
 const source=visibleMessages(c).filter(m=>m.from==='me'&&!m.demo&&m.actual!==false&&m.day<=current.day).at(-1);
 if(!source?.taiDeferredUntil||source.taiDeferredUntil>now()||source.taiHandledAction||replyAfter(c,source.id))return false;
 const presence=taiPresence(current);
 if(!presence.contactable||presence.status==='away')return false;
 deferredResumes.add(store);
 void replyToTaiMessage(store,source.id,{retryDeferred:true,now}).catch(error=>{
  deferredFailures.set(store,now()+60000);
  console.warn('Tai persisted deferred reply retry failed:',error?.message);
 }).finally(()=>deferredResumes.delete(store));
 return true;
}

let ttsQueue=Promise.resolve();
export function synthesizeVoiceNotes(store,jobs){
 const work=async()=>{
  for(const job of jobs){
   try{
    const clip=await voicePreview({text:job.text,tone:job.tone});
    const audioId='tai-'+job.id;
    await saveClip(audioId,clip);
    const current=store.get();
    if(current.day!==job.day||deathLocked(current))continue;
    store.update(s=>{
     const m=conversation(s)?.messages.find(x=>x.id===job.id);
     if(m){m.kind='voice';m.audioId=audioId;m.voiceCaption=job.text;
       delete m.voiceRequested;}
    });
   }catch(error){
    console.warn('MiniMax voice failed; text remains:',error?.message);
    store.update(s=>{const m=conversation(s)?.messages.find(m=>m.id===job.id);if(m){delete m.voiceRequested;m.voiceFailed=true;}});
   }
  }
 };
 // A rejection must not poison subsequent voice synthesis.
 const queued=ttsQueue.then(work,work);
 ttsQueue=queued.catch(()=>{});
 return queued;
}

export async function replyToTaiMessage(store,sourceMessageId,{wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),random=Math.random,now=Date.now,refresh=()=>{},retryDeferred=false,onTyping=()=>{}}={}){
 const initial=store.get(),c=conversation(initial);
 if(!c||!c.messages.some(m=>m.id===sourceMessageId)||replyAfter(c,sourceMessageId)||c.messages.some(m=>m.id===sourceMessageId&&['read_no_reply','end_session','start_call'].includes(m.taiHandledAction))||initial.events?.some(e=>e.type==='tai_text_call_trigger'&&e.sourceId===sourceMessageId))return {status:'scripted'};
 const pendingSource=c.messages.find(m=>m.id===sourceMessageId);
 if(pendingSource?.taiDeferredUntil&&now()<pendingSource.taiDeferredUntil)return {status:'deferred',retryAfterMs:pendingSource.taiDeferredUntil-now()};
 if(!taiRecognized(initial)||deathLocked(initial))return {status:'unavailable',message:'当前剧情暂不能回复'};
 const presence=taiPresence(initial);
 if(!presence.contactable||presence.status==='away')return {status:'offline',message:'熙泰暂时不在线，消息已保存'};
 markTaiEngaged();
 if(pendingRequests.has(store))return {status:'busy',message:'熙泰正在输入'};
 const messages=visibleMessages(c).filter(m=>m.kind!=='image'&&m.kind!=='app_invitation'&&!m.demo&&typeof m.text==='string'&&m.text.trim()&&m.day<=initial.day)
  .slice(-20).map(m=>m.kind==='call'?{role:'user',content:callBridgeNote(m,initial)||m.text}:({role:m.from==='me'?'user':'assistant',content:m.kind==='voice'?m.voiceCaption||'[语音消息；未提供转写，无法识别内容]':m.text.slice(0,2000)})).filter(m=>m.content);
 if(messages.at(-1)?.role!=='user')return {status:'scripted'};
 pendingRequests.add(store);
 const startedAt=now(),behavior=taiBehavior(initial);
 try{
  const source=c.messages.find(m=>m.id===sourceMessageId);
  const unheard=source?.kind==='voice'&&!source?.voiceCaption;
  const status=unheard?{}:await aiStatus();if(!unheard&&!status.deepseek)throw Error('请在 NoApp 的 AI 设置中输入 DeepSeek Key');
  const lastUser=source?.voiceCaption||source?.text||'';
  // A telephone request is not a request for one prerecorded voice bubble.
  const requestedCall=taiPlayerRequestedCall(lastUser);
  const voiceRequested=!requestedCall&&/语音|录音|听听你的声音|听你说|说句话/.test(lastUser);
  const hashed=[...sourceMessageId].reduce((h,ch)=>(Math.imul(h,33)+ch.charCodeAt(0))>>>0,5381);
  const voiceTurn=unheard?!!apiConfig().minimax:voiceRequested||(initial.day>=60&&hashed%19===0);
  const request={day:initial.day,channel:'noapp',storyVersion:isStory55(initial)?'55-v1':undefined,recognized:taiRecognized(initial),messages,outputMode:voiceTurn?'voice':'text',
   behavior,
   scene:'熙蒙刚发来的真实消息：'+String(lastUser).slice(0,400)+'。根据对话自然接话，由你自己决定说几句、是否带起别的话题，不要凑条数，也不必时刻客气。'+(requestedCall?' 如果你同意现在立刻给熙蒙打电话，回复的最后一项必须以 (phone) 开头，后面写接通时你准备说的第一句话，不要把「我现在打」当普通文字就结束；如果不方便就正常发文字说明，不要用 (phone)。':''),
   relationshipContext:xitaiRelationshipContext(initial,{mode:'text'}),
   profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories};
  const availableCall=!['ringing','dialing','connected'].includes(callState().state);
  const decision=unheard?null:await chooseTaiAction({...request,sourceMessageId,hasIncoming:true,
   allowCall:availableCall&&!!status.minimax,allowVoice:!!status.minimax,
   allowDefer:!retryDeferred&&!(source?.taiDeferredCount>0),
   playerDeclinedCall:taiPlayerDeclinedCall(lastUser)});
  if(decision&&['read_no_reply','defer_reply','end_session','start_call'].includes(decision.action)){
   if(!isCurrentTaiTurn(store.get(),sourceMessageId,initial.day)||replyAfter(conversation(store.get()),sourceMessageId))return {status:'superseded'};
   if(decision.action==='start_call'){
    const called=startIncoming({store,refresh},'陈熙泰发起语音通话',{reason:'【熙泰本轮主动决定来电】'+(decision.intent||'想亲自听熙蒙说话')});
    if(called){store.update(s=>{const m=conversation(s)?.messages.find(x=>x.id===sourceMessageId);if(m){m.taiReadAt=now();m.taiHandledAction='start_call';}
      s.events.push({type:'tai_text_call_trigger',sourceId:sourceMessageId,day:s.day,clock:s.clock,protocol:'v10'});});
     return {status:'called',count:0,action:'start_call'};}
    // A failed real call is NOT replaced by a false spoken promise.
   }else if(decision.action==='defer_reply'){
    const until=now()+decision.delay_seconds*1000;
    store.update(s=>{const m=conversation(s)?.messages.find(x=>x.id===sourceMessageId);if(m){m.taiDeferredUntil=until;m.taiDeferredCount=(m.taiDeferredCount||0)+1;}
     s.events.push({type:'tai_deferred_reply',sourceId:sourceMessageId,day:s.day,clock:s.clock,dueAt:until});});
    return {status:'deferred',retryAfterMs:decision.delay_seconds*1000};
   }else{
    store.update(s=>{const m=conversation(s)?.messages.find(x=>x.id===sourceMessageId);if(m){m.taiReadAt=now();m.taiHandledAction=decision.action;}
     s.events.push({type:'tai_action_'+decision.action,sourceId:sourceMessageId,day:s.day,clock:s.clock});});
    return {status:decision.action,count:0};
   }
  }
  const actualDecision=decision?.action==='start_call'?null:decision;
  if(actualDecision){request.approvedDecision=actualDecision;
   request.outputMode=actualDecision.action==='send_voice'?'voice':'text';}
  if(!unheard)onTyping();
  const result=unheard?null:await askTai(request);
  let draftEntries=unheard?[unheardReply(sourceMessageId)]:unpackTaiReply(result,'noapp');
  // A bare mirrored greeting is a model-continuation artifact, not a choice
  // rooted in Tai's personality. Repair it only when he replied with nothing
  // but the exact same greeting; preserve other genuine one-line replies.
  const greeting=s=>/^(?:hi|hello|hey|嗨|你好)[!！?.。\s]*$/i.test(String(s||'').trim());
  if(!unheard&&greeting(lastUser)&&draftEntries.length===1&&
    draftEntries[0].text.trim().toLowerCase().replace(/[!！?.。\s]/g,'')===
    lastUser.trim().toLowerCase().replace(/[!！?.。\s]/g,'')){
    const retry=await askTai({...request,scene:request.scene+' 上一稿只机械复述了对方的问候词，请按你当前生活和态度自然接话，仍可以短，不要机械复制。'});
    draftEntries=unpackTaiReply(retry,'noapp');
  }
  // Keep an explicit phone action even if the model returned the configured
  // maximum number of text bubbles before it. Never interpret it as a voice
  // bubble; the first phone utterance is played only after the player answers.
  const limit=Math.max(1,behavior.maxMessages);
  const phoneAt=draftEntries.findIndex(item=>item.action==='phone');
  const selected=phoneAt>=limit?[...draftEntries.slice(0,limit-1),draftEntries[phoneAt]]:draftEntries.slice(0,limit);
  const entries=selected.map(item=>actualDecision?
    ({...item,action:undefined,mode:actualDecision.action==='send_voice'?'voice':'text',
      tone:item.tone==='neutral'&&actualDecision.tone!=='neutral'?actualDecision.tone:item.tone,
      ...(actualDecision.action==='send_voice'?{speechText:item.speechText||item.text}:{})}):
    item.action==='phone'?{...item,mode:'text'}:requestedCall?{...item,mode:'text'}:voiceTurn?{...item,mode:'voice',speechText:item.speechText||item.text}:item);
  let emitted=0;
  let phoneCommand=null;
  const voiceJobs=[];
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
   // A text bubble appears as soon as it is received. Slow MiniMax synthesis
   // cannot stall subsequent sentences or make the conversation look frozen.
   store.update(s=>{
    const target=conversation(s);if(!target)return;
    const msg={id,from:'tai',text:item.text,kind:'text',
      aiTone:item.tone,vocalCue:item.vocalCue&&item.vocalCue!=='none'?item.vocalCue:actualDecision?.vocal_cue||'none',time:s.clock,day:s.day,sentDate:dateParts(s).iso,
      aiGenerated:true,actual:true,receivedAt:now(),replySourceId:sourceMessageId,voiceRequested:item.mode==='voice',...(item.translation?{translation:item.translation}:{})};
    target.messages.push(msg);
    if(!isConversationOpen(s,'noapp','tai')){
     target.unread=Math.max(0,Number(target.unread)||0)+1;
     s.notifications.unshift({id:'tai-reply-'+id,conversationId:'tai',title:target.name,
       body:item.text,link:{appId:'noapp',route:'/chat/tai',params:{}}});
    }
   });
   emitted++;
   if(item.mode==='voice'){
    // Queue TTS in its own chain so three voice messages do not create three
    // simultaneous MiniMax calls. Failed audio leaves the written bubble.
    voiceJobs.push({id,text:item.speechText||item.text,tone:item.tone,day:initial.day});
   }
  }
  // Make an actual incoming call only after a current, explicit player request
  // AND Tai's last emitted message commits to calling immediately.
  const delivered=conversation(store.get())?.messages.filter(m=>m.replySourceId===sourceMessageId&&m.from==='tai')||[];
  // (phone) has priority over fragile sentence regexes. The old phrase
  // detector remains as compatibility for models that forget the marker.
  const alreadyCalled=store.get().events.some(e=>e.type==='tai_text_call_trigger'&&e.sourceId===sourceMessageId);
  const shouldCall=!actualDecision&&!alreadyCalled&&!taiPlayerDeclinedCall(lastUser)&&isCurrentTaiTurn(store.get(),sourceMessageId,initial.day)&&(
   !!phoneCommand||emitted>0&&delivered.length===emitted&&taiShouldCallAfterText({lastUser,entries:delivered}));
  let called=false;
  if(shouldCall){
   const reason='【刚才的通话约定】熙蒙刚刚说「'+String(lastUser).slice(0,140)+'」，熙泰决定立即拨号。'+(phoneCommand?.text?'接通后第一句话已准备好。':'文字中明确答应「'+String(delivered.at(-1)?.text||'').slice(0,120)+'」。')+'请自然承接正在发生的话题，不是陌生人初次通话。';
   called=startIncoming({store,refresh},'陈熙泰发起语音通话',{reason,openingText:phoneCommand?.text||''});
   if(called)store.update(s=>s.events.push({type:'tai_text_call_trigger',sourceId:sourceMessageId,day:s.day,clock:s.clock,protocol:phoneCommand?'phone':'legacy'}));
  }
  if(voiceJobs.length){
   void synthesizeVoiceNotes(store,voiceJobs).catch(error=>{
    console.warn('MiniMax voice conversion delayed, chat text preserved:',error?.message);
   });
  }
  return {status:called?'called':'replied',count:emitted,text:entries.filter(x=>x.action!=='phone').map(x=>x.text).join('\n')};
 }finally{pendingRequests.delete(store);}
}
