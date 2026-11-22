import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {prepareRecognitionPreview} from '../src/apps/noapp/recognition-preview.js';
import {completed,recognitionCallDue,timedStoryPaused} from '../src/services/story55/state.js';
import {maybeStartRecognitionCall,callState,callAction,incomingCallBanner} from '../src/apps/noapp/voice-call.js';

test('direct review rebuilds the real D33 scene and immediately rings with the fixed call',()=>{
 const s=initialState();activateStory55(s);prepareRecognitionPreview(s);
 assert.equal(s.day,33);assert.equal(s.unlocked,true);
 assert.equal(completed(s,'invite'),true);assert.equal(completed(s,'recognition'),false);
 assert.equal(recognitionCallDue(s),true);assert.equal(timedStoryPaused(s),true);
 assert.equal(s.nav.current.route,'/chat/tai');
 const ctx={store:{get:()=>s,update:fn=>fn(s)},refresh(){},router:{open:link=>{s.nav.current=link;}}};
 try{
  assert.equal(maybeStartRecognitionCall(ctx),true);assert.equal(callState().state,'ringing');
  assert.match(incomingCallBanner(s),/接听来电/);
  assert.equal(maybeStartRecognitionCall(ctx),false);
 }finally{callAction('tai-hangup',ctx);}
});

test('recognition link uses fresh memory without opening or overwriting either browser save',async()=>{
 const original={document:globalThis.document,location:globalThis.location};
 try{
  globalThis.document={querySelector:q=>q==='meta[name=phone-preview]'?{content:'true'}:null};
  globalThis.location={pathname:'/BBBTAI/preview/',search:'?story=55&recognitionPreview=1'};
  const {openPhoneStore,RECOGNITION_PREVIEW,KEY}=await import('../src/services/storage.js?recognition-isolated');
  assert.equal(RECOGNITION_PREVIEW,true);assert.equal(KEY,'ximeng-phone-story55-recognition-test');
  const denied=()=>{throw Error('Real browser storage must not be touched');};
  const options={storage:{getItem:denied,setItem:denied,removeItem:denied},factory:{open:denied}};
  const first=await openPhoneStore(options);first.update(prepareRecognitionPreview);
  assert.equal(recognitionCallDue(first.get()),true);
  const second=await openPhoneStore(options);assert.equal(second.get().day,1);
  second.update(prepareRecognitionPreview);assert.equal(recognitionCallDue(second.get()),true);
  globalThis.document={querySelector:()=>null};globalThis.location.pathname='/BBBTAI/';
  assert.equal((await import('../src/services/storage.js?recognition-production')).RECOGNITION_PREVIEW,false);
 }finally{Object.assign(globalThis,original);}
});
