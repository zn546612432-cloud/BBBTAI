import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,PhoneStore,KEY} from '../src/services/storage.js';
import {dateParts,setPreviewDate} from '../src/services/calendar.js';
import {advanceGameMinutes,tickWorld,absoluteMinute} from '../src/system/time/clock.js';
import {plugIn,unplug,drainBattery,BATTERY_DRAIN_INTERVAL_MS} from '../src/system/power/battery.js';
import {DEATH_START,DEATH_END,syncDeathNight,phoneBlocked,chargingBlock,recoverPhone} from '../src/system/power/story.js';
import {dynamicIsland} from '../src/system/power/island.js';
import {powerFullscreen} from '../src/system/power/controls.js';
import {home} from '../src/system/shell.js';
import {LockScreen} from '../src/system/lock.js';
const at=(day,clock)=>{const s=initialState();s.day=day;s.clock=clock;s.content.alarms=[];return s;};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};

test('inclusive ninety-day calendar and countdown share the same timeline',()=>{
 const s=at(1,'08:00');assert.equal(dateParts(s).iso,'2025-05-19');assert.match(home(s),/还有 89 天/);
 s.day=89;assert.equal(dateParts(s).iso,'2025-08-15');assert.match(home(s),/还有 1 天/);
 s.day=90;assert.equal(dateParts(s).iso,'2025-08-16');assert.match(home(s),/还有 0 天/);
 s.day=91;assert.equal(dateParts(s).iso,'2025-08-17');assert.doesNotMatch(home(s),/还有 -1/);
});
test('ordinary charge can enter D90 but cannot charge again all that day',()=>{
 const s=at(89,'23:59');assert.equal(plugIn(s),true);tickWorld(s,1200);
 assert.equal(s.day,90);assert.equal(s.clock,'08:00');assert.equal(plugIn(s),false);
 for(const clock of ['00:00','03:00','12:00','23:58']){s.clock=clock;assert.equal(plugIn(s),false);}
 s.clock='02:59';advanceGameMinutes(s,1);assert.equal(s.clock,'03:00');assert.equal(s.emergencyCharge,false);
 drainBattery(s,BATTERY_DRAIN_INTERVAL_MS*200);assert.equal(s.batteryPercent,20);assert.equal(s.emergencyCharge,false);
});
test('major plot blocks skipping until its authored completion flag exists',()=>{
 const s=at(57,'12:00');s.storyChargeGates=[{day:57,untilFlag:'day-57-complete'}];
 assert.equal(chargingBlock(s),'plot');assert.equal(plugIn(s),false);assert.equal(s.day,57);
 s.storyPresets.flags.push('unrelated');assert.equal(plugIn(s),false);
 s.storyPresets.flags.push('day-57-complete');assert.equal(plugIn(s),true);assert.equal(s.day,58);
});
test('23:59 always stops at 20%, suppresses coincident alarms and has no island actions',()=>{
 const s=at(90,'23:58');s.batteryPercent=99;s.content.alarms=[{id:'end',time:'23:59',enabled:true}];
 assert.equal(advanceGameMinutes(s,60).event,'death-start');assert.equal(absoluteMinute(s),DEATH_START);
 assert.equal(s.batteryPercent,20);assert.equal(s.alarmRinging,null);assert.equal(phoneBlocked(s),true);
 const html=dynamicIsland(s);assert.match(html,/Low Battery/);assert.match(html,/is-expanded/);assert.doesNotMatch(html,/data-action=/);
 assert.equal(plugIn(s),false);assert.equal(unplug(s),false);
});
test('draining crosses midnight continuously, ignores alarms and stops exactly at 03:00 / 1%',()=>{
 const s=at(90,'23:59');syncDeathNight(s);s.content.alarms=[{id:'night',time:'01:00',enabled:true}];
 advanceGameMinutes(s,1);assert.equal(s.day,91);assert.equal(s.clock,'00:00');assert.equal(dateParts(s).iso,'2025-08-17');
 advanceGameMinutes(s,90);assert.equal(s.clock,'01:30');assert.equal(s.batteryPercent,11);
 const before=s.batteryPercent;drainBattery(s,100000);assert.equal(s.batteryPercent,before);
 assert.equal(advanceGameMinutes(s,1000).event,'death-off');assert.equal(absoluteMinute(s),DEATH_END);
 assert.equal(s.batteryPercent,1);assert.equal(s.deathPhase,'off');assert.equal(s.unlocked,false);
 assert.equal(tickWorld(s,1_000_000).minutes,0);assert.equal(advanceGameMinutes(s,2000).minutes,0);
 assert.doesNotMatch(powerFullscreen(s),/>充电<|>关机</);assert.match(powerFullscreen(s),/story-wake/);
});
test('only 6180 can resume charging, without skipping D91 recovery',()=>{
 const s=at(91,'03:00');syncDeathNight(s);assert.equal(recoverPhone(s,'6180'),false);
 s.deathPhase='passcode';assert.equal(recoverPhone(s,'0816'),false);assert.equal(plugIn(s),false);
 const keypad=new LockScreen();keypad.open();for(const digit of '0816')keypad.key(digit,'6180');assert.equal(keypad.stage,'error');
 keypad.retry();for(const digit of '6180')keypad.key(digit,'6180');assert.equal(keypad.stage,'unlocking');
 assert.equal(recoverPhone(s,keypad.digits),true);assert.equal(s.day,91);assert.equal(s.clock,'03:00');assert.equal(s.powerMode,'charging');
 assert.equal(phoneBlocked(s),false);tickWorld(s,3000);assert.equal(s.clock,'04:00');assert.ok(s.batteryPercent>1);
 assert.equal(plugIn(s),false);assert.equal(unplug(s),true);
});
test('reload and backup restore preserve every death phase and successful recovery',()=>{
 const adapter=storage(),store=new PhoneStore(adapter);
 store.update(s=>{s.day=90;s.clock='23:59';});assert.equal(new PhoneStore(adapter).get().deathPhase,'draining');
 store.update(s=>advanceGameMinutes(s,100));let fresh=new PhoneStore(adapter);assert.equal(fresh.get().clock,'01:39');assert.equal(fresh.get().batteryPercent,10);
 fresh.update(s=>advanceGameMinutes(s,200));fresh=new PhoneStore(adapter);assert.equal(fresh.get().deathPhase,'off');
 fresh.update(s=>{s.deathPhase='passcode';});fresh=new PhoneStore(adapter);assert.equal(fresh.get().deathPhase,'passcode');
 fresh.update(s=>recoverPhone(s,'6180'));fresh=new PhoneStore(adapter);assert.equal(fresh.get().deathPhase,'recovered');assert.equal(fresh.get().powerMode,'charging');
 fresh.replace({...fresh.get(),deathPhase:null,day:90,clock:'23:59',batteryPercent:1,emergencyCharge:true});
 assert.equal(fresh.get().batteryPercent,20);assert.equal(fresh.get().emergencyCharge,false);
});
test('old broken D90 saves migrate without deleting authored content or staying emergency-locked',()=>{
 const adapter=storage(),s=at(90,'23:59');delete s.timelineVersion;s.calendar={anchorDay:90,anchorDate:'2026-10-26'};s.batteryPercent=1;s.emergencyCharge=true;s.powerMode='charging';s.content.notes[0].text='保留内容';
 adapter.setItem(KEY,JSON.stringify(s));const restored=new PhoneStore(adapter).get();
 assert.equal(dateParts(restored).iso,'2025-08-16');assert.equal(restored.batteryPercent,20);assert.equal(restored.powerMode,'idle');assert.equal(restored.emergencyCharge,false);assert.equal(restored.content.notes[0].text,'保留内容');
});
test('preview resets narrative phase so an author can test the timeline repeatedly',()=>{
 const s=at(91,'03:00');syncDeathNight(s);setPreviewDate(s,{day:89,clock:'23:58'});
 assert.equal(s.deathPhase,null);assert.equal(dateParts(s).iso,'2025-08-15');assert.equal(plugIn(s),true);
});
