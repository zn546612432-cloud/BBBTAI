import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {initialState,PhoneStore} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {D53_CALL} from '../src/story/d53/call.js';
import {answerCall,endCall,declineCall,receiveCall} from '../src/services/telephony/store.js';
import {tickAuthoredPhoneCalls,pauseAuthoredPhoneCall,nativePhoneCallDue} from '../src/services/telephony/authored.js';
import {telephonyFullscreen} from '../src/services/telephony/view.js';
import {pendingTimedStoryEvent,timedStoryPaused} from '../src/services/story55/state.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {tickTelephony,primeTelephony,mountTelephony} from '../src/services/telephony/index.js';
import {stampFixedLine} from '../src/services/story55/fixed-timeline.js';

function fixture(day=53,clock='21:30'){
 const s=initialState();activateStory55(s);s.day=day;s.clock=clock;s.unlocked=true;s.batteryPercent=80;
 s.story55.activeScene=null;s.powerMode='normal';s.deathPhase=null;
 if(day===53)s.story55.completed['d53-action-start']={day:53,clock:'20:00'};
 const entries=new Map(),store=new PhoneStore({getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v)});store.replace(s);
 const ctx={store,refresh(){},toast(){},router:{open(){}}};
 const audio={play(){return Promise.resolve();},pause(){this.paused=true;}};
 const a={audio,running:false,playing:null};return {store,ctx,a};
}
const progress=store=>store.get().story55.nativePhoneCalls[D53_CALL.id];
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('D53 native call clips the unified clock to 21:30 and defers while locked or another call is active',()=>{
 const {store,ctx,a}=fixture(53,'21:29');
 assert.equal(nativePhoneCallDue(store.get(),D53_CALL),false);tickAuthoredPhoneCalls(ctx,a,100);assert.equal(store.get().phoneCall,undefined);
 store.update(s=>advanceGameMinutes(s,5));assert.equal(store.get().clock,'21:30');assert.equal(pendingTimedStoryEvent(store.get()).id,D53_CALL.id);assert.equal(timedStoryPaused(store.get()),true);
 store.update(s=>s.unlocked=false);tickAuthoredPhoneCalls(ctx,a,100);assert.equal(store.get().phoneCall,undefined);
 store.update(s=>s.unlocked=true);receiveCall(store,{id:'other',displayName:'哥'},100);tickAuthoredPhoneCalls(ctx,a,100);assert.equal(store.get().phoneCall.id,'other');
 endCall(store,'other',200);tickAuthoredPhoneCalls(ctx,a,201);assert.equal(store.get().phoneCall.displayName,'傅隆生');assert.equal(store.get().phoneCall.source,'authored-phone');
 assert.match(telephonyFullscreen(store.get()),/傅隆生/);assert.doesNotMatch(telephonyFullscreen(store.get()),/熙泰|NoApp|自動接通/);
 for(const day of [52,54]){const other=fixture(day,'22:00');assert.equal(nativePhoneCallDue(other.store.get(),D53_CALL),false);}
});

test('complete cinematic call waits after recording ends, captions both sides with distinct timestamps, and logs once',async t=>{
 let now=1000;t.mock.method(Date,'now',()=>now);
 const {store,ctx,a}=fixture();
 const playerMessages=()=>Object.values(store.get().content.conversations).flatMap(chats=>chats.flatMap(chat=>chat.messages||[])).filter(m=>m.from==='me').map(m=>m.id);
 const originalPlayerMessages=playerMessages();
 tickAuthoredPhoneCalls(ctx,a,now);const id=store.get().phoneCall.id;answerCall(store,id,now);
 const stamps=[];
 for(let i=0;i<D53_CALL.steps.length;i++){
  const step=D53_CALL.steps[i],p=progress(store);assert.equal(p.index,i);
  now=Math.max(now,p.nextAt);
  if(step.delayMs){tickAuthoredPhoneCalls(ctx,a,p.nextAt-1);assert.equal(progress(store).index,i);assert.equal(a.running,false);}
  tickAuthoredPhoneCalls(ctx,a,now);
  if(step.audio){
   assert.equal(store.get().phoneCall.caption?.text,D53_CALL.steps[i-1]?.text);
   a.audio.onplaying();assert.equal(store.get().phoneCall.caption.text,step.text);
   assert.equal(progress(store).index,i,'loading/playing never completes a recording');
   now+=1234;a.audio.onended();await flush();
   assert.equal(progress(store).nextAt,now+(D53_CALL.steps[i+1]?.delayMs||0));
  }else{
   assert.equal(store.get().phoneCall.caption.text,step.text);
   now=progress(store).captionUntil;tickAuthoredPhoneCalls(ctx,a,now);
  }
  stamps.push(store.get().phoneCall.caption.clock);
 }
 tickAuthoredPhoneCalls(ctx,a,now);
 assert.equal(store.get().phoneCall.state,'ended');assert.equal(store.get().phoneCall.reason,'scripted_end');
 assert.equal(store.get().story55.scriptedCallCompleted[D53_CALL.id],true);assert.equal(pendingTimedStoryEvent(store.get()).id,'failure');
 assert.equal(store.get().clock,'21:33');assert.equal(new Set(stamps).size,10);assert.equal(stamps[0],'21:30:00');assert.equal(stamps.at(-1),'21:33:20');
 const logs=store.get().content.phone.calls.filter(c=>c.id===id);assert.equal(logs.length,1);assert.equal(logs[0].transcript.length,10);
 assert.deepEqual(playerMessages(),originalPlayerMessages,'cinematic captions must not send player chat messages');
 tickAuthoredPhoneCalls(ctx,a,now+10000);assert.equal(store.get().phoneCall.state,'ended');assert.equal(store.get().content.phone.calls.filter(c=>c.id===id).length,1);
});

test('missing audio holds the current line and time gate; retry resumes without duplicate captions',async t=>{
 let now=1000;t.mock.method(Date,'now',()=>now);const {store,ctx,a}=fixture();
 tickAuthoredPhoneCalls(ctx,a,now);answerCall(store,store.get().phoneCall.id,now);tickAuthoredPhoneCalls(ctx,a,now);
 a.audio.onerror();await flush();assert.equal(progress(store).index,0);assert.equal(store.get().phoneCall.resumeRequired,true);assert.ok(pendingTimedStoryEvent(store.get()));assert.equal(progress(store).transcript.length,0);
 store.update(s=>s.phoneCall.resumeRequired=false);now+=5000;tickAuthoredPhoneCalls(ctx,a,now);a.audio.onplaying();
 pauseAuthoredPhoneCall(ctx,a,now);await flush();assert.equal(progress(store).index,0);assert.equal(progress(store).transcript.length,1);
 store.update(s=>s.phoneCall.resumeRequired=false);now+=5000;tickAuthoredPhoneCalls(ctx,a,now);a.audio.onplaying();now+=1000;a.audio.onended();await flush();
 assert.equal(progress(store).index,1);assert.equal(progress(store).transcript.length,1);
});

test('decline retries, connected hangup is ignored, and reload/background preserve progress',async t=>{
 let now=1000;t.mock.method(Date,'now',()=>now);const {store,ctx,a}=fixture();
 tickAuthoredPhoneCalls(ctx,a,now);const first=store.get().phoneCall.id;declineCall(store,first,now);
 tickAuthoredPhoneCalls(ctx,a,5999);assert.equal(store.get().phoneCall.state,'ended');now=6000;tickAuthoredPhoneCalls(ctx,a,now);
 const second=store.get().phoneCall.id;assert.notEqual(second,first);answerCall(store,second,now);
 tickAuthoredPhoneCalls(ctx,a,now);a.audio.onplaying();now+=1200;a.audio.onended();await flush();
 const originalNext=progress(store).nextAt;now+=500;pauseAuthoredPhoneCall(ctx,a,now);await flush();
 now+=10000;store.update(s=>s.phoneCall.resumeRequired=false);tickAuthoredPhoneCalls(ctx,a,now);assert.equal(progress(store).nextAt,originalNext+10000);assert.equal(progress(store).transcript.length,1);
 assert.equal(endCall(store,second,now),false);
 assert.equal(endCall(store,second,now,{remote:true,reason:'user-hangup'}),false);
 assert.equal(endCall(store,second,now,{reason:'scripted_end'}),false);
 assert.equal(store.get().phoneCall.state,'connected');assert.equal(progress(store).index,1);
 const restored=fixture();restored.store.replace(structuredClone(store.get()));const prev=globalThis.document;
 globalThis.document={addEventListener(){},removeEventListener(){},querySelector(){return null;}};
 try{
  answerCall(restored.store,restored.store.get().phoneCall.id,now);const stop=mountTelephony(()=>restored.ctx);stop();
  assert.equal(restored.store.get().phoneCall.resumeRequired,true);assert.equal(progress(restored.store).index,1);assert.equal(progress(restored.store).transcript.length,1);
 }finally{globalThis.document=prev;}
 assert.equal(store.get().content.phone.calls.filter(c=>c.id===first).length,1);assert.equal(store.get().content.phone.calls.filter(c=>c.id===second).length,0);
});

test('existing telephony tick dispatches D53; shared timestamps leave other authored scenes unchanged',()=>{
 const {store,ctx}=fixture();tickTelephony(ctx,100);assert.equal(store.get().phoneCall.scriptId,D53_CALL.id);
 const s={day:45,clock:'11:23',story55:{}},p={};assert.equal(stampFixedLine(s,p,[['me','短句']],0,{at:'11:23'}),'11:23');
 for(const step of D53_CALL.steps.filter(s=>s.audio))assert.ok(existsSync(new URL('../public'+step.audio,import.meta.url)));
 assert.deepEqual(D53_CALL.steps.map(s=>s.delayMs),[0,2000,2000,2000,3000,0,2000,0,0,2000]);
});


test('native D53 view hides transcript timestamps while preserving captions and backend story time',()=>{
 const {store,ctx,a}=fixture();tickAuthoredPhoneCalls(ctx,a,100);answerCall(store,store.get().phoneCall.id,100);
 store.update(s=>s.phoneCall.caption={speaker:'熙蒙',text:'放心吧。',clock:'21:33:20'});
 const html=telephonyFullscreen(store.get());
 assert.match(html,/tel-native-tools/);assert.match(html,/放心吧。/);assert.match(html,/熙蒙/);
 assert.doesNotMatch(html,/<time|21:33:20|21:30:00|通話中<\/small>/);
 assert.match(html,/data-action="tel-end"/);assert.match(html,/data-action="tel-chat"/);
 assert.equal(store.get().phoneCall.caption.clock,'21:33:20');
});

test('native controls cannot end D53, mute updates only mic state, and resume keeps captions open',()=>{
 const {store,ctx,a}=fixture();tickAuthoredPhoneCalls(ctx,a,100);const id=store.get().phoneCall.id;answerCall(store,id,100);
 const old=globalThis.document,listeners=new Map();
 globalThis.document={addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(type){listeners.delete(type);},querySelector(){return null;}};
 let stop;
 try{
  stop=mountTelephony(()=>ctx);const click=listeners.get('click');
  const fire=action=>click({target:{closest(){return {dataset:{action}};}},preventDefault(){},stopImmediatePropagation(){}});
  fire('tel-end');assert.equal(store.get().phoneCall.state,'connected');assert.equal(store.get().content.phone.calls.some(c=>c.id===id),false);
  fire('tel-microphone');assert.equal(store.get().phoneCall.microphoneMuted,true);assert.equal(store.get().phoneCall.speaking,false);
  fire('tel-microphone');assert.equal(store.get().phoneCall.microphoneMuted,false);
  fire('tel-resume');assert.equal(store.get().phoneCall.showControls,true);assert.equal(store.get().phoneCall.resumeRequired,false);
 }finally{stop?.();globalThis.document=old;}
});
