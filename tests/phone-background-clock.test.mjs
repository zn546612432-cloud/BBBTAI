import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,PhoneStore,KEY} from '../src/services/storage.js';
import {activateStory55,tickStory55} from '../src/services/story55/runtime.js';
import {story55Config} from '../src/services/story55/state.js';
import {settlePhoneBackground,backgroundStoryBlocked} from '../src/system/runtime/controller.js';
import {tickWorld,setStory55MinutesPerSecond} from '../src/system/time/clock.js';
import {beginShortCharge} from '../src/system/power/battery.js';
import {deliverMissedScheduled} from '../src/story/presets/engine.js';
import {MessageDelivery} from '../src/services/messaging/delivery.js';
import {WorldTickBatch} from '../src/system/time/tick-batch.js';
import {tickPhoneRuntime} from '../src/system/runtime/controller.js';
const start=(day=2,clock='08:00')=>{
 const s=activateStory55(initialState());s.day=day;s.clock=clock;s.unlocked=true;
 s.nav.current={appId:'wechat',route:'/chat/group',params:{}};s.content.alarms=[];
 for(const n of story55Config(s).nodes)if(n.day<day)s.story55.completed[n.id]={day:n.day,clock:'12:00'};
 s.story55.d01={bankClaimed:true,rewardPaid:true};
 return s;
};
const reconcile=(s,from)=>{tickStory55(s);deliverMissedScheduled(s,from);};
const resume=(s,ms,extra={})=>settlePhoneBackground(s,ms,{now:1000+ms,reconcile,...extra});

test('background uses five game minutes per second regardless of open App or lock screen',()=>{
 for(const appId of ['home','wechat','ghost'])for(const unlocked of [true,false]){
  const s=start();s.nav.current.appId=appId;s.unlocked=unlocked;
  assert.equal(resume(s,10000).minutes,50);assert.equal(s.clock,'08:50');
  assert.equal(s.batteryPercent,96);assert.equal(s.nav.current.appId,appId);
 }
});
test('foreground App remains slow; fractional background time and developer speed are retained',()=>{
 const s=start();tickWorld(s,6000);assert.equal(s.worldMinuteFraction,0.5);
 resume(s,100);assert.equal(s.clock,'08:01');assert.equal(s.worldMinuteFraction,0);
 tickWorld(s,60000);assert.equal(s.clock,'08:06');
 setStory55MinutesPerSecond(s,2);resume(s,250);assert.equal(s.worldMinuteFraction,0.5);
 resume(s,250);assert.equal(s.clock,'08:07');
 setStory55MinutesPerSecond(s,0);resume(s,60000);assert.equal(s.clock,'08:07');
});
test('pending foreground fractions are settled before background changes the rate',()=>{
 const s=start(),batch=new WorldTickBatch();assert.equal(batch.take(s,6000),null);
 tickPhoneRuntime(s,batch.flush());resume(s,100);
 assert.equal(s.clock,'08:01');assert.equal(s.worldMinuteFraction,0);
 assert.equal(batch.flush(),null);
});
test('active main scene, call, green screen, remote takeover and editor block background fast-forward',()=>{
 for(const configure of [s=>s.story55.activeScene='return',s=>s.phoneCall={state:'ringing'},
  s=>s.phoneCall={state:'connected'},s=>s.story55.d13={phase:'green'},
  s=>s.story55.ghostShare={phase:'controlling',remote:{active:true}},s=>s.nav.current.appId='editor']){
  const s=start();configure(s);assert.equal(resume(s,60000).minutes,0);
  assert.equal(s.clock,'08:00');assert.equal(s.batteryPercent,100);
 }
 for(const extra of [{callActive:true},{restarting:true}]){
  const s=start();assert.equal(resume(s,60000,extra).minutes,0);
 }
});
test('D01 unfinished work is protected; future timed main scenes do not stop time early',()=>{
 const first=activateStory55(initialState());assert.equal(backgroundStoryBlocked(first),true);
 assert.equal(resume(first,60000).minutes,0);
 const s=start(11,'08:30');assert.equal(backgroundStoryBlocked(s),false);
 assert.equal(resume(s,60000).minutes,10);assert.equal(s.clock,'08:40');
 assert.equal(s.story55.completed.return,undefined);
 assert.equal(s.story55.scenes.return?.index||0,0,'no preset response or NPC sequence is auto-played');
});
test('D13 stops exactly at 22:10, delivers one mail and leaves wallet/call steps pending',()=>{
 const s=start(13,'22:00');const original=s.content.conversations.mirage.flatMap(c=>c.messages).filter(m=>m.from==='me').length;
 assert.equal(resume(s,60000).minutes,10);assert.equal(s.clock,'22:10');
 assert.equal(s.content.mail.filter(m=>m.id==='s55-d13-wallet-mail').length,1);
 assert.equal(s.notifications.filter(m=>m.id==='s55-mail-s55-d13-wallet-mail').length,1);
 assert.equal(s.story55.completed['d13-wallet-transfer'],undefined);
 assert.equal(resume(s,60000).minutes,0);assert.equal(s.clock,'22:10');
 assert.equal(s.content.mail.filter(m=>m.id==='s55-d13-wallet-mail').length,1);
 assert.equal(s.content.conversations.mirage.flatMap(c=>c.messages).filter(m=>m.from==='me').length,original);
});
test('D23 timed chess dialogue is protected even without a long-charge gate',()=>{
 const s=start(23,'22:10');assert.equal(resume(s,60000).minutes,6);
 assert.equal(s.clock,'22:16');assert.equal(s.story55.completed['d23-chess'],undefined);
});
test('alarm, 03:00 emergency, short-charge midnight and long absences retain exact boundaries',()=>{
 const a=start();a.content.alarms=[{id:'alarm',time:'08:10',enabled:true,repeat:'永不'}];
 assert.equal(resume(a,3600000).event,'alarm');assert.equal(a.clock,'08:10');
 const s=start(9,'23:00');assert.equal(resume(s,86400000).event,'emergency');
 assert.equal(s.day,10);assert.equal(s.clock,'03:00');assert.equal(s.batteryPercent,1);
 const short=start(2,'23:50');short.batteryPercent=50;assert.equal(beginShortCharge(short,1000),true);
 assert.equal(resume(short,60000).event,'short-charge-end');
 assert.equal(short.day,2);assert.equal(short.clock,'23:59');assert.equal(short.powerMode,'idle');
});
test('short charging credits once for the real elapsed interval alongside fast background time',()=>{
 const s=start();s.batteryPercent=50;assert.equal(beginShortCharge(s,1000),true);
 resume(s,6000);assert.equal(s.clock,'08:30');assert.equal(s.batteryPercent,51);
 assert.equal(s.shortCharge.elapsedMs,6000);
 resume(s,6000,{now:13000});assert.equal(s.clock,'09:00');assert.equal(s.batteryPercent,52);
 assert.equal(s.shortCharge.elapsedMs,12000);
});
test('scheduled catch-up preserves authored chronology, never invents outgoing lines and is idempotent',()=>{
 const s=start();s.storyPresets.rules=[
  {id:'late',enabled:true,kind:'proactive',mode:'scheduled',day:2,from:'08:30',to:'08:31',channel:'wechat',conversationId:'group',messages:['late'],once:true},
  {id:'early',enabled:true,kind:'proactive',mode:'scheduled',day:2,from:'08:10',to:'08:11',channel:'wechat',conversationId:'group',messages:['early'],once:true}
 ];
 resume(s,10000);
 const c=s.content.conversations.wechat.find(c=>c.id==='group');
 assert.deepEqual(c.messages.filter(m=>/^preset-(early|late)-/.test(m.id)).map(m=>[m.text,m.time]),[['early','08:10'],['late','08:30']]);
 resume(s,1000);assert.equal(c.messages.filter(m=>/^preset-(early|late)-/.test(m.id)).length,2);
 const data=new Map([[KEY,JSON.stringify(s)]]),store=new PhoneStore({getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});
 const delivery=new MessageDelivery(store);delivery.tick();delivery.tick();
 assert.equal(store.get().content.conversations.wechat.find(c=>c.id==='group').messages.filter(m=>/^preset-(early|late)-/.test(m.id)).length,2);
});
test('invalid intervals and finale states never fast-forward',()=>{
 for(const value of [0,-1,NaN,Infinity]){const s=start();assert.equal(resume(s,value).minutes,0);assert.equal(s.clock,'08:00');}
 for(const configure of [s=>s.story55.secondView=true,s=>s.story55.finalTransition={phase:'accelerating'},s=>{s.day=55;s.story55.scenes.ending={index:5};}]){
  const s=start();configure(s);assert.equal(resume(s,60000).minutes,0);
 }
});
