import {isStory55,taiRecognized} from '../../services/story55/state.js';
import {resolvePhoneAudioPath,canonicalPhoneAudioPath} from '../../services/voice/asset-url.js';
import {unheardReply} from '../../services/voice/unheard.js';
import {pressFeedback,releaseFeedback,impact} from '../../system/feedback/index.js';
import {xitaiRelationshipContext} from '../../services/ai/relationship-context.js';
import {TAI_PORTRAIT} from './portrait.js';
import {rememberTaiConversation,rememberTaiDelivered,rememberTaiCall} from '../../services/ai/memory.js';
import {esc} from '../../system/ui.js';
import {taiPresence,markTaiEngaged} from '../../services/presence.js';
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
import {selectCallSegments,isQuietCallRequest,nextNaturalCallIdleEvent,wantsMoreCallSpeech,expandCallSegments} from './call-engine-v2.js';
import {taiShouldHangUpCall} from './call-hangup-intent.js';
import {callFailureLine} from '../../services/ai/voice-delivery.js';
import {isConversationOpen} from '../../services/messaging/delivery.js';
import {validateCallReplyAction,validateTaiAction} from '../../services/ai/action-protocol-v10.js';

let call={state:'idle',direction:'incoming',muted:false,speaker:true,turns:[],started:0,busy:false,nudgeCount:0};
let recording=null;
let callSerial=0;
let activeRecognition=null;
export function callState(){return {state:call.state,direction:call.direction,sessionId:call.sessionId,turnCount:call.turns.length,endedBy:call.endedBy||null};}
function recordCall(s,{direction,status,seconds=0,turns=[],endedBy=null,endReason=''}){
 const chat=s.content.conversations.noapp?.find(c=>c.id==='tai');
 if(!chat)return;
 const label=endReason==='connection_error'?'通話失敗':status==='missed'?(direction==='outgoing'?'對方未接聽':'未接语音来电'):status==='declined'?(direction==='outgoing'?'對方已拒接':'已拒绝语音来电'):
   status==='cancelled'?'已取消语音呼叫':'语音通话 · '+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 const entry={id:'tai-call-history-'+uid(),from:direction==='incoming'?'tai':'me',text:label,
   kind:'call',callStatus:status,duration:seconds,day:s.day,time:s.clock,actual:true,
   ...(status==='ended'||direction==='outgoing'&&['declined','missed'].includes(status)?{endedBy:['tai','player','system','connection_error'].includes(endedBy)?endedBy:'system',endReason:String(endReason||'').slice(0,40)}:{})};
 if(status==='ended'&&turns.length)entry.transcript=turns.slice(-14).map(t=>(t.role==='user'?'熙蒙':'熙泰')+'：'+t.content).join('\n').slice(0,900);
 chat.messages.push(entry);
 if(status==='missed'&&!(s.unlocked&&s.nav.current.appId==='noapp'&&s.nav.current.route==='/chat/tai'))
  chat.unread=Math.max(0,Number(chat.unread)||0)+1;
 return entry;
}
export function incomingCallBanner(s){
 if(call.state!=='ringing'||!s.unlocked||!taiRecognized(s))return '';
 return '<div class="tai-incoming-banner" role="group" aria-label="陈熙泰来电">'+
   '<img class="tai-banner-avatar" src="'+esc(s.characterAvatars?.['熙泰']||AVATAR)+'" alt="">'+
   '<div class="tai-banner-info"><strong>陈熙泰</strong><small>NoApp · 语音来电</small></div>'+
   '<button type="button" class="tai-banner-decline" data-action="tai-banner-decline" aria-label="拒绝来电">'+glyph.hang+'</button>'+
   '<button type="button" class="tai-banner-accept" data-action="tai-banner-accept" aria-label="接听来电">'+glyph.answer+'</button></div>';
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
 hang:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 13.8c5.8-4.2 13.2-4.2 19 0l-2.4 4.2a1.7 1.7 0 01-2.1.8l-2.8-1.1v-3.1a23 23 0 00-4.4 0v3.1L7 18.8a1.7 1.7 0 01-2.1-.8z"/></svg>',
 speaker:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9c2 2 2 4 0 6M20 5c4 4 4 10 0 14"/></svg>',
 quiet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM3 3l18 18"/></svg>',
 plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>',
 layout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="3" width="13" height="13" rx="1.5"/><rect x="10" y="10" width="11" height="11" rx="1.5"/></svg>',
 keyboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 15h8"/></svg>',
 micOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 8V5a3 3 0 0 1 6 0v8M5 10v2a7 7 0 0 0 12 5M12 19v3M8 22h8M3 3l18 18"/></svg>',
 answer:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 13.8c5.8-4.2 13.2-4.2 19 0l-2.4 4.2a1.7 1.7 0 01-2.1.8l-2.8-1.1v-3.1a23 23 0 00-4.4 0v3.1L7 18.8a1.7 1.7 0 01-2.1-.8z" transform="rotate(180 12 12)"/></svg>'
};
function phoneButton(action,title,art,kind=''){
 return '<button type="button" data-action="'+action+'" class="tai-call-control '+kind+'" aria-label="'+title+'"><span class="tai-control-circle">'+art+'</span><span class="tai-control-label">'+title+'</span></button>';
}
function duration(){
 if(!call.started)return '等待连接';
 const sec=Math.floor((Date.now()-call.started)/1000);
 return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
}
export function callView(s){
 const ring=call.state==='ringing',active=call.state==='connected',dial=call.state==='dialing';
 const subtitle=call.connectionIssue?'連線不穩定':call.endedBy==='connection_error'?'通話失敗':ring?'NoApp 語音來電':dial?'正在呼叫…':active?(call.transcribing?'正在識別…':call.requestingMic?'正在開啟麥克風…':call.listening?'正在聆聽…':call.audioReady?'輕點繼續收聽':call.caption?'熙泰正在說話…':call.busy?'熙泰正在回覆…':call.inlineNotice||'通話中'):'通話已結束';
 const controls=ring?
   phoneButton('tai-decline','拒绝',glyph.hang,'is-decline')+phoneButton('tai-accept','接听',glyph.answer,'is-accept'):
   active?
   phoneButton('tai-mute',call.muted?'取消靜音':'靜音',call.muted?glyph.micOff:glyph.mic,'is-secondary'+(call.muted?' is-selected':''))+
   phoneButton('tai-mic',call.listening?'結束說話':'說話',glyph.mic,'is-mic'+(call.listening?' is-listening':''))+
   phoneButton('tai-speaker','揚聲器',call.speaker?glyph.speaker:glyph.quiet,'is-speaker'+(call.speaker?' is-selected':''))+
   phoneButton('tai-expand','文字輸入',glyph.keyboard,'is-secondary'+(call.expanded?' is-selected':''))+
   phoneButton('tai-hangup','結束',glyph.hang,'is-hang'):
   dial?phoneButton('tai-hangup','取消',glyph.hang,'is-hang'):'';
 const transcript=call.expanded?'<div class="tai-call-caption-sheet" aria-label="通話文字"><header>通話文字 <button type="button" data-action="tai-expand" aria-label="關閉文字轉寫">✕</button></header><div class="tai-call-transcript">'+call.turns.slice(-9).map(t=>'<p><b>'+(t.role==='user'?'熙蒙':'熙泰')+'</b> '+esc(t.content)+'</p>').join('')+'</div><form data-form="tai-call-turn"><input name="text" inputmode="text" autocomplete="off" maxlength="1200" placeholder="輸入文字…"><button type="submit" aria-label="傳送">↑</button></form></div>':'';
 const liveCaptions=active?'<div class="tai-live-captions" role="status" aria-live="polite">'+
  (call.caption?'<p class="theirs">'+esc(call.caption)+'</p>':'')+
  (call.audioReady?'<button type="button" data-action="tai-play-audio">▶ 继续收听</button>':'')+'</div>':'';
 return '<section class="tai-call-screen tai-native-call'+(call.expanded?' is-expanded':'')+(active?' is-connected':'')+'" aria-label="NoApp语音通话">'
  +'<div class="tai-call-ambient" aria-hidden="true"><img src="'+esc(s?.characterAvatars?.['熙泰']||AVATAR)+'" alt=""></div>'
  +'<nav class="tai-call-topbar">'+
   '<span class="tai-call-channel">NoApp 語音</span></nav>'+
   '<div class="tai-call-identity"><img class="tai-call-avatar" src="'+esc(s?.characterAvatars?.['熙泰']||AVATAR)+'" alt="陈熙泰照片" data-source="'+AVATAR_SOURCE+'"><h1>陳熙泰</h1><p role="status" aria-live="polite">'+esc(subtitle)+'</p>'+(active?'<small class="tai-call-duration">'+duration()+'</small>':'')+'</div>'+
   liveCaptions+transcript+
   '<div class="tai-call-bottom'+(ring?' two-actions':active?' native-controls':' native-single')+'">'+controls+'</div>'+
   '</section>';
}
export function startIncoming(ctx,preview='熙泰邀请你语音通话',{reason='',openingText=''}={}){
 if(!taiRecognized(ctx.store.get())||['ringing','dialing','connected'].includes(call.state))return false;
 const sessionId=++callSerial,notificationId='tai-call-'+uid();
 call={state:'ringing',sessionId,revision:0,quietUntil:0,notificationId,direction:'incoming',muted:false,speaker:true,turns:[],started:0,busy:false,audioReady:false,nudgeCount:0,openingText:String(openingText||'').trim().slice(0,600),reason:reason||(/邀请你语音|语音通话/.test(preview)?'想听熙蒙说说之前提过的事情；不主动汇报自己的生活':preview)};
 ctx.store.update(s=>{s.notifications.unshift({id:notificationId,title:'NoApp · 陈熙泰',body:preview,type:'tai-incoming-call',link:{appId:'noapp',route:'/call',params:{}}});});
 // A missed call stays in the game's notifications; answering or declining
 // removes just this call's card, never another character's messages.
 ctx.refresh?.();
 const missedTimer=setTimeout(()=>{
  if(call.sessionId!==sessionId||call.state!=='ringing')return;
  call.state='missed';callSerial++;
  ctx.store.update(s=>{
   const n=s.notifications.find(n=>n.id===notificationId);
   if(n){n.title='陈熙泰';n.body='未接语音通话';n.type='tai-missed-call';}
   s.events.push({type:'tai_call_missed',day:s.day,clock:s.clock});
   recordCall(s,{direction:'incoming',status:'missed'});
  });
  ctx.refresh?.();
 },60000);
 missedTimer.unref?.(); // Node tests should not remain open for a missed-call timeout.
 return true;
}
export function startOutgoing(ctx){
 const p=taiPresence(ctx.store.get());
 if(!p.contactable||p.status==='away'){ctx.toast('熙泰当前不在线，稍后再联系。');return;}
 if(['ringing','dialing','connected'].includes(call.state)){ctx.toast('当前已有通话');return false;}
 playback=createGestureAudio();
 const sessionId=++callSerial;
 call={state:'dialing',sessionId,revision:0,quietUntil:0,direction:'outgoing',muted:false,speaker:true,turns:[],started:0,busy:false,audioReady:false,nudgeCount:0};
 ctx.router.open({appId:'noapp',route:'/call'});
 const pending=()=>call.sessionId===sessionId&&call.state==='dialing';
 const connect=()=>{if(!pending())return;call.state='connected';call.started=Date.now();markTaiEngaged();ctx.refresh();startGreeting(ctx);};
 const timer=setTimeout(async()=>{
  if(!pending())return;
  const state=ctx.store.get(),history=(state.content.conversations.noapp?.find(c=>c.id==='tai')?.messages||[]).filter(m=>m.actual!==false&&!m.demo&&(m.day||1)<=state.day&&m.kind!=='call'&&m.text).slice(-12).map(m=>({role:m.from==='me'?'user':'assistant',content:String(m.voiceCaption||m.text).slice(0,1600)}));
  const scene='【電話系統事件】熙蒙正在撥打你的電話。尚未接通，沒有任何已聽見的通話內容。';
  const messages=[...history,{role:'user',content:'[电话系统事件；不是熙蒙说出的台词：'+scene+']'}],sourceMessageId='ring:'+sessionId+':'+uid();
  const worldbookSnapshot=captureTaiWorldbook(ctx.store,{channel:'noapp',day:state.day,recognized:taiRecognized(state),messages,outputMode:'ringing',worldbookEvents:['call_ringing'],scenario:scene,turnId:sourceMessageId});
  let timeout,decision;try{decision=await Promise.race([chooseTaiAction({channel:'noapp',day:state.day,recognized:taiRecognized(state),messages,outputMode:'ringing',scene,worldbookEvents:['call_ringing'],worldbookSnapshot,relationshipContext:xitaiRelationshipContext(state,{mode:'text'}),sourceMessageId,callRinging:true,hasIncoming:false,allowVoice:false,allowDefer:false}),new Promise(resolve=>{timeout=setTimeout(()=>resolve(null),8000);})]);}catch{}finally{clearTimeout(timeout);}
  if(!pending())return;
  if(decision)rememberTaiMood(ctx.store,decision,sourceMessageId);
  if(decision?.action==='decline_call'){callAction('tai-hangup',ctx,{endedBy:'tai',endReason:'declined',outcomeOverride:'declined'});return;}
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
  }).catch(blocked);
 });
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
  :'电话刚接通，是熙蒙拨给你。按自己的当下状态开口，可以忙、困、好奇或高兴，别默认责备他打扰。';
 if(event==='unheard')return '刚才熙蒙试着说话，但这段语音未能识别，没有任何可用内容。你只知道没听清，不能猜他的话；简短问一句或两句让他再说一次，不谈ASR、权限、浏览器或技术接口。';
 if(event==='nudge')return '上一段已经说完，熙蒙在电话里一直安静。先依据前文问怎么了、是不是有事；可以自然关心他是否还在听。不要默认他生气，不要催三遍。';
 if(event==='closing')return '对方很久没说话，你可以告别并真正结束通话。说一句符合当下情绪的告别，程序会执行挂断，而不是只说要挂。';
 return '熙蒙刚在实时电话里讲了话。先准确理解他问了什么，承接上一句话的具体意思，认真回答；如果他在分享、追问、愿意聊天，就展开讲几段有信息的新内容，顺着话题表达个人态度与具体见闻。不是文字聊天，不能假装电话已挂。避免无来由自夸、空洞问答和极短气泡式语音。';
}
async function generateTurn(ctx,{opening=false,text='',event='',endAfter=false,presetText=''}={}){
 if(call.state!=='connected'||call.busy)return;
 const sessionId=call.sessionId,revision=call.revision||0,day=ctx.store.get().day;
 const forceHangUp=!opening&&!event&&taiShouldHangUpCall(text);
 const shouldClose=forceHangUp||event==='closing'||endAfter;
 const moreSpeech=!shouldClose&&!opening&&!event&&wantsMoreCallSpeech(text);
 endAfter=endAfter||forceHangUp;
 const current=()=>call.sessionId===sessionId&&call.revision===revision&&call.state==='connected'&&ctx.store.get().day===day;
 if(!opening&&!event&&!String(text).trim())return;
 if(!opening&&!event){
  const playerText=String(text).trim();
  call.turns.push({role:'user',content:playerText});
  call.lastPlayerAt=Date.now();call.nudgeCount=0;
  call.quietUntil=isQuietCallRequest(playerText)?Date.now()+taiBehavior(ctx.store.get()).callQuietSeconds*1000:0;
 }
 call.inlineNotice='';call.busy=true;
 call.generationId=(call.generationId||0)+1;
 const generationId=call.generationId;
 const turnId='call:'+call.started+':'+sessionId+':'+generationId;
 if(!opening&&!event)ctx.store.update(s=>rememberTaiConversation(s,text,{sourceId:turnId}));
 markTaiEngaged();ctx.refresh?.();
 try{
  const history=call.turns.slice(-20);
  const behavior=taiBehavior(ctx.store.get());
  const speechDepth=shouldClose?'【明确结束通话】本轮程序已决定结束这通电话。你本人先亲口说一小段自然告别，之后程序立刻挂断；不用继续追问，也不能将这句发成文字消息。':
   moreSpeech?'【本轮明确要求多说】程序已生成通话表达计划 {"min_segments":3,"max_segments":5,"mode":"voice"}。messages 必须包含3至5段有实质内容、各自完整的口语，每段1至3句。围绕刚才的话题自然多讲，不以一个短句或反问收尾，不披露未经许可的私事；若确实要结束通话，给出真实理由及告别。':
   opening||event==='unheard'?'【简短开场/没听清】自然说一两句即可，不为了凑长而扩写。':
   behavior.callDetail==='brief'?'【通话简短模式】以1～2段自然口语回答；有必要的内容要说完，别只留半句。':
   behavior.callDetail==='natural'?'【通话自然模式】能谈的话题可自然用2～3段内容不同的完整话意，不强制每次多段。':
   '【通话丰富模式】普通连续聊天以2～4段完整口语为目标，每段1～3句；先回应，再自然展开有实质内容的细节、判断或个人态度。短招呼、明确拒绝、告别可以短。不是每段只有一小句，不重复同一个意思。';
  const scene=callScene({opening,event,direction:call.direction,reason:call.reason})+
   ' 【NoApp V3｜真人电话】这轮只调用一次台词生成。你现在仍在真实通话里。'+speechDepth+
   ' 允许丰富而自然的几段说话，绝不为数量补写废话，也不留下逗号结尾的残句。'+
   (call.quietUntil>Date.now()?' 熙蒙要求安静陪伴，回答后保持安静，不催他说话。':'')+
   taiMomentumPrompt(history,{mode:'call'});
  const messages=opening||event?[...history,{role:'user',content:'[电话系统事件；不是熙蒙说出的台词：'+scene+']'}]:history;
  const relationshipContext=xitaiRelationshipContext(ctx.store.get(),{mode:'call'});
  const worldbookSnapshot=presetText||event==='unheard'?null:captureTaiWorldbook(ctx.store,{channel:'noapp',day,recognized:taiRecognized(ctx.store.get()),messages,outputMode:'call',scenario:scene,turnId});
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
  let data=presetText?{text:JSON.stringify({messages:[{text:presetText,mode:'voice',tone:'neutral'}]})}:
   event==='unheard'?null:await askTai(request);
  if(!current())return;
  const readDecision=value=>validateTaiAction(value,{mode:'call',channel:'noapp',recognized:request.recognized,callConnected:current(),hasIncoming:!opening&&!event&&!!text}).decision;
  if(!decision&&!presetText&&event!=='unheard')decision=readDecision(data);
  if(decision?.action==='listen'&&!shouldClose){rememberTaiMood(ctx.store,decision,turnId);call.lastTaiEndAt=Date.now();return;}
  endAfter=shouldClose||decision?.action==='hang_up'||validateCallReplyAction(data,{callConnected:current(),approvedDecision:decision});
  const parse=value=>dedupeTaiTurnEntries(unpackTaiReply(value,'call'));
  let raw;
  try{raw=event==='unheard'?[unheardReply(sessionId+':'+generationId)]:parse(data);}
  catch(error){if(endAfter)raw=[];else throw error;}
  const select=entries=>selectCallSegments(!endAfter&&!opening&&!event&&(moreSpeech||behavior.callDetail==='detailed')?expandCallSegments(entries):entries,{
   maxSegments:endAfter?2:moreSpeech?5:behavior.callMaxSegments,
   dedupe:behavior.callDedupe,
   recent:call.turns.filter(t=>t.role==='assistant').slice(-2).map(t=>t.content)
  });
  let {segments,blocked}=select(raw);
  if(moreSpeech&&!endAfter&&segments.length<3){
   // A single bounded correction, only when the actual delivered plan is short.
   try{
    const revised=await askTai({...request,scene:scene+' 【多段语音补足】上一稿只有'+segments.length+'段有效口语。重新输出整轮3至5段有不同内容的 messages JSON，不重复上一轮旧话，不要编造私人事实。'});
    if(!current())return;
    const nextDecision=readDecision(revised);
    const revisedRaw=parse(revised),next=select(revisedRaw);
    if(nextDecision?.action==='hang_up'||validateCallReplyAction(revised,{callConnected:current(),approvedDecision:nextDecision})){
     data=revised;decision=nextDecision;endAfter=true;raw=revisedRaw;({segments,blocked}=select(raw));
    }else if(next.segments.length>segments.length){data=revised;decision=nextDecision||decision;raw=revisedRaw;({segments,blocked}=next);}
   }catch{}
  }
  if(!current())return;
  if(decision)rememberTaiMood(ctx.store,decision,turnId,{evidence:!opening&&!event?text:''});
  if(endAfter&&!segments.length)segments=[{text:'先掛了。',tone:'neutral',mode:'voice'}];
  ctx.store.update(state=>{
   state.events??=[];
   state.events.push({type:'tai_call_v2_turn',sessionId,generationId,day:state.day,clock:state.clock,
    proposed:raw.length,planned:segments.length,blocked:blocked.length,
    endAfter,forcedByPlayer:forceHangUp,moreSpeech,minSegments:moreSpeech?3:0,mode:behavior.callDetail,at:Date.now()});
  });
  // Prepare one upcoming clip while the current clip plays; no overlapping
  // playback, and never queue more work after interruption.
  const synth=r=>Promise.resolve().then(()=>voicePreview({text:composeCallSpeech([r],behavior),tone:r.tone||decision?.tone||'neutral',directed:true})).then(blob=>({blob}),error=>({error}));
  let pending=segments.length?synth(segments[0]):null;
  for(let i=0;i<segments.length;i++){
   if(!current())break;
   const r=segments[i],prepared=await (pending||synth(r));
   if(!current())break;
   if(prepared.error)throw prepared.error;
   const blob=prepared.blob;
   pending=null;
   call.caption=r.text;call.lastSpeech=r.text;ctx.refresh?.();
   const outcome=await playCallAudio(ctx,blob,sessionId,revision,()=>{if(current()&&i+1<segments.length)pending=synth(segments[i+1]);});
   if(outcome==='failed')throw Error('Call audio playback failed');
   if(!current()||outcome!=='completed')break;
   call.turns.push({role:'assistant',content:r.text,tone:r.tone||decision?.tone||'neutral',
    vocalCue:r.vocalCue||decision?.vocal_cue||'none',playedAt:Date.now()});
   if(!presetText&&event!=='unheard')ctx.store.update(s=>rememberTaiDelivered(s,r.text,{sourceId:turnId+':played:'+call.turns.length}));
   call.caption='';call.audioReady=false;ctx.refresh?.();
   if(!endAfter||i+1<segments.length)await new Promise(resolve=>setTimeout(resolve,Math.min(behavior.callPause,.65)*1000));
  }
 }catch(error){
  if(current()){
   console.warn('NoApp call connection failed:',error?.message);
   call.connectionIssue=true;ctx.refresh?.();
   await new Promise(resolve=>setTimeout(resolve,700));
   if(current())callAction('tai-hangup',ctx,{endedBy:'connection_error',endReason:'connection_error',fallback:callFailureLine({endedAfter:endAfter,turns:call.turns})});
  }
 }
 finally{
  if(current()){
   call.busy=false;call.lastTaiEndAt=Date.now();
   if(endAfter)callAction('tai-hangup',ctx,{endedBy:'tai',endReason:forceHangUp?'player_request':event==='closing'?'idle':'autonomous'});else ctx.refresh?.();
  }
 }
}
export function nextCallIdleEvent(snapshot,now=Date.now(),config){
 return nextNaturalCallIdleEvent(snapshot,now,taiBehavior({aiDraft:{behavior:config}}));
}
export function maybeAdvanceCall(ctx,{now=Date.now()}={}){
 if(playback&&!playback.paused)return false;
 const event=nextCallIdleEvent(call,now,taiBehavior(ctx.store.get()));
 if(!event)return false;
 call.nudgeCount=event==='nudge'?1:2;
 void generateTurn(ctx,{event,endAfter:event==='closing'});
 return true;
}
async function respond(text,ctx){return generateTurn(ctx,{text});}
function startGreeting(ctx){
 if(call.state==='connected'&&!call.greeted){
  call.greeted=true;
  queueMicrotask(()=>{if(call.state==='connected')generateTurn(ctx,{opening:true,presetText:call.openingText||''});});
 }
}
export function submitCall(form,ctx){
 if(form.dataset.form!=='tai-call-turn')return false;
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
 case 'tai-accept':
  if(call.state!=='ringing')return false;
  playback=createGestureAudio();
  call.state='connected';call.started=Date.now();markTaiEngaged();
  ctx.store.update(s=>{s.notifications=s.notifications.filter(n=>n.id!==call.notificationId);});
  ctx.refresh();startGreeting(ctx);return true;
 case 'tai-decline':case 'tai-hangup':
  if(!['ringing','dialing','connected'].includes(call.state))return true;
  const previous=call;
  callSerial++;call={state:'ended',sessionId:callSerial,direction:previous.direction,endedBy:previous.state==='connected'&&['tai','player','system','connection_error'].includes(endedBy)?endedBy:null,muted:false,speaker:true,turns:[],started:0,busy:false,nudgeCount:0};
  if(activeRecognition){activeRecognition.abort?.();activeRecognition=null;}
  if(recording?.call){recording.recorder._cancelled=true;recording.recorder.stop();recording=null;}
  finishSegment?.('interrupted');
  if(playback){playback.pause();if(playback.src.startsWith('blob:'))URL.revokeObjectURL(playback.src);playback=null;}
  let endedRecord;
  ctx.store.update(s=>{
   if(previous.notificationId)s.notifications=s.notifications.filter(n=>n.id!==previous.notificationId);
   const outcome=previous.state==='dialing'&&endedBy==='tai'&&['declined','missed'].includes(outcomeOverride)?outcomeOverride:previous.state==='ringing'?'declined':previous.state==='dialing'?'cancelled':'ended';
   s.events.push({type:action==='tai-decline'?'tai_call_declined':'tai_call_ended',day:s.day,clock:s.clock,
    endedBy:previous.state==='connected'?call.endedBy:outcomeOverride&&endedBy==='tai'?'tai':null,endReason:previous.state==='connected'||outcomeOverride?endReason:'',
    durationSeconds:previous.started?Math.max(0,Math.floor((Date.now()-previous.started)/1000)):0});
   endedRecord=recordCall(s,{direction:previous.direction,status:outcome,turns:previous.turns,endedBy:outcome==='declined'||outcome==='missed'?endedBy:call.endedBy,endReason,
    seconds:previous.started?Math.max(0,Math.floor((Date.now()-previous.started)/1000)):0});
   if(endedRecord?.callStatus==='ended')rememberTaiCall(s,endedRecord);
   if(endedBy==='connection_error'&&fallback){
    const chat=s.content.conversations.noapp?.find(c=>c.id==='tai');
    if(chat){const id='tai-call-fallback-'+uid();chat.messages.push({id,from:'tai',kind:'text',text:fallback,day:s.day,time:s.clock,sentDate:dateParts(s).iso,actual:true,receivedAt:Date.now()});
     if(!isConversationOpen(s,'noapp','tai')&&s.nav.current.route!=='/call'){
      chat.unread=(chat.unread||0)+1;s.notifications.unshift({id,conversationId:'tai',title:chat.name,body:fallback,link:{appId:'noapp',route:'/chat/tai',params:{}}});
     }
    }
   }
  });
  if(endedRecord?.callStatus==='ended'&&endedBy==='player'&&endReason==='manual'&&endedRecord.transcript){
   // Existing proactive queue owns actual delivery; no second messaging system.
   const timer=setTimeout(()=>import('../../services/ai/proactive.js').then(({maybeSendProactive})=>maybeSendProactive(ctx.store,{force:'postcall',postCall:endedRecord})).catch(()=>{}),350);
   timer.unref?.();
  }
  // Declining the top banner must not eject the player from another App.
  if(ctx.store.get().nav.current.appId==='noapp'&&ctx.store.get().nav.current.route==='/call'){
   const endedSession=call.sessionId;
   const back=()=>{if(call.sessionId===endedSession&&ctx.store.get().nav.current.appId==='noapp'&&ctx.store.get().nav.current.route==='/call')ctx.router?.open({appId:'noapp',route:'/chat/tai'});};
   if(endedBy==='connection_error'){ctx.refresh?.();setTimeout(back,1100);}else back();
  }
  return true;
 case 'tai-play-audio':if(playback){playback.muted=!call.speaker;playback.play().then(()=>{call.audioReady=false;callPlaybackStarted?.();ctx.refresh();}).catch(()=>{call.inlineNotice='請再次點擊繼續收聽';ctx.refresh?.();});}return true;
 case 'tai-expand':call.expanded=!call.expanded;ctx.refresh();return true;
 case 'tai-mute':call.muted=!call.muted;ctx.refresh();return true;
 case 'tai-speaker':call.speaker=!call.speaker;if(playback)playback.muted=!call.speaker;ctx.refresh();return true;
 case 'tai-mic':{
  // iOS lowers or interrupts remote audio when a new mic audio session opens.
  // A microphone gesture interrupts the current reply before starting iOS half-duplex capture.
  if(call.requestingMic||call.transcribing)return true;
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
 const clip=await voicePreview({text:body,tone});
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
     blob=await voicePreview({text:m.speechText||clean,tone:m.aiTone||'neutral',...m.voiceSettings,directed:Boolean(m.aiGenerated&&!m.testOnly&&!m.voiceSettings)});
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
     blob=await voicePreview({text:m.speechText||m.voiceCaption||m.text,tone:m.aiTone||'neutral',...m.voiceSettings,directed:Boolean(m.aiGenerated&&!m.testOnly&&!m.voiceSettings)});
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
   const clip=await voicePreview({text:m.speechText||clean,tone:m.aiTone||'neutral',...m.voiceSettings,directed:Boolean(m.aiGenerated&&!m.testOnly&&!m.voiceSettings)});
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
