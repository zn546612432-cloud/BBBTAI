import {receiveCall,answerCall,endCall,declineCall,outgoingCall,activePhoneCall,canPresentPhoneCall} from './store.js';
import {createGestureAudio,primeAudio} from '../voice/playback.js';
import {apiConfig,voicePreview} from '../ai/gateway.js';
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
 const a=session(ctx.store);if(!a.audio)a.audio=createGestureAudio();else primeAudio(a.audio);
 return a.audio;
}
// The shell handles authored Send before the App's submit handler. Capture the
// real submit gesture synchronously, before the shell's first await, so iOS and
// an eight-second remote answer can reuse this unlocked Audio element.
export function primeAuthoredPhoneSend(ctx,form){
 const s=ctx.store.get(),id=form?.dataset?.storyScene;
 if(!s.unlocked||!id||nodeStatus(s,id).state!=='ready')return false;
 const node=nodeById(s,id),lines=sceneLines(s,id),index=scene55(s,id).index;
 if(!node?.call||form.dataset.id!==node.conversationId||
    (form.dataset.channel||s.nav.current.appId)!==node.channel||lines[index]?.[0]!=='me')return false;
 const value=String(form.elements?.text?.value||'').trim();
 if(value!==lines[index][1].trim())return false;
 const call=lines.findIndex((line,i)=>i>index&&line[0]==='call');
 if(call<0||lines.slice(index+1,call).some(line=>line[0]==='me'))return false;
 return !!primeTelephony(ctx);
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
 // Hanging up really ends the call. D13 redials using a new call ID
 // without resetting the dialogue index or duplicating delivered text.
 const previous=s.phoneCall;
 if(previous?.source==='story55'&&previous.node==='intrusion'&&previous.state==='ended'&&
    ['user-hangup','user-declined'].includes(previous.reason)&&
    s.story55?.activeScene==='intrusion'&&!completed(s,'intrusion')){
  if(now>=previous.endedAt+1500){
   const node=nodeById(s,'intrusion'),retry=(Number(s.story55?.d13?.callRetries)||0)+1;
   if(node?.call&&receiveCall(ctx.store,{...node.call,id:(node.call.id||'s55-d13-call-v2')+'-retry-'+retry,source:'story55',node:'intrusion'},now))
    ctx.store.update(state=>{state.story55.d13.callRetries=retry;});
  }
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
 let cancelled=false,liveAudioUrl=null;
 try{
  const source=story55Config(ctx.store.get()).voiceAssets?.[call.node]?.[index];
  ctx.store.update(s=>s.phoneCall.speaking=true);
  if(!a.audio)throw Error('VOICE_UNAVAILABLE');
  const audio=a.audio;
  // D13's approved speech is voice-only in MIRAGE. Re-synthesize after
  // script revisions instead of playing a previously bundled wrong ending.
  // The personal MiniMax token stays in the existing per-tab AI settings.
  const liveD13=call.node==='intrusion'&&(!!apiConfig().minimax||index===20);
  if(liveD13){
   const spoken=line[1].replace(/\bnya\b/gi,'奈亞');
   const blob=await voicePreview({text:spoken});
   liveAudioUrl=URL.createObjectURL(blob);
   audio.src=liveAudioUrl;
  }else{
   if(!source)throw Error('VOICE_UNAVAILABLE');
   audio.src=resolvePhoneAudioPath(canonicalPhoneAudioPath(source));
  }
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
    if(a.audio)a.audio._primed=false;ctx.store.update(s=>s.phoneCall.resumeRequired=true);return;
   }
   a.audio?.pause();
   if(call.node==='intrusion'){
    // Never replace a missing phone voice with an unwanted text bubble.
    ctx.store.update(s=>{s.phoneCall.resumeRequired=true;});
    return;
   }
   append();ctx.toast?.('配音暫不可用，已切換文字');
  }
 }finally{
  if(current())ctx.store.update(s=>s.phoneCall.speaking=false);
  a.running=false;
  if(liveAudioUrl)URL.revokeObjectURL(liveAudioUrl);
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
  if(action==='tel-resume'){primeTelephony(ctx);ctx.store.update(s=>{s.phoneCall.resumeRequired=false;s.phoneCall.showControls=false;});}
  if(action==='tel-decline'){
   if(call.forced)endCall(ctx.store,call.id,Date.now(),{remote:true,reason:'user-declined'});
   else declineCall(ctx.store,call.id);
  }
  if(action==='tel-end'){
   if(call.forced)endCall(ctx.store,call.id,Date.now(),{remote:true,reason:'user-hangup'});
   else endCall(ctx.store,call.id);
  }
  if(action==='tel-return')ctx.store.update(s=>{s.phoneCall.showControls=true;});
  if(action==='tel-chat'){
   if(call.resumeRequired)primeTelephony(ctx);
   ctx.store.update(s=>{s.phoneCall.showControls=false;s.phoneCall.resumeRequired=false;});
   const nav=ctx.store.get().nav.current,node=call.node&&nodeById(ctx.store.get(),call.node);
   if(node){
    const target={appId:node.channel||'mirage',route:'/chat/'+(node.conversationId||'s55-ouroboros'),params:{}};
    if(nav.appId!==target.appId||nav.route!==target.route)ctx.router.open(target);
   }
  }
 };
 document.addEventListener('click',click,true);
 const submit=e=>primeAuthoredPhoneSend(getContext(),e.target);
 document.addEventListener('submit',submit,true);
 const timer=setInterval(()=>{
  try{
   if(document.hidden)return;
   tickTelephony(getContext());
   const call=activePhoneCall(ctx.store.get());
   if(!call&&a.playing){a.audio?.pause();a.playing.cancel();}
   if(call?.state==='connected'){
    const n=document.querySelector('.tel-call-island .tel-call-time');
    const duration=Math.max(0,Math.floor((Date.now()-call.answeredAt)/1000));
    const label=`${String(Math.floor(duration/60)).padStart(2,'0')}:${String(duration%60).padStart(2,'0')}`;
    if(n)n.textContent=label;
    const fullscreenTimer=document.querySelector('.tel-call-identity p');
    if(fullscreenTimer)fullscreenTimer.textContent=label;
   }
   if(call?.state==='ringing'&&call.forced){
    const countdown=document.querySelector('.tel-call-auto');
    if(countdown)countdown.textContent=Math.max(0,Math.ceil((Number(call.presentedAt||Date.now())+call.autoAnswerMs-Date.now())/1000))+' 秒後自動接通';
   }
  }catch(error){ctx.toast?.(error.message);}
 },250);
 return ()=>{clearInterval(timer);document.removeEventListener('click',click,true);document.removeEventListener('submit',submit,true);a.audio?.pause();a.playing?.cancel();};
}
