import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {registry} from '../src/system/registry.js';
import {worldMinuteRate,tickWorld,advanceGameMinutes,setStory55MinutesPerSecond} from '../src/system/time/clock.js';
import {phoneRuntimePaused,tickPhoneRuntime} from '../src/system/runtime/controller.js';
import {WorldTickBatch} from '../src/system/time/tick-batch.js';
import {drainBattery,BATTERY_DRAIN_INTERVAL_MS,plugIn,beginShortCharge} from '../src/system/power/battery.js';
import {PHONE_RUNTIME_POLICY,phoneSceneMinuteRate,taiReplyTriggered} from '../src/system/runtime/policy.js';
import {MessageDelivery} from '../src/services/messaging/delivery.js';
import {readConversationInState} from '../src/services/messaging/read.js';
const start=(day=2,appId='home')=>{
 const s=activateStory55(initialState());s.day=day;s.unlocked=true;
 s.story55.completed.intro={day:1,clock:'12:00'};
 s.nav.current={appId,route:'/',params:{}};return s;
};
test('every registered App on every story day uses 1 real minute = 5 game minutes',()=>{
 for(let day=1;day<=55;day++)for(const appId of [...registry.keys(),'future-app']){
  if(appId==='editor')continue;
  const s=start(day,appId);
  for(const route of ['/','/chat/group','/mail/key','/call']){
   s.nav.current.route=route;
   for(const focused of [true,false])assert.equal(worldMinuteRate(s,{focused,taiChat:true}),5/60000,`D${day} ${appId} ${route}`);
  }
 }
});
test('home alone is fast; locked, call, notification and task switcher remain slow',()=>{
 const s=start();assert.equal(worldMinuteRate(s),2.5/1000);
 for(const options of [{overlay:true},{callActive:true},{fastForward:false}])assert.equal(worldMinuteRate(s,options),5/60000);
 s.unlocked=false;assert.equal(worldMinuteRate(s),5/60000);
});
test('full-day home and App use consume exactly the same charge for the same game minutes',()=>{
 for(const [appId,elapsed] of [['home',360000],['ghost',10800000]]){
  const s=start(2,appId);tickWorld(s,elapsed);
  assert.equal(s.clock,'23:00');assert.equal(s.batteryPercent,20);
  assert.equal(drainBattery(s,elapsed),0,'old real-time caller cannot debit twice');
 }
});
test('clock pause, hidden tabs, editor and invalid elapsed do not drain charge',()=>{
 const s=start(2,'wechat');setStory55MinutesPerSecond(s,0);
 tickWorld(s,600000);assert.equal(s.clock,'08:00');assert.equal(s.batteryPercent,100);
 setStory55MinutesPerSecond(s,5);
 const frame={elapsedMs:600000,gameMinutes:50};
 for(const options of [{hidden:true},{restarting:true}]){
  assert.equal(phoneRuntimePaused(s,options),true);tickPhoneRuntime(s,frame,options);
 }
 s.nav.current.appId='editor';tickPhoneRuntime(s,frame);
 assert.equal(s.clock,'08:00');assert.equal(s.batteryPercent,100);
 for(const value of [NaN,Infinity,-10])tickWorld(s,value);
 assert.equal(s.clock,'08:00');
});
test('loaded saves keep battery, preserve partial debit, and persist the new remainder',()=>{
 const s=start();delete s.powerClockVersion;delete s.powerGameMinuteFraction;
 s.batteryPercent=63;s.powerActiveMs=BATTERY_DRAIN_INTERVAL_MS/2;
 advanceGameMinutes(s,5);assert.equal(s.batteryPercent,63);
 const restored=JSON.parse(JSON.stringify(s));advanceGameMinutes(restored,1);
 assert.equal(restored.batteryPercent,62);
 const remainder=restored.powerGameMinuteFraction;
 restored.clock='08:00';advanceGameMinutes(restored,1);
 assert.equal(restored.batteryPercent,62);assert.equal(restored.powerGameMinuteFraction,remainder+1);
});
test('story gates never raise a low saved battery; holding D01 at 03:00 stops discharge',()=>{
 const s=start(1);s.batteryPercent=7;
 advanceGameMinutes(s,1);assert.equal(s.batteryPercent,7);
 advanceGameMinutes(s,5000);const before=s.batteryPercent;
 assert.equal(s.clock,'03:00');assert.equal(before,1);assert.equal(advanceGameMinutes(s,1000).minutes,0);
 assert.equal(s.batteryPercent,before);
});
test('alarms and emergency settle only actual elapsed minutes and retain the 1% override',()=>{
 const s=start();s.clock='02:59';s.batteryPercent=50;
 assert.equal(advanceGameMinutes(s,120).event,'emergency');
 assert.equal(s.clock,'03:00');assert.equal(s.batteryPercent,1);
 const a=start();a.content.alarms=[{id:'a',time:'08:10',enabled:true,repeat:'永不'}];
 assert.equal(advanceGameMinutes(a,900).minutes,10);assert.equal(a.batteryPercent,100);
 tickPhoneRuntime(a,{elapsedMs:100000,gameMinutes:500});assert.equal(a.batteryPercent,100);
});
test('short charge and long charge share the controller without also discharging',()=>{
 const s=start(2,'ghost');s.batteryPercent=50;beginShortCharge(s,1000);
 tickPhoneRuntime(s,{elapsedMs:60000,gameMinutes:5});
 assert.equal(s.clock,'08:05');assert.equal(s.batteryPercent,60);
 s.powerMode='idle';s.shortCharge=null;
 assert.equal(plugIn(s),true);assert.equal(s.clock,'08:00');assert.equal(s.batteryPercent,100);
 assert.equal(s.powerGameMinuteFraction,0);
});
test('mixed App/home segments and reload have the same debit as uninterrupted game time',()=>{
 let s=start(),batch=new WorldTickBatch();
 for(let n=0;n<10;n++){
  s.nav.current.appId='ghost';let f=batch.take(s,6000);if(f)tickPhoneRuntime(s,f);
  s.nav.current.appId='home';f=batch.take(s,200);if(f)tickPhoneRuntime(s,f);
 }
 assert.equal(s.clock,'08:10');assert.equal(s.batteryPercent,100);
 s=JSON.parse(JSON.stringify(s));advanceGameMinutes(s,2);assert.equal(s.batteryPercent,99);
});

test('unified clock: home 150x, background 10x and short charging 225x overrides both',()=>{
 const s=start(),home=2.5/1000,background=10/60000,short=3.75/1000;
 assert.equal(PHONE_RUNTIME_POLICY.homeMinutesPerRealSecond,2.5);
 assert.equal(PHONE_RUNTIME_POLICY.backgroundMinutesPerRealMinute,10);
 assert.equal(PHONE_RUNTIME_POLICY.shortChargeHomeMinutesPerRealSecond,3.75);
 assert.equal(phoneSceneMinuteRate(s),home);
 assert.equal(phoneSceneMinuteRate(s,{hidden:true,background:true}),background);
 s.nav.current.appId='wechat';
 assert.equal(phoneSceneMinuteRate(s),5/60000);
 assert.equal(phoneSceneMinuteRate(s,{hidden:true,background:true}),background);
 s.nav.current.appId='home';
 s.powerMode='short-charging';
 assert.equal(phoneSceneMinuteRate(s),short);
 assert.equal(phoneSceneMinuteRate(s,{hidden:true,background:true}),short);
 s.nav.current.appId='wechat';
 assert.equal(phoneSceneMinuteRate(s),5/60000);
 setStory55MinutesPerSecond(s,0);
 assert.equal(phoneSceneMinuteRate(s,{hidden:true,background:true}),0,'developer pause still stops everything');
});

test('Tai online alone does not slow HOME; queued, real AI and unread replies do',()=>{
 const s=start(),rate=()=>phoneSceneMinuteRate(s),c=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
 assert.ok(c);
 assert.equal(taiReplyTriggered(s),false);
 assert.equal(rate(),2.5/1000,'mere presence is not a reply');
 c.messages.push({id:'reply-me',from:'me',kind:'text',text:'在嗎？',taiReplyRequestAt:Date.now(),day:s.day,time:s.clock});
 assert.equal(rate(),5/60000,'an actual pending Mirage AI reply slows the home screen');
 c.messages.at(-1).taiReplyRequestAt=Date.now()-130000;
 assert.equal(rate(),2.5/1000,'a stale request from a frozen page cannot hold the speed forever');
 delete c.messages.at(-1).taiReplyRequestAt;
 const queued={id:'pending-tai',from:'s55-ouroboros',kind:'text',text:'？',day:s.day,time:s.clock,schedule:{mode:'chat-delay',seconds:3}};
 c.messages.push(queued);
 s.story55.ghostShare={phase:'dialogue',pendingIds:[queued.id]};
 assert.equal(rate(),5/60000,'an authored reply already queued slows the home screen');
 queued.delivery={day:s.day,clock:s.clock};
 assert.equal(rate(),2.5/1000);
 c.unread=1;
 assert.equal(rate(),5/60000,'an unread Tai reply stays protected until opened');
 readConversationInState(s,'mirage','s55-ouroboros');
 assert.equal(rate(),2.5/1000);
 const noapp=s.content.conversations.noapp.find(c=>c.id==='tai');
 assert.ok(noapp);
 noapp.messages.push({id:'noapp-me',from:'me',kind:'text',text:'等等',taiPending:true});
 assert.equal(rate(),2.5/1000,'an offline stored message is not an active reply');
 noapp.messages.at(-1).taiReadAt=Date.now();
 assert.equal(rate(),5/60000,'a genuinely processing NoApp reply slows the home screen');
 noapp.messages.at(-1).taiReadAt=Date.now()-130000;
 assert.equal(rate(),2.5/1000,'stale saved NoApp request cannot slow the phone forever');
 delete noapp.messages.at(-1).taiPending;
 assert.equal(rate(),2.5/1000);
 noapp.messages.push({id:'noapp-tai',from:'tai',kind:'text',text:'好',actual:true});
 noapp.unread=1;
 assert.equal(rate(),5/60000);
 noapp.unread=0;
 assert.equal(rate(),2.5/1000);
});

test('native Tai reply continues while waiting on HOME and uses original unread notification service',()=>{
 const s=start(),c=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
 const id='queued-home-tai-test',m={id,from:'s55-ouroboros',kind:'text',text:'在這裡',day:s.day,time:s.clock,
  schedule:{mode:'chat-delay',seconds:2},story55:true};
 c.messages.push(m);s.story55.ghostShare={phase:'dialogue',pendingIds:[id]};
 const engine=new MessageDelivery({get:()=>s,update:fn=>fn(s)});
 engine.tick(1000,true);
 assert.equal(m.delivery,undefined);
 engine.tick(2999,true);assert.equal(m.delivery,undefined);
 engine.tick(3000,true);
 assert.ok(m.delivery,'queued message must arrive even outside MIRAGE');
 assert.equal(c.unread,1,'the existing unread counter records the reply');
 assert.ok(s.notifications.some(n=>n.messageId===id),'existing notification queue is reused');
 assert.equal(phoneSceneMinuteRate(s),5/60000);
 readConversationInState(s,'mirage','s55-ouroboros');
 assert.equal(c.unread,0);
 assert.equal(phoneSceneMinuteRate(s),2.5/1000);
 engine.tick(4000,true);
 assert.equal(s.notifications.filter(n=>n.messageId===id).length,0,'no duplicated notification');
});

test('long charge transition releases a saved D06 plot hold without skipping the plot or draining the battery',()=>{
 const s=start(6);
 s.story55.completed.wallet={day:6,clock:'08:00'};
 s.content.mirage??={};s.content.mirage.transactions??=[];
 s.content.mirage.transactions.push({id:'s55-wallet-10btc'});
 s.story55.wishes??={};s.story55.wishes.story??={};s.story55.wishes.story.delivered=[];
 s.unlocked=false;s.batteryPercent=100;s.dayChargeRemainingMs=1200;
 assert.equal(worldMinuteRate(s),0,'the real D06 celebration gate is active');
 const saved=JSON.parse(JSON.stringify(s));
 const batch=new WorldTickBatch();
 for(const options of [{hidden:true},{background:true,hidden:true},{restarting:true}]){
  assert.equal(phoneRuntimePaused(saved,options),true);
  tickPhoneRuntime(saved,{elapsedMs:5000,gameMinutes:20},options);
  assert.equal(saved.dayChargeRemainingMs,1200);
 }
 assert.equal(phoneRuntimePaused(saved),false);
 tickPhoneRuntime(saved,batch.take(saved,800));
 assert.equal(saved.dayChargeRemainingMs,400);
 tickPhoneRuntime(saved,batch.take(saved,800));
 assert.equal(saved.dayChargeRemainingMs,0);
 assert.equal(saved.clock,'08:00');assert.equal(saved.day,6);assert.equal(saved.batteryPercent,100);
 assert.equal(saved.unlocked,false);
 assert.equal(phoneRuntimePaused(saved),true,'plot gate is still active after the animation');
 tickPhoneRuntime(saved,{elapsedMs:60000,gameMinutes:5});
 assert.equal(saved.clock,'08:00');assert.equal(saved.batteryPercent,100);
 assert.deepEqual(saved.story55.wishes.story.delivered,[]);
});
test('long charge consumes only its animation even with a large foreground frame',()=>{
 const s=start(2);
 s.dayChargeRemainingMs=1200;s.unlocked=false;s.batteryPercent=100;
 const before=s.clock;
 tickPhoneRuntime(s,{elapsedMs:2500,gameMinutes:10});
 assert.equal(s.dayChargeRemainingMs,0);assert.equal(s.clock,before);assert.equal(s.batteryPercent,100);
});
