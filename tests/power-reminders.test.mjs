import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,PhoneStore,KEY} from '../src/services/storage.js';
import {dateParts} from '../src/services/calendar.js';
import {BATTERY_DRAIN_INTERVAL_MS,drainBattery,needsCharge,canCharge,plugIn,unplug} from '../src/system/power/battery.js';
import {advanceGameMinutes,tickWorld,setSleeping,absoluteMinute,dismissAlarm} from '../src/system/time/clock.js';
import {status} from '../src/system/shell.js';
import {powerFullscreen} from '../src/system/power/controls.js';
import {render as renderReminders} from '../src/apps/reminders/index.js';
import {isNativeScrollTarget} from '../src/system/gestures.js';

test('battery drains independently of the clock and low power animates in the island',()=>{
 const s=initialState();
 assert.equal(s.batteryPercent,82);
 assert.equal(drainBattery(s,BATTERY_DRAIN_INTERVAL_MS-1),0);
 assert.equal(drainBattery(s,1),1);
 assert.equal(s.batteryPercent,81);
 drainBattery(s,BATTERY_DRAIN_INTERVAL_MS*61);
 assert.equal(s.batteryPercent,20);
 assert.equal(needsCharge(s),true);
 assert.equal(drainBattery(s,BATTERY_DRAIN_INTERVAL_MS),1);
 s.batteryPercent=20;
 assert.match(status(s,{islandExpanded:true}),/Low Battery/);
 assert.match(status(s,{islandExpanded:true}),/Please charge/);
 assert.match(status(s,{islandExpanded:true}),/充电/);
 assert.match(status(s,{islandExpanded:true}),/拒绝/);
 assert.match(status(s),/battery-island/);
 assert.doesNotMatch(status(s),/is-expanded/);
 plugIn(s);assert.match(powerFullscreen(s),/power-day-charge/);
 assert.equal(s.batteryPercent,100);
});

test('1% enters an emergency black screen until charging; shutdown remains recoverable',()=>{
 const s=initialState();drainBattery(s,BATTERY_DRAIN_INTERVAL_MS*200);
 assert.equal(s.batteryPercent,1);
 assert.equal(s.emergencyCharge,true);
 assert.match(powerFullscreen(s),/power-emergency-screen/);
 assert.match(powerFullscreen(s),/关机/);
 assert.match(powerFullscreen(s),/充电/);
 s.poweredOff=true;
 assert.match(powerFullscreen(s),/power-off-screen/);
 plugIn(s);
 assert.equal(s.poweredOff,false);
 assert.equal(s.emergencyCharge,false);
});

test('direct charging preserves content, advances the calendar and cannot double skip',()=>{
 const s=initialState(),priorDate=dateParts(s).iso,priorContent=s.content;
 assert.equal(canCharge(s),true);assert.equal(plugIn(s),true);
 assert.equal(s.day,57);assert.equal(s.clock,'08:00');assert.equal(s.batteryPercent,100);
 assert.notEqual(dateParts(s).iso,priorDate);assert.strictEqual(s.content,priorContent);
 assert.equal(plugIn(s),false);assert.equal(unplug(s),false);
 tickWorld(s,1200);assert.equal(powerFullscreen(s),'');
});

test('existing saved battery percentage survives PhoneStore reload',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const store=new PhoneStore(storage);
 store.update(s=>drainBattery(s,BATTERY_DRAIN_INTERVAL_MS*7));
 assert.equal(new PhoneStore(storage).get().batteryPercent,75);
});

test('old generated morning notifications disappear without deleting authored notices',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const saved=initialState();
 saved.notifications=[
  {id:'morning-56',title:'早安',body:'新的一天开始了'},
  {id:'custom-1',title:'早安',body:'自己写的剧情'}
 ];
 storage.setItem(KEY,JSON.stringify(saved));
 const store=new PhoneStore(storage);
 assert.deepEqual(store.get().notifications.map(n=>n.id),['custom-1']);
});

test('Reminders declares a native scrolling surface, excluded from shade gestures',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const html=renderReminders({store:new PhoneStore(storage)},{route:'/'});
 assert.match(html,/data-native-scroll="reminders"/);
 assert.equal(isNativeScrollTarget({closest:selector=>selector==='[data-native-scroll]'?{}:null}),true);
 assert.equal(isNativeScrollTarget({closest:()=>null}),false);
});
