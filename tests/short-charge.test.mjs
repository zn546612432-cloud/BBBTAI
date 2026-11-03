import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {batteryPercent,beginShortCharge,endShortCharge,tickShortChargeBattery,drainBattery,plugIn,SHORT_CHARGE_MAX_GAIN} from '../src/system/power/battery.js';
import {tickWorld,advanceGameMinutes,worldMinuteRate,SHORT_CHARGE_MINUTES_PER_MS} from '../src/system/time/clock.js';
import {dynamicIsland} from '../src/system/power/island.js';
import {status} from '../src/system/shell.js';
import {seedD02} from '../src/story/d02/runtime.js';
import {MessageDelivery} from '../src/services/messaging/delivery.js';
const d02=()=>{const s=activateStory55(initialState());s.day=2;s.clock='08:00';s.story55.completed.intro={day:1,clock:'12:00',test:true};return s;};
test('Dynamic Island offers short and long charging choices',()=>{
 const s=d02();
 assert.match(dynamicIsland(s,{expanded:true}),/power-charge-select/);
 const html=dynamicIsland(s,{expanded:true,page:'select'});
 assert.match(html,/power-short-start/);assert.match(html,/power-long-start/);
 assert.match(html,/1 分钟＝游戏 3 小时/);assert.match(html,/次日 08:00/);
 assert.match(status(s,{islandExpanded:true,islandPage:'select'}),/is-charge-select/);
});
test('D02 short charging advances three game hours per real minute, even in chat',()=>{
 const s=d02();s.batteryPercent=70;
 assert.equal(beginShortCharge(s),true);
 assert.equal(worldMinuteRate(s,{focused:true,taiChat:true}),SHORT_CHARGE_MINUTES_PER_MS);
 tickShortChargeBattery(s,20_000);
 assert.equal(tickWorld(s,20_000,{focused:true,taiChat:true}).minutes,60);
 assert.equal(s.day,2);assert.equal(s.clock,'09:00');assert.equal(batteryPercent(s),73);
 assert.equal(drainBattery(s,20_000),0);
 tickShortChargeBattery(s,40_000);tickWorld(s,40_000);
 assert.equal(s.clock,'11:00');assert.equal(batteryPercent(s),80);
 tickShortChargeBattery(s,60_000);tickWorld(s,60_000);
 assert.equal(s.clock,'14:00');assert.equal(batteryPercent(s),80);
 assert.equal(s.shortCharge.elapsedMs,60_000);assert.equal(SHORT_CHARGE_MAX_GAIN,10);
});
test('Unplugging stops acceleration immediately, retains the earned charge and day',()=>{
 const s=d02();s.batteryPercent=84;
 assert.equal(beginShortCharge(s),true);
 tickShortChargeBattery(s,30_000);tickWorld(s,30_000);
 assert.equal(s.clock,'09:30');assert.equal(s.batteryPercent,89);
 assert.equal(endShortCharge(s),true);assert.equal(s.powerMode,'idle');
 assert.equal(s.shortCharge,null);assert.equal(s.day,2);
 assert.equal(endShortCharge(s),false);
 tickWorld(s,3_000);assert.equal(s.clock,'09:31');
});
test('short charge stops at 23:59 instead of skipping to tomorrow',()=>{
 const s=d02();s.clock='23:50';s.batteryPercent=70;
 beginShortCharge(s);tickShortChargeBattery(s,20_000);
 assert.equal(tickWorld(s,20_000).event,'short-charge-end');
 assert.equal(s.day,2);assert.equal(s.clock,'23:59');
 assert.equal(s.powerMode,'idle');assert.equal(s.batteryPercent,73);
});
test('long charge remains the original next-day 08:00 fully charged transition',()=>{
 const s=d02();s.clock='15:42';s.batteryPercent=35;
 assert.equal(plugIn(s),true);assert.equal(s.day,3);assert.equal(s.clock,'08:00');
 assert.equal(s.batteryPercent,100);assert.equal(s.shortCharge,null);
 assert.equal(beginShortCharge(s),false);
});
test('D01 cannot skip overnight with short charge and D55 ending is protected',()=>{
 const s=activateStory55(initialState());s.clock='23:50';
 assert.equal(beginShortCharge(s),false,'must complete D01 before any charge');
 s.story55.d01={bankClaimed:true,rewardPaid:true};
 s.story55.completed.intro={day:1,clock:'12:00',test:true};
 assert.equal(beginShortCharge(s),true);
 assert.equal(advanceGameMinutes(s,120).event,'short-charge-end');
 assert.equal(s.day,1);assert.equal(s.clock,'23:59');
 s.story55.d01.nightAfterMidnight=true;s.clock='00:30';
 assert.equal(beginShortCharge(s),false,'D01 after midnight remains under the original lock');
 const last=d02();last.day=55;last.story55.ended=true;
 assert.equal(beginShortCharge(last),false);
});

test('D02 sale SMS still delivers at its original game timestamp during acceleration',()=>{
 const s=d02();s.batteryPercent=70;seedD02(s);
 const store={get:()=>s,update:fn=>fn(s)},delivery=new MessageDelivery(store);
 const c=s.content.conversations.messages.find(c=>c.id==='sms-aodong-2025');
 assert.ok(c);assert.equal(c.messages.find(m=>m.id==='d02-aodong-sale').delivery,undefined);
 assert.equal(beginShortCharge(s),true);
 tickShortChargeBattery(s,20_000);tickWorld(s,20_000);
 delivery.tick(1_000,true);
 const promo=c.messages.find(m=>m.id==='d02-aodong-sale');
 assert.deepEqual(promo.delivery,{day:2,clock:'09:00'});
 assert.match(s.notifications.find(n=>n.messageId==='d02-aodong-sale')?.body||'',/八折/);
 delivery.tick(2_000,true);
 assert.equal(s.events.filter(e=>e.messageId==='d02-aodong-sale').length,1,'no duplicate alert');
});
