import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {WorldTickBatch} from '../src/system/time/tick-batch.js';
import {tickWorld} from '../src/system/time/clock.js';
import {drainBattery} from '../src/system/power/battery.js';
test('private chat commits visible time/battery changes rather than rewriting all history every 800ms',()=>{
 const s=activateStory55(initialState()),batch=new WorldTickBatch(),options={focused:false,taiChat:true};let writes=0;
 for(let n=0;n<75;n++){
  const elapsed=batch.take(s,800,options);
  if(elapsed){tickWorld(s,elapsed,options);drainBattery(s,elapsed);writes++;}
 }
 assert.equal(s.clock,'08:02');assert.equal(s.batteryPercent,96);assert.ok(writes<=6,'writes='+writes);
});
test('date jumps discard pending elapsed time; charging still completes its short transition',()=>{
 const s=activateStory55(initialState()),batch=new WorldTickBatch(),options={};
 assert.equal(batch.take(s,2000,options),0);
 s.clock='10:00';assert.equal(batch.take(s,1000,options),0);
 assert.equal(batch.take(s,2000,options),3000);
 s.dayChargeRemainingMs=1200;assert.equal(batch.take(s,800,options),800);
 batch.reset();assert.equal(batch.take(s,800,options),800);
});
