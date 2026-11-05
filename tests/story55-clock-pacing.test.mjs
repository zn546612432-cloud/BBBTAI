import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {tickWorld,worldMinuteRate,STORY55_FINALE_REPLY_MINUTES_PER_MS} from '../src/system/time/clock.js';

test('only the unlocked idle home advances five game minutes per real second',()=>{
 for(const appId of ['home']){
  const s=activateStory55(initialState());s.unlocked=true;s.nav.current={appId,route:'/',params:{}};
  tickWorld(s,200);assert.equal(s.clock,'08:01');
  tickWorld(s,800);assert.equal(s.clock,'08:05');
  tickWorld(s,5000);assert.equal(s.clock,'08:30');
 }
});
test('short partial ticks retain fractional time, without dropping minutes',()=>{
 const s=activateStory55(initialState());s.unlocked=true;
 tickWorld(s,100);assert.equal(s.clock,'08:00');
 tickWorld(s,100);assert.equal(s.clock,'08:01');
 tickWorld(s,800);assert.equal(s.clock,'08:05');
});
test('finale three-minute reply keeps its slower nine-second pace',()=>{
 assert.equal(STORY55_FINALE_REPLY_MINUTES_PER_MS,1/3000);
});
test('all App chat and typing advance five game minutes per real minute',()=>{
 for(const context of [{taiChat:true},{focused:true}]){
  const s=activateStory55(initialState());s.unlocked=true;s.nav.current={appId:'wechat',route:'/chat/group'};
  tickWorld(s,30000,context);assert.equal(s.clock,'08:02');
  tickWorld(s,30000,context);assert.equal(s.clock,'08:05');
 }
});
