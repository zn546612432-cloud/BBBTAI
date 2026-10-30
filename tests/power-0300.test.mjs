import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,PhoneStore} from '../src/services/storage.js';
import {advanceGameMinutes,tickWorld} from '../src/system/time/clock.js';
import {drainBattery,plugIn,BATTERY_DRAIN_INTERVAL_MS} from '../src/system/power/battery.js';

test('03:00 forces 1%, freezes through reload, then charging wakes at 08:00 without skipping a date',()=>{
 const s=initialState();s.day=55;s.clock='23:59';s.batteryPercent=60;s.content.alarms=[];
 assert.equal(advanceGameMinutes(s,181).event,'emergency');
 assert.equal(s.day,56);assert.equal(s.clock,'03:00');assert.equal(s.batteryPercent,1);
 const adapter={data:null,getItem(){return this.data;},setItem(key,value){this.data=value;}};
 adapter.setItem('',JSON.stringify(s));const restored=new PhoneStore(adapter).get();
 assert.equal(restored.day,56);assert.equal(restored.clock,'03:00');
 assert.equal(tickWorld(restored,86_400_000).minutes,0);
 assert.equal(advanceGameMinutes(restored,1440).minutes,0);
 assert.equal(plugIn(restored),true);
 assert.equal(restored.day,56);assert.equal(restored.clock,'08:00');assert.equal(restored.batteryPercent,100);
});

test('elapsed foreground battery use cannot trigger the 1% state before 03:00',()=>{
 const s=initialState();s.day=56;s.clock='02:59';s.batteryPercent=10;
 drainBattery(s,BATTERY_DRAIN_INTERVAL_MS*100);
 assert.equal(s.batteryPercent,2);assert.equal(s.emergencyCharge,false);
 assert.equal(advanceGameMinutes(s,1).event,'emergency');
 assert.equal(s.batteryPercent,1);assert.equal(s.clock,'03:00');
});
