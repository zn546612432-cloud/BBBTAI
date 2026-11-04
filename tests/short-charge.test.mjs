import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {batteryPercent,beginShortCharge,endShortCharge,tickShortChargeBattery,settleOfflineShortCharge,shortChargeGainToday,shortChargeStoryInterrupted,drainBattery,plugIn,SHORT_CHARGE_MAX_GAIN} from '../src/system/power/battery.js';
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
 assert.match(html,/>短充<\/button>/);assert.match(html,/>长充<\/button>/);
 assert.doesNotMatch(html,/现实 1 分钟|次日 08:00|最多 \+10%/);
 assert.match(status(s,{islandExpanded:true,islandPage:'select'}),/is-charge-select/);
});
test('D02 short charging advances three game hours per real minute only when allowed',()=>{
 const s=d02();s.batteryPercent=70;
 assert.equal(beginShortCharge(s),true);
 assert.equal(worldMinuteRate(s,{focused:true,taiChat:true}),SHORT_CHARGE_MINUTES_PER_MS);
 assert.equal(worldMinuteRate(s,{focused:true,taiChat:false,fastForward:false}),2/60000);
 assert.equal(worldMinuteRate(s,{focused:false,taiChat:true,fastForward:false}),2/60000);
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
 assert.equal(plugIn(s),false,'D01 overnight charge still requires the compulsory tasks');
 assert.equal(beginShortCharge(s),false,'D01 wet-port gate also blocks short charge');
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

test('original plot gate blocks BOTH long and short charging',()=>{
 const s=activateStory55(initialState());s.day=2;s.clock='09:30';
 assert.equal(plugIn(s),false,'unfinished D01 story still protects a long charge');
 assert.equal(beginShortCharge(s),false,'the same gate blocks short charge');
 s.story55.completed.intro={day:1,clock:'12:00',test:true};
 assert.equal(beginShortCharge(s),true);
 tickShortChargeBattery(s,20_000);
 assert.equal(tickWorld(s,20_000).minutes,60);
 assert.equal(s.day,2);assert.equal(s.clock,'10:30');
 assert.equal(endShortCharge(s),true);
});

test('charge options keep a touchable surface below the compact status bar',async()=>{
 const {readFileSync}=await import('node:fs');
 const css=readFileSync(new URL('../src/system/power/styles.css',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const gesture=readFileSync(new URL('../src/system/gestures.js',import.meta.url),'utf8');
 assert.match(css,/#status-layer\.is-charge-expanded\{[^}]*pointer-events:auto/);
 assert.match(main,/classList\.toggle\('is-charge-expanded',islandExpanded\)/);
 assert.match(gesture,/\.battery-charge-choice/);
 assert.match(main,/action==='power-short-start'/);
 assert.match(main,/action==='power-long-start'/);
 assert.match(main,/充电口进水，稍后再试/);
});

test('one daily 10-point allowance is shared by repeated short-charge sessions',()=>{
 const s=d02();s.batteryPercent=50;
 assert.equal(beginShortCharge(s,1000),true);
 tickShortChargeBattery(s,30_000,31_000);
 assert.equal(s.batteryPercent,55);assert.equal(shortChargeGainToday(s),5);
 endShortCharge(s);beginShortCharge(s,35_000);
 tickShortChargeBattery(s,60_000,95_000);
 assert.equal(s.batteryPercent,60);assert.equal(shortChargeGainToday(s),10);
 endShortCharge(s);beginShortCharge(s,95_000);
 tickShortChargeBattery(s,60_000,155_000);
 assert.equal(s.batteryPercent,60);
 assert.equal(shortChargeGainToday(s),10);
 assert.equal(s.powerMode,'short-charging','full quota does not force unplugging');
});

test('a full 100% battery remains plugged in and charges only actually received points',()=>{
 const s=d02();s.batteryPercent=96;
 beginShortCharge(s,1000);tickShortChargeBattery(s,60_000,61_000);
 assert.equal(s.batteryPercent,100);assert.equal(shortChargeGainToday(s),4);
 assert.equal(s.powerMode,'short-charging');
 endShortCharge(s);
 s.day=3;s.batteryPercent=50;beginShortCharge(s,61_000);
 tickShortChargeBattery(s,60_000,121_000);
 assert.equal(shortChargeGainToday(s),10);assert.equal(s.batteryPercent,60);
 endShortCharge(s);s.day=2;s.batteryPercent=50;
 beginShortCharge(s,121_000);tickShortChargeBattery(s,60_000,181_000);
 assert.equal(s.batteryPercent,56);assert.equal(shortChargeGainToday(s),10,'returning to D02 does not reset quota');
});

test('background/closed browser credits battery without advancing story time',()=>{
 const s=d02();s.batteryPercent=50;s.clock='10:00';
 beginShortCharge(s,1_000);
 tickShortChargeBattery(s,20_000,21_000);
 assert.equal(s.batteryPercent,53);
 const before=s.clock;
 assert.equal(settleOfflineShortCharge(s,621_000),7);
 assert.equal(s.batteryPercent,60);assert.equal(s.clock,before);
 assert.equal(settleOfflineShortCharge(s,621_000),0,'no duplicate credit');
 assert.equal(shortChargeGainToday(s),10);
});

test('short charging runs at ordinary speed inside apps, then resumes home acceleration',()=>{
 const s=d02();s.batteryPercent=70;beginShortCharge(s);
 assert.equal(worldMinuteRate(s,{fastForward:true}),SHORT_CHARGE_MINUTES_PER_MS);
 assert.equal(worldMinuteRate(s,{fastForward:false}),1/3000);
 tickWorld(s,9_000,{fastForward:false});
 assert.equal(s.clock,'08:03');
 tickWorld(s,1_000,{fastForward:true});
 assert.equal(s.clock,'08:06');assert.equal(s.powerMode,'short-charging');
});

test('an active compulsory story scene forces a quiet unplug',()=>{
 const s=d02();beginShortCharge(s);
 assert.equal(shortChargeStoryInterrupted(s),false);
 s.story55.activeScene='intro';
 assert.equal(shortChargeStoryInterrupted(s),true);
 endShortCharge(s);assert.equal(s.powerMode,'idle');
});

test('foreground notification pauses and background resumption are wired without Kira mail',async()=>{
 const {readFileSync}=await import('node:fs');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/shortChargeNoticePausedUntil=Date\.now\(\)\+5000/);
 assert.match(main,/!shade&&!tasks\.visible/);
 assert.match(main,/settleResumedShortCharge/);
 assert.match(main,/\!ok\)toast\('现在无法短充'\)/);
 assert.doesNotMatch(main,/短充已开始/);
});
