import test from 'node:test';
import assert from 'node:assert/strict';
import {LockScreen} from '../src/system/lock.js';
import {restartState} from '../src/system/restart/index.js';
import {initialState,PhoneStore,KEY} from '../src/services/storage.js';
import {storyDay,setPreviewDate,dateParts} from '../src/services/calendar.js';
import {render} from '../src/apps/developer/index.js';
test('0000 requests confirmation without unlocking; cancel preserves the run',()=>{
 const lock=new LockScreen(),s=initialState();lock.open();for(const digit of '0000')lock.key(digit);
 assert.equal(lock.stage,'restart');assert.equal(s.day,56);assert.equal(s.unlocked,false);
 lock.open();assert.equal(lock.stage,'passcode');assert.equal(lock.digits,'');
});
test('restart clears runtime progress, preserves authored rules and survives reload',()=>{
 const previous=initialState();previous.day=91;previous.deathPhase='passcode';previous.storyPresets.flags=['done'];previous.storyPresets.rules=[{id:'authored'}];previous.storyChargeGates=[{day:57,untilFlag:'done'}];
 const chat=previous.content.conversations.wechat[0];chat.messages.push({id:'authored-old',from:'wang',text:'保存的历史',time:'12:00',authored:true,delivery:{day:90}},{id:'player',actual:true});
 previous.ghost={orders:{one:{}},history:[1],config:{route:{seconds:20}}};
 const next=restartState(previous);assert.equal(next.day,1);assert.equal(next.clock,'08:00');assert.equal(dateParts(next).iso,'2025-05-19');assert.equal(next.batteryPercent,100);assert.equal(next.deathPhase,null);
 assert.deepEqual(next.storyPresets.flags,[]);assert.deepEqual(next.storyPresets.rules,[{id:'authored'}]);assert.equal(next.content.conversations.wechat[0].messages.some(m=>m.actual),false);assert.equal(next.content.conversations.wechat[0].messages[0].delivery,undefined);assert.deepEqual(next.ghost.orders,{});assert.deepEqual(next.events,[]);assert.deepEqual(next.matches,[]);
 const data=new Map([[KEY,JSON.stringify(next)]]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};assert.equal(new PhoneStore(storage).get().day,1);assert.equal(previous.day,91);
});
test('day, date and countdown share one canonical calendar',()=>{
 for(const [day,iso,remaining] of [[1,'2025-05-19',89],[89,'2025-08-15',1],[90,'2025-08-16',0],[91,'2025-08-17',0]]){
  assert.equal(storyDay(day).iso,iso);assert.equal(storyDay(day).remaining,remaining);const s=initialState();setPreviewDate(s,{day,clock:'12:00'});assert.equal(dateParts(s).iso,iso);
 }assert.throws(()=>storyDay(0));
});
test('each extracted developer feature renders independently',()=>{for(const route of ['conversations','sms','phone','assets','preview','presets'])assert.ok(render({store:{get:initialState}},{route:'/'+route}).length>100);});
