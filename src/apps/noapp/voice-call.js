import {unheardReply} from '../../services/voice/unheard.js';
import {pressFeedback,releaseFeedback,impact} from '../../system/feedback/index.js';
import {xitaiRelationshipContext} from '../../services/ai/relationship-context.js';
import {TAI_PORTRAIT} from './portrait.js';
import {rememberTaiConversation} from '../../services/ai/memory.js';
import {esc} from '../../system/ui.js';
import {taiPresence,markTaiEngaged} from '../../services/presence.js';
import {askTai,voicePreview,speechToText} from '../../services/ai/gateway.js';
import {saveClip,loadClip} from '../../services/voice/audio-store.js';
import {uid} from '../../services/id.js';
import {dateParts} from '../../services/calendar.js';
import {unpackTaiReply,readableTaiVoiceText} from '../../services/ai/format.js';
import {taiBehavior} from '../../services/ai/behavior.js';
import {createGestureAudio} from '../../services/voice/playback.js';
import {composeCallSpeech} from '../../services/voice/call-speech.js';

let call={state:'idle',direction:'incoming',muted:false,speaker:true,turns:[],started:0,busy:false,nudgeCount:0};
let recording=null;
let callSerial=0;
let activeRecognition=null;
export function callState(){return {state:call.state,direction:call.direction,sessionId:call.sessionId,turnCount:call.turns.length};}
function recordCall(s,{direction,status,seconds=0,turns=[]}){
 const chat=s.content.conversations.noapp?.find(c=>c.id==='tai');
 if(!chat)return;
 const label=status==='missed'?'未接语音来电':status==='declined'?'已拒绝语音来电':
   status==='cancelled'?'已取消语音呼叫':'语音通话 · '+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 const entry={id:'tai-call-history-'+uid(),from:direction==='incoming'?'tai':'me',text:label,
   kind:'call',callStatus:status,duration:seconds,day:s.day,time:s.clock,actual:true};
 if(status==='ended'&&turns.length)entry.transcript=turns.slice(-14).map(t=>(t.role==='user'?'熙蒙':'熙泰')+'：'+t.content).join('\n').slice(0,900);
 chat.messages.push(entry);
 if(status==='missed'&&!(s.unlocked&&s.nav.current.appId==='noapp'&&s.nav.current.route==='/chat/tai'))
  chat.unread=Math.max(0,Number(chat.unread)||0)+1;
}
export function incomingCallBanner(s){
 if(call.state!=='ringing'||!s.unlocked||s.day<56)return '';
 return '<div class="tai-incoming-banner" role="group" aria-label="陈熙泰来电">'+
   '<img class="tai-banner-avatar" src="'+esc(s.characterAvatars?.['熙泰']||AVATAR)+'" alt="">'+
   '<div class="tai-banner-info"><strong>陈熙泰</strong><small>NoApp · 语音来电</small></div>'+
   '<button type="button" class="tai-banner-decline" data-action="tai-banner-decline" aria-label="拒绝来电">'+glyph.hang+'</button>'+
   '<button type="button" class="tai-banner-accept" data-action="tai-banner-accept" aria-label="接听来电">'+glyph.answer+'</button></div>';
}
let playback=null;
let messagePlayback=null,voicePlaylistToken=0,pausedForMicrophone=false;
function suspendVoicesForCapture(){
 if(messagePlayback&&!messagePlayback.paused){pausedForMicrophone=true;messagePlayback.pause();}
}
function resumeVoicesAfterCapture(){
 if(pausedForMicrophone&&messagePlayback){pausedForMicrophone=false;messagePlayback.play().catch(()=>{});}
}

const AVATAR=TAI_PORTRAIT; // user-supplied, cropped high clarity portrait
const AVATAR_SOURCE='/assets/tai-portrait.svg';
const glyph={
 mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0014 0v-2M12 19v3M8 22h8"/></svg>',
 hang:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 13.8c5.8-4.2 13.2-4.2 19 0l-2.4 4.2a1.7 1.7 0 01-2.1.8l-2.8-1.1v-3.1a23 23 0 00-4.4 0v3.1L7 18.8a1.7 1.7 0 01-2.1-.8z"/></svg>',
 speaker:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9c2 2 2 4 0 6M20 5c4 4 4 10 0 14"/></svg>',
 quiet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM3 3l18 18"/></svg>',
 plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>',
 layout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="3" width="13" height="13" rx="1.5"/><rect x="10" y="10" width="11" height="11" rx="1.5"/></svg>',
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
 const subtitle=ring?'邀请你语音通话':dial?'正在呼叫…':active?(call.busy?'熙泰正在回复…':call.listening?'正在听你说话…':'语音通话中 · '+duration()):'通话已结束';
 const controls=ring?
   phoneButton('tai-decline','拒绝',glyph.hang,'is-decline')+phoneButton('tai-accept','接听',glyph.answer,'is-accept'):
   active?
   phoneButton('tai-speaker',call.speaker?'声音已开':'声音已关',call.speaker?glyph.speaker:glyph.quiet,'is-speaker'+(call.speaker?' is-speaker-on':''))+
   phoneButton('tai-expand','通话字幕',glyph.layout,'is-secondary')+
   phoneButton('tai-mute',call.muted?'取消静音':'静音',call.muted?glyph.quiet:glyph.mic,'is-secondary')+
   phoneButton('tai-mic',call.listening?'结束说话':'按下说话',glyph.mic,'is-secondary'+(call.listening?' is-listening':''))+
   phoneButton('tai-hangup','结束',glyph.hang,'is-hang')+
   phoneButton('tai-expand','文字输入',glyph.plus,'is-secondary'):
   phoneButton('tai-hangup','取消',glyph.hang,'is-hang');
 const transcript=call.expanded?'<div class="tai-call-caption-sheet" aria-label="文字转写"><header>通话文字 <button type="button" data-action="tai-expand" aria-label="关闭文字转写">✕</button></header><div class="tai-call-transcript">'+call.turns.slice(-9).map(t=>'<p><b>'+(t.role==='user'?'熙蒙':'熙泰')+'</b> '+esc(t.content)+'</p>').join('')+'</div><form data-form="tai-call-turn"><input name="text" inputmode="text" autocomplete="off" maxlength="1200" placeholder="发文字继续通话…"><button type="submit" '+(call.busy?'disabled':'')+'>发送</button></form></div>':'';
 const liveCaptions=active?'<div class="tai-live-captions" role="status" aria-live="polite">'+
  (call.caption?'<p class="theirs">'+esc(call.caption)+'</p>':'')+
  (call.audioReady?'<button type="button" data-action="tai-play-audio">▶ 继续收听</button>':'')+'</div>':'';
 return '<section class="tai-call-screen" aria-label="NoApp语音通话">'
  +'<div class="tai-call-ambient" aria-hidden="true"></div>'
  +'<nav class="tai-call-topbar">'+
   '<button type="button" data-action="tai-expand" aria-label="查看或收起通话文字">'+glyph.layout+'</button>'+
   '<span class="tai-call-channel">NOAPP · AUDIO</span>'+
   '<button type="button" data-action="tai-expand" aria-label="展开通话文字">'+glyph.plus+'</button></nav>'+
   '<div class="tai-call-identity"><img class="tai-call-avatar" src="'+esc(s?.characterAvatars?.['熙泰']||AVATAR)+'" alt="陈熙泰照片" data-source="'+AVATAR_SOURCE+'"><h1>陈熙泰</h1><p>'+subtitle+'</p><div class="tai-call-dots" aria-hidden="true"><i></i><i></i><i></i></div></div>'+
   liveCaptions+transcript+
   '<div class="tai-call-bottom'+(ring?' two-actions':active?' grid-six':'')+'">'+controls+'</div>'+
   '</section>';
}
export function startIncoming(ctx,preview='熙泰邀请你语音通话'){
 if(ctx.store.get().day<56||['ringing','dialing','connected'].includes(call.state))return false;
 const sessionId=++callSerial,notificationId='tai-call-'+uid();
 call={state:'ringing',sessionId,notificationId,direction:'incoming',muted:false,speaker:true,turns:[],started:0,busy:false,audioReady:false,nudgeCount:0,reason:/邀请你语音|语音通话/.test(preview)?'从当前生活或未完话题里选一件具体想分享、想问或想听他回应的事':preview};
 ctx.store.update(s=>{s.notifications.unshift({id:notificationId,title:'NoApp · 陈熙泰',body:preview,type:'tai-incoming-call',link:{appId:'noapp',route:'/call',params:{}}});});
 // A missed call stays in the game's notifications; answering or declining
 // removes just this call's card, never another character's messages.
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
 call={state:'dialing',sessionId,direction:'outgoing',muted:false,speaker:true,turns:[],started:0,busy:false,audioReady:false,nudgeCount:0};
 ctx.router.open({appId:'noapp',route:'/call'});
 setTimeout(()=>{if(call.sessionId!==sessionId||call.state!=='dialing')return;call.state='connected';call.started=Date.now();markTaiEngaged();ctx.refresh();startGreeting(ctx);},1100);
 return true;
}
// A blocked play keeps this segment pending. Only its completion allows the
// next caption/track; hanging up resolves and cancels the pending segment.
let finishSegment=null;
async function playCallAudio(ctx,blob,sessionId){
 if(call.sessionId!==sessionId||call.state!=='connected')return;
 playback??=createGestureAudio();
 if(!playback)throw Error('此设备不能播放音频');
 const audio=playback;
 audio.pause();
 if(audio.src.startsWith('blob:'))URL.revokeObjectURL(audio.src);
 audio.src=URL.createObjectURL(blob);audio.muted=!call.speaker;
 await new Promise(resolve=>{
  let settled=false;
  const finish=()=>{
   if(settled)return;settled=true;
   audio.removeEventListener('ended',finish);audio.removeEventListener('error',failed);
   if(finishSegment===finish)finishSegment=null;
   if(call.sessionId===sessionId){call.audioReady=false;call.lastTaiEndAt=Date.now();}
   resolve();
  };
  const failed=()=>{ctx.toast('这段语音未能播放，请点「继续收听」重试。');call.audioReady=true;ctx.refresh();};
  finishSegment=finish;
  audio.addEventListener('ended',finish,{once:true});audio.addEventListener('error',failed);
  Promise.resolve(audio.play()).then(()=>{
   if(call.sessionId!==sessionId||call.state!=='connected'){audio.pause();finish();}
  }).catch(()=>{
   if(call.sessionId!==sessionId||call.state!=='connected'){finish();return;}
   call.audioReady=true;ctx.refresh();
  });
 });
}
export function callScene({opening=false,event='',direction='outgoing',reason=''}={}){
 if(opening)return direction==='incoming'
  ?'电话刚接通，是你陈熙泰主动拨给熙蒙的。先说明自己为何找他：'+(reason||'从当前生活或未完话题里选一件具体想分享、想问或想听他回应的事')+'。不要反问他为什么给你打电话，不要说他这通电话打断了你。'
  :'电话刚接通，是熙蒙拨给你。按自己的当下状态开口，可以忙、困、好奇或高兴，别默认责备他打扰。';
 if(event==='unheard')return '刚才熙蒙试着说话，但这段语音未能识别，没有任何可用内容。你只知道没听清，不能猜他的话；简短问一句或两句让他再说一次，不谈ASR、权限、浏览器或技术接口。';
 if(event==='nudge')return '上一段已经说完，熙蒙在电话里一直安静。先依据前文问怎么了、是不是有事；如果刚在亲密调情，可带一点坏心思问是不是想你、怎么不肯说。不要默认他生气，不要催三遍。';
 if(event==='closing')return '追问之后对方仍很久没说话。自然问一句还有事吗，或说自己困了/先去忙、要挂了；说完才结束通话，不用长篇解释。';
 return '熙蒙刚在电话里讲了话，按关系、当前生活与前文自然回应。每个消息是一句或一小段能独立说完的话，留下轮流说话的空隙。';
}
async function generateTurn(ctx,{opening=false,text='',event='',endAfter=false}={}){
 if(call.state!=='connected'||call.busy)return;
 const sessionId=call.sessionId;
 const requestDay=ctx.store.get().day;
 if(!opening&&!event&&!String(text).trim())return;
 if(!opening&&!event){call.turns.push({role:'user',content:String(text).trim()});call.lastPlayerAt=Date.now();call.nudgeCount=0;}
 call.busy=true;markTaiEngaged();ctx.refresh();
 try{
  const history=call.turns.slice(-20);
  const scene=callScene({opening,event,direction:call.direction,reason:call.reason});
  const messages=opening||event?[...history,{role:'user',content:'[电话系统事件；不是熙蒙说出的台词：'+scene+']'}]:history;
  const data=event==='unheard'?null:await askTai({channel:'noapp',day:requestDay,messages,outputMode:'call',scene,
   behavior:taiBehavior(ctx.store.get()),
   relationshipContext:xitaiRelationshipContext(ctx.store.get(),{mode:'call'}),
   profile:ctx.store.get().aiDraft?.profile,memories:ctx.store.get().aiDraft?.memories});
  if(call.sessionId!==sessionId||call.state!=='connected'||ctx.store.get().day!==requestDay)return;
  const replies=event==='unheard'?[unheardReply(sessionId+':'+call.turns.length)]:unpackTaiReply(data,'call');
  for(const r of replies){
   if(call.sessionId!==sessionId||call.state!=='connected'||ctx.store.get().day!==requestDay)break;
   const speech=composeCallSpeech([r],taiBehavior(ctx.store.get()));
   if(!speech)continue;
   // Prepare each segment independently: captions are published only when
   // that segment is ready, never while its predecessors are still speaking.
   const blob=await voicePreview({text:speech,tone:r.tone||'neutral'});
   if(call.sessionId!==sessionId||call.state!=='connected'||ctx.store.get().day!==requestDay)break;
   call.turns.push({role:'assistant',content:r.text});
   call.caption=r.text;call.lastSpeech=r.text;ctx.refresh();
   await playCallAudio(ctx,blob,sessionId);
   if(call.sessionId!==sessionId||call.state!=='connected')break;
   call.caption='';ctx.refresh();
   await new Promise(resolve=>setTimeout(resolve,taiBehavior(ctx.store.get()).callPause*1000));
  }
 }catch(e){if(call.sessionId===sessionId&&call.state==='connected')ctx.toast('通话 AI：'+e.message);}
 finally{
  if(call.sessionId===sessionId){
   call.busy=false;
   call.lastTaiEndAt=Date.now();
   if(call.state==='connected'){
    if(endAfter)callAction('tai-hangup',ctx);
    else ctx.refresh();
   }
  }
 }
}
export function nextCallIdleEvent(snapshot,now=Date.now(),config){
 if(snapshot.state!=='connected'||snapshot.busy||snapshot.listening||snapshot.requestingMic||snapshot.audioReady||!snapshot.lastTaiEndAt)return '';
 const c=taiBehavior({aiDraft:{behavior:config}});
 const silence=now-snapshot.lastTaiEndAt;
 if(snapshot.nudgeCount===0&&silence>=c.callNudgeSeconds*1000)return 'nudge';
 if(snapshot.nudgeCount===1&&silence>=c.callCloseSeconds*1000)return 'closing';
 return '';
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
  queueMicrotask(()=>{if(call.state==='connected')generateTurn(ctx,{opening:true});});
 }
}
export function submitCall(form,ctx){
 if(form.dataset.form!=='tai-call-turn')return false;
 const text=String(new FormData(form).get('text')||'').trim();if(text)respond(text,ctx);
 return true;
}
export function callAction(action,ctx){
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
  callSerial++;call={state:'ended',sessionId:callSerial,direction:previous.direction,muted:false,speaker:true,turns:[],started:0,busy:false,nudgeCount:0};
  if(activeRecognition){activeRecognition.abort?.();activeRecognition=null;}
  if(recording?.call){recording.recorder._cancelled=true;recording.recorder.stop();recording=null;}
  finishSegment?.();
  if(playback){playback.pause();if(playback.src.startsWith('blob:'))URL.revokeObjectURL(playback.src);playback=null;}
  ctx.store.update(s=>{
   if(previous.notificationId)s.notifications=s.notifications.filter(n=>n.id!==previous.notificationId);
   const outcome=previous.state==='ringing'?'declined':previous.state==='dialing'?'cancelled':'ended';
   s.events.push({type:action==='tai-decline'?'tai_call_declined':'tai_call_ended',day:s.day,clock:s.clock,durationSeconds:previous.started?Math.max(0,Math.floor((Date.now()-previous.started)/1000)):0});
   if(previous.turns.length){
    s.aiDraft??={};s.aiDraft.memories??=[];
    const transcript=previous.turns.slice(-8).map(t=>(t.role==='user'?'熙蒙':'熙泰')+'：'+t.content).join('\n').slice(0,600);
    s.aiDraft.memories.push({day:s.day,visibility:'noapp',source:'NoApp已发生通话',text:transcript});
    s.aiDraft.memories=s.aiDraft.memories.slice(-30);
   }
   recordCall(s,{direction:previous.direction,status:outcome,turns:previous.turns,seconds:previous.started?Math.max(0,Math.floor((Date.now()-previous.started)/1000)):0});
  });
  // Declining the top banner must not eject the player from another App.
  if(ctx.store.get().nav.current.appId==='noapp'&&ctx.store.get().nav.current.route==='/call')
   ctx.router.open({appId:'noapp',route:'/chat/tai'});
  return true;
 case 'tai-play-audio':if(playback){playback.muted=!call.speaker;playback.play().then(()=>{call.audioReady=false;ctx.refresh();}).catch(()=>ctx.toast('浏览器尚未允许播放，请再次点击继续收听。'));}return true;
 case 'tai-expand':call.expanded=!call.expanded;ctx.refresh();return true;
 case 'tai-mute':call.muted=!call.muted;ctx.refresh();return true;
 case 'tai-speaker':call.speaker=!call.speaker;if(playback)playback.muted=!call.speaker;ctx.refresh();return true;
 case 'tai-mic':{
  // iOS lowers or interrupts remote audio when a new mic audio session opens.
  // Keep the call half-duplex: no microphone capture until Xitai finishes.
  if(call.busy||call.requestingMic||playback&&!playback.paused){ctx.toast('等熙泰说完，再按麦克风。');return true;}
  if(call.muted){ctx.toast('解除静音后再说话');return true;}
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(navigator.mediaDevices?.getUserMedia&&globalThis.MediaRecorder){
   if(recording?.call){
    const active=recording;recording=null;call.listening=false;active.recorder.stop();ctx.refresh();ctx.toast('正在识别这一段通话语音…');return true;
   }
   const sessionId=call.sessionId;call.requestingMic=true;
   (async()=>{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(call.sessionId!==sessionId||call.state!=='connected'){stream.getTracks().forEach(t=>t.stop());return;}
    const chunks=[],recorder=new MediaRecorder(stream);
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());
      if(recorder._cancelled||call.sessionId!==sessionId||call.state!=='connected')return;
      call.listening=false;call.busy=true;ctx.refresh();
      try{const text=await speechToText(new Blob(chunks,{type:recorder.mimeType||'audio/mp4'}));if(call.sessionId===sessionId&&call.state==='connected'){call.busy=false;await respond(text,ctx);}}
      catch(e){if(call.sessionId===sessionId&&call.state==='connected'){call.busy=false;ctx.toast('这段话没能识别，可重说或用文字输入。');await generateTurn(ctx,{event:'unheard'});}}
      finally{if(call.sessionId===sessionId){call.busy=false;ctx.refresh();}}
    };
    recording={recorder,call:true};call.listening=true;recorder.start();ctx.refresh();ctx.toast('正在听，请再点一次麦克风结束。');
    setTimeout(()=>{if(recording?.recorder===recorder&&recorder.state==='recording'){recording=null;call.listening=false;recorder.stop();ctx.refresh();}},18000);
   })().catch(e=>{if(call.sessionId===sessionId){call.listening=false;ctx.toast('麦克风不可用：'+e.message);void generateTurn(ctx,{event:'unheard'});}}).finally(()=>{if(call.sessionId===sessionId)call.requestingMic=false;});
   return true;
  }
  if(!Speech){ctx.toast('此设备未开放麦克风，请用文字输入。');void generateTurn(ctx,{event:'unheard'});return true;}
  try{
   if(activeRecognition){activeRecognition.stop();activeRecognition=null;call.listening=false;ctx.refresh();return true;}
   const sessionId=call.sessionId,recognition=new Speech();recognition.lang='zh-CN';recognition.interimResults=false;recognition.maxAlternatives=1;
   let heard=false,failed=false;
   activeRecognition=recognition;call.listening=true;
   recognition.onresult=e=>{heard=true;if(call.sessionId===sessionId&&call.state==='connected'){call.listening=false;void respond(e.results[0][0].transcript,ctx);}};
   recognition.onend=()=>{if(activeRecognition===recognition)activeRecognition=null;if(call.sessionId===sessionId&&call.state==='connected'){call.listening=false;ctx.refresh();if(!heard&&!failed)void generateTurn(ctx,{event:'unheard'});}};
   recognition.onerror=e=>{failed=true;if(call.sessionId===sessionId&&call.state==='connected'&&e.error!=='aborted'){call.listening=false;ctx.toast('这段语音没能识别，请重说或用文字输入。');void generateTurn(ctx,{event:'unheard'});}};
   recognition.start();ctx.refresh();
  }catch(e){ctx.toast(e.message);}
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
     if(transcript)rememberTaiConversation(s,transcript);
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
 if(s.day<56)throw Error('NoApp 语音测试需要 D56 之后');
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
 if(messagePlayback){messagePlayback.pause();if(messagePlayback.src.startsWith('blob:'))URL.revokeObjectURL(messagePlayback.src);}
 messagePlayback=createGestureAudio();
 messagePlayback.preload='auto';
 // Reuse a single audio element: after the initial tap, sequential play is
 // much more reliable on iOS than creating three new autoplay elements.
 for(const m of queue){
  if(token!==voicePlaylistToken)break;
  let blob=await loadClip(m.audioId||m.id);
  // A voice synthesized before the parser fix may be literally speaking JSON.
  // Repair its audio and visible transcript only after recovering the dialogue.
  const oldCaption=String(m.voiceCaption||m.text||'');
  if(m.from==='tai'&&/^\s*(?:\[\s*\{|\{\s*"(?:messages|text|reply))/.test(oldCaption)){
   const clean=readableTaiVoiceText(oldCaption);
   if(!clean||clean==='语音转写异常，原始数据已隐藏'){ctx.toast('旧语音格式异常，请重新生成');continue;}
   try{
    blob=await voicePreview({text:clean,tone:m.aiTone||'neutral'});
    await saveClip(m.audioId||m.id,blob);
    ctx.store.update(state=>{
     const record=state.content.conversations.noapp?.find(c=>c.id==='tai')?.messages.find(x=>x.id===m.id);
     if(record){record.voiceCaption=clean;record.text=clean;}
    });
   }catch(error){ctx.toast('旧语音重制失败：'+error.message);continue;}
  }
  if(!blob&&m.voiceRequested){
   for(let wait=0;wait<35&&!blob&&token===voicePlaylistToken;wait++){
    await new Promise(resolve=>setTimeout(resolve,240));
    blob=await loadClip('tai-'+m.id);
   }
  }
  if(!blob){if(m===selected)ctx.toast('语音尚未准备好');continue;}
  const url=URL.createObjectURL(blob);
  messagePlayback.src=url;
  try{
   await messagePlayback.play();
   await new Promise(resolve=>{
    const finish=()=>{messagePlayback?.removeEventListener('ended',finish);messagePlayback?.removeEventListener('error',finish);resolve();};
    messagePlayback.addEventListener('ended',finish,{once:true});
    messagePlayback.addEventListener('error',finish,{once:true});
   });
  }catch(e){ctx.toast('点击语音后重试：'+e.message);break;}
  finally{URL.revokeObjectURL(url);}
 }
}
export async function convertTaiTextToVoice(ctx,id){
 const c=ctx.store.get().content.conversations.noapp.find(x=>x.id==='tai'),m=c?.messages.find(x=>x.id===id);
 if(!m||m.from==='me')throw Error('只允许给熙泰的消息配音');
 const clean=readableTaiVoiceText(m.text);
 const clip=await voicePreview({text:clean,tone:m.aiTone||'neutral'});
 await saveClip('tai-'+id,clip);
 ctx.store.update(s=>{const c=s.content.conversations.noapp.find(x=>x.id==='tai');const m=c?.messages.find(x=>x.id===id);if(m){m.kind='voice';m.audioId='tai-'+id;m.voiceCaption=clean;m.text=clean;}});
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
