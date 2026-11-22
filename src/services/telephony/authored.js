import {NATIVE_PHONE_CALLS} from '../../story/phone-calls.js';
import {isStory55,scriptedCallPlayed} from '../story55/state.js';
import {activePhoneCall,canPresentPhoneCall,receiveCall,endCall} from './store.js';
import {resolveStablePhoneAudioPath} from '../voice/asset-url.js';
import {stampFixedLine} from '../story55/fixed-timeline.js';

const progress=(s,id)=>s.story55.nativePhoneCalls?.[id];
const ensureProgress=(s,id)=>{
 s.story55.nativePhoneCalls??={};
 return s.story55.nativePhoneCalls[id]??={index:0,nextAt:0,transcript:[],attempt:0};
};
export const nativePhoneScript=call=>call?.source==='authored-phone'?NATIVE_PHONE_CALLS.find(n=>n.id===call.scriptId):null;
export const nativePhoneCallDue=(s,script)=>isStory55(s)&&!s.story55.ended&&s.day===script.day&&s.clock>=script.at&&!scriptedCallPlayed(s,script);
export function pauseAuthoredPhoneCall(ctx,a,now=Date.now()){
 const c=activePhoneCall(ctx.store.get());if(!nativePhoneScript(c)||c.state!=='connected')return;
 a.audio?.pause();a.playing?.cancel();
 ctx.store.update(s=>{
  const p=ensureProgress(s,c.scriptId);p.pausedAt??=now;
  s.phoneCall.resumeRequired=true;s.phoneCall.speaking=false;
 });
}
function appendCaption(s,call,step,index,now){
 const p=ensureProgress(s,call.scriptId);
 const script=nativePhoneScript(call);
 let line=p.transcript.find(t=>t.index===index);
 if(!line){
  const clock=stampFixedLine(s,p,script.steps,index,{at:script.at,day:script.day,precision:'second'});
  line={index,speaker:step.speaker,text:step.text,clock,playedAt:now};p.transcript.push(line);
 }
 s.phoneCall.caption={speaker:step.speaker,text:step.text,clock:line.clock};
 s.phoneCall.transcript=structuredClone(p.transcript);
}
function advance(ctx,call,index,script,now){
 ctx.store.update(s=>{
  const p=ensureProgress(s,script.id);if(p.index!==index)return;
  p.index++;delete p.captionUntil;
  p.nextAt=now+(script.steps[p.index]?.delayMs||0);
  s.phoneCall.speaking=false;
 });
}
// Runs from the existing telephony tick and uses its gesture-unlocked Audio.
export function tickAuthoredPhoneCalls(ctx,a,now=Date.now()){
 const s=ctx.store.get(),call=activePhoneCall(s);
 if(!call){
  const script=NATIVE_PHONE_CALLS.find(n=>nativePhoneCallDue(s,n));
  if(!script||!canPresentPhoneCall(s))return false;
  const previous=s.phoneCall;
  if(previous?.scriptId===script.id&&now<previous.endedAt+5000)return true;
  const attempt=(progress(s,script.id)?.attempt||0)+1;
  if(receiveCall(ctx.store,{id:`${script.id}-${attempt}`,scriptId:script.id,source:'authored-phone',displayName:script.displayName,number:script.number},now)){
   ctx.store.update(s=>{ensureProgress(s,script.id).attempt=attempt;s.story55[script.triggerKey]=true;});
  }
  return true;
 }
 const script=nativePhoneScript(call);if(!script)return false;
 if(call.state!=='connected')return true;
 if(!canPresentPhoneCall(s)||globalThis.document?.hidden){pauseAuthoredPhoneCall(ctx,a,now);return true;}
 if(call.resumeRequired||a.running)return true;
 let p=progress(s,script.id);
 if(p?.pausedAt!==undefined){
  ctx.store.update(s=>{
   const p=ensureProgress(s,script.id),elapsed=Math.max(0,now-p.pausedAt);
   p.nextAt+=elapsed;if(p.captionUntil)p.captionUntil+=elapsed;delete p.pausedAt;
  });p=progress(ctx.store.get(),script.id);
 }
 const index=p?.index||0,step=script.steps[index];
 if(!step){
  ctx.store.update(s=>{s.story55.scriptedCallCompleted??={};s.story55.scriptedCallCompleted[script.id]=true;});
  endCall(ctx.store,call.id,now,{reason:'scripted_end'});return true;
 }
 if(now<(p?.nextAt||0))return true;
 if(!step.audio){
  if(!p?.captionUntil){
   ctx.store.update(s=>{
    appendCaption(s,call,step,index,now);
    // Give the written reply its natural reading time before the next pause.
    ensureProgress(s,script.id).captionUntil=now+Math.max(900,Array.from(step.text).length*150);
   });
  }else if(now>=p.captionUntil)advance(ctx,call,index,script,now);
  return true;
 }
 void playAuthoredPhoneLine(ctx,a,call,script,index,step);return true;
}
async function playAuthoredPhoneLine(ctx,a,call,script,index,step){
 a.running=true;let cancelled=false;
 const current=()=>{
  const s=ctx.store.get();return s.phoneCall?.id===call.id&&s.phoneCall.state==='connected'&&progress(s,script.id)?.index===index;
 };
 try{
  if(!a.audio)throw Error('VOICE_UNAVAILABLE');
  const audio=a.audio;audio.src=resolveStablePhoneAudioPath(step.audio);
  await new Promise((resolve,reject)=>{
   let timer;
   const cleanup=()=>{clearTimeout(timer);audio.onplaying=null;audio.onended=null;audio.onerror=null;a.playing=null;};
   const fail=error=>{cleanup();reject(error);};
   a.playing={id:call.id,cancel(){cancelled=true;cleanup();resolve();}};
   audio.onplaying=()=>{
    if(!current())return;
    clearTimeout(timer);timer=setTimeout(()=>fail(Error('VOICE_TIMEOUT')),180000);
    ctx.store.update(s=>{appendCaption(s,call,step,index,Date.now());s.phoneCall.speaking=true;});
   };
   audio.onended=()=>{cleanup();resolve();};
   audio.onerror=()=>fail(Error('VOICE_UNAVAILABLE'));
   timer=setTimeout(()=>fail(Error('VOICE_TIMEOUT')),15000);
   try{Promise.resolve(audio.play()).catch(fail);}catch(error){fail(error);}
  });
  if(!cancelled&&current())advance(ctx,call,index,script,Date.now());
 }catch{
  // A missing/rejected recording must be retried by a gesture, never skipped.
  if(current())pauseAuthoredPhoneCall(ctx,a);
 }finally{
  a.running=false;
  if(current())ctx.store.update(s=>s.phoneCall.speaking=false);
 }
}
