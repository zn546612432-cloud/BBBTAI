import {esc} from '../../system/ui.js';
import {taiPresence,markTaiEngaged} from '../../services/presence.js';
import {askTai,voicePreview,speechToText} from '../../services/ai/gateway.js';
import {saveClip,loadClip} from '../../services/voice/audio-store.js';
import {uid} from '../../services/id.js';
import {dateParts} from '../../services/calendar.js';
import {unpackTaiReply} from '../../services/ai/format.js';

let call={state:'idle',direction:'incoming',muted:false,speaker:false,turns:[],started:0,busy:false};
let recording=null;
let playback=null;
const AVATAR="data:image/webp;base64,UklGRrADAABXRUJQVlA4IKQDAACwFQCdASpQAFAAPuFkp04opaMiKlYNoRAcCUAZMAYfyS2e+bsvX5Stjpt3tz9wXRE2+tvcLgSx3ZtNUhwnaPOkapE5bXGbTupmaqAkQZWUZnSAPQoGOM+UZL/gIcQeI+K6w+7EIjoKUJr8LPYB9XnzitlCMrI6WAuw+EqHqNFPATAE+GXU/m3Uit631X8fPtt+0eaId9252sLR1Wmli4N9yk8+/4aNyCbw30K2hw2DvWify5oJ4AD+8r/+PBBNbN9QRXas1B+KcVIBHrNKQg9db1HUE2uCUTrkUtWRkgfqz9MijqloAN9CaZYyqMXUVDvS3YOCB17CLKilIfIr/DrE6xFQ829GCkoioUO+DNjNNYsW5A94rkWqpv1sgG7z+50/4bDHM8eCbJA5nqWREJwa2BETb3dveKzx3W/BlGomXjEPh3YzG0nLuZEuY37yhXAHWg2fbWCOa9vY+N/XVnOKt9WS61xaVN8BbbQYgSGNtVK15/dqBETh+PDo4E2/yVzDZ3HlNgynSfihN2STUKe/suIGkGKjZA5ppPREMUTe5ZmnplhuiUr5NSswqWxghZ1ktOphHzHbbPGXLaNmdl3GeOezPdA/tEA8NfLtcoRf6cDi38TewJyzDRGIao6yVS5CM0iDvg+VNlZctTyVPO1grRMgkJIiTiKQLHbyCVX5ZrlLGgZeD0ZGx82b/WoxFbATPYikUprNqgFSLMgP7i4pVvCy0IhFeT/uQ9ODH3O7kSd8mnrFjDXV4oob6760elJllPJzRuNt/fYpT6wJtYpNJNrkpJE/2wKKy5Tra6+vvAW5WosrYuqiCwo4CaXHU0lonVguSCKNAYq1gq+igVUyAuntnQnxdsHQV9kcD61LC3yS5nsDmhT6SWJgpdaR1ucBvlMgXTBC7VioHhUyZh0Wbv5oDJYb7LaN4P4qe97Afeg4VlLlV54OFOUPWfc69aVwYCMABQVY+QLOhovZ6NiHioqaKvPcj7Z+HlX+TrPUhOo81DnO3r0brYMgxwaxWXpSUoTH/HP1CaA3RGFuNFeQY/NnbYv6uwMKGdgkmNeVa75koelldP5MhdGgk1MdNaFEzhggsimY3NPHOhh0YzF6GYbfCGe2LqL1h2iQNoFZRaKFblJRhTNBBRevL30YpkFVa7M2xj79YQKaBMU5aUfI19fKPNc7VKhkUZ6S6Rxe8GYDP/6lK8aeQDu3rTWw0h2gpfIc/U82LQimqfsF6dkYKZAAAA=="; // data URL avoids SVG-in-img nested image restrictions
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
 return '<section class="tai-call-screen" aria-label="NoApp语音通话">'
  +'<div class="tai-call-ambient" aria-hidden="true"></div>'
  +'<nav class="tai-call-topbar">'+
   '<button type="button" data-action="tai-expand" aria-label="查看或收起通话文字">'+glyph.layout+'</button>'+
   '<span class="tai-call-channel">NOAPP · AUDIO</span>'+
   '<button type="button" data-action="tai-expand" aria-label="展开通话文字">'+glyph.plus+'</button></nav>'+
   '<div class="tai-call-identity"><img class="tai-call-avatar" src="'+AVATAR+'" alt="陈熙泰照片" data-source="'+AVATAR_SOURCE+'"><h1>陈熙泰</h1><p>'+subtitle+'</p><div class="tai-call-dots" aria-hidden="true"><i></i><i></i><i></i></div></div>'+
   transcript+
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
 setTimeout(()=>{if(call.state!=='dialing')return;call.state='connected';call.started=Date.now();markTaiEngaged();ctx.refresh();},1100);
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
   try{
    await playback.play();
    // play() resolves when playback STARTS, not when it FINISHES.
    // Wait until this voice ends so consecutive Tai messages don't cut each other off.
    const currentAudio=playback;
    await new Promise(resolve=>{
      let finished=false;
      const done=()=>{if(finished)return;finished=true;currentAudio.removeEventListener('ended',done);currentAudio.removeEventListener('pause',done);currentAudio.removeEventListener('error',done);clearTimeout(watchdog);resolve();};
      currentAudio.addEventListener('ended',done,{once:true});
      currentAudio.addEventListener('pause',done,{once:true});
      currentAudio.addEventListener('error',done,{once:true});
      const watchdog=setTimeout(done,180000);
      if(currentAudio.ended)done();
    });
   }catch{ctx.toast('Safari 阻止了自动播放，请先手动点一次播放器允许音频。');}
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
  call.state='connected';call.started=Date.now();markTaiEngaged();ctx.refresh();return true;
 case 'tai-decline':case 'tai-hangup':
  call.state='ended';call.turns=[];if(playback){playback.pause();URL.revokeObjectURL(playback.src);playback=null;}
  ctx.router.open({appId:'noapp',route:'/chat/tai'});return true;
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
   const blob=new Blob(chunks,{type:recorder.mimeType||'audio/mp4'});
   const id='voice-'+uid(),duration=Math.max(1,Math.round((Date.now()-start)/1000));
   await saveClip(id,blob);
   let transcript='';
   try{transcript=await speechToText(blob);}catch(error){ctx.toast('语音已保存；自动转写不可用：'+error.message);}
   ctx.store.update(s=>{
    const c=s.content.conversations.noapp.find(c=>c.id==='tai');
    c.messages.push({id,from:'me',text:'[语音消息 '+duration+'秒]',kind:'voice',audioId:id,voiceCaption:transcript||null,duration,time:s.clock,day:s.day,sentDate:dateParts(s).iso,actual:true});
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
