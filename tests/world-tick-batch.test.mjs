import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {WorldTickBatch} from '../src/system/time/tick-batch.js';
import {tickPhoneRuntime} from '../src/system/runtime/controller.js';
const start=()=>{const s=activateStory55(initialState());s.unlocked=true;return s;};
test('chat commits visible minute changes instead of rewriting history every 800ms',()=>{
 const s=start(),batch=new WorldTickBatch();s.nav.current={appId:'wechat',route:'/chat/group'};let writes=0;
 for(let n=0;n<75;n++){
  const frame=batch.take(s,800);
  if(frame){tickPhoneRuntime(s,frame);writes++;}
 }
 assert.equal(s.clock,'08:05');assert.equal(s.batteryPercent,100);assert.equal(writes,5);
});
test('date jumps discard pending elapsed time; charging completes its short transition',()=>{
 const s=start(),batch=new WorldTickBatch();
 assert.equal(batch.take(s,100),null);
 s.clock='10:00';assert.equal(batch.take(s,100),null);
 assert.deepEqual(batch.take(s,100),{elapsedMs:200,gameMinutes:1});
 s.dayChargeRemainingMs=1200;assert.equal(batch.take(s,800).elapsedMs,800);
 batch.reset();assert.equal(batch.take(s,800).elapsedMs,800);
});
test('switching App -> home prices each elapsed segment at its original rate',()=>{
 const s=start(),batch=new WorldTickBatch();s.nav.current={appId:'ghost',route:'/'};
 assert.equal(batch.take(s,6000),null); // half a game minute of reading
 s.nav.current={appId:'home',route:'/'};
 const frame=batch.take(s,100); // half a game minute on home
 assert.deepEqual(frame,{elapsedMs:6100,gameMinutes:1});
 tickPhoneRuntime(s,frame);assert.equal(s.clock,'08:01');
 s.nav.current={appId:'wechat',route:'/chat/group'};
 tickPhoneRuntime(s,batch.take(s,6000));
 assert.equal(s.clock,'08:01');assert.equal(s.worldMinuteFraction,.5);
});
