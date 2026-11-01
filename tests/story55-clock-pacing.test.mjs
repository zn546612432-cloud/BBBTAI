import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {tickWorld} from '../src/system/time/clock.js';

test('55-day browsing and GHOST advance one game minute per three real seconds',()=>{
 for(const appId of ['home','wechat','ghost']){
  const s=activateStory55(initialState());s.nav.current={appId,route:'/',params:{}};
  tickWorld(s,1500);assert.equal(s.clock,'08:00');
  tickWorld(s,1500);assert.equal(s.clock,'08:01');
  tickWorld(s,6000);assert.equal(s.clock,'08:03');
 }
});
test('55-day private chat and typing advance two game minutes per real minute',()=>{
 for(const context of [{taiChat:true},{focused:true}]){
  const s=activateStory55(initialState());
  tickWorld(s,30000,context);assert.equal(s.clock,'08:01');
  tickWorld(s,30000,context);assert.equal(s.clock,'08:02');
 }
});
