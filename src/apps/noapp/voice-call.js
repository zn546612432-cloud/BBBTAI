import {TAI_PORTRAIT} from './portrait.js';
import {rememberTaiConversation} from '../../services/ai/memory.js';
import {esc} from '../../system/ui.js';
import {taiPresence,markTaiEngaged} from '../../services/presence.js';
import {askTai,voicePreview,speechToText} from '../../services/ai/gateway.js';
import {saveClip,loadClip} from '../../services/voice/audio-store.js';
import {uid} from '../../services/id.js';
import {dateParts} from '../../services/calendar.js';
import {unpackTaiReply} from '../../services/ai/format.js';

let call={state:'idle',direction:'incoming',muted:false,speaker:false,turns:[],started:0,busy:false};
let recording=null;
let pendingHold=null; // unique token for async microphone permission prompts
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
   active?phoneButton('tai-mic',call.listening?'点击结束':'麦克风已开',glyph.mic,'is-mic'+(call.listening?' is-listening':''))+
   phoneButton('tai-hangup','取消',glyph.hang,'is-hang')+
   phoneButton('tai-speaker',call.speaker?'扬声器已开':'扬声器已关',call.speaker?glyph.speaker:glyph.quiet,'is-speaker'+(call.speaker?' is-speaker-on':'')):
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
   '<div class="tai-call-bottom'+(ring?' two-actions':'')+'">'+controls+'</div>'+
   '</section>';
}
export function startIncoming(ctx,preview='熙泰邀请你语音通话'){
 if(ctx.store.get().day<56)return;
 call={state:'ringing',direction:'incoming',muted:false,speaker:false,turns:[],started:0,busy:false};
 ctx.store.update(s=>{s.notifications.unshift({id:'tai-call-'+uid(),title:'NoApp · 陈熙泰',body:preview,type:'tai-incoming-call',link:{appId:'noapp',route:'/call',params:{}}});});
}
export function startOutgoing(ctx){
 const p=taiPresence(ctx.store.get());
 if(!p.contactable||p.status!=='online'){ctx.toast('熙泰当前不在线，稍后再联系。');return;}
 call={state:'dialing',direction:'outgoing',muted:false,speaker:false,turns:[],started:0,busy:false};
 ctx.router.open({appId:'noapp',route:'/call'});
 setTimeout(()=>{if(call.state!=='dialing')return;call.state='connected';call.started=Date.now();markTaiEngaged();ctx.refresh();startGreeting(ctx);},1100);
}
// A telephone turn is ONE MiniMax TTS request, regardless of how many
// chat bubbles DeepSeek chooses to send. Safari no longer drops later chunks.
async function playCallAudio(ctx,blob){
 if(playback){playback.pause();if(playback.src.startsWith('blob:'))URL.revokeObjectURL(playback.src);}
 const url=URL.createObjectURL(blob);
 playback=new Audio(url);
 const current=playback;
 try{
  await current.play();
  await new Promise(resolve=>{
   if(current.ended){resolve();return;}
   let finished=false;
   const finish=()=>{if(finished)return;finished=true;clearTimeout(watchdog);current.removeEventListener('ended',finish);current.removeEventListener('pause',finish);current.removeEventListener('error',finish);resolve();};
   current.addEventListener('ended',finish);current.addEventListener('pause',finish);current.addEventListener('error',finish);
   const watchdog=setTimeout(finish,180000);
  });
 }catch{
  call.audioReady=true;
  ctx.toast('iPhone 阻止了自动播放，请点击「播放语音」收听熙泰。');
 }finally{
  call.audioReady=!!(playback&&playback.paused&&playback.currentTime===0);
  if(call.state==='connected')ctx.refresh();
 }
}
async function generateTurn(ctx,{opening=false,text=''}={}){
 if(call.state!=='connected'||call.busy)return;
 const requestDay=ctx.store.get().day;
 if(!opening&&!String(text).trim())return;
 if(!opening)call.turns.push({role:'user',content:String(text).trim()});
 call.busy=true;markTaiEngaged();ctx.refresh();
 try{
  const history=call.turns.slice(-20);
  const messages=opening?[...history,{role:'user',content:'[通话系统事件：语音电话刚接通。请由你先主动自然地说第一句话，不要反问我是系统，没有必要问候式客服套话。可以按关系和当前话题选择短句，偶尔非常自然地夹入一个简短葡语词。只生成熙泰的台词。]'}]:history;
  const data=await askTai({channel:'noapp',day:requestDay,messages,profile:ctx.store.get().aiDraft?.profile,memories:ctx.store.get().aiDraft?.memories});
  const replies=unpackTaiReply(data,'noapp');
  const completeSpeech=replies.map(x=>x.text.trim()).filter(Boolean).join(' ');
  if(!completeSpeech)throw Error('熙泰暂时没有回应');
  for(const r of replies)call.turns.push({role:'assistant',content:r.text});
  call.lastSpeech=completeSpeech;ctx.refresh();
  // One contiguous payload. Long words, breathing and personality are
  // handled once by the MiniMax voice-worldbook composer.
  const blob=await voicePreview({text:completeSpeech,tone:replies.at(-1)?.tone||'neutral'});
  if(call.state!=='connected')return;
  await playCallAudio(ctx,blob);
 }catch(e){if(call.state==='connected')ctx.toast('通话 AI：'+e.message);}
 finally{call.busy=false;if(call.state==='connected')ctx.refresh();}
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
  call.state='connected';call.started=Date.now();markTaiEngaged();ctx.refresh();startGreeting(ctx);return true;
 case 'tai-decline':case 'tai-hangup':
  call.state='ended';call.turns=[];if(playback){playback.pause();URL.revokeObjectURL(playback.src);playback=null;}
  ctx.router.open({appId:'noapp',route:'/chat/tai'});return true;
 case 'tai-play-audio':if(playback){playback.play().catch(e=>ctx.toast(e.message));}return true;
 case 'tai-expand':call.expanded=!call.expanded;ctx.refresh();return true;
 case 'tai-mute':call.muted=!call.muted;ctx.refresh();return true;
 case 'tai-speaker':call.speaker=!call.speaker;ctx.refresh();return true;
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
   const recognition=new Speech();recognition.lang='zh-CN';recognition.interimResults=false;recognition.maxAlternatives=1;
   recognition.onresult=e=>respond(e.results[0][0].transcript,ctx);
   recognition.onerror=e=>ctx.toast('语音识别不可用：'+e.error);
   recognition.start();ctx.toast('正在听你说话…');
  }catch(e){ctx.toast(e.message);}
  return true;
 }
 default:return false;
 }
}
export async function toggleVoiceRecord(ctx){
 if(recording){
  recording.recorder.stop();recording=null;ctx.toast('正在保存语音…');return;
 }
 if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder)throw Error('需要 HTTPS 与 Safari 麦克风权限才能录音');
 const stream=await navigator.mediaDevices.getUserMedia({audio:true});
 const chunks=[];const recorder=new MediaRecorder(stream);
 const start=Date.now();
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 recorder.onstop=async()=>{
  stream.getTracks().forEach(t=>t.stop());
  try{
   if(recorder._cancelled){ctx.toast('已取消录音');return;}
   const blob=new Blob(chunks,{type:recorder.mimeType||'audio/mp4'});
   const id='voice-'+uid(),duration=Math.max(1,Math.round((Date.now()-start)/1000));
   await saveClip(id,blob);
   let transcript='';
   try{transcript=await speechToText(blob);}catch(error){ctx.toast('语音已保存；自动转写不可用：'+error.message);}
   ctx.store.update(s=>{
    const c=s.content.conversations.noapp.find(c=>c.id==='tai');
    c.messages.push({id,from:'me',text:'[语音消息 '+duration+'秒]',kind:'voice',audioId:id,voiceCaption:transcript||null,duration,time:s.clock,day:s.day,sentDate:dateParts(s).iso,actual:true});
    if(transcript)rememberTaiConversation(s,transcript);
    s.events.push({type:'voice_sent',channel:'noapp',messageId:id,day:s.day,clock:s.clock});
   });
   ctx.toast(transcript?'语音已发送并转写，正在等待熙泰回复…':'语音已发送（没有转写时 AI 不会臆测内容）');
   if(transcript)window.dispatchEvent(new CustomEvent('ximeng:noapp-voice-sent',{detail:{messageId:id}}));
  }catch(e){ctx.toast('语音保存失败：'+e.message);}
 };
 recording={recorder,start};recorder.start();ctx.toast('正在录音，点击同一麦克风按钮结束（最长25秒）');
 setTimeout(()=>{if(recording?.recorder===recorder&&recorder.state==='recording'){recording=null;recorder.stop();}},25000);
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

/** iOS-style hold-to-record. Hold, see moving waves, release to send;
 * slide upward before release to cancel. */
export function mountHoldToTalk(root,makeContext){
 if(!root||root.dataset.xitaiHoldMounted)return;
 root.dataset.xitaiHoldMounted='1';
 let active=null;
 const indicator=()=>root.querySelector('.noapp-record-overlay');
 function hide(){const el=indicator();if(el){el.classList.remove('is-recording');el.setAttribute('aria-hidden','true');} }
 root.addEventListener('pointerdown',e=>{
  const button=e.target.closest('[data-action="tai-record"][data-hold="true"]');
  if(!button||active||!button.closest('.app-noapp'))return;
  e.preventDefault();
  const token={pointerId:e.pointerId,startY:e.clientY,timer:null,recording:false,cancel:false};
  active=token;
  try{button.setPointerCapture(e.pointerId);}catch{}
  token.timer=setTimeout(async()=>{
   if(active!==token)return;
   token.recording=true;
   const el=indicator();if(el){el.classList.add('is-recording');el.setAttribute('aria-hidden','false');}
   const ctx=makeContext();
   const nonce=pendingHold={};
   try{
    // getUserMedia requires a trusted gesture; browsers may ask permission here.
    await toggleVoiceRecord(ctx);
    if(pendingHold!==nonce||active!==token){
     if(recording?.recorder?.state==='recording'){
      recording.recorder._cancelled=true;recording.recorder.stop();recording=null;
     }
    }
   }catch(err){ctx.toast(err.message);hide();}
  },280);
 },true);
 async function release(e,forced=false){
  const token=active;if(!token||e.pointerId!==token.pointerId)return;
  active=null;clearTimeout(token.timer);
  if(!token.recording){hide();return;}
  pendingHold=null;
  const ctx=makeContext();
  const cancel=forced||token.cancel||e.clientY<token.startY-75;
  const rec=recording;
  if(rec?.recorder?.state==='recording'){
   if(cancel)rec.recorder._cancelled=true;
   rec.recorder.stop();recording=null;
  }
  hide();
  if(cancel)ctx.toast('语音已取消');
 }
 root.addEventListener('pointermove',e=>{
  if(!active||e.pointerId!==active.pointerId)return;
  const el=indicator();if(el)el.classList.toggle('is-cancel-gesture',e.clientY<active.startY-75);
 },true);
 root.addEventListener('pointerup',e=>{void release(e,false);},true);
 root.addEventListener('pointercancel',e=>{void release(e,true);},true);
 root.addEventListener('lostpointercapture',e=>{if(active&&e.pointerId===active.pointerId)void release(e,true);},true);
}
