import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {registry} from '../src/system/registry.js';
import {worldMinuteRate,tickWorld,advanceGameMinutes,setStory55MinutesPerSecond} from '../src/system/time/clock.js';
import {phoneRuntimePaused,tickPhoneRuntime} from '../src/system/runtime/controller.js';
import {WorldTickBatch} from '../src/system/time/tick-batch.js';
import {drainBattery,BATTERY_DRAIN_INTERVAL_MS,plugIn,beginShortCharge} from '../src/system/power/battery.js';
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
 const s=start();assert.equal(worldMinuteRate(s),5/1000);
 for(const options of [{overlay:true},{callActive:true},{fastForward:false}])assert.equal(worldMinuteRate(s,options),5/60000);
 s.unlocked=false;assert.equal(worldMinuteRate(s),5/60000);
});
test('full-day home and App use consume exactly the same charge for the same game minutes',()=>{
 for(const [appId,elapsed] of [['home',180000],['ghost',10800000]]){
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
 assert.equal(s.clock,'03:00');assert.equal(advanceGameMinutes(s,1000).minutes,0);
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
  s.nav.current.appId='home';f=batch.take(s,100);if(f)tickPhoneRuntime(s,f);
 }
 assert.equal(s.clock,'08:10');assert.equal(s.batteryPercent,100);
 s=JSON.parse(JSON.stringify(s));advanceGameMinutes(s,2);assert.equal(s.batteryPercent,99);
});
