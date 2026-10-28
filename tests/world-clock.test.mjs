import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,PhoneStore} from '../src/services/storage.js';
import {MessageDelivery} from '../src/services/messaging/delivery.js';
import {advanceGameMinutes,tickWorld,setSleeping,dismissAlarm,absoluteMinute} from '../src/system/time/clock.js';
import {plugIn,drainBattery} from '../src/system/power/battery.js';

test('normal game clock: 30 real minutes for 24 game hours, battery independent',()=>{
 const s=initialState();s.day=1;s.clock='08:00';s.batteryPercent=100;
 const start=absoluteMinute(s);tickWorld(s,1_125_000);drainBattery(s,1_125_000);
 assert.equal(absoluteMinute(s)-start,900);assert.equal(s.clock,'23:00');assert.equal(s.batteryPercent,20);
});
test('ordinary charging jumps once to the next morning with full battery',()=>{
 const s=initialState();s.batteryPercent=55;assert.equal(plugIn(s),true);
 assert.equal(s.day,57);assert.equal(s.clock,'08:00');assert.equal(s.batteryPercent,100);
 assert.equal(plugIn(s),false);assert.equal(tickWorld(s,1200).minutes,0);
 assert.equal(s.day,57);assert.equal(s.powerMode,'idle');assert.equal(s.unlocked,false);
});
test('recovery charging still supports sleeping and an exact alarm boundary',()=>{
 const s=initialState();s.day=91;s.deathPhase='recovered';s.clock='23:00';s.batteryPercent=30;s.powerMode='charging';
 s.content.alarms=[{id:'test',time:'03:00',label:'凌晨工作',enabled:true,repeat:'永不'}];
 assert.equal(setSleeping(s),true);
 assert.equal(tickWorld(s,12_000).event,'alarm');assert.equal(s.clock,'03:00');
 assert.equal(s.alarmRinging.label,'凌晨工作');assert.equal(tickWorld(s,5000).minutes,0);
 dismissAlarm(s);assert.equal(s.alarmRinging,null);assert.equal(s.powerMode,'charging');
});
test('recovery sleep wakes at 08:00 with full charge when no earlier alarm',()=>{
 const s=initialState();s.day=91;s.deathPhase='recovered';s.clock='23:00';s.batteryPercent=20;s.powerMode='charging';s.content.alarms=[];
 assert.equal(setSleeping(s),true);assert.equal(tickWorld(s,20_000).event,'wake');
 assert.equal(s.clock,'08:00');assert.equal(s.day,92);assert.equal(s.batteryPercent,100);assert.equal(s.powerMode,'idle');
});
test('ordinary 03:00 emergency can charge directly to the next day',()=>{
 const s=initialState();s.clock='02:50';s.batteryPercent=67;
 assert.equal(advanceGameMinutes(s,40).event,'emergency');assert.equal(s.clock,'03:00');assert.equal(s.batteryPercent,1);
 assert.equal(tickWorld(s,8000).minutes,0);assert.equal(plugIn(s),true);
 assert.equal(s.emergencyCharge,false);assert.equal(s.day,57);assert.equal(s.clock,'08:00');assert.equal(s.batteryPercent,100);
});
test('typing slows ordinary time',()=>{
 const a=initialState(),b=initialState();tickWorld(a,5000);tickWorld(b,5000,{focused:true});
 assert.equal(a.clock,'21:22');assert.equal(b.clock,'21:18');
});
test('direct charging delivers scheduled messages once with their original timestamps',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},store=new PhoneStore(storage);
 store.update(s=>{s.content.conversations={wechat:[{id:'test',name:'测试聊天',messages:[
  {id:'a',from:'contact',text:'午夜之前',schedule:{mode:'game-time',day:56,clock:'23:30'}},
  {id:'b',from:'contact',text:'凌晨一点',schedule:{mode:'game-time',day:57,clock:'01:00'}}]}]};plugIn(s);});
 const engine=new MessageDelivery(store);assert.equal(engine.tick().length,2);assert.equal(engine.tick().length,0);
 assert.deepEqual(store.get().content.conversations.wechat[0].messages.map(m=>m.delivery),[{day:56,clock:'23:30'},{day:57,clock:'01:00'}]);
});
