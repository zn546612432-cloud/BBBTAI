import {createGestureAudio} from '../voice/playback.js';
import {resolvePhoneAudioPath,canonicalPhoneAudioPath} from '../voice/asset-url.js';

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
 if(old){old.unsubscribe?.();old.audio.onended=null;old.audio.onerror=null;old.audio.onpause=null;old.audio.pause?.();}
 paint();
}
export async function toggleFinalRecording(ctx,onComplete){
 const state=ctx.store.get(),source=state.story55.config.finalAudio,key=canonicalPhoneAudioPath(source);
 if(session&&(session.store!==ctx.store||!valid(state)))stopFinalRecording();
 if(!session){
  const audio=createGestureAudio();if(!audio)throw Error('无法创建播放器');
  const current={audio,key,day:state.day,store:ctx.store,status:'idle',completed:false,onComplete};session=current;
  audio.src=resolvePhoneAudioPath(source);
  audio.onended=()=>{
   if(session!==current)return;
   current.status='ended';paint();
   if(!current.completed){current.completed=true;current.onComplete();}
  };
  audio.onerror=()=>{if(session!==current)return;current.status='error';paint();ctx.toast?.('语音加载失败，请重新点击播放');};
  current.unsubscribe=ctx.store.subscribe?.(next=>{
   if(session===current&&(!valid(next)||['off','passcode'].includes(next.deathPhase)||next.nav.current.appId!=='noapp'))stopFinalRecording();
  });
 }
 const current=session;
 // Rapid taps during the same pending play() never create or restart a player.
 if(current.status==='loading')return;
 if(current.status==='playing'){current.audio.pause();current.status='paused';paint();return;}
 if(current.status==='ended')current.audio.currentTime=0;
 current.status='loading';paint();
 try{
  await current.audio.play();
  if(session===current&&current.status==='loading'){current.status='playing';paint();}
 }catch(error){
  if(session===current){current.status='paused';paint();ctx.toast?.('播放失败，请重新点击播放');}
 }
}
