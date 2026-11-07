import {receiveCall,answerCall,endCall,declineCall,outgoingCall,activePhoneCall,canPresentPhoneCall} from './store.js';
import {createGestureAudio} from '../voice/playback.js';
import {canonicalPhoneAudioPath,resolvePhoneAudioPath} from '../voice/asset-url.js';
import {scene55,sceneLines,advanceScene55,appendSceneMessage55} from '../story55/runtime.js';
import {nodeStatus,nodeById,completed,story55Config} from '../story55/state.js';
import {enterD13Chat} from '../../story/d13/runtime.js';
import {prepareStory55NodeAtDay} from '../story55/rebuild.js';
import {D13_PREVIEW} from '../storage.js';
import {errorHaptic} from '../../system/haptics.js';
export {receiveCall,answerCall,endCall,declineCall,outgoingCall};
const sessions=new WeakMap();
function session(store){let a=sessions.get(store);if(!a){a={audio:null,running:false,playing:null,greenSeen:false};sessions.set(store,a);}return a;}
export function primeTelephony(ctx){
 const a=session(ctx.store);if(!a.audio)a.audio=createGestureAudio();
 return a.audio;
}
function sceneCall(s){
 if(s.story55?.activeScene){
  const id=s.story55.activeScene,n=nodeById(s,id);
  if(n?.call&&nodeStatus(s,id).state==='ready'&&sceneLines(s,id)[scene55(s,id).index]?.[0]==='call')return n;
 }
 return null;
}
export function tickTelephony(ctx,now=Date.now()){
 const s=ctx.store.get(),a=session(ctx.store),d=s.story55?.d13;
 if(d?.phase==='green'){
  if(!a.greenSeen){a.greenSeen=true;try{errorHaptic();}catch{}}
  if(now>=d.greenStartedAt+3000){ctx.store.update(enterD13Chat);ctx.router.open({appId:'mirage',route:'/chat/s55-ouroboros',params:{}});}
  return;
 }
 const n=sceneCall(s);
 if(n&&!activePhoneCall(s)){
  receiveCall(ctx.store,{id:'story-call-'+n.id,source:'story55',node:n.id,...n.call},now);return;
 }
 const call=activePhoneCall(s);if(!call)return;
 if(!canPresentPhoneCall(s)){
  // Do not count a lock screen, alarm or depleted battery toward auto-answer.
  if(call.presentedAt!==null)ctx.store.update(s=>s.phoneCall.presentedAt=null);
  if(a.playing){a.audio?.pause();a.playing.cancel();ctx.store.update(s=>{s.phoneCall.resumeRequired=true;s.phoneCall.speaking=false;});}
  return;
 }
 if(call.state==='ringing'){
  if(call.presentedAt===null){ctx.store.update(s=>s.phoneCall.presentedAt=now);return;}
  if(call.direction==='outgoing'&&now>=call.presentedAt+2500){
   endCall(ctx.store,call.id,now,{reason:'unavailable'});ctx.toast?.('對方暫時無法接聽');return;
  }
  if(call.forced&&now>=call.presentedAt+call.autoAnswerMs)answerCall(ctx.store,call.id,now,{remote:true});
  return;
 }
 if(call.source!=='story55'||call.resumeRequired||a.running)return;
 if(completed(s,call.node)){endCall(ctx.store,call.id,now,{remote:true});return;}
 const index=scene55(s,call.node).index,line=sceneLines(s,call.node)[index];
 if(!line)return;
 if(line[0]==='call'){ctx.store.update(s=>advanceScene55(s,call.node));return;}
 if(line[0]==='me')return; // Only the native Send button advances player speech.
 if(scene55(s,call.node).nextAt>now)return;
 if(line[0]==='system'){ctx.store.update(s=>advanceScene55(s,call.node));return;}
 void playStoryLine(ctx,call,index,line,a);
}
async function playStoryLine(ctx,call,index,line,a){
 a.running=true;
 const current=()=>{
  const s=ctx.store.get();return s.phoneCall?.id===call.id&&s.phoneCall.state==='connected'&&scene55(s,call.node).index===index&&!completed(s,call.node);
 };
 const append=()=>{if(current())ctx.store.update(s=>appendSceneMessage55(s,call.node,index));};
 let cancelled=false;
 try{
  const source=story55Config(ctx.store.get()).voiceAssets?.[call.node]?.[index];
  ctx.store.update(s=>s.phoneCall.speaking=true);
  if(!source||!a.audio)throw Error('VOICE_UNAVAILABLE');
  const audio=a.audio;
  audio.src=resolvePhoneAudioPath(canonicalPhoneAudioPath(source));
  await new Promise((resolve,reject)=>{
   let timer;
   const cleanup=()=>{clearTimeout(timer);audio.onplaying=null;audio.onended=null;audio.onerror=null;a.playing=null;};
   const fail=e=>{cleanup();reject(e);};
   a.playing={id:call.id,cancel(){cancelled=true;cleanup();resolve();}};
   // Message becomes visible when sound actually begins, never on fetch start.
   audio.onplaying=()=>{clearTimeout(timer);append();timer=setTimeout(()=>fail(Error('VOICE_TIMEOUT')),180000);};
   audio.onended=()=>{cleanup();resolve();};
   audio.onerror=()=>fail(Error('VOICE_UNAVAILABLE'));
   timer=setTimeout(()=>fail(Error('VOICE_TIMEOUT')),15000);
   try{Promise.resolve(audio.play()).catch(fail);}catch(error){fail(error);}
  });
 }catch(error){
  if(current()){
   if(error?.name==='NotAllowedError'){
    ctx.store.update(s=>s.phoneCall.resumeRequired=true);return;
   }
   a.audio?.pause();append();ctx.toast?.('配音暫不可用，已切換文字');
  }
 }finally{
  if(current())ctx.store.update(s=>s.phoneCall.speaking=false);
  a.running=false;
 }
 if(!cancelled&&current())ctx.store.update(s=>advanceScene55(s,call.node));
}
export function mountTelephony(getContext){
 const ctx=getContext(),a=session(ctx.store);
 if(D13_PREVIEW){ctx.store.update(s=>prepareStory55NodeAtDay(s,'d13-wallet-mail'));ctx.router.open({appId:'kira',route:'/mail/s55-d13-wallet-mail',params:{}});}
 // A refresh never repeats the green animation. Connected audio needs a tap.
 if(ctx.store.get().story55?.d13?.phase==='green'){
  ctx.store.update(enterD13Chat);ctx.router.open({appId:'mirage',route:'/chat/s55-ouroboros',params:{}});
 }
 if(activePhoneCall(ctx.store.get())?.state==='connected')ctx.store.update(s=>{s.phoneCall.resumeRequired=true;s.phoneCall.speaking=false;});
 const click=e=>{
  const button=e.target.closest?.('[data-action^="tel-"]');if(!button)return;
  e.preventDefault();e.stopImmediatePropagation();
  const ctx=getContext(),call=activePhoneCall(ctx.store.get());if(!call)return;
  const action=button.dataset.action;
  if(action==='tel-answer'){primeTelephony(ctx);answerCall(ctx.store,call.id);}
  if(action==='tel-resume'){primeTelephony(ctx);ctx.store.update(s=>s.phoneCall.resumeRequired=false);}
  if(action==='tel-decline')declineCall(ctx.store,call.id);
  if(action==='tel-end')endCall(ctx.store,call.id);
  if(action==='tel-return'&&call.node)ctx.router.open({appId:'mirage',route:'/chat/s55-ouroboros',params:{}});
 };
 document.addEventListener('click',click,true);
 const timer=setInterval(()=>{
  try{
   if(document.hidden)return;
   tickTelephony(getContext());
   const call=activePhoneCall(ctx.store.get());
   if(!call&&a.playing){a.audio?.pause();a.playing.cancel();}
   if(call?.state==='connected'){
    const n=document.querySelector('.tel-call-island span');
    if(n){const sec=Math.max(0,Math.floor((Date.now()-call.answeredAt)/1000));n.textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
   }
  }catch(error){ctx.toast?.(error.message);}
 },250);
 return ()=>{clearInterval(timer);document.removeEventListener('click',click,true);a.audio?.pause();a.playing?.cancel();};
}
