import {createGestureAudio} from '../voice/playback.js';
import {resolveStablePhoneAudioPath,canonicalPhoneAudioPath} from '../voice/asset-url.js';

let session=null;
const valid=s=>session&&s.story55?.config?.finalAudio&&s.day===session.day&&canonicalPhoneAudioPath(s.story55.config.finalAudio)===session.key;
export function finalRecordingStatus(s){return valid(s)?session.status:'idle';}
function paint(){
 if(!globalThis.document)return;
 const active=session&&['loading','playing'].includes(session.status);
 for(const button of document.querySelectorAll('[data-action="s55-final-audio"]')){
  button.textContent=active?'❚❚':'▶';
  button.setAttribute('aria-label',active?'暂停语音':'播放语音');
  button.setAttribute('aria-pressed',String(!!active));
  button.disabled=session?.status==='loading';
  button.closest('.noapp-final-voice')?.classList.toggle('is-playing',session?.status==='playing');
 }
}
export function stopFinalRecording(){
 const old=session;session=null;
 if(old){clearTimeout(old.timer);old.unsubscribe?.();old.audio.onended=null;old.audio.onerror=null;old.audio.onpause=null;old.audio.pause?.();}
 paint();
}
export async function toggleFinalRecording(ctx,onComplete){
 const state=ctx.store.get(),source=state.story55.config.finalAudio,key=canonicalPhoneAudioPath(source);
 if(session&&(session.store!==ctx.store||!valid(state)))stopFinalRecording();
 if(!session){
  // The actual bundled MP3 can play synchronously in this tap. Priming with
  // a different WAV here races Safari's source switch and can abort play().
  const audio=createGestureAudio({prime:false});if(!audio)throw Error('无法创建播放器');
  const current={audio,key,day:state.day,store:ctx.store,status:'idle',completed:false,onComplete};session=current;
  audio.src=resolveStablePhoneAudioPath(source);
  audio.onended=()=>{
   if(session!==current)return;
   if(current.status!=='playing')return;
   clearTimeout(current.timer);current.status='ended';paint();
   if(!current.completed){current.completed=true;current.onComplete();}
  };
  audio.onerror=()=>{if(session!==current)return;clearTimeout(current.timer);current.status='error';paint();ctx.toast?.('D55 录音加载失败（媒体错误 '+(audio.error?.code||'未知')+'），可再次点击重试');};
  current.unsubscribe=ctx.store.subscribe?.(next=>{
   if(session===current&&(!valid(next)||['off','passcode'].includes(next.deathPhase)||next.nav.current.appId!=='noapp'))stopFinalRecording();
  });
 }
 const current=session;
 // Rapid taps during the same pending play() never create or restart a player.
 if(current.status==='loading')return;
 if(current.status==='playing'){current.audio.pause();current.status='paused';paint();return;}
 if(current.status==='error'){
  current.audio.src=resolveStablePhoneAudioPath(source);current.audio.load?.();
 }
 if(current.status==='ended')current.audio.currentTime=0;
 const attempt=(current.attempt||0)+1;current.attempt=attempt;
 current.status='loading';paint();
 current.timer=setTimeout(()=>{
  if(session!==current||current.attempt!==attempt||current.status!=='loading')return;
  current.status='error';current.audio.pause?.();paint();ctx.toast?.('D55 录音加载超时，可再次点击重试');
 },20000);
 current.timer.unref?.();
 try{
  await current.audio.play();
  if(session!==current||current.attempt!==attempt)return;
  clearTimeout(current.timer);
  if(session===current&&current.status==='loading'){current.status='playing';paint();}
 }catch(error){
  if(session!==current||current.attempt!==attempt)return;
  clearTimeout(current.timer);
  if(session===current){current.status='error';paint();ctx.toast?.('D55 录音播放失败：'+(error?.name||'播放器错误')+'，可再次点击重试');}
 }
}
