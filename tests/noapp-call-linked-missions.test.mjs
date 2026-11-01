import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {initializeMirage} from '../src/apps/mirage/data.js';
import {saveLinkedMission,linkedMission,acceptLinkedMission,advanceLinkedMission,resetLinkedMission,linkedMailId,linkedArtifactId} from '../src/apps/mirage/linked-missions.js';
import {authorize,begin,finish,submit,settle} from '../src/apps/ghost/state.js';
import {deliverLinkedArtifact} from '../src/apps/mirage/linked-contract-runtime.js';
import {startIncoming,callState,callAction} from '../src/apps/noapp/voice-call.js';
const storeFor=(state=initialState())=>{let s=state;return {get:()=>s,update(fn){const next=structuredClone(s);fn(next);s=next;return s;}};};
const linked={id:'hardware-support-02',title:'硬件交付校验',description:'核对订单回执和虚构设备测试结果。',
 owner:'BASILISK SUPPLY',rewardLabel:'1,500 CREDITS',subject:'【MIRAGE】订单确认',
 body:'检查报告已送达。请确认任务并提交。',browserQuery:'硬件校验报告',type:'route',seconds:120,reward:1500};

test('developer can independently bind and complete a second custom contract across four apps',()=>{
 const store=storeFor();initializeMirage(store);
 store.update(s=>saveLinkedMission(s,linked));
 let s=store.get();
 assert.equal(s.content.orders.find(x=>x.id===linked.id).status,'OPEN');
 assert.equal(s.ghost.missionTypes[linked.id],'route');
 store.update(s=>assert.equal(acceptLinkedMission(s,linked.id),true));
 s=store.get();
 assert.ok(s.content.mail.some(m=>m.id===linkedMailId(linked.id)));
 assert.equal(s.notifications.filter(n=>n.id==='linked-mail-notice-'+linked.id).length,1);
 store.update(s=>{advanceLinkedMission(s,linked.id,2);advanceLinkedMission(s,linked.id,3);});
 store.update(s=>{authorize(s,{orderId:linked.id,mailId:linkedMailId(linked.id),type:linked.type});advanceLinkedMission(s,linked.id,4);});
 store.update(s=>assert.equal(begin(s,linked.id,1000),true));
 store.update(s=>finish(s,linked.id,true,2000));
 assert.equal(linkedMission(store.get(),linked.id).stage,5);
 store.update(s=>{assert.equal(submit(s,linked.id,3000),false);deliverLinkedArtifact(s,linked.id,linkedArtifactId(linked.id));});
 store.update(s=>{s.clock='22:30';settle(s,125000);});
 s=store.get();
 assert.equal(linkedMission(s,linked.id).stage,6);
 assert.equal(s.ghost.balance,1500);
 assert.equal(s.content.orders.find(x=>x.id===linked.id).status,'COMPLETED');
 assert.equal(s.content.mail.some(m=>m.id===linkedMailId(linked.id)),true);
});
test('custom contracts reject canonical story IDs and invalid payout/clock values',()=>{
 const store=storeFor();initializeMirage(store);
 for(const patch of [{id:'mirage-ouroboros-10btc-d05'},{id:'mirage-recruit-hacker'},{reward:-1},{seconds:1}]){
  assert.throws(()=>store.update(s=>saveLinkedMission(s,{...linked,...patch})));
 }
});
test('resetting one linked mission does not delete an unrelated customer/order',()=>{
 const store=storeFor();initializeMirage(store);
 store.update(s=>saveLinkedMission(s,linked));
 store.update(s=>saveLinkedMission(s,{...linked,id:'another-order-03',title:'测试第二单'}));
 store.update(s=>acceptLinkedMission(s,linked.id));
 store.update(s=>acceptLinkedMission(s,'another-order-03'));
 store.update(s=>resetLinkedMission(s,linked.id));
 const s=store.get();
 assert.equal(linkedMission(s,linked.id).stage,0);
 assert.equal(linkedMission(s,'another-order-03').stage,1);
 assert.ok(s.content.mail.some(m=>m.id===linkedMailId('another-order-03')));
 assert.ok(!s.content.mail.some(m=>m.id===linkedMailId(linked.id)));
});

test('an active NoApp call refuses another incoming call and removes only its notification on decline',()=>{
 const store=storeFor();store.update(s=>{s.day=60;s.notifications=[{id:'unrelated',title:'哥'}];});
 const ctx={store,refresh(){},router:{open(){}},toast(){}};
 assert.equal(startIncoming(ctx),true);
 const firstId=callState().sessionId;
 assert.equal(startIncoming(ctx),false);
 assert.equal(callState().sessionId,firstId);
 assert.equal(store.get().notifications.length,2);
 assert.equal(callAction('tai-decline',ctx),true);
 assert.equal(callState().state,'ended');
 assert.deepEqual(store.get().notifications.map(n=>n.id),['unrelated']);
});
test('a response returned after hanging up cannot continue the expired conversation',async()=>{
 const store=storeFor();store.update(s=>s.day=60);
 const oldFetch=globalThis.fetch,oldSession=globalThis.sessionStorage;
 let resolve;
 globalThis.sessionStorage={getItem:()=>null};
 globalThis.fetch=()=>new Promise(r=>{resolve=r;});
 const ctx={store,refresh(){},router:{open(){}},toast(){}};
 try{
  assert.equal(startIncoming(ctx),true);
  assert.equal(callAction('tai-accept',ctx),true);
  await Promise.resolve();await Promise.resolve(); // greeting's queued request
  assert.equal(callAction('tai-hangup',ctx),true);
  resolve?.({ok:true,text:async()=>JSON.stringify({text:'挂断之后不应该出现'})});
  await new Promise(r=>setImmediate(r));
  assert.equal(callState().state,'ended');
  assert.equal(callState().turnCount,0);
 }finally{
  if(oldFetch===undefined)delete globalThis.fetch;else globalThis.fetch=oldFetch;
  if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;
 }
});
