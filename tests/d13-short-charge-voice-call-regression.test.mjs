import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,PhoneStore} from '../src/services/storage.js';
import {activateStory55,tickStory55,appendSceneMessage55,sceneLines,markMail55} from '../src/services/story55/runtime.js';
import {beginShortCharge,plugIn,endShortCharge} from '../src/system/power/battery.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {chargingBlock,shortChargeBlock} from '../src/system/power/story.js';
import {nodeStatus} from '../src/services/story55/state.js';
import {bindD13Wallet,transferD13Wallet} from '../src/story/d13/runtime.js';
import {handle as handleMirage} from '../src/apps/mirage/index.js';
import {setMirageAuthenticated} from '../src/apps/mirage/session.js';
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

test('D13 exhibition pending before 22:10 does not disable short charge or silently complete the scene',()=>{
 const s=day13('15:18');
 delete s.story55.completed.exhibition;
 tickStory55(s);
 assert.equal(chargingBlock(s),'plot','long charge remains blocked until the authored story finishes');
 assert.equal(shortChargeBlock(s),null,'exhibition is not a short-charge gate on the D13 waiting day');
 assert.equal(beginShortCharge(s),true);
 assert.equal(advanceGameMinutes(s,30).minutes,30);
 assert.equal(s.day,13);
 assert.equal(s.story55.completed.exhibition,undefined,'short charge must not send any scene or player reply');
 assert.equal(endShortCharge(s),true);
 s.story55.activeScene='exhibition';
 assert.equal(beginShortCharge(s),false,'an actively running scene still interrupts charging');
});

test('D13 KIRA mail arrives once at 22:10 even when daytime exhibition was not completed',()=>{
 const s=day13('22:09');
 delete s.story55.completed.exhibition;
 // Reproduce an older existing phone save, not only the new definitions.
 s.story55.config.nodes.find(n=>n.id==='d13-wallet-mail').requires=['exhibition'];
 s.story55.config.nodes.find(n=>n.id==='intrusion').requires=['d13-wallet-transfer'];
 tickStory55(s);
 assert.equal(s.content.mail.some(m=>m.id==='s55-d13-wallet-mail'),false);
 assert.equal(nodeStatus(s,'d13-wallet-mail').state,'locked');
 advanceGameMinutes(s,1);
 tickStory55(s);
 assert.equal(s.clock,'22:10');
 assert.deepEqual(s.story55.config.nodes.find(n=>n.id==='d13-wallet-mail').requires,[]);
 assert.deepEqual(s.story55.config.nodes.find(n=>n.id==='d13-wallet-transfer').requires,['d13-wallet-bind']);
 assert.deepEqual(s.story55.config.nodes.find(n=>n.id==='intrusion').requires,['d13-wallet-transfer']);
 assert.equal(s.content.mail.filter(m=>m.id==='s55-d13-wallet-mail').length,1);
 const notice=s.notifications.find(n=>n.id==='s55-mail-s55-d13-wallet-mail');
 assert.equal(notice.day,13);assert.equal(notice.clock,'22:10');
 assert.equal(s.content.mail.find(m=>m.id==='s55-d13-wallet-mail').date,'2025-05-31');
 markMail55(s,'s55-d13-wallet-mail');
 assert.equal(s.story55.completed.exhibition,undefined,'reading does not auto-complete the meeting');
 assert.equal(s.story55.completed['d13-wallet-mail'].day,13);
 assert.equal(bindD13Wallet(s),true,'mail reading allows the normal wallet binding');
 assert.equal(transferD13Wallet(s,1000),true,'wallet transfer must not depend on the independent planning note');
 assert.equal(s.story55.d13?.phase,'green');
 assert.equal(nodeStatus(s,'d13-wallet-transfer').state,'done');
 assert.equal(s.story55.completed.exhibition,undefined,'a transfer cannot auto-complete another scene');
 assert.equal(nodeStatus(s,'intrusion').state,'ready','real transfer permits the call');
 tickStory55(s);tickStory55(s);
 assert.equal(s.content.mail.filter(m=>m.id==='s55-d13-wallet-mail').length,1);
 assert.equal(s.notifications.filter(n=>n.id==='s55-mail-s55-d13-wallet-mail').length,1);
});

test('D13 time and battery continue after 23:59 despite mandatory pending scenes',()=>{
 const s=day13('23:59');delete s.story55.completed.exhibition;
 s.batteryPercent=20;s.powerGameMinuteFraction=0;
 tickStory55(s);
 const before=s.batteryPercent;
 assert.equal(chargingBlock(s),'plot');
 assert.equal(advanceGameMinutes(s,30).minutes,30);
 assert.equal(s.day,14);assert.equal(s.clock,'00:29');
 assert.ok(s.batteryPercent<before,'20% floor must not freeze an incomplete story day after midnight');
 assert.equal(s.story55.completed.exhibition,undefined,'time alone cannot finish the required scene');
 assert.equal(s.story55.completed.intrusion,undefined);
 const outcome=advanceGameMinutes(s,151);
 assert.equal(outcome.event,'emergency');
 assert.equal(s.day,14);assert.equal(s.clock,'03:00');assert.equal(s.batteryPercent,1);
 assert.equal(s.emergencyCharge,true);
 assert.equal(chargingBlock(s),null,'03:00 emergency must not deadlock behind a plot gate');
 assert.equal(plugIn(s),true,'emergency charge restores the same calendar morning');
 assert.equal(s.day,14);assert.equal(s.clock,'08:00');assert.equal(s.batteryPercent,100);
 assert.equal(s.story55.completed.exhibition,undefined);
 assert.equal(s.story55.completed.intrusion,undefined);
 tickStory55(s);
 assert.equal(s.content.mail.filter(m=>m.id==='s55-d13-wallet-mail').length,1,'D13 mail survives recovery');
});

test('late foreground delivery uses the actual arrival timestamp and never duplicates notices',()=>{
 const s=day13('22:09');delete s.story55.completed.exhibition;
 // Simulate a batched foreground tick that crosses midnight without a 22:10 render.
 s.clock='00:30';s.day=14;
 tickStory55(s);
 const mail=s.content.mail.find(m=>m.id==='s55-d13-wallet-mail');
 const notice=s.notifications.find(n=>n.id==='s55-mail-s55-d13-wallet-mail');
 assert.ok(mail);assert.equal(mail.date,'2025-06-01');
 assert.equal(notice.day,14);assert.equal(notice.clock,'00:30');
 tickStory55(s);
 assert.equal(s.content.mail.filter(m=>m.id==='s55-d13-wallet-mail').length,1);
 assert.equal(s.notifications.filter(n=>n.id==='s55-mail-s55-d13-wallet-mail').length,1);
});

test('a frozen D13 23:59 saved phone reloads to restore its timed mail and continues the real shared clock',()=>{
 const s=day13('23:59');delete s.story55.completed.exhibition;
 const entries=new Map(),storage={
  getItem:key=>entries.get(key)||null,
  setItem:(key,value)=>entries.set(key,value)
 };
 const store=new PhoneStore(storage);store.replace(s);
 const reloaded=new PhoneStore(storage);
 assert.equal(reloaded.get().day,13);assert.equal(reloaded.get().clock,'23:59');
 assert.equal(reloaded.get().content.mail.filter(m=>m.id==='s55-d13-wallet-mail').length,1);
 assert.equal(reloaded.get().notifications.filter(n=>n.id==='s55-mail-s55-d13-wallet-mail').length,1);
 const previous=reloaded.get().batteryPercent;
 reloaded.update(next=>advanceGameMinutes(next,30));
 assert.equal(reloaded.get().day,14);assert.equal(reloaded.get().clock,'00:29');
 assert.ok(reloaded.get().batteryPercent<previous);
 assert.equal(reloaded.get().story55.completed.exhibition,undefined);
 assert.equal(reloaded.get().content.mail.filter(m=>m.id==='s55-d13-wallet-mail').length,1);
 const another=new PhoneStore(storage);
 assert.equal(another.get().day,14);assert.equal(another.get().clock,'00:29');
 assert.equal(another.get().content.mail.filter(m=>m.id==='s55-d13-wallet-mail').length,1);
});

test('D13 short charge stops at 23:59 but normal time and battery resume on the next tick',()=>{
 const s=day13('23:50');delete s.story55.completed.exhibition;
 s.batteryPercent=20;s.powerGameMinuteFraction=0;
 tickStory55(s);
 assert.equal(beginShortCharge(s),true);
 assert.equal(advanceGameMinutes(s,100).event,'short-charge-end');
 assert.equal(s.day,13);assert.equal(s.clock,'23:59');
 assert.equal(s.powerMode,'idle');
 const before=s.batteryPercent;
 assert.equal(advanceGameMinutes(s,12).minutes,12);
 assert.equal(s.day,14);assert.equal(s.clock,'00:11');
 assert.ok(s.batteryPercent<before,'unplugged battery drains again after 23:59');
 assert.equal(s.story55.completed.exhibition,undefined);
});

test('MIRAGE native transfer can proceed without the unrelated planning window',()=>{
 const s=day13('22:11');delete s.story55.completed.exhibition;
 tickStory55(s);markMail55(s,'s55-d13-wallet-mail');assert.equal(bindD13Wallet(s),true);
 const ctx={store:{get:()=>s,update:fn=>fn(s)}};
 setMirageAuthenticated(true);
 handleMirage('mc-wallet-transfer-confirm',{dataset:{}},ctx,{route:'/wallet/s55-d13-wallet-50btc'});
 assert.equal(s.story55.d13.phase,'green');
 assert.equal(s.story55.completed.exhibition,undefined);
});

test('D13 evening phone call releases long-charge to D14 even when the independent planning note was never opened',()=>{
 const s=day13('22:30');
 delete s.story55.completed.exhibition;
 // Emulate saved pre-fix planning gate: upgrading must not remove its text.
 const plan=s.story55.config.nodes.find(n=>n.id==='exhibition');
 plan.gateDay=13;
 assert.equal(chargingBlock(s),'plot');
 tickStory55(s);
 assert.equal(plan.gateDay,undefined,'migrate only the old default note gate');
 assert.ok(s.story55.config.scenes.exhibition[0][1].includes('29天'));
 for(const id of ['d13-wallet-mail','d13-wallet-bind','d13-wallet-transfer','intrusion'])
  s.story55.completed[id]={day:13,clock:'22:28'};
 assert.equal(s.story55.completed.exhibition,undefined,'never auto-complete optional text');
 assert.equal(chargingBlock(s),null,'only actual required call needs to block day transition');
 s.clock='23:25';s.story55.activeScene=null;
 assert.equal(plugIn(s),true);
 assert.equal(s.day,14);
 s.dayChargeRemainingMs=0;tickStory55(s);
 s.clock='09:16';tickStory55(s);
 assert.ok(s.content.mail.some(m=>m.id==='code-mail'),'D14 KIRA mail is still reached');
});
