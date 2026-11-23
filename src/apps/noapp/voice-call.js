import {isStory55,taiRecognized,completed,overnightSceneNight55,scriptedCallPlayed,recognitionCallDue} from '../../services/story55/state.js';
import {RECOGNITION_CALL} from '../../story/d29/recognition-call.js';
import {finishScene55} from '../../services/story55/runtime.js';
import {D41_CALL,D42_CALL} from '../../story/d34-d42/definition.js';
import {D45_CALL} from '../../story/d45/definition.js';
import {D55_OPENING_CALL,D55_WARNING_CALL,D55_FINAL_CALL,D55_RECALL,D55_FATHER_CALL} from '../../story/d55/calls.js';
import {D55_XIAOXIN} from '../../story/d55/definition.js';
import {stampFixedLine,presetReplyDelay} from '../../services/story55/fixed-timeline.js';
import {phoneBlocked} from '../../system/power/story.js';
import {offerD41ChessInvitation,D41_CHESS_INVITATION} from '../../services/invitations.js';
import {loadScriptedVoice,preloadScriptedVoice} from '../../services/voice/scripted-voice.js';
import {recoverD55SilentVoice} from '../../story/d55/voice-progress.js';
import {d41ChessComplete} from '../../story/d34-d42/d41-chess.js';
import {resolvePhoneAudioPath,canonicalPhoneAudioPath} from '../../services/voice/asset-url.js';
import {unheardReply} from '../../services/voice/unheard.js';
import {pressFeedback,releaseFeedback,impact} from '../../system/feedback/index.js';
import {xitaiRelationshipContext} from '../../services/ai/relationship-context.js';
import {TAI_PORTRAIT} from './portrait.js';
import {rememberTaiConversation,rememberTaiDelivered,rememberTaiCall} from '../../services/ai/memory.js';
import {absorbPendingTaiTextsForCall} from '../../services/ai/incoming-turn.js';
import {esc} from '../../system/ui.js';
import {taiPresence,markTaiEngaged} from '../../services/presence.js';
import {taiLife} from '../../services/ai/life-context.js';
import {synthesizeTaiVoice} from '../../services/ai/voice-synthesis.js';
import {selectTaiMemoryPreset} from './memory-replies.js';
import {taiSocialEnergy,canTaiCall,taiCallCooling,markTaiCallRest,socialEnergyPrompt} from '../../services/ai/social-energy.js';
import {hasBannedTaiConstruction} from '../../services/ai/expression-style.js';
import {taiDisplayName} from './contact.js';
import {askTai,chooseTaiAction,voicePreview,speechToText,apiConfig} from '../../services/ai/gateway.js';
import {captureTaiWorldbook} from '../../services/ai/worldbook/index.js';
import {rememberTaiMood} from '../../services/ai/worldbook/mood.js';
import {explainMinimaxFailure} from '../../services/voice/minimax-diagnostics.js';
import {saveClip,loadClip} from '../../services/voice/audio-store.js';
import {uid} from '../../services/id.js';
import {dateParts} from '../../services/calendar.js';
import {unpackTaiReply,readableTaiVoiceText} from '../../services/ai/format.js';
import {taiBehavior} from '../../services/ai/behavior.js';
import {createGestureAudio} from '../../services/voice/playback.js';
import {composeCallSpeech} from '../../services/voice/call-speech.js';
import {taiMomentumPrompt} from '../../services/ai/conversation-momentum-v11.js';
import {dedupeTaiTurnEntries} from '../../services/ai/conversation-shape-v12.js';
import {selectCallSegments,isQuietCallRequest,nextNaturalCallIdleEvent,expandCallSegments,planCallSpeech,needsCallContinuation,finalizeCallSegments,outgoingCallOpening,incomingCallOpening,callPersonaGuidance,taiCallReplyStatus} from './call-engine-v2.js';
import {taiShouldHangUpCall,taiCallFarewellIntent} from './call-hangup-intent.js';
import {callFailureLine} from '../../services/ai/voice-delivery.js';
import {isConversationOpen} from '../../services/messaging/delivery.js';
import {dismissNoAppCallRoute,isNoAppCallRoute} from '../../services/router.js';
import {validateCallReplyAction,validateTaiAction} from '../../services/ai/action-protocol-v10.js';

let call={state:'idle',direction:'incoming',muted:false,speaker:true,turns:[],started:0,busy:false,nudgeCount:0};
let recording=null;
let callSerial=0;
let activeRecognition=null;
export function callState(){return {state:call.state,direction:call.direction,sessionId:call.sessionId,turnCount:call.turns.length,endedBy:call.endedBy||null,busy:!!call.busy,replyPhase:call.replyPhase||null};}
export const scriptedCallCameraActive=()=>call.state==='connected'&&!!call.scripted?.camera;
function recordCall(s,{direction,status,seconds=0,turns=[],endedBy=null,endReason=''}){
 const chat=s.content.conversations.noapp?.find(c=>c.id==='tai');
 if(!chat)return;
 const label=endReason==='connection_error'?'通話失敗':status==='missed'?(direction==='outgoing'?'對方未接聽':'未接语音来电'):status==='declined'?(direction==='outgoing'?'對方已拒接':'已拒绝语音来电'):
   status==='cancelled'?'已取消语音呼叫':'语音通话 · '+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 const entry={id:'tai-call-history-'+uid(),from:direction==='incoming'?'tai':'me',text:label,
   kind:'call',callStatus:status,duration:seconds,day:s.day,time:s.clock,actual:true,
   ...(status==='ended'||direction==='outgoing'&&['declined','missed'].includes(status)?{endedBy:['tai','player','system','connection_error'].includes(endedBy)?endedBy:'system',endReason:String(endReason||'').slice(0,40)}:{})};
 if(status==='ended'&&turns.length){const fixed=turns.some(t=>t.clock);entry.transcript=(fixed?turns:turns.slice(-120)).map(t=>(t.clock?'['+t.clock+'] ':'')+(t.role==='user'?'熙蒙':'熙泰')+'：'+t.content).join('\n').slice(-12000);}
 chat.messages.push(entry);
 if(direction==='incoming'&&status==='missed'&&!(s.unlocked&&s.nav.current.appId==='noapp'&&s.nav.current.route==='/chat/tai'))
  chat.unread=Math.max(0,Number(chat.unread)||0)+1;
 return entry;
}
export function incomingCallBanner(s){
 if(call.state!=='ringing'||!s.unlocked||!taiRecognized(s)&&call.scripted?.id!==RECOGNITION_CALL.id)return '';
 const locked=call.scripted?.unanswerable===true;
 return '<div class="tai-incoming-banner" role="group" aria-label="陈熙泰来电">'+
   '<img class="tai-banner-avatar" src="'+esc(s.characterAvatars?.['熙泰']||AVATAR)+'" alt="">'+
   '<div class="tai-banner-info"><strong>'+esc(taiDisplayName(s))+'</strong><small>NoApp · 语音来电</small></div>'+
   '<button type="button" class="tai-banner-decline" data-action="tai-banner-decline" aria-label="拒绝来电"'+(locked?' disabled':'')+'>'+glyph.hang+'</button>'+
   '<button type="button" class="tai-banner-accept" data-action="tai-banner-accept" aria-label="接听来电"'+(locked?' disabled':'')+'>'+glyph.answer+'</button></div>';
}
let playback=null;
let messagePlayback=null,voicePlaylistToken=0,pausedForMicrophone=false,cancelMessagePlayback=null;
function suspendVoicesForCapture(){
 if(messagePlayback&&!messagePlayback.paused){pausedForMicrophone=true;messagePlayback.pause();}
}
function resumeVoicesAfterCapture(){
 if(pausedForMicrophone&&messagePlayback){pausedForMicrophone=false;messagePlayback.play().catch(()=>{});}
}

const AVATAR=TAI_PORTRAIT; // user-supplied, cropped high clarity portrait
const AVATAR_SOURCE=TAI_PORTRAIT;
const glyph={
 mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0014 0v-2M12 19v3M8 22h8"/></svg>',
 hang:'<svg class="tai-handset-down" viewBox="0 0 28 28" fill="currentColor" aria-hidden="true"><path d="M1 16c0-4.8 5.8-8.3 13-8.3S27 11.2 27 16c0 1.8-.9 2.8-2.4 2.8-.3 0-.6 0-.9-.1l-4.5-1.1c-1.1-.3-1.8-1-1.8-2.1v-2.2a15.8 15.8 0 0 0-6.8 0v2.2c0 1.1-.7 1.8-1.8 2.1l-4.5 1.1-.9.1C1.9 18.8 1 17.8 1 16Z"/></svg>',
 speaker:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9c2 2 2 4 0 6M20 5c4 4 4 10 0 14"/></svg>',
 quiet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM3 3l18 18"/></svg>',
 plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>',
 layout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="3" width="13" height="13" rx="1.5"/><rect x="10" y="10" width="11" height="11" rx="1.5"/></svg>',
 phone:'<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path fill="currentColor" d="M5.1 3.2c-1.5.8-2.9 3.1-2.5 5.6.9 6.8 10.5 16.4 17.3 17.1 2.5.3 4.9-1.2 5.6-2.7.4-.8.1-1.7-.6-2.2l-5.1-3.6c-.7-.5-1.6-.4-2.2.2l-2 2.1c-3.2-1.6-5.9-4.3-7.4-7.5l2.2-2c.6-.6.7-1.5.2-2.2L7 3.8c-.5-.7-1.2-1-1.9-.6Z"/><path d="M16 3a10 10 0 0 1 9 9M16 7a6 6 0 0 1 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
 keyboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 15h8"/></svg>',
 micOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 8V5a3 3 0 0 1 6 0v8M5 10v2a7 7 0 0 0 12 5M12 19v3M8 22h8M3 3l18 18"/></svg>',
 answer:'<svg class="tai-handset-up" viewBox="0 0 28 28" fill="currentColor" aria-hidden="true"><path d="M5.1 3.2c-1.5.8-2.9 3.1-2.5 5.6.9 6.8 10.5 16.4 17.3 17.1 2.5.3 4.9-1.2 5.6-2.7.4-.8.1-1.7-.6-2.2l-5.1-3.6c-.7-.5-1.6-.4-2.2.2l-2 2.1c-3.2-1.6-5.9-4.3-7.4-7.5l2.2-2c.6-.6.7-1.5.2-2.2L7 3.8c-.5-.7-1.2-1-1.9-.6Z"/></svg>'
};
function phoneButton(action,title,art,kind='',disabled=false){
 return '<button type="button" data-action="'+action+'" class="tai-call-control '+kind+'" aria-label="'+title+'"'+(disabled?' disabled':'')+'><span class="tai-control-circle">'+art+'</span><span class="tai-control-label">'+title+'</span></button>';
}
function duration(){
 if(!call.started)return '等待连接';
 const sec=Math.floor((Date.now()-call.started)/1000);
 return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
}
// This is a second view of the live session, never a second call or recorder.
export function minimizedCallView(s){
 if(!s.unlocked||isNoAppCallRoute(s.nav.current)||!['dialing','connected'].includes(call.state))return '';
 const dialing=call.state==='dialing',listening=!!call.listening;
 const replyStatus=taiCallReplyStatus(call,call.caption||'');
 const label=dialing?'呼叫中':listening?'錄音中':call.requestingMic?'開啟中':call.transcribing?'傳送中':call.audioReady?'待收聽':replyStatus|| (call.muted?'已靜音':'通話中');
 const action=call.audioReady?'tai-play-audio':dialing||call.scripted?'tai-resume-call':'tai-mic';
 const disabled=!dialing&&(call.requestingMic||call.transcribing);
 return '<aside class="tai-mini-call'+(listening?' is-recording':'')+'" aria-label="NoApp 通話">'+
  '<button type="button" class="tai-mini-call-main" data-action="'+action+'" aria-label="'+(call.audioReady?'繼續收聽':dialing||call.scripted?'返回通話':listening?'結束錄音並傳送':'開始說話')+'"'+(disabled?' disabled':'')+'>'+glyph.phone+'<span>'+label+'</span></button>'+
  '<div class="tai-mini-call-actions"><button type="button" data-action="tai-resume-call" aria-label="展開通話">'+glyph.layout+'</button><button type="button" data-action="tai-hangup" aria-label="掛斷">'+glyph.hang+'</button></div></aside>';
}
// Hide performance pauses in Tai's visible subtitles, not in the authored
// script or the exact text used to retrieve prerecorded MP3s.
const displayedCallText=(text,isTai)=>isTai?String(text||'').replace(/…+|\.{3,}|．{3,}/g,'').trim():String(text||'');
export function callView(s){
 const ring=call.state==='ringing',active=call.state==='connected',dial=call.state==='dialing';
 const caption=active?displayedCallText(call.caption,call.captionRole!=='me'):'';
 const replyStatus=taiCallReplyStatus(call,caption);
 const replying=!!replyStatus;
 const subtitle=call.connectionIssue?'連線不穩定':call.endedBy==='connection_error'?'通話失敗':ring?'NoApp 語音來電':dial?'正在呼叫…':active?(call.transcribing?'正在識別…':call.requestingMic?'正在開啟麥克風…':call.listening?'正在聆聽…':caption||(call.audioReady?'輕點繼續收聽':replyStatus||call.inlineNotice||'通話中')):'通話已結束';
 const captionClass=caption&&subtitle===caption?' class="tai-call-spoken-caption '+(call.captionRole==='me'?'mine':'theirs')+'"':replying?' class="tai-call-replying"':'';
 const controls=ring?
   phoneButton('tai-decline','拒绝',glyph.hang,'is-decline',!!call.scripted?.unanswerable)+phoneButton('tai-accept','接听',glyph.answer,'is-accept',!!call.scripted?.unanswerable):
   active?
   phoneButton('tai-mute',call.muted?'取消靜音':'靜音',call.muted?glyph.micOff:glyph.mic,'is-secondary'+(call.muted?' is-selected':''))+
   phoneButton('tai-mic',call.listening?'結束說話':'說話',glyph.mic,'is-mic'+(call.listening?' is-listening':''),!!call.scripted)+
   phoneButton('tai-speaker','揚聲器',call.speaker?glyph.speaker:glyph.quiet,'is-speaker'+(call.speaker?' is-selected':''))+
   phoneButton('tai-expand',call.scripted?.autoPlayerLines?'通話文字':'文字輸入',glyph.keyboard,'is-secondary'+(call.expanded?' is-selected':''))+
   phoneButton('tai-hangup','結束',glyph.hang,'is-hang',!!call.d55Story):
   dial?phoneButton('tai-hangup','取消',glyph.hang,'is-hang'):'<button type="button" class="tai-call-return" data-action="tai-return-from-call">返回聊天</button>';
 const draft=scriptedCallDraft();
 const composer=call.d55Held?'':call.scripted?(draft?'<form data-form="tai-call-turn"><input name="text" readonly value="'+esc(draft)+'" aria-label="預設文字"><button type="submit" aria-label="傳送">↑</button></form>':''):'<form data-form="tai-call-turn"><input name="text" inputmode="text" autocomplete="off" maxlength="1200" placeholder="輸入文字…"><button type="submit" aria-label="傳送">↑</button></form>';
 const transcript=call.expanded?'<div class="tai-call-caption-sheet" aria-label="通話文字"><header>通話文字 <button type="button" data-action="tai-expand" aria-label="關閉文字轉寫">✕</button></header><div class="tai-call-transcript">'+(call.scripted?call.turns:call.turns.slice(-9)).map(t=>'<p>'+(t.clock?'<small>'+esc(t.clock)+'</small> ':'')+'<b>'+(t.role==='user'?'熙蒙':'熙泰')+'</b> '+esc(displayedCallText(t.content,t.role!=='user'))+'</p>').join('')+'</div>'+composer+'</div>':'';
 const resumeAudio=active&&call.audioReady?'<div class="tai-live-captions"><button type="button" data-action="tai-play-audio">▶ 继续收听</button></div>':'';
 return '<section class="tai-call-screen tai-native-call'+(call.expanded?' is-expanded':'')+(active?' is-connected':'')+'" aria-label="NoApp语音通话">'
  +'<div class="tai-call-ambient" aria-hidden="true"><img src="'+esc(s?.characterAvatars?.['熙泰']||AVATAR)+'" alt=""></div>'
  +'<nav class="tai-call-topbar">'+
   '<span class="tai-call-channel">NoApp 語音</span>'+((active||dial)?'<button type="button" class="tai-call-minimize" data-action="tai-minimize-call" aria-label="縮小通話">'+glyph.layout+'</button>':'')+'</nav>'+
   '<div class="tai-call-identity"><img class="tai-call-avatar" src="'+esc(s?.characterAvatars?.['熙泰']||AVATAR)+'" alt="陈熙泰照片" data-source="'+AVATAR_SOURCE+'"><h1>'+esc(taiDisplayName(s))+'</h1><p role="status" aria-live="polite"'+captionClass+'>'+esc(subtitle)+'</p>'+(active?'<small class="tai-call-duration">'+duration()+'</small>':'')+(scriptedCallCameraActive()?'<small class="tai-call-camera-status">● 攝像頭已開啟</small>':'')+'</div>'+
   resumeAudio+transcript+
   '<div class="tai-call-bottom'+(ring?' two-actions':active?' native-controls':' native-single')+'">'+controls+'</div>'+
   '</section>';
}
export function startIncoming(ctx,preview='熙泰邀请你语音通话',{reason='',openingText='',requestedByPlayer=false,scripted=null}={}){
 if(!taiRecognized(ctx.store.get())&&!(scripted?.id===RECOGNITION_CALL.id&&recognitionCallDue(ctx.store.get()))||!scripted&&(!taiPresence(ctx.store.get()).contactable||!canTaiCall(ctx.store.get()))||['ringing','dialing','connected'].includes(call.state))return false;
 const sessionId=++callSerial,notificationId='tai-call-'+uid();
 call={state:'ringing',sessionId,revision:0,quietUntil:0,notificationId,direction:'incoming',muted:false,speaker:true,turns:[],started:0,busy:false,audioReady:false,nudgeCount:0,requestedByPlayer,openingText:String(openingText||'').trim().slice(0,600),reason:reason||(/邀请你语音|语音通话/.test(preview)?'想听熙蒙说说之前提过的事情；不主动汇报自己的生活':preview)};
 call.scripted=scripted;
 if(scripted?.id?.startsWith('d55-')){
  call.d55Story=true;call.d55Phase=scripted.id===D55_RECALL.id?'recall':scripted.id===D55_FINAL_CALL.id?'final':'opening';
  call.scriptIndex=ctx.store.get().story55?.d55CallProgress?.[scripted.id]||0;
 }
 if(scripted&&!scripted.unanswerable)preloadScriptedVoice(scripted.id===RECOGNITION_CALL.id?33:scripted.day);
 ctx.store.update(s=>{absorbPendingTaiTextsForCall(s);if(scripted)s.story55[scripted.triggerKey||'d42CallTriggered']=true;s.notifications.unshift({id:notificationId,title:'NoApp · '+taiDisplayName(s),body:preview,type:'tai-incoming-call',...(scripted?{scriptedCallId:scripted.id}:{}),link:{appId:'noapp',route:'/call',params:{}}});});
 // A missed call stays in the game's notifications; answering or declining
 // removes just this call's card, never another character's messages.
 ctx.refresh?.();
 if(scripted?.unanswerable)return true; // Deliberately unanswered, ends at the authored game clock.
 const missedTimer=setTimeout(()=>{
  if(call.sessionId!==sessionId||call.state!=='ringing')return;
  call.state='missed';callSerial++;
  if(call.scripted?.pauseTimeUntilComplete){call.scriptedRetryId=call.scripted.id;call.retryAt=Date.now()+5000;}
  ctx.store.update(s=>{
   const n=s.notifications.find(n=>n.id===notificationId);
   if(n){n.title=taiDisplayName(s);n.body='未接语音通话';n.type='tai-missed-call';n.link={appId:'noapp',route:'/chat/tai',params:{}};}
   s.events.push({type:'tai_call_missed',day:s.day,clock:s.clock});
   recordCall(s,{direction:'incoming',status:'missed'});
   // Merely viewing a ringing screen does not make it a permanent route.
   dismissNoAppCallRoute(s);
  });
  ctx.refresh?.();
 },60000);
 missedTimer.unref?.(); // Node tests should not remain open for a missed-call timeout.
 return true;
}
export function d42CallDue(s){
 return isStory55(s)&&!s.story55.ended&&s.day===D42_CALL.day&&s.clock>=D42_CALL.at&&completed(s,'show')&&taiRecognized(s)&&!scriptedCallPlayed(s,D42_CALL);
}
export function maybeStartRecognitionCall(ctx){
 const s=ctx.store.get();
 return startTimedScriptedCall(ctx,{...RECOGNITION_CALL,day:s.day,at:s.clock},recognitionCallDue);
}
export function maybeStartD42Call(ctx){
 if(ctx.store.get().day===42)preloadScriptedVoice(42);
 return startTimedScriptedCall(ctx,D42_CALL,d42CallDue);
}
export function d41CallDue(s){
 return isStory55(s)&&!s.story55.ended&&s.day===D41_CALL.day&&taiRecognized(s)&&!scriptedCallPlayed(s,D41_CALL)&&(s.clock>=D41_CALL.at||overnightSceneNight55(s));
}
export function maybeStartD41Call(ctx){
 if([40,41].includes(ctx.store.get().day))preloadScriptedVoice(41);
 return startTimedScriptedCall(ctx,D41_CALL,d41CallDue);
}
export function d45CallDue(s){return isStory55(s)&&!s.story55.ended&&s.day===45&&s.clock>=D45_CALL.at&&completed(s,'d45-tai')&&taiRecognized(s)&&!scriptedCallPlayed(s,D45_CALL);}
export function maybeStartD45Call(ctx){
 if(ctx.store.get().day===45)preloadScriptedVoice(45);
 return startTimedScriptedCall(ctx,D45_CALL,d45CallDue);
}
function startTimedScriptedCall(ctx,script,due,{retryNow=false}={}){
 const s=ctx.store.get();
 // Do not spend a scripted incoming call on a screen where the banner is hidden.
 if(!due(s)||!s.unlocked||phoneBlocked(s)||['ringing','dialing','connected'].includes(call.state)||!retryNow&&s.story55[script.triggerKey]&&call.scriptedRetryId===script.id&&Date.now()<call.retryAt)return false;
 // A missed/rejected call or abandoned browser session cannot complete an
 // important scene. Replace only its old ringing notice on retry.
 const stale=s.notifications.filter(n=>n.type==='tai-incoming-call'&&(n.scriptedCallId===script.id||!n.scriptedCallId&&s.story55?.[script.triggerKey]));
 if(stale.length)ctx.store.update(state=>{state.notifications=state.notifications.filter(n=>!stale.some(x=>x.id===n.id));});
 return startIncoming(ctx,'熙泰邀请你语音通话',{scripted:script});
}
export function startOutgoing(ctx){
 if(!taiRecognized(ctx.store.get()))return false;
 if(['ringing','dialing','connected'].includes(call.state))return callAction('tai-resume-call',ctx);
 for(const [script,due] of [[D41_CALL,d41CallDue],[D42_CALL,d42CallDue],[D45_CALL,d45CallDue]])if(startTimedScriptedCall(ctx,script,due,{retryNow:true})){
  ctx.router.open({appId:'noapp',route:'/call',params:{}});return callAction('tai-accept',ctx);
 }
 playback=createGestureAudio();
 const sessionId=++callSerial;
 call={state:'dialing',sessionId,revision:0,quietUntil:0,direction:'outgoing',muted:false,speaker:true,turns:[],started:0,busy:false,audioReady:false,nudgeCount:0};
 ctx.store.update(absorbPendingTaiTextsForCall);
 ctx.router.open({appId:'noapp',route:'/call'});
 const pending=()=>call.sessionId===sessionId&&call.state==='dialing';
 const refuse=()=>callAction('tai-hangup',ctx,{endedBy:'tai',endReason:'resting',outcomeOverride:'declined',fallback:taiCallCooling(ctx.store.get())?'':'現在不方便打電話，晚點再說。'});
 const connect=()=>{if(!pending())return;if(!taiPresence(ctx.store.get()).contactable){callAction('tai-hangup',ctx,{endedBy:'tai',endReason:'ignored',outcomeOverride:'missed'});return;}if(!canTaiCall(ctx.store.get())){refuse();return;}call.state='connected';call.started=Date.now();markTaiEngaged();ctx.refresh();startGreeting(ctx);};
 const timer=setTimeout(async()=>{
  if(!pending())return;
  const state=ctx.store.get();
  if(!taiPresence(state).contactable||taiPresence(state).status==='away'){const missed=setTimeout(()=>{if(pending())callAction('tai-hangup',ctx,{endedBy:'tai',endReason:'ignored',outcomeOverride:'missed'});},7000);missed.unref?.();return;}
  if(!canTaiCall(state)){refuse();return;}
  const history=(state.content.conversations.noapp?.find(c=>c.id==='tai')?.messages||[]).filter(m=>m.actual!==false&&!m.demo&&(m.day||1)<=state.day&&m.kind!=='call'&&m.text).slice(-12).map(m=>({role:m.from==='me'?'user':'assistant',content:String(m.voiceCaption||m.text).slice(0,1600)}));
  const scene='【電話系統事件】熙蒙正在撥打你的電話。尚未接通，沒有任何已聽見的通話內容。';
  const messages=[...history,{role:'user',content:'[电话系统事件；不是熙蒙说出的台词：'+scene+']'}],sourceMessageId='ring:'+sessionId+':'+uid();
  const worldbookSnapshot=captureTaiWorldbook(ctx.store,{channel:'noapp',day:state.day,recognized:taiRecognized(state),messages,outputMode:'ringing',worldbookEvents:['call_ringing'],scenario:scene,turnId:sourceMessageId});
  let timeout,decision;try{decision=await Promise.race([chooseTaiAction({channel:'noapp',day:state.day,recognized:taiRecognized(state),messages,outputMode:'ringing',scene,worldbookEvents:['call_ringing'],worldbookSnapshot,relationshipContext:xitaiRelationshipContext(state,{mode:'text'}),sourceMessageId,callRinging:true,hasIncoming:false,allowVoice:false,allowDefer:false}),new Promise(resolve=>{timeout=setTimeout(()=>resolve(null),8000);})]);}catch{}finally{clearTimeout(timeout);}
  if(!pending())return;
  if(decision)rememberTaiMood(ctx.store,decision,sourceMessageId);
  if(decision?.action==='decline_call'){callAction('tai-hangup',ctx,{endedBy:'tai',endReason:'declined',outcomeOverride:'declined',fallback:'現在不方便打電話。'});return;}
  if(decision?.action==='ignore_call'){const missed=setTimeout(()=>{if(pending())callAction('tai-hangup',ctx,{endedBy:'tai',endReason:'ignored',outcomeOverride:'missed'});},18000);missed.unref?.();return;}
  connect();
 },1100);timer.unref?.();
 return true;
}
// A blocked play keeps this segment pending. Only its completion allows the
// next caption/track; hanging up resolves and cancels the pending segment.
let finishSegment=null,callPlaybackStarted=null;
// Generated text is NOT a completed utterance until the audio ended event.
async function playCallAudio(ctx,blob,sessionId,revision,onStart){
 if(call.sessionId!==sessionId||call.state!=='connected'||call.revision!==revision)return 'interrupted';
 playback??=createGestureAudio();
 if(!playback)throw Error('此设备不能播放音频');
 const audio=playback;
 audio.pause();
 if(audio.src?.startsWith('blob:'))URL.revokeObjectURL(audio.src);
 audio.src=URL.createObjectURL(blob);
 audio.muted=!call.speaker;
 return new Promise(resolve=>{
  let settled=false,started=false;
  const begin=()=>{if(started||settled||call.sessionId!==sessionId||call.revision!==revision)return;started=true;onStart?.();};
  callPlaybackStarted=begin;
  const finish=(outcome='completed')=>{
   if(settled)return;settled=true;
   audio.removeEventListener('ended',ended);
   audio.removeEventListener('error',failed);
   if(finishSegment===finish)finishSegment=null;
   if(callPlaybackStarted===begin)callPlaybackStarted=null;
   if(call.sessionId===sessionId){
    call.audioReady=false;
    if(outcome==='completed')call.lastTaiEndAt=Date.now();
   }
   resolve(outcome);
  };
  const ended=()=>finish('completed');
  const blocked=()=>{
   if(settled||call.sessionId!==sessionId||call.revision!==revision)return;
   call.audioReady=true;
   call.inlineNotice='輕點繼續收聽';
   ctx.refresh?.();
  };
  const failed=()=>finish('failed');
  finishSegment=finish;
  audio.addEventListener('ended',ended,{once:true});
  audio.addEventListener('error',failed);
  Promise.resolve().then(()=>audio.play()).then(()=>{
   if(call.sessionId!==sessionId||call.state!=='connected'||call.revision!==revision){
    audio.pause();finish('interrupted');
   }else begin();
  }).catch(error=>{if(call.scripted?.id===D41_CALL.id&&error?.name!=='NotAllowedError')failed();else blocked();});
 });
}
export const d41CallConnected=()=>call.state==='connected'&&call.scripted?.id===D41_CALL.id;
export async function playD41ChessVoice(ctx,blob,text){
 if(!d41CallConnected())return null;
 const sessionId=call.sessionId,revision=call.revision;
 call.caption=text;call.busy=true;ctx.refresh?.();
 try{
  const outcome=await playCallAudio(ctx,blob,sessionId,revision);
  if(outcome==='completed'&&call.sessionId===sessionId)call.turns.push({role:'assistant',content:text,playedAt:Date.now()});
  return outcome;
 }finally{if(call.sessionId===sessionId){call.caption='';call.busy=false;ctx.refresh?.();}}
}
function interruptCallTurn(ctx,source='player'){
 if(call.state!=='connected')return false;
 const active=call.busy||!!call.audioReady||!!(playback&&!playback.paused);
 if(!active||!taiBehavior(ctx.store.get()).callInterrupt)return false;
 call.revision=(call.revision||0)+1;
 playback?.pause();
 finishSegment?.('interrupted');
 call.caption='';call.audioReady=false;call.busy=false;call.transcribing=false;
 call.lastTaiEndAt=Date.now();call.nudgeCount=0;
 ctx.store.update(s=>{
  s.events??=[];
  s.events.push({type:'tai_call_v2_interrupt',sessionId:call.sessionId,source,day:s.day,clock:s.clock,at:Date.now()});
 });
 ctx.refresh?.();
 return true;
}
export function callScene({opening=false,event='',direction='outgoing',reason=''}={}){
 if(opening&&direction==='incoming'&&reason.startsWith('【刚才的通话约定】'))return '你是陈熙泰，电话现在已接通。刚才是熙蒙主动请求听你说话，你也明确答应现在拨号。'+reason+' 这是你兑现承诺的第一句话，不要说自己又准备打电话、不问他为什么打给你，不要没来由地夸自己的声音或发明他刚说的话。可以先自然回应，再关心他在做什么，留给他接话的空隙。';
 if(opening)return direction==='incoming'
  ?'电话刚接通，是你陈熙泰主动拨给熙蒙的。先说明自己为何找他：'+(reason||'关心熙蒙真实提过的事，不主动汇报自己的日程')+'。不要反问他为什么给你打电话，不要说他这通电话打断了你。'
  :'电话刚接通，是熙蒙拨给你。不要喊熙蒙、阿蒙、哥哥等称呼，不做自我介绍。通常直接用「怎么了？」开口，别默认责备他打扰；只有真实情境需要时才简单说明当下情况。';
 if(event==='unheard')return '刚才熙蒙试着说话，但这段语音未能识别，没有任何可用内容。你只知道没听清，不能猜他的话；简短问一句或两句让他再说一次，不谈ASR、权限、浏览器或技术接口。';
 if(event==='nudge')return '上一段已经说完，熙蒙在电话里一直安静。根据刚才真实的对话自然接一句，可以问怎么了、怎么不说话了，也可以接着刚才的玩笑或自己的想法。若說「你再不說話，我可要掛了」，這是警告，先等待他回答，不選 hang_up。若直接告別，才選 hang_up。不要默认他生气，不重复催促。';
 if(event==='closing')return '对方很久没说话，你可以告别并真正结束通话。说一句符合当下情绪的告别，程序会执行挂断，而不是只说要挂。';
 return '熙蒙刚在实时电话里讲了话。先准确理解他问了什么，承接上一句话的具体意思，认真回答；如果他在分享、追问、愿意聊天，就展开讲几段有信息的新内容，顺着话题表达个人态度与具体见闻。不是文字聊天，不能假装电话已挂。避免无来由自夸、空洞问答和极短气泡式语音。';
}
async function generateTurn(ctx,{opening=false,text='',event='',endAfter=false,presetText=''}={}){
 if(call.state!=='connected'||call.busy)return;
 if(call.closingPending){if(String(text).trim())call.turns.push({role:'user',content:String(text).trim()});return;}
 if(!taiPresence(ctx.store.get()).contactable){callAction('tai-hangup',ctx,{endedBy:'tai',endReason:'unavailable'});return;}
 const sessionId=call.sessionId,revision=call.revision||0,day=ctx.store.get().day;
 const forceHangUp=!opening&&!event&&taiShouldHangUpCall(text);
 const energy=taiSocialEnergy(ctx.store.get(),'call');
 const shouldClose=!call.d55Story&&(forceHangUp||event==='closing'||endAfter||energy.remaining<=3);
 const life=taiLife(ctx.store.get());
 const closingLine=life.minute>=1260||life.minute<90?'時間不早了，我困了。晚安。':life.status==='busy'?'我還有事，先掛了。':'好了，先聊到這裡吧，再見。';
 endAfter=shouldClose;
 const current=()=>call.sessionId===sessionId&&call.revision===revision&&call.state==='connected'&&taiPresence(ctx.store.get()).contactable;
 if(!opening&&!event&&!String(text).trim())return;
 if(!opening&&!event){
  const playerText=String(text).trim();
  call.turns.push({role:'user',content:playerText});
  call.lastPlayerAt=Date.now();call.nudgeCount=0;call.warnedAt=0;
  call.quietUntil=isQuietCallRequest(playerText)?Date.now()+taiBehavior(ctx.store.get()).callQuietSeconds*1000:0;
 }
 call.inlineNotice='';call.busy=true;call.replyPhase='thinking';
 call.generationId=(call.generationId||0)+1;
 const generationId=call.generationId;
 const turnId='call:'+call.started+':'+sessionId+':'+generationId;
 if(!opening&&!event)ctx.store.update(s=>rememberTaiConversation(s,text,{sourceId:turnId}));
 markTaiEngaged();ctx.refresh?.();
 try{
  const history=call.turns.slice(-20);
  const behavior=taiBehavior(ctx.store.get());
  const plan=planCallSpeech({text,history,behavior,opening,event,closing:shouldClose});
  plan.maxSegments=Math.max(1,Math.min(plan.maxSegments,energy.remaining-(shouldClose?0:1),energy.stage==='fatigue'?2:Infinity));
  plan.minSegments=Math.min(plan.minSegments,plan.maxSegments);
  const moreSpeech=plan.explicit&&!shouldClose&&!opening&&!event;
  const speechDepth='【本轮通话表达计划】'+JSON.stringify({min_segments:plan.minSegments,max_segments:plan.maxSegments,mode:'voice'})+'。'+
   (shouldClose?'本轮结束电话。可先回应眼前的话，然后亲口说自然告别；最后一段必须是告别，之后程序实际挂断，不提额限。':
    'messages 数组按计划分开输出完整的口语意群，每段1至3句；先直接回应，再顺着真实话题补充想法、细节、下一句或自然转题。不要把一句话拆成碎片或同义重复。简单招呼、明确拒绝、私事界线、真正的简短回答可以短；其余有内容的对话不要仅输出一个短句。')+
   (plan.smallTalk&&!shouldClose?' 熙蒙已经连续问了几轮短问题。判断这些话是否有意义；如果他只是想闲聊，你可以接着聊、自然逗他一句，或者直接询问还有什么正事；若现在确实忙或不想继续，说明一句并选择 hang_up，不需要迎合每一个无意义的问题。':'');
  const scene=socialEnergyPrompt(ctx.store.get(),'call',{connected:true})+' '+callScene({opening,event,direction:call.direction,reason:call.reason})+
   ' 【NoApp V3｜真人电话】这轮只调用一次台词生成。你现在仍在真实通话里。'+speechDepth+
   callPersonaGuidance(taiLife(ctx.store.get()))+
   ' 通话开场不喊对方名字；需要称呼时只叫 nya（奈亚），不要念熙蒙、陈熙蒙。允许丰富而自然的几段说话，绝不为数量补写废话，也不留下逗号结尾的残句。'+
   (call.quietUntil>Date.now()?' 熙蒙要求安静陪伴，回答后保持安静，不催他说话。':'')+
   taiMomentumPrompt(history,{mode:'call'});
  const messages=opening||event?[...history,{role:'user',content:'[电话系统事件；不是熙蒙说出的台词：'+scene+']'}]:history;
  const relationshipContext=xitaiRelationshipContext(ctx.store.get(),{mode:'call',topic:text});
  const worldbookSnapshot=presetText||event==='unheard'?null:captureTaiWorldbook(ctx.store,{channel:'noapp',day,recognized:taiRecognized(ctx.store.get()),messages,outputMode:'call',scenario:scene,turnId,worldbookEvents:['social_energy']});
  // Calls need one model round-trip: return the legal action and spoken
  // messages together. Ringing and text still use their existing decisions.
  let decision=shouldClose?{schema_version:10,action:'hang_up',strategy:'answer_directly',intensity:'low',tone:'neutral',vocal_cue:'none',intent:'自然告别，然后由程序真正挂断。'}:null;
  const request={
    channel:'noapp',day,storyVersion:isStory55(ctx.store.get())?'55-v1':undefined,
    recognized:taiRecognized(ctx.store.get()),messages,outputMode:'call',scene,worldbookSnapshot,
    behavior:taiBehavior(ctx.store.get()),approvedDecision:decision,
    relationshipContext,profile:ctx.store.get().aiDraft?.profile,
    memories:ctx.store.get().aiDraft?.memories
  };
  // Only explicit questions about facts already heard take the zero-LLM route.
  // D55 authored calls and unrecognised events retain the existing pipeline.
  const memoryPreset=!opening&&!event&&!presetText&&!shouldClose&&!call.scripted&&!call.d55Story
   ?selectTaiMemoryPreset(ctx.store.get(),text):null;
  let data=memoryPreset?{text:JSON.stringify({messages:[{text:memoryPreset.text,mode:'voice',tone:'neutral'}]})}:
   presetText&&!shouldClose?{text:JSON.stringify({messages:(Array.isArray(presetText)?presetText:[presetText]).map(text=>({text,mode:'voice',tone:'neutral'}))})}:
   event==='unheard'&&!shouldClose?null:await askTai(request);
  if(!current())return;
  call.replyPhase='voice';ctx.refresh?.();
  const readDecision=value=>validateTaiAction(value,{mode:'call',channel:'noapp',recognized:request.recognized,callConnected:current(),hasIncoming:!opening&&!event&&!!text}).decision;
  if(!decision&&!presetText&&event!=='unheard')decision=readDecision(data);
  if(decision?.action==='listen'&&!shouldClose){rememberTaiMood(ctx.store,decision,turnId);call.lastTaiEndAt=Date.now();return;}
  endAfter=shouldClose||decision?.action==='hang_up'||validateCallReplyAction(data,{callConnected:current(),approvedDecision:decision});
  const parse=value=>dedupeTaiTurnEntries(unpackTaiReply(value,'call'));
  let raw;
  try{raw=event==='unheard'&&!shouldClose?[unheardReply(sessionId+':'+generationId)]:parse(data);}
  catch(error){if(endAfter)raw=[];else throw error;}
  const goodbyeAt=raw.findIndex(r=>taiCallFarewellIntent(r.text)==='end');
  if(goodbyeAt>=0){raw=raw.slice(0,goodbyeAt+1);endAfter=true;}
  else if(!shouldClose&&raw.some(r=>taiCallFarewellIntent(r.text)==='warn'))endAfter=false;
  const select=entries=>selectCallSegments(!endAfter&&!opening&&!event&&plan.minSegments>1?expandCallSegments(entries):entries,{
   maxSegments:endAfter?Math.min(2,plan.maxSegments):plan.maxSegments,
   dedupe:behavior.callDedupe,
   recent:call.turns.filter(t=>t.role==='assistant').slice(-2).map(t=>t.content)
  });
  let {segments,blocked}=select(raw);
  if(!endAfter&&!presetText&&!memoryPreset&&energy.stage==='normal'&&!raw.some(r=>taiCallFarewellIntent(r.text)==='warn')&&needsCallContinuation(segments,plan)){
   // Retain the first response; one bounded continuation for meaningful speech.
   try{
    const revised=await askTai({...request,scene:scene+' 【多段语音补足】已经拟好且会保留的台词：'+segments.map(r=>r.text).join(' / ')+'。只生成接下来'+(plan.minSegments-segments.length)+'至'+(plan.maxSegments-segments.length)+'段不同且有实质内容的 messages，不要重述已有台词。若确实没有更多内容、想安静或不愿披露私事，可选择 listen；若准备挂断，请输出自然告别并选择 hang_up。'});
    if(!current())return;
    const nextDecision=readDecision(revised);
    const revisedRaw=parse(revised),next=select(revisedRaw);
    if(nextDecision?.action==='hang_up'||validateCallReplyAction(revised,{callConnected:current(),approvedDecision:nextDecision})||revisedRaw.some(r=>taiCallFarewellIntent(r.text)==='end')){
     const accumulated=select([...segments,...revisedRaw]);data=revised;decision=nextDecision;endAfter=true;raw=[...raw,...revisedRaw];({segments,blocked}=accumulated);
    }else if(nextDecision?.action!=='listen'&&next.segments.length){
     const initial=moreSpeech&&segments.length===1&&/^(?:好|嗯|行|可以)[。！？!?]*$/.test(segments[0].text)?[]:segments;
     const accumulated=select([...initial,...revisedRaw]);if(accumulated.segments.length>segments.length){raw=[...raw,...revisedRaw];({segments,blocked}=accumulated);}
    }
   }catch{}
  }
  if(!current())return;
  if(decision)rememberTaiMood(ctx.store,decision,turnId,{evidence:!opening&&!event?text:''});
  if(endAfter){
   const final=raw.find(r=>taiCallFarewellIntent(r.text)==='end');
   if(final&&!segments.some(r=>r.text===final.text))segments=[...segments.slice(0,Math.max(0,Math.min(2,plan.maxSegments)-1)),final];
  }
  ({segments,endAfter}=finalizeCallSegments(segments,{close:endAfter,closingLine,maxSegments:endAfter?Math.min(2,plan.maxSegments):plan.maxSegments}));
  // The local unheard repair is authored and must remain available without AI.
  if((event!=='unheard'||shouldClose)&&(hasBannedTaiConstruction(segments.map(r=>r.text))||hasBannedTaiConstruction(segments.map(r=>r.speechText||r.text))))throw Object.assign(Error('Blocked combined dialogue'),{code:'TAI_STYLE'});
  ctx.store.update(state=>{
   state.events??=[];
   state.events.push({type:'tai_call_v2_turn',sessionId,generationId,day:state.day,clock:state.clock,
    proposed:raw.length,planned:segments.length,blocked:blocked.length,
    endAfter,forcedByPlayer:forceHangUp,moreSpeech,minSegments:plan.minSegments,maxSegments:plan.maxSegments,mode:behavior.callDetail,at:Date.now()});
  });
  // Prepare one upcoming clip while the current clip plays; no overlapping
  // playback, and never queue more work after interruption.
  const synth=r=>Promise.resolve().then(()=>{if(!current())throw Error('Call no longer available');return synthesizeTaiVoice({text:composeCallSpeech([r],behavior),tone:r.tone||decision?.tone||'neutral',directed:true},voicePreview,{store:ctx.store,kind:'call'});}).then(blob=>({blob}),error=>({error}));
  let pending=segments.length?synth(segments[0]):null;
  for(let i=0;i<segments.length;i++){
   if(!current())break;
   const r=segments[i],prepared=await (pending||synth(r));
   if(!current())break;
   if(prepared.error)throw prepared.error;
   const blob=prepared.blob;
   pending=null;
   call.caption=r.text;call.lastSpeech=r.text;call.replyPhase='speaking';ctx.refresh?.();
   const outcome=await playCallAudio(ctx,blob,sessionId,revision,()=>{if(current()&&i+1<segments.length)pending=synth(segments[i+1]);});
   if(outcome==='failed')throw Error('Call audio playback failed');
   if(!current()||outcome!=='completed')break;
   call.turns.push({role:'assistant',content:r.text,tone:r.tone||decision?.tone||'neutral',
    vocalCue:r.vocalCue||decision?.vocal_cue||'none',playedAt:Date.now()});
   if(event==='nudge'&&taiCallFarewellIntent(r.text)==='warn')call.warnedAt=Date.now();
   if(!presetText&&event!=='unheard')ctx.store.update(s=>rememberTaiDelivered(s,r.text,{sourceId:turnId+':played:'+call.turns.length}));
   call.caption='';call.audioReady=false;call.replyPhase='voice';ctx.refresh?.();
   if(!endAfter||i+1<segments.length)await new Promise(resolve=>setTimeout(resolve,Math.min(behavior.callPause,.65)*1000));
  }
 }catch(error){
  if(error?.code==='TAI_STYLE'){endAfter=false;return;} // stay connected; an expression veto is not a network failure
  if(error?.code==='TAI_SOCIAL_REST'){if(current())callAction('tai-hangup',ctx,{endedBy:'tai',endReason:'resting',fallback:closingLine});return;}
  if(current()){
   console.warn('NoApp call connection failed:',error?.message);
   call.connectionIssue=true;ctx.refresh?.();
   await new Promise(resolve=>setTimeout(resolve,700));
   if(current())callAction('tai-hangup',ctx,{endedBy:'connection_error',endReason:'connection_error',fallback:callFailureLine({endedAfter:endAfter,turns:call.turns})});
  }
 }
 finally{
  if(current()){
   call.busy=false;call.replyPhase=null;call.lastTaiEndAt=Date.now();
   if(endAfter){
    const finish=()=>{if(call.sessionId===sessionId&&call.state==='connected')callAction('tai-hangup',ctx,{endedBy:'tai',endReason:forceHangUp?'player_request':event==='closing'?'idle':'autonomous'});};
    if(forceHangUp)finish();else{call.closingPending=true;call.closeTimer=setTimeout(finish,2500);call.closeTimer.unref?.();ctx.refresh?.();}
   }else ctx.refresh?.();
  }
 }
}
// D55 uses the existing live NoApp call, native Phone interruption and one
// world clock. This driver changes phases; it never creates a parallel call UI.
function beginD55Script(ctx,script,phase){
 if(call.state!=='connected'||!call.d55Story)return false;
 call.revision=(call.revision||0)+1;
 playback?.pause();finishSegment?.('interrupted');
 call.busy=false;call.audioReady=false;call.caption='';call.captionRole=null;
 call.scripted=script;call.scriptIndex=ctx.store.get().story55?.d55CallProgress?.[script.id]||0;
 call.d55Phase=phase;call.d55Held=false;call.expanded=false;
 ctx.store.update(s=>{s.story55.d55CallStage=phase;s.story55[script.triggerKey]=true;});
 void playScriptedOpening(ctx);ctx.refresh?.();return true;
}
export function tickD55NoApp(ctx,{now=Date.now()}={}){
 let s=ctx.store.get();
 if(!isStory55(s)||s.story55?.ended)return false;
 if(s.day===55&&!(s.story55.d55RecordedVoiceRevision>=1)){
  ctx.store.update(recoverD55SilentVoice);s=ctx.store.get();
 }
 const story=s.story55;
 // Pre-render approved fixed dialogue at the preceding day's close or early
 // D55. Actual phone playback only reads cached or bundled recordings.
 if((s.day===54&&completed(s,'d54-tai')||s.day===55&&s.clock>='09:50')
    &&story.d55VoicePrewarmDay!==s.day){
  ctx.store.update(s=>{s.story55.d55VoicePrewarmDay=s.day;});
  preloadScriptedVoice(55);
 }
 if(s.day!==55)return false;
 if(call.state==='ringing'&&call.scripted?.id===D55_RECALL.id){
  if(s.clock>='22:49'){
   callAction('tai-hangup',ctx,{endedBy:'tai',endReason:'d55_unanswered_end'});
   ctx.store.update(s=>{s.story55.d55RecallCompleted=true;});
   return true;
  }
  return true;
 }
 if(story.d55Disconnected){
  // The last recording must actually finish playing before the ringing
  // overlay can cover its voice bubble.
  if(story.finalAudioHeard&&!story.d55RecallCompleted&&s.clock>='22:46'
     &&!['ringing','dialing','connected'].includes(call.state)){
   return startIncoming(ctx,'熙泰邀請你語音通話',{scripted:D55_RECALL});
  }
  return false;
 }
 if(call.state==='connected'&&call.d55Story){
  if(call.d55Held){
   if(story.d55FatherEndedAt&&now-story.d55FatherEndedAt>=3000)
    return beginD55Script(ctx,D55_FINAL_CALL,'final');
   return true;
  }
  if(call.d55Phase==='free'&&s.clock>='22:30'&&!story.d55FatherReady)
   return beginD55Script(ctx,D55_WARNING_CALL,'warning');
  return true;
 }
 if(!completed(s,D55_XIAOXIN)||s.clock<'22:00'||!s.unlocked||phoneBlocked(s)
    ||['ringing','dialing','connected'].includes(call.state))return false;
 if(['ringing','connected'].includes(s.phoneCall?.state))return false;
 if(story.d55FatherReady&&!story.d55FatherEndedAt)return false;
 if(story.d55FatherEndedAt){
  if(now-story.d55FatherEndedAt<3000)return false;
  return startIncoming(ctx,'熙泰邀請你語音通話',{scripted:D55_FINAL_CALL});
 }
 if(call.scriptedRetryId&&now<(call.retryAt||0))return true;
 const introDone=scriptedCallPlayed(s,D55_OPENING_CALL);
 return startIncoming(ctx,'熙泰邀請你語音通話',
  {scripted:introDone?{...D55_OPENING_CALL,steps:[]}:D55_OPENING_CALL});
}

export function nextCallIdleEvent(snapshot,now=Date.now(),config){
 return nextNaturalCallIdleEvent(snapshot,now,taiBehavior({aiDraft:{behavior:config}}));
}
export function maybeAdvanceCall(ctx,{now=Date.now()}={}){
 if(call.d55Story&&!call.scripted)return false; // No auto hang-up or idle nudges during D55.
 if(call.scripted){
  if(call.scripted.id===D41_CALL.id&&call.state==='connected'){
   const s=ctx.store.get(),match=s.matches?.find(m=>m.invitationId===D41_CHESS_INVITATION);
   const done=call.scriptIndex>=D41_CALL.steps.length&&!call.busy&&d41ChessComplete(match);
   if(done||s.day>41){callAction('tai-hangup',ctx,{endedBy:'tai',endReason:'scripted_end'});return true;}
  }
  return false; // authored calls never hand off to a model or idle nudge
 }
 if(call.state==='connected'&&!taiPresence(ctx.store.get()).contactable){callAction('tai-hangup',ctx,{endedBy:'tai',endReason:'unavailable'});return true;}
 if(playback&&!playback.paused)return false;
 const event=nextCallIdleEvent(call,now,taiBehavior(ctx.store.get()));
 if(!event)return false;
 call.nudgeCount=event==='nudge'?1:2;
 void generateTurn(ctx,{event,endAfter:event==='closing'});
 return true;
}
async function respond(text,ctx){return generateTurn(ctx,{text});}
// Preload concurrently, but never make the first line wait for later clips.
export async function playScriptedCallSequence(script,{current,synthesize,play,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 const clips=script.lines.map(text=>Promise.resolve(synthesize(text)).catch(()=>null));
 for(let i=0;i<clips.length;i++){
  if(!current())return;
  const clip=await clips[i];if(!current())return;
  if(await play(clip,script.lines[i])!=='completed'||!current())return;
  if(i+1<clips.length)await wait(script.gapMs);
 }
}
async function playScriptedOpening(ctx){
 const sessionId=call.sessionId,revision=call.revision,script=call.scripted;
 const current=()=>call.sessionId===sessionId&&call.revision===revision&&call.state==='connected';
 call.busy=true;ctx.refresh?.();
 try{
  const steps=script.steps||script.lines.map(text=>['tai',text]);
  call.scriptIndex??=0;
  while(current()&&call.scriptIndex<steps.length){
   const [role]=steps[call.scriptIndex];
   if(role==='me'){
    if(call.scriptIndex<(ctx.store.get().story55?.d55VoiceRecoveryThrough?.[script.id]||0)){
     call.scriptIndex++;saveD55CallProgress(ctx,script);continue;
    }
    if(script.autoPlayerLines){
     // Authored cutscene dialogue, not a simulated click on the live composer.
     const text=steps[call.scriptIndex][1];
     call.caption=text;call.captionRole='me';
     call.turns.push({role:'user',content:text,clock:stampScriptedCallLine(ctx,script,steps,call.scriptIndex)});
     call.scriptIndex++;ctx.refresh?.();
     await new Promise(resolve=>setTimeout(resolve,Math.max(2200,Array.from(text).length*180)));
     if(!current())return;
     call.caption='';call.captionRole=null;ctx.refresh?.();
     if(call.scriptIndex<steps.length)await new Promise(resolve=>setTimeout(resolve,script.gapAfterMs?.[call.scriptIndex-1]??script.gapMs));
     continue;
    }
    if(script.camera)await new Promise(resolve=>setTimeout(resolve,presetReplyDelay(steps[call.scriptIndex][1],script.gapMs)));
    break;
   }
   if(role==='pause'){
    call.caption='';call.captionRole=null;ctx.refresh?.();
    await new Promise(resolve=>setTimeout(resolve,script.pauseMs||2000));
    if(!current())return;
    call.scriptIndex++;saveD55CallProgress(ctx,script);continue;
   }
   if(role==='invite'){
    ctx.store.update(offerD41ChessInvitation);call.scriptIndex++;ctx.refresh?.();await new Promise(resolve=>setTimeout(resolve,script.inviteGapMs));continue;
   }
   const lines=[];for(let i=call.scriptIndex;i<steps.length&&steps[i][0]==='tai';i++)lines.push(steps[i][1]);
   const before=call.scriptIndex;
   const requireRecording=script.id===D41_CALL.id||script.id.startsWith('d55-');
   await playScriptedCallSequence({...script,lines},{current,
   synthesize:async text=>{
    if(!requireRecording)return loadScriptedVoice(text).catch(()=>loadScriptedVoice(text)).catch(()=>null);
    while(current()){try{const blob=await loadScriptedVoice(text);call.connectionIssue=false;return blob;}catch{call.connectionIssue=true;ctx.refresh?.();await new Promise(resolve=>setTimeout(resolve,1800));}}
    return null;
   },
   play:async(blob,text)=>{
    call.caption=text;call.lastSpeech=text;ctx.refresh?.();
    let outcome=blob?await playCallAudio(ctx,blob,sessionId,revision):'failed';
    while(requireRecording&&outcome==='failed'&&current()){
     await new Promise(resolve=>setTimeout(resolve,1800));
     if(current())outcome=await playCallAudio(ctx,blob,sessionId,revision);
    }
    // Do not create a separate troubleshooting flow inside the story.
    if(outcome==='failed'&&current()){
     if(script.id===RECOGNITION_CALL.id){callAction('tai-hangup',ctx,{endedBy:'connection_error',endReason:'connection_error'});return 'interrupted';}
     if(script.camera||script.autoPlayerLines||script.id.startsWith('d55-')){await new Promise(resolve=>setTimeout(resolve,presetReplyDelay(text,script.gapMs)));if(!current())return 'interrupted';}
     call.turns.push({role:'assistant',content:text,voiceUnavailable:true,clock:stampScriptedCallLine(ctx,script,steps,call.scriptIndex)});call.scriptIndex++;saveD55CallProgress(ctx,script);call.audioReady=false;call.caption='';
     ctx.refresh?.();return 'completed';
    }
    if(current()&&outcome==='completed'){
     call.turns.push({role:'assistant',content:text,playedAt:Date.now(),clock:stampScriptedCallLine(ctx,script,steps,call.scriptIndex)});call.scriptIndex++;saveD55CallProgress(ctx,script);call.caption='';call.audioReady=false;ctx.refresh?.();
    }
    return outcome;
   }});
   if(!current()||call.scriptIndex===before)break;
   if(script.autoPlayerLines&&steps[call.scriptIndex]?.[0]==='me')await new Promise(resolve=>setTimeout(resolve,script.gapMs));
  }
 }catch(error){
  if(current()){console.warn('NoApp scripted call connection failed:',error?.message);callAction('tai-hangup',ctx,{endedBy:'connection_error',endReason:'connection_error'});}
 }finally{if(current()){
  call.busy=false;call.lastTaiEndAt=Date.now();
  const count=script.steps?.length||script.lines.length;
  if(call.scriptIndex>=count){
   if(script.id!==RECOGNITION_CALL.id)ctx.store.update(s=>{s.story55.scriptedCallCompleted??={};s.story55.scriptedCallCompleted[script.id]=true;});
   if(script.handoffToFree){
    call.scripted=null;call.d55Phase='free';call.d55Held=false;call.expanded=false;
    ctx.store.update(s=>{s.story55.d55CallStage='free';});ctx.refresh?.();return;
   }
   if(script.handoffToHold){
    call.scripted=null;call.d55Phase='held';call.d55Held=true;
    ctx.store.update(s=>{s.story55.d55CallStage='held';s.story55.d55FatherReady=true;s.story55.d55FatherTakeover=true;});ctx.refresh?.();return;
   }
   if(script.disconnectOnComplete){
    ctx.store.update(s=>{
     s.story55.d55Disconnected=true;s.story55.d55CallStage='disconnected';
     if(s.clock<'22:43')s.clock='22:43';
    });
    callAction('tai-hangup',ctx,{endedBy:'system',endReason:'d55_disconnect'});
    ctx.store.update(s=>{
     const c=s.content.conversations.noapp?.find(c=>c.id==='tai');
     if(c&&!c.messages.some(m=>m.id==='s55-d55-xitai-last-text')){
      c.messages.push({id:'s55-d55-xitai-last-text',from:'tai',text:'熙蒙？',kind:'text',
       day:55,time:s.clock,actual:true,story55:true});
      if(!isConversationOpen(s,'noapp','tai')){c.unread=(c.unread||0)+1;
       s.notifications.unshift({id:'s55-d55-xitai-last-notice',title:'陳熙泰',body:'熙蒙？',
        link:{appId:'noapp',route:'/chat/tai',params:{}}});}
     }
    });
    ctx.refresh?.();return;
   }
   if(!script.completionMatch){callAction('tai-hangup',ctx,{endedBy:'tai',endReason:'scripted_end'});return;}
  }
  if(scriptedCallDraft())call.expanded=true;ctx.refresh?.();
 }}
}
function saveD55CallProgress(ctx,script){
 if(!script?.id?.startsWith('d55-'))return;
 const index=call.scriptIndex||0;
 ctx.store.update(s=>{s.story55.d55CallProgress??={};s.story55.d55CallProgress[script.id]=index;});
}
function stampScriptedCallLine(ctx,script,steps,index){
 // D55 uses the world clock: scripted captions must not artificially advance
 // 22:30 to 22:49 while the phone exchange is still taking place.
 if(script.id?.startsWith('d55-'))return ctx.store.get().clock;
 let clock;ctx.store.update(s=>{call.timeline??={};clock=stampFixedLine(s,call.timeline,steps,index,{at:script.at,day:script.day});});return clock;
}
export function scriptedCallDraft(){
 const step=call.scripted?.steps?.[call.scriptIndex||0];
 return call.state==='connected'&&!call.busy&&!call.scripted?.autoPlayerLines&&step?.[0]==='me'?step[1]:null;
}
function startGreeting(ctx){
 if(call.state==='connected'&&!call.greeted){
  call.greeted=true;
  if(call.scripted){void playScriptedOpening(ctx);return;}
  queueMicrotask(()=>{if(call.state==='connected')generateTurn(ctx,{opening:true,presetText:call.direction==='outgoing'?outgoingCallOpening(taiLife(ctx.store.get()),{sessionId:call.sessionId}):incomingCallOpening(call)});});
 }
}
export function submitCall(form,ctx){
 if(form.dataset.form!=='tai-call-turn')return false;
 if(call.scripted){
  const draft=scriptedCallDraft();
  if(draft&&String(new FormData(form).get('text')||'').trim()===draft){
   const script=call.scripted;
   call.turns.push({role:'user',content:draft,clock:stampScriptedCallLine(ctx,script,script.steps,call.scriptIndex)});
   call.scriptIndex++;saveD55CallProgress(ctx,script);
   if(script.id===D55_WARNING_CALL.id&&call.scriptIndex===3)
    ctx.store.update(s=>{s.story55.d55FatherReady=true;});
   void playScriptedOpening(ctx);
  }
  return true;
 }
 const text=String(new FormData(form).get('text')||'').trim();
 if(text){
  if(call.busy||call.audioReady||playback&&!playback.paused){
   if(!taiBehavior(ctx.store.get()).callInterrupt){call.inlineNotice='等熙泰說完再輸入';ctx.refresh?.();return true;}
   interruptCallTurn(ctx,'text');
  }
  void respond(text,ctx);
 }
 return true;
}
export function callAction(action,ctx,{endedBy='player',endReason='manual',fallback='',outcomeOverride=''}={}){
 switch(action){
 case 'tai-minimize-call':
  if(['dialing','connected'].includes(call.state))ctx.store.update(dismissNoAppCallRoute);
  return true;
 case 'tai-resume-call':
  if(['ringing','dialing','connected'].includes(call.state)&&!isNoAppCallRoute(ctx.store.get().nav.current))ctx.router.open({appId:'noapp',route:'/call',params:{}});
  return true;
 case 'tai-accept':
  if(call.state!=='ringing'||call.scripted?.unanswerable)return false;
  if(!call.scripted&&(!taiPresence(ctx.store.get()).contactable||!canTaiCall(ctx.store.get()))){callAction('tai-decline',ctx,{endedBy:'tai',endReason:'unavailable'});return true;}
  playback=createGestureAudio();
  call.state='connected';call.started=Date.now();markTaiEngaged();
  ctx.store.update(s=>{s.notifications=s.notifications.filter(n=>n.id!==call.notificationId);});
  ctx.refresh();startGreeting(ctx);return true;
 case 'tai-decline':case 'tai-hangup':
  if(call.scripted?.unanswerable&&!['d55_unanswered_end'].includes(endReason))return true;
  if(call.d55Story&&call.state==='connected'&&!['d55_disconnect','d55_unanswered_end'].includes(endReason))return true;
  if(!['ringing','dialing','connected'].includes(call.state))return true;
  const previous=call;
  clearTimeout(previous.closeTimer);
  callSerial++;call={state:'ended',sessionId:callSerial,direction:previous.direction,endedBy:previous.state==='connected'&&['tai','player','system','connection_error'].includes(endedBy)?endedBy:null,muted:false,speaker:true,turns:[],started:0,busy:false,nudgeCount:0};
  if(previous.scripted?.pauseTimeUntilComplete&&!scriptedCallPlayed(ctx.store.get(),previous.scripted)){call.scriptedRetryId=previous.scripted.id;call.retryAt=Date.now()+5000;}
  if(activeRecognition){activeRecognition.abort?.();activeRecognition=null;}
  if(recording?.call){recording.recorder._cancelled=true;recording.recorder.stop();recording=null;}
  finishSegment?.('interrupted');
  if(playback){playback.pause();if(playback.src.startsWith('blob:'))URL.revokeObjectURL(playback.src);playback=null;}
  let endedRecord;
  ctx.store.update(s=>{
   if(!previous.scripted&&endedBy==='tai'&&['autonomous','idle','declined','resting'].includes(endReason)&&!taiCallCooling(s))markTaiCallRest(s);
   if(previous.notificationId)s.notifications=s.notifications.filter(n=>n.id!==previous.notificationId);
   const outcome=previous.scripted?.unanswerable?'missed':previous.state==='dialing'&&endedBy==='tai'&&['declined','missed'].includes(outcomeOverride)?outcomeOverride:previous.state==='ringing'?'declined':previous.state==='dialing'?'cancelled':'ended';
   s.events.push({type:action==='tai-decline'?'tai_call_declined':'tai_call_ended',day:s.day,clock:s.clock,
    endedBy:previous.state==='connected'?call.endedBy:outcomeOverride&&endedBy==='tai'?'tai':null,endReason:previous.state==='connected'||outcomeOverride?endReason:'',
    durationSeconds:previous.started?Math.max(0,Math.floor((Date.now()-previous.started)/1000)):0});
   endedRecord=recordCall(s,{direction:previous.direction,status:outcome,turns:previous.turns,endedBy:outcome==='declined'||outcome==='missed'?endedBy:call.endedBy,endReason,
    seconds:previous.started?Math.max(0,Math.floor((Date.now()-previous.started)/1000)):0});
   if(previous.scripted?.id===RECOGNITION_CALL.id&&endReason==='scripted_end'&&previous.scriptIndex>=previous.scripted.steps.length&&endedRecord?.callStatus==='ended'){
    endedRecord.id='s55-recognition-call';endedRecord.story55=true;
    s.story55.scriptedCallCompleted??={};s.story55.scriptedCallCompleted[RECOGNITION_CALL.id]=true;
    s.story55.scenes.recognition={index:previous.scripted.steps.length,accepted:true};
    finishScene55(s,'recognition');
   }
   if(endedRecord?.callStatus==='ended')rememberTaiCall(s,endedRecord);
   if(['connection_error','tai'].includes(endedBy)&&fallback){
    const chat=s.content.conversations.noapp?.find(c=>c.id==='tai');
    if(chat){const id='tai-call-fallback-'+uid();chat.messages.push({id,from:'tai',kind:'text',text:fallback,day:s.day,time:s.clock,sentDate:dateParts(s).iso,actual:true,receivedAt:Date.now()});
     if(!isConversationOpen(s,'noapp','tai')&&s.nav.current.route!=='/call'){
      chat.unread=(chat.unread||0)+1;s.notifications.unshift({id,conversationId:'tai',title:taiDisplayName(s),body:fallback,link:{appId:'noapp',route:'/chat/tai',params:{}}});
     }
    }
   }
  });
  if(!previous.scripted&&endedRecord?.callStatus==='ended'&&endedBy==='player'&&endReason==='manual'&&endedRecord.transcript){
   // Existing proactive queue owns actual delivery; no second messaging system.
   const timer=setTimeout(()=>import('../../services/ai/proactive.js').then(({maybeSendProactive})=>maybeSendProactive(ctx.store,{force:'postcall',postCall:endedRecord})).catch(()=>{}),350);
   timer.unref?.();
  }
  // Declining the top banner must not eject the player from another App,
  // nor leave /call in the back stack after the call has stopped.
  if(isNoAppCallRoute(ctx.store.get().nav.current)||ctx.store.get().nav.stack?.some(isNoAppCallRoute)){
   const endedSession=call.sessionId;
   const back=()=>{if(call.sessionId===endedSession)ctx.store.update(dismissNoAppCallRoute);};
   if(endedBy==='connection_error'){ctx.refresh?.();setTimeout(back,1100);}else back();
  }
  return true;
 case 'tai-return-from-call':ctx.store.update(dismissNoAppCallRoute);return true;
 case 'tai-play-audio':if(playback){playback.muted=!call.speaker;playback.play().then(()=>{call.audioReady=false;callPlaybackStarted?.();ctx.refresh();}).catch(()=>{call.inlineNotice='請再次點擊繼續收聽';ctx.refresh?.();});}return true;
 case 'tai-expand':call.expanded=!call.expanded;ctx.refresh();return true;
 case 'tai-mute':call.muted=!call.muted;ctx.refresh();return true;
 case 'tai-speaker':call.speaker=!call.speaker;if(playback)playback.muted=!call.speaker;ctx.refresh();return true;
 case 'tai-mic':{
  if(call.scripted||call.d55Held)return true;
  // iOS lowers or interrupts remote audio when a new mic audio session opens.
  // A microphone gesture interrupts the current reply before starting iOS half-duplex capture.
  if(call.state!=='connected'||call.requestingMic||call.transcribing)return true;
  call.inlineNotice='';
   if(call.busy||call.audioReady||playback&&!playback.paused){
    if(!taiBehavior(ctx.store.get()).callInterrupt){call.inlineNotice='等熙泰說完再說話';ctx.refresh?.();return true;}
    interruptCallTurn(ctx,'microphone');
   }
  if(call.muted){call.inlineNotice='請先解除靜音';ctx.refresh?.();return true;}
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(navigator.mediaDevices?.getUserMedia&&globalThis.MediaRecorder){
   if(recording?.call){
    const active=recording;recording=null;call.listening=false;call.transcribing=true;active.recorder.stop();ctx.refresh();return true;
   }
   const sessionId=call.sessionId,captureRevision=call.revision||0;call.requestingMic=true;ctx.refresh?.();
   (async()=>{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(call.sessionId!==sessionId||call.state!=='connected'||call.revision!==captureRevision){stream.getTracks().forEach(t=>t.stop());return;}
    const chunks=[],recorder=new MediaRecorder(stream);
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());
      if(recorder._cancelled||call.sessionId!==sessionId||call.state!=='connected'||call.revision!==captureRevision)return;
      call.listening=false;call.transcribing=true;call.busy=true;ctx.refresh();
      try{
       const text=await speechToText(new Blob(chunks,{type:recorder.mimeType||'audio/mp4'}));
       if(call.sessionId===sessionId&&call.state==='connected'&&call.revision===captureRevision){
        call.transcribing=false;call.busy=false;await respond(text,ctx);
       }
      }catch(e){
       if(call.sessionId===sessionId&&call.state==='connected'&&call.revision===captureRevision){
        call.transcribing=false;call.busy=false;call.inlineNotice='沒有聽清，請再說一次';
        await generateTurn(ctx,{event:'unheard'});
       }
      }finally{
       if(call.sessionId===sessionId&&call.revision===captureRevision){
        if(call.transcribing){call.transcribing=false;call.busy=false;}
        ctx.refresh();
       }
      }
    };
    recording={recorder,call:true};call.listening=true;recorder.start();call.requestingMic=false;ctx.refresh();
    setTimeout(()=>{if(recording?.recorder===recorder&&recorder.state==='recording'){recording=null;call.listening=false;call.transcribing=true;recorder.stop();ctx.refresh();}},18000);
   })().catch(e=>{if(call.sessionId===sessionId){call.listening=false;call.inlineNotice='麥克風不可用，請使用文字輸入';ctx.refresh?.();}}).finally(()=>{if(call.sessionId===sessionId){call.requestingMic=false;ctx.refresh?.();}});
   return true;
  }
  if(!Speech){call.inlineNotice='此裝置未開放麥克風，請使用文字輸入';ctx.refresh?.();return true;}
  try{
   if(activeRecognition){activeRecognition.stop();activeRecognition=null;call.listening=false;call.transcribing=true;ctx.refresh();return true;}
   const sessionId=call.sessionId,captureRevision=call.revision||0,recognition=new Speech();recognition.lang='zh-CN';recognition.interimResults=false;recognition.maxAlternatives=1;
   let heard=false,failed=false;
   activeRecognition=recognition;call.listening=true;
   recognition.onresult=e=>{heard=true;if(call.sessionId===sessionId&&call.state==='connected'&&call.revision===captureRevision){call.listening=false;call.transcribing=false;void respond(e.results[0][0].transcript,ctx);}};
   recognition.onend=()=>{const active=activeRecognition===recognition;if(active)activeRecognition=null;if(call.sessionId===sessionId&&call.state==='connected'&&call.revision===captureRevision){call.listening=false;call.transcribing=false;ctx.refresh();if(!heard&&!failed)void generateTurn(ctx,{event:'unheard'});}};
   recognition.onerror=e=>{failed=true;if(call.sessionId===sessionId&&call.state==='connected'&&call.revision===captureRevision&&e.error!=='aborted'){call.listening=false;call.transcribing=false;call.inlineNotice='沒有聽清，請再說一次';void generateTurn(ctx,{event:'unheard'});}};
   recognition.start();ctx.refresh();
  }catch(e){call.listening=false;call.transcribing=false;call.inlineNotice='麥克風不可用，請使用文字輸入';ctx.refresh?.();}
  return true;
 }
 default:return false;
 }
}
let voicePermissionPending=false;
async function beginVoiceRecording(ctx){
 if(voicePermissionPending||recording)throw Error('麦克风正在使用中');
 if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder)throw Error('需要 HTTPS 和麦克风权限才能录音');
 voicePermissionPending=true;
 let stream;
 try{
  suspendVoicesForCapture();
  // Called directly from pointerdown, before any delay or re-render, so iOS
  // can associate the permission request with the player's real gesture.
  stream=await navigator.mediaDevices.getUserMedia({audio:true});
  const preferred=['audio/mp4','audio/webm;codecs=opus','audio/webm'];
  const mime=preferred.find(type=>MediaRecorder.isTypeSupported?.(type))||'';
  const recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
  const clips=[],start=Date.now();
  const current={recorder,stream,start,kind:'message',_cancelled:false,timer:null};
  recorder.ondataavailable=e=>{if(e.data?.size)clips.push(e.data);};
  recorder.onstop=async()=>{
   clearTimeout(current.timer);
   stream.getTracks().forEach(track=>track.stop());
   resumeVoicesAfterCapture();
   if(recording===current)recording=null;
   if(current._cancelled)return;
   try{
    const blob=new Blob(clips,{type:recorder.mimeType||mime||'audio/mp4'});
    if(blob.size<128)throw Error('录音时间太短，请按住后说话');
    const duration=Math.max(1,Math.round((Date.now()-start)/1000)),id='voice-'+uid();
    await saveClip(id,blob);
    let transcript='';
    try{transcript=await speechToText(blob);}
    catch(error){ctx.toast('语音已保存，但转写失败：'+error.message);}
    ctx.store.update(s=>{
     const c=s.content.conversations.noapp?.find(c=>c.id==='tai');if(!c)return;
     c.messages.push({id,from:'me',text:'[语音消息 '+duration+'秒]',kind:'voice',audioId:id,voiceCaption:transcript||null,recognitionFailed:!transcript,duration,time:s.clock,day:s.day,sentDate:dateParts(s).iso,actual:true});
     s.events.push({type:'voice_sent',channel:'noapp',messageId:id,day:s.day,clock:s.clock});
    });
    if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('ximeng:noapp-voice-sent',{detail:{messageId:id}}));
   }catch(e){ctx.toast('语音保存失败：'+e.message);}
  };
  recorder.onerror=()=>{current._cancelled=true;};
  recording=current;
  recorder.start(250);
  current.timer=setTimeout(()=>stopVoiceRecording({cancel:false}),25000);
  return current;
 }catch(e){stream?.getTracks().forEach(track=>track.stop());resumeVoicesAfterCapture();throw e;}
 finally{voicePermissionPending=false;}
}
function stopVoiceRecording({cancel=false}={}){
 const current=recording;
 if(!current||current.kind!=='message')return false;
 current._cancelled=!!cancel;
 clearTimeout(current.timer);
 recording=null;
 if(current.recorder.state==='recording')current.recorder.stop();
 else current.stream.getTracks().forEach(track=>track.stop());
 return true;
}
export async function toggleVoiceRecord(ctx){
 if(recording?.kind==='message'){stopVoiceRecording();return;}
 await beginVoiceRecording(ctx);
}
export async function sendTaiTestVoice(ctx,{text,tone='dry'}={}){
 const s=ctx.store.get();
 if(!taiRecognized(s))throw Error('NoApp 语音测试需要相认以后');
 const body=readableTaiVoiceText(String(text||'').trim().slice(0,1200));
 if(!body)throw Error('语音台词不能为空');
 const clip=await synthesizeTaiVoice({text:body,tone},voicePreview);
 const id='tai-voice-preview-'+uid(),audioId='tai-'+id;
 await saveClip(audioId,clip);
 ctx.store.update(state=>{
  const c=state.content.conversations.noapp?.find(c=>c.id==='tai');
  if(!c)return;
  c.messages.push({id,from:'tai',kind:'voice',text:body,voiceCaption:body,audioId,
   day:state.day,time:state.clock,sentDate:dateParts(state).iso,actual:true,aiGenerated:true,testOnly:true});
 });
 return id;
}
export async function playVoiceMessage(id,ctx){
 const c=ctx.store.get().content.conversations.noapp?.find(c=>c.id==='tai');
 const list=c?.messages||[],index=list.findIndex(m=>(m.audioId||m.id)===id);
 const selected=list[index];
 const queue=selected?.from==='tai'?
   list.slice(index).filter(m=>m.from==='tai'&&(m.kind==='voice'||m.voiceRequested)):[selected].filter(Boolean);
 const token=++voicePlaylistToken;
 cancelMessagePlayback?.();
 if(messagePlayback){messagePlayback.pause();if(messagePlayback.src.startsWith('blob:'))URL.revokeObjectURL(messagePlayback.src);}
 messagePlayback=createGestureAudio();
 if(!messagePlayback){ctx.toast('当前浏览器不支持音频播放');return;}
 const player=messagePlayback;
 messagePlayback.preload='auto';
 // Reuse a single audio element: after the initial tap, sequential play is
 // much more reliable on iOS than creating three new autoplay elements.
 for(const m of queue){
  if(token!==voicePlaylistToken)break;
  // A bundled recording remains playable even if local audio storage is denied.
  let blob=await loadClip(m.audioId||m.id).catch(()=>null);
  // A voice synthesized before the parser fix may be literally speaking JSON.
  // Repair its audio and visible transcript only after recovering the dialogue.
  const oldCaption=String(m.voiceCaption||m.text||'');
  if(m.from==='tai'&&/^\s*(?:\[\s*\{|\{\s*"(?:messages|text|reply))/.test(oldCaption)){
   const clean=readableTaiVoiceText(oldCaption);
   if(!clean||clean==='语音转写异常，原始数据已隐藏'){ctx.toast('旧语音格式异常，请重新生成');continue;}
   try{
     blob=await synthesizeTaiVoice({text:m.speechText||clean,tone:m.aiTone||'neutral',...m.voiceSettings,directed:Boolean(m.aiGenerated&&!m.testOnly&&!m.voiceSettings)},voicePreview);
    await saveClip(m.audioId||m.id,blob);
    ctx.store.update(state=>{
     const record=state.content.conversations.noapp?.find(c=>c.id==='tai')?.messages.find(x=>x.id===m.id);
     if(record){record.voiceCaption=clean;record.text=clean;}
    });
   }catch(error){console.warn('NoApp old voice repair failed:',error?.message);ctx.toast('暫時無法播放語音');continue;}
  }
  if(!blob&&m.voiceRequested){
   for(let wait=0;wait<35&&!blob&&token===voicePlaylistToken;wait++){
    await new Promise(resolve=>setTimeout(resolve,240));
    blob=await loadClip('tai-'+m.id).catch(()=>null);
   }
  }
  const source=typeof m.voiceSrc==='string'?canonicalPhoneAudioPath(m.voiceSrc):null;
  const asset=source&&/^\/assets\/[a-z0-9_./-]+\.(mp3|m4a|ogg|wav)$/i.test(source)?resolvePhoneAudioPath(source):null;
  // An authored text-only bubble can be generated on first playback,
  // provided the developer has configured MiniMax. Cache it for next time.
  if(!blob&&!asset&&m.from==='tai'&&String(m.voiceCaption||m.text||'').trim()){
   try{
     blob=await synthesizeTaiVoice({text:m.speechText||m.voiceCaption||m.text,tone:m.aiTone||'neutral',...m.voiceSettings,directed:Boolean(m.aiGenerated&&!m.testOnly&&!m.voiceSettings)},voicePreview);
    await saveClip(m.audioId||m.id,blob);
   }catch(error){
    console.warn('NoApp voice playback unavailable:',error?.message);
    if(m===selected)ctx.toast('暫時無法播放語音');
    continue;
   }
  }
  if(!blob&&!asset){if(m===selected)ctx.toast('暫時無法播放語音');continue;}
  if(token!==voicePlaylistToken)break;
  const url=blob?URL.createObjectURL(blob):asset;
  player.src=url;
  try{
   // Register first: very short clips can end before an awaited play().
   await new Promise((resolve,reject)=>{
    const current=player;
    const cancel=()=>{clean();resolve();};
    const clean=()=>{current.removeEventListener('ended',ended);current.removeEventListener('error',failed);if(cancelMessagePlayback===cancel)cancelMessagePlayback=null;};
    const ended=()=>{clean();resolve();};
    const failed=()=>{clean();reject(Error('文件加载失败或格式不兼容'));};
    current.addEventListener('ended',ended,{once:true});
    current.addEventListener('error',failed,{once:true});
    cancelMessagePlayback=cancel;
    try{Promise.resolve(current.play()).catch(error=>{clean();reject(error);});}
    catch(error){clean();reject(error);}
   });
  }catch(e){ctx.toast('语音播放失败：'+(e?.message||'请重新点击播放'));break;}
  finally{if(blob)URL.revokeObjectURL(url);}
 }
}
const voiceConversions=new WeakMap();
export function convertTaiTextToVoice(ctx,id){
 let pending=voiceConversions.get(ctx.store);
 if(!pending){pending=new Map();voiceConversions.set(ctx.store,pending);}
 if(pending.has(id))return pending.get(id);
 const task=convertVoice(ctx,id).finally(()=>pending.delete(id));
 pending.set(id,task);return task;
}
async function convertVoice(ctx,id){
 const c=ctx.store.get().content.conversations.noapp.find(x=>x.id==='tai'),m=c?.messages.find(x=>x.id===id);
 if(!m||m.from==='me')throw Error('只允许给熙泰的消息配音');
 if(m.kind==='voice'&&m.audioId)return;
 const clean=readableTaiVoiceText(m.text);
 ctx.store.update(s=>{
  const record=s.content.conversations.noapp.find(x=>x.id==='tai')?.messages.find(x=>x.id===id);
  if(record){delete record.voiceRequested;delete record.voiceFailed;delete record.voiceError;}
 });
 try{
   const clip=await synthesizeTaiVoice({text:m.speechText||clean,tone:m.aiTone||'neutral',...m.voiceSettings,directed:Boolean(m.aiGenerated&&!m.testOnly&&!m.voiceSettings)},voicePreview);
  await saveClip('tai-'+id,clip);
  ctx.store.update(s=>{
   const record=s.content.conversations.noapp.find(x=>x.id==='tai')?.messages.find(x=>x.id===id);
   if(record){record.kind='voice';record.audioId='tai-'+id;record.voiceCaption=clean;record.text=clean;
    delete record.voiceFailed;delete record.voiceError;delete record.voiceRequested;}
  });
 }catch(error){
  ctx.store.update(s=>{
   const record=s.content.conversations.noapp.find(x=>x.id==='tai')?.messages.find(x=>x.id===id);
   if(record){record.voiceFailed=true;delete record.voiceRequested;record.voiceError=explainMinimaxFailure(error,{region:apiConfig().region}).slice(0,550);}
  });
  throw error;
 }
}

/** iOS push-to-talk: request the microphone on the pointerdown gesture,
 * handle delayed Safari permission dialogs, and never send after cancellation. */
export function mountHoldToTalk(root,makeContext){
 if(!root||root.dataset.xitaiHoldMounted)return;
 root.dataset.xitaiHoldMounted='1';
 let active=null;
 const overlay=()=>root.querySelector('.noapp-record-overlay');
 function show(){const el=overlay();if(!el)return;el.classList.add('is-recording');el.setAttribute('aria-hidden','false');}
 function hide(){const el=overlay();if(!el)return;el.classList.remove('is-recording','is-cancel-gesture');el.setAttribute('aria-hidden','true');}
 function finish(token,cancel){
  if(token.done)return;
  token.done=true;
  if(active===token)active=null;
  if(token.ready){stopVoiceRecording({cancel});}
  else token.cancel=cancel;
  releaseFeedback(token.target,{cancel});
  hide();
 }
 root.addEventListener('pointerdown',e=>{
  const target=e.target.closest?.('[data-action="tai-record"][data-hold="true"]');
  if(!target||!target.closest('.app-noapp')||active||recording||voicePermissionPending)return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  e.preventDefault();
  const ctx=makeContext(),token={pointerId:e.pointerId,startY:e.clientY,startX:e.clientX,started:Date.now(),ready:false,done:false,cancel:false,target};
  pressFeedback(target);
  active=token;
  try{target.setPointerCapture(e.pointerId);}catch{}
  show();
  // getUserMedia begins synchronously inside this trusted pointer event.
  void beginVoiceRecording(ctx).then(()=>{
   token.ready=true;
   impact('success');
   if(token.done)stopVoiceRecording({cancel:token.cancel});
   else if(active===token)show();
  }).catch(err=>{
   if(!token.done)ctx.toast(err.message||'麦克风不可用');
   if(active===token)active=null;
   releaseFeedback(token.target,{cancel:true});
   hide();
  });
 },true);
 root.addEventListener('pointermove',e=>{
  const t=active;if(!t||t.pointerId!==e.pointerId)return;
  const was=t.cancel;
  t.cancel=e.clientY<t.startY-75;
  if(t.cancel&&!was)impact('cancel');
  overlay()?.classList.toggle('is-cancel-gesture',t.cancel);
 },true);
 function release(e,forceCancel=false){
  const t=active;
  if(!t||t.pointerId!==e.pointerId)return;
  const tooShort=Date.now()-t.started<350;
  const cancel=forceCancel||t.cancel||e.clientY<t.startY-75||tooShort;
  finish(t,cancel);
 }
 root.addEventListener('pointerup',e=>release(e),true);
 root.addEventListener('pointercancel',e=>release(e,true),true);
 root.addEventListener('lostpointercapture',e=>release(e,true),true);
}
