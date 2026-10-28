import test from 'node:test';
import assert from 'node:assert/strict';
import {batteryLevel,status,lock,notifications} from '../src/system/shell.js';
import {initialState} from '../src/services/storage.js';

test('status bar shows a numeric battery value and keeps it in range',()=>{
 const state=initialState();
 assert.equal(batteryLevel(state),82);
 assert.match(status(state),/aria-label="电量 82%，查看充电"/);
 assert.match(status(state),/<button class="status-battery"/);
 assert.match(status(state),/status-network">5G/);
 assert.equal(batteryLevel({...state,batteryPercent:139}),100);
 assert.equal(batteryLevel({...state,batteryPercent:-3}),0);
});

test('compact Dynamic Island is inert; the status-bar battery is the only battery entry point',()=>{
 const html=status(initialState());
 assert.equal((html.match(/data-action="power-open"/g)||[]).length,1);
 assert.match(html,/<span class="battery-island-compact" aria-hidden="true">/);
});

test('lock and notification shade use real originating-app icons and readable text',()=>{
 const state=initialState();
 state.notifications=[{id:'wx-1',title:'微信',body:'熙旺：你睡了吗？',link:{appId:'wechat'}}];
 for(const html of [lock(state),notifications(state)]){
  assert.match(html,/notification-app-icon/);
  assert.match(html,/notification-copy/);
  assert.match(html,/icon-rendered|icon-override|icon-designed/);
  assert.doesNotMatch(html,/notification-dot/);
 }
});
