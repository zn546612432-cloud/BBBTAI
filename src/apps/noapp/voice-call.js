import {esc} from '../../system/ui.js';
import {taiPresence} from '../../services/presence.js';
import {askTai,voicePreview} from '../../services/ai/gateway.js';
import {saveClip,loadClip} from '../../services/voice/audio-store.js';
import {uid} from '../../services/id.js';
import {dateParts} from '../../services/calendar.js';
import {unpackTaiReply} from '../../services/ai/format.js';

let call={state:'idle',direction:'incoming',muted:false,speaker:true,turns:[],started:0,busy:false};
let recording=null;
let playback=null;
const AVATAR='/assets/tai-portrait.svg';
const avatar=()=>'<img class="tai-call-avatar" src="'+AVATAR+'" alt="陈熙泰头像">';
const button=(action,title,icon,kind='')=>'<button type="button" data-action="'+action+'" class="tai-call-button '+kind+'"><span class="tai-call-button-icon">'+icon+'</span><small>'+title+'</small></button>';
function statusText(){return {ringing:'NoApp 语音通话',dialing:'正在呼叫…',connected:'NoApp 语音通话',ended:'通话已结束'}[call.state]||'NoApp 语音通话';}
export function callView(s){
 const ring=call.state==='ringing',connected=call.state==='connected';
 return '<div class="tai-call-screen" aria-label="熙泰语音通话"><div class="tai-call-top"><span>NOAPP · ENCRYPTED AUDIO</span><span class="tai-call-status">'+statusText()+'</span></div>'
 +'<div class="tai-call-person">'+avatar()+'<h1>陈熙泰</h1><p>'+(ring?'语音来电':call.state==='dialing'?'正在连接……':connected?'已接通 · '+Math.floor((Date.now()-call.started)/1000)+' 秒':'未连接')+'</p></div>'
 +(ring?'<div class="tai-call-choices">'+button('tai-decline','拒绝','✕','reject')+button('tai-accept','接听','☎','accept')+'</div>':connected?
 '<div class="tai-call-features">'+button('tai-mute',call.muted?'解除静音':'静音',call.muted?'🔇':'🎙')+button('tai-speaker',call.speaker?'扬声器开':'扬声器','◖))')+button('tai-hangup','挂断','☎','reject')+'</div>'
 +'<div class="tai-call-chat"><div class="tai-call-transcript" aria-live="polite">'+call.turns.slice(-6).map(x=>'<p><b>'+(x.role==='user'?'熙蒙':'熙泰')+'：</b>'+esc(x.content)+'</p>').join('')+'</div><form data-form="tai-call-turn"><input name="text" placeholder="输入或用麦克风说话…" aria-label="电话回复" autocomplete="off" maxlength="1200"><button type="button" data-action="tai-mic" aria-label="说话">🎤</button><button type="submit" '+(call.busy?'disabled':'')+'>发送</button></form><small>语音识别取决于 Safari 支持；不支持时可打字继续，通话采用轮流发言。</small></div>':
 '<div class="tai-call-choices">'+button('tai-hangup','取消','✕','reject')+'</div>')+'</div>';
}
export function startIncoming(ctx,preview='熙泰邀请你语音通话'){
 if(ctx.store.get().day<56)return;
 call={state:'ringing',direction:'incoming',muted:false,speaker:true,turns:[],started:0,busy:false};
 ctx.store.update(s=>{s.notifications.unshift({id:'tai-call-'+uid(),title:'NoApp · 陈熙泰',body:preview,type:'tai-incoming-call',link:{appId:'noapp',route:'/call',params:{}}});});
}
export function startOutgoing(ctx){
 const p=taiPresence(ctx.store.get());
 if(!p.contactable||p.status!=='online'){ctx.toast('熙泰当前不在线，稍后再联系。');return;}
 call={state:'dialing',direction:'outgoing',muted:false,speaker:true,turns:[],started:0,busy:false};
 ctx.router.open({appId:'noapp',route:'/call'});
 setTimeout(()=>{if(call.state!=='dialing')return;call.state='connected';call.started=Date.now();ctx.refresh();},1100);
}
async function respond(text,ctx){
 if(call.state!=='connected'||call.busy||!text.trim())return;
 const turn={role:'user',content:text.trim()};
 call.turns.push(turn);call.busy=true;ctx.refresh();
 try{
  const data=await askTai({channel:'noapp',day:ctx.store.get().day,messages:call.turns.slice(-20),profile:ctx.store.get().aiDraft?.profile,memories:ctx.store.get().aiDraft?.memories});
  const replies=unpackTaiReply(data,'noapp');
  for(const reply of replies){
   if(call.state!=='connected')break;
   call.turns.push({role:'assistant',content:reply.text});ctx.refresh();
   const blob=await voicePreview({text:reply.text,tone:reply.tone});
   if(call.state!=='connected')break;
   if(playback){playback.pause();URL.revokeObjectURL(playback.src);playback=null;}
   playback=new Audio(URL.createObjectURL(blob));
   try{await playback.play();}catch{ctx.toast('请点通话界面后再播放音频，iPhone 已阻止自动播放。');}
   if(replies.length>1)await new Promise(r=>setTimeout(r,420));
  }
 }catch(e){ctx.toast('电话回复失败：'+e.message);}
 finally{call.busy=false;ctx.refresh();}
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
  call.state='connected';call.started=Date.now();ctx.refresh();return true;
 case 'tai-decline':case 'tai-hangup':
  call.state='ended';call.turns=[];if(playback){playback.pause();URL.revokeObjectURL(playback.src);playback=null;}
  ctx.router.open({appId:'noapp',route:'/chat/tai'});return true;
 case 'tai-mute':call.muted=!call.muted;ctx.refresh();return true;
 case 'tai-speaker':call.speaker=!call.speaker;ctx.refresh();return true;
 case 'tai-mic':{
  if(call.muted){ctx.toast('解除静音后再说话');return true;}
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){ctx.toast('此浏览器未提供语音识别，请输入文字继续；麦克风语音消息可单独录制。');return true;}
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
   const blob=new Blob(chunks,{type:recorder.mimeType||'audio/mp4'});
   const id='voice-'+uid(),duration=Math.max(1,Math.round((Date.now()-start)/1000));
   await saveClip(id,blob);
   ctx.store.update(s=>{
    const c=s.content.conversations.noapp.find(c=>c.id==='tai');
    c.messages.push({id,from:'me',text:'[语音消息 '+duration+'秒]',kind:'voice',audioId:id,duration,time:s.clock,day:s.day,sentDate:dateParts(s).iso,actual:true});
    s.events.push({type:'voice_sent',channel:'noapp',messageId:id,day:s.day,clock:s.clock});
   });
   ctx.toast('语音已发送到 NoApp（本机保存），AI 尚不能直接理解未转写的语音');
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
