import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,appendSceneMessage55,sceneLines} from '../src/services/story55/runtime.js';
import {beginShortCharge,plugIn,endShortCharge} from '../src/system/power/battery.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {chargingBlock} from '../src/system/power/story.js';
import {telephonyFullscreen,telephonyIsland} from '../src/services/telephony/view.js';

function day13(clock='21:00'){
 const s=activateStory55(initialState());
 s.day=13;s.clock=clock;s.unlocked=true;s.batteryPercent=75;s.powerMode='idle';
 for(const node of s.story55.config.nodes){
  if(Number.isInteger(node.gateDay)&&node.gateDay<=13&&
   !['d13-wallet-mail','d13-wallet-bind','d13-wallet-transfer','intrusion'].includes(node.id)){
   s.story55.completed[node.id]={day:node.day,clock:'12:00',test:true};
  }
 }
 return s;
}

test('D13 waiting for 22:10 KIRA mail permits short charge, not long charge or premature delivery',()=>{
 const s=day13();
 tickStory55(s);
 assert.equal(s.content.mail.some(m=>m.id==='s55-d13-wallet-mail'),false);
 assert.equal(chargingBlock(s),'plot','mandatory D13 progression remains a long-charge gate');
 assert.equal(plugIn(s),false);
 assert.equal(beginShortCharge(s),true);
 assert.equal(advanceGameMinutes(s,69).minutes,69);
 tickStory55(s);
 assert.equal(s.clock,'22:09');
 assert.equal(s.content.mail.some(m=>m.id==='s55-d13-wallet-mail'),false);
 assert.equal(advanceGameMinutes(s,1).minutes,1);
 tickStory55(s);
 assert.equal(s.clock,'22:10');
 assert.equal(s.content.mail.filter(m=>m.id==='s55-d13-wallet-mail').length,1);
 assert.equal(s.notifications.filter(n=>n.id==='s55-mail-s55-d13-wallet-mail').length,1);
 tickStory55(s);
 assert.equal(s.content.mail.filter(m=>m.id==='s55-d13-wallet-mail').length,1);
 assert.equal(s.powerMode,'short-charging');
 assert.equal(endShortCharge(s),true);
});

test('03:00 emergency battery follows completion of the D13 evening call',()=>{
 const s=day13('23:59');
 for(const id of ['d13-wallet-mail','d13-wallet-bind','d13-wallet-transfer','intrusion'])s.story55.completed[id]={day:13,clock:'22:26',test:true};
 assert.equal(chargingBlock(s),null);
 assert.equal(advanceGameMinutes(s,181).event,'emergency');
 assert.equal(s.day,14);assert.equal(s.clock,'03:00');
 assert.equal(s.batteryPercent,1);assert.equal(s.emergencyCharge,true);
});

test('D13 pure-green overlay has no narration, call icons are SVG, island blinks red',()=>{
 const s=day13('22:26');s.story55.d13={phase:'green'};
 const green=telephonyFullscreen(s);
 assert.match(green,/tel-green-screen/);
 assert.doesNotMatch(green,/屏幕失去|SESSION|RESTART|<p>|<div/);
 s.story55.d13.phase='chat';
 s.phoneCall={id:'d13-test',source:'story55',node:'intrusion',direction:'incoming',
  displayName:'未知號碼',forced:true,state:'ringing',answeredAt:null,
  autoAnswerMs:8000,presentedAt:1000};
 const incoming=telephonyFullscreen(s);
 assert.match(incoming,/data-action="tel-answer"/);
 assert.match(incoming,/data-action="tel-decline"/);
 assert.match(incoming,/<svg /);
 assert.doesNotMatch(incoming,/☎|📞|📱|REMOTE OVERRIDE/);
 s.phoneCall.state='connected';s.phoneCall.answeredAt=1000;
 const island=telephonyIsland(s);
 assert.match(island,/tel-call-record-dot/);
 assert.match(island,/tel-call-time/);
 assert.doesNotMatch(island,/☎/);
});

test('D13 spoken Tai turns are avatar-only and IP trace is a terminal state, not a narrator',()=>{
 const s=day13('22:26');
 assert.equal(sceneLines(s,'intrusion')[20][1].endsWith('晚安，nya，或者我該叫你，熙蒙……'),true);
 appendSceneMessage55(s,'intrusion',8);
 appendSceneMessage55(s,'intrusion',15);
 appendSceneMessage55(s,'intrusion',19);
 appendSceneMessage55(s,'intrusion',20);
 const chat=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
 for(const i of [8,20]){
  const m=chat.messages.find(x=>x.id==='s55-intrusion-v2-'+i);
  assert.equal(m.kind,'call-avatar');assert.equal(m.text,'');
 }
 assert.equal(chat.messages.find(m=>m.id==='s55-intrusion-v2-15').text,'（正在定位 IP………）');
 assert.equal(chat.messages.find(m=>m.id==='s55-intrusion-v2-19').text,'（追蹤失敗！錯誤代碼：ERR-4037）');
 assert.ok(chat.messages.filter(m=>m.kind==='terminal-status').every(m=>m.from==='system'));
});
