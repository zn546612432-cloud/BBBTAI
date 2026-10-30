import {TAI_PORTRAIT} from './portrait.js';
import {rememberTaiConversation} from '../../services/ai/memory.js';
import {esc} from '../../system/ui.js';
import {taiPresence,markTaiEngaged} from '../../services/presence.js';
import {askTai,voicePreview,speechToText} from '../../services/ai/gateway.js';
import {saveClip,loadClip} from '../../services/voice/audio-store.js';
import {uid} from '../../services/id.js';
import {dateParts} from '../../services/calendar.js';
import {unpackTaiReply} from '../../services/ai/format.js';

let call={state:'idle',direction:'incoming',muted:false,speaker:true,turns:[],started:0,busy:false};
let recording=null;
let callSerial=0;
let activeRecognition=null;
export function callState(){return {state:call.state,direction:call.direction,sessionId:call.sessionId,turnCount:call.turns.length};}
let playback=null;
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
export function callView(){
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
 const liveCaptions=active?'<div class="tai-live-captions" role="log" aria-live="polite">'+call.turns.slice(-5).map(t=>'<p class="'+(t.role==='user'?'mine':'theirs')+'">'+esc(t.content)+'</p>').join('')+(call.audioReady?'<button type="button" data-action="tai-play-audio">▶ 播放语音</button>':'')+'</div>':'';
 return '<section class="tai-call-screen" aria-label="NoApp语音通话">'
  +'<div class="tai-call-ambient" aria-hidden="true"></div>'
  +'<nav class="tai-call-topbar">'+
   '<button type="button" data-action="tai-expand" aria-label="查看或收起通话文字">'+glyph.layout+'</button>'+
   '<span class="tai-call-channel">NOAPP · AUDIO</span>'+
   '<button type="button" data-action="tai-expand" aria-label="展开通话文字">'+glyph.plus+'</button></nav>'+
   '<div class="tai-call-identity"><img class="tai-call-avatar" src="'+AVATAR+'" alt="陈熙泰照片" data-source="'+AVATAR_SOURCE+'"><h1>陈熙泰</h1><p>'+subtitle+'</p><div class="tai-call-dots" aria-hidden="true"><i></i><i></i><i></i></div></div>'+
   liveCaptions+transcript+
   '<div class="tai-call-bottom'+(ring?' two-actions':active?' grid-six':'')+'">'+controls+'</div>'+
   '</section>';
}
export function startIncoming(ctx,preview='熙泰邀请你语音通话'){
 if(ctx.store.get().day<56||['ringing','dialing','connected'].includes(call.state))return false;
 const sessionId=++callSerial,notificationId='tai-call-'+uid();
 call={state:'ringing',sessionId,notificationId,direction:'incoming',muted:false,speaker:true,turns:[],started:0,busy:false,audioReady:false};
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
 const sessionId=++callSerial;
 call={state:'dialing',sessionId,direction:'outgoing',muted:false,speaker:true,turns:[],started:0,busy:false,audioReady:false};
 ctx.router.open({appId:'noapp',route:'/call'});
 setTimeout(()=>{if(call.sessionId!==sessionId||call.state!=='dialing')return;call.state='connected';call.started=Date.now();markTaiEngaged();ctx.refresh();startGreeting(ctx);},1100);
 return true;
}
// A telephone turn is ONE MiniMax TTS request, regardless of how many
// chat bubbles DeepSeek chooses to send. Safari no longer drops later chunks.
async function playCallAudio(ctx,blob,sessionId){
 if(call.sessionId!==sessionId||call.state!=='connected')return;
 if(playback){playback.pause();if(playback.src.startsWith('blob:'))URL.revokeObjectURL(playback.src);}
 const url=URL.createObjectURL(blob);
 playback=new Audio(url);
 playback.muted=!call.speaker;
 const current=playback;
 try{
  await current.play();
  if(call.sessionId!==sessionId||call.state!=='connected'){current.pause();return;}
  await new Promise(resolve=>{
   if(current.ended){resolve();return;}
   let finished=false;
   const finish=()=>{if(finished)return;finished=true;clearTimeout(watchdog);current.removeEventListener('ended',finish);current.removeEventListener('pause',finish);current.removeEventListener('error',finish);resolve();};
   current.addEventListener('ended',finish);current.addEventListener('pause',finish);current.addEventListener('error',finish);
   const watchdog=setTimeout(finish,180000);
  });
 }catch{
  if(call.sessionId===sessionId&&call.state==='connected'){
   call.audioReady=true;
   ctx.toast('点击「播放语音」收听熙泰。');
  }
 }finally{
  if(call.sessionId===sessionId&&call.state==='connected'){
   call.audioReady=!!(playback&&playback.paused&&playback.currentTime===0);
   ctx.refresh();
  }
 }
}
async function generateTurn(ctx,{opening=false,text=''}={}){
 if(call.state!=='connected'||call.busy)return;
 const sessionId=call.sessionId;
 const requestDay=ctx.store.get().day;
 if(!opening&&!String(text).trim())return;
 if(!opening)call.turns.push({role:'user',content:String(text).trim()});
 call.busy=true;markTaiEngaged();ctx.refresh();
 try{
  const history=call.turns.slice(-20);
  const messages=opening?[...history,{role:'user',content:'[通话系统事件：语音电话刚接通。请由你先主动自然地说第一句话，不要反问我是系统，没有必要问候式客服套话。可以按关系和当前话题选择短句，偶尔非常自然地夹入一个简短葡语词。只生成熙泰的台词。]'}]:history;
  const data=await askTai({channel:'noapp',day:requestDay,messages,profile:ctx.store.get().aiDraft?.profile,memories:ctx.store.get().aiDraft?.memories});
  if(call.sessionId!==sessionId||call.state!=='connected')return;
  const replies=unpackTaiReply(data,'noapp');
  const completeSpeech=replies.map(x=>x.text.trim()).filter(Boolean).join(' ');
  if(!completeSpeech)throw Error('熙泰暂时没有回应');
  for(const r of replies)call.turns.push({role:'assistant',content:r.text});
  call.lastSpeech=completeSpeech;ctx.refresh();
  // One contiguous payload. Long words, breathing and personality are
  // handled once by the MiniMax voice-worldbook composer.
  const blob=await voicePreview({text:completeSpeech,tone:replies.at(-1)?.tone||'neutral'});
  if(call.sessionId!==sessionId||call.state!=='connected')return;
  await playCallAudio(ctx,blob,sessionId);
 }catch(e){if(call.sessionId===sessionId&&call.state==='connected')ctx.toast('通话 AI：'+e.message);}
 finally{if(call.sessionId===sessionId){call.busy=false;if(call.state==='connected')ctx.refresh();}}
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
  call.state='connected';call.started=Date.now();markTaiEngaged();
  ctx.store.update(s=>{s.notifications=s.notifications.filter(n=>n.id!==call.notificationId);});
  ctx.refresh();startGreeting(ctx);return true;
 case 'tai-decline':case 'tai-hangup':
  if(!['ringing','dialing','connected'].includes(call.state))return true;
  const previous=call;
  callSerial++;call={state:'ended',sessionId:callSerial,direction:previous.direction,muted:false,speaker:true,turns:[],started:0,busy:false};
  if(activeRecognition){activeRecognition.abort?.();activeRecognition=null;}
  if(recording?.call){recording.recorder._cancelled=true;recording.recorder.stop();recording=null;}
  if(playback){playback.pause();if(playback.src.startsWith('blob:'))URL.revokeObjectURL(playback.src);playback=null;}
  ctx.store.update(s=>{
   if(previous.notificationId)s.notifications=s.notifications.filter(n=>n.id!==previous.notificationId);
   s.events.push({type:action==='tai-decline'?'tai_call_declined':'tai_call_ended',day:s.day,clock:s.clock});
  });
  ctx.router.open({appId:'noapp',route:'/chat/tai'});return true;
 case 'tai-play-audio':if(playback){playback.muted=!call.speaker;playback.play().then(()=>{call.audioReady=false;ctx.refresh();}).catch(e=>ctx.toast(e.message));}return true;
 case 'tai-expand':call.expanded=!call.expanded;ctx.refresh();return true;
 case 'tai-mute':call.muted=!call.muted;ctx.refresh();return true;
 case 'tai-speaker':call.speaker=!call.speaker;if(playback)playback.muted=!call.speaker;ctx.refresh();return true;
 case 'tai-mic':{
  if(call.muted){ctx.toast('解除静音后再说话');return true;}
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){
   if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder){ctx.toast('请打字继续；此设备没有开放麦克风。');return true;}
   if(recording?.call){
    const active=recording;recording=null;call.listening=false;active.recorder.stop();ctx.refresh();ctx.toast('正在识别这一段通话语音…');return true;
   }
   (async()=>{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const chunks=[],recorder=new MediaRecorder(stream);
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());
      try{const text=await speechToText(new Blob(chunks,{type:recorder.mimeType||'audio/mp4'}));await respond(text,ctx);}
      catch(e){ctx.toast('语音识别失败：'+e.message);}
    };
    recording={recorder,call:true};call.listening=true;recorder.start();ctx.refresh();ctx.toast('正在听，请再点一次麦克风结束。');
    setTimeout(()=>{if(recording?.recorder===recorder&&recorder.state==='recording'){recording=null;call.listening=false;recorder.stop();ctx.refresh();}},18000);
   })().catch(e=>ctx.toast('麦克风不可用：'+e.message));
   return true;
  }
  try{
   if(activeRecognition){activeRecognition.stop();activeRecognition=null;call.listening=false;ctx.refresh();return true;}
   const sessionId=call.sessionId,recognition=new Speech();recognition.lang='zh-CN';recognition.interimResults=false;recognition.maxAlternatives=1;
   activeRecognition=recognition;call.listening=true;
   recognition.onresult=e=>{if(call.sessionId===sessionId&&call.state==='connected')void respond(e.results[0][0].transcript,ctx);};
   recognition.onend=()=>{if(activeRecognition===recognition)activeRecognition=null;if(call.sessionId===sessionId){call.listening=false;ctx.refresh();}};
   recognition.onerror=e=>{if(call.sessionId===sessionId&&e.error!=='aborted')ctx.toast('语音识别不可用：'+e.error);};
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
     c.messages.push({id,from:'me',text:'[语音消息 '+duration+'秒]',kind:'voice',audioId:id,voiceCaption:transcript||null,duration,time:s.clock,day:s.day,sentDate:dateParts(s).iso,actual:true});
     if(transcript)rememberTaiConversation(s,transcript);
     s.events.push({type:'voice_sent',channel:'noapp',messageId:id,day:s.day,clock:s.clock});
    });
    if(transcript&&typeof window!=='undefined')window.dispatchEvent(new CustomEvent('ximeng:noapp-voice-sent',{detail:{messageId:id}}));
   }catch(e){ctx.toast('语音保存失败：'+e.message);}
  };
  recorder.onerror=()=>{current._cancelled=true;};
  recording=current;
  recorder.start(250);
  current.timer=setTimeout(()=>stopVoiceRecording({cancel:false}),25000);
  return current;
 }catch(e){stream?.getTracks().forEach(track=>track.stop());throw e;}
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
export async function playVoiceMessage(id,ctx){
 const blob=await loadClip(id);if(!blob)throw Error('找不到本机语音文件');
 if(playback){playback.pause();URL.revokeObjectURL(playback.src);}
 playback=new Audio(URL.createObjectURL(blob));try{await playback.play();}catch(e){ctx.toast('点击播放按钮后重新试试：'+e.message);}
}
export async function convertTaiTextToVoice(ctx,id){
 const c=ctx.store.get().content.conversations.noapp.find(x=>x.id==='tai'),m=c?.messages.find(x=>x.id===id);
 if(!m||m.from==='me')throw Error('只允许给熙泰的消息配音');
 const clip=await voicePreview({text:m.text,tone:m.aiTone||'neutral'});
 await saveClip('tai-'+id,clip);
 ctx.store.update(s=>{const c=s.content.conversations.noapp.find(x=>x.id==='tai');const m=c?.messages.find(x=>x.id===id);if(m){m.kind='voice';m.audioId='tai-'+id;m.voiceCaption=m.text;}});
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
  hide();
 }
 root.addEventListener('pointerdown',e=>{
  const target=e.target.closest?.('[data-action="tai-record"][data-hold="true"]');
  if(!target||!target.closest('.app-noapp')||active||recording||voicePermissionPending)return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  e.preventDefault();
  const ctx=makeContext(),token={pointerId:e.pointerId,startY:e.clientY,startX:e.clientX,started:Date.now(),ready:false,done:false,cancel:false};
  active=token;
  try{target.setPointerCapture(e.pointerId);}catch{}
  show();
  // getUserMedia begins synchronously inside this trusted pointer event.
  void beginVoiceRecording(ctx).then(()=>{
   token.ready=true;
   if(token.done)stopVoiceRecording({cancel:token.cancel});
   else if(active===token)show();
  }).catch(err=>{
   if(!token.done)ctx.toast(err.message||'麦克风不可用');
   if(active===token)active=null;
   hide();
  });
 },true);
 root.addEventListener('pointermove',e=>{
  const t=active;if(!t||t.pointerId!==e.pointerId)return;
  t.cancel=e.clientY<t.startY-75;
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
