import test from 'node:test';
import assert from 'node:assert/strict';
import {pauseTaiRemoteOnHide,resumeTaiRemoteOnShow,createTaiForegroundDelay} from '../src/system/remote-control/visibility.js';
import {createTaiRemoteController} from '../src/system/remote-control/controller.js';

function fixture({sourceType='ghost-order',stage='running',status='running'}={}){
 const orderId='s55:base:0:0';
 const control={
  id:orderId,type:'strike',story55Project:'base',status,
  attempts:1,deadline:50000,startedAt:10000,previewUntil:0,
  board:{arcade:{kind:'strike',hits:2,misses:0,target:7,lockUntil:14000}},
  moves:2
 };
 const other={
  id:'unrelated-extract',type:'extract',status:'running',
  deadline:50000,startedAt:10000,
  board:{arcade:{kind:'extract',lockUntil:14000,matched:[],revealed:[]}}
 };
 const s={
  story55:{
   ghostShareTakeovers:1,
   ghostShare:{phase:'controlling',
    source:sourceType==='ghost-order'?
     {type:'ghost-order',orderId}:{type:'ghost-project',projectId:'base'},
    remote:{active:true,token:'stable-token',stage,authorizedDay:18,
     orderId:stage==='typing'?null:orderId,pausedAt:null}},
   projects:{base:{active:orderId}}
  },
  ghost:{orders:{[orderId]:control,'unrelated-extract':other},history:[]}
 };
 return {s,control,other,orderId};
}
test('B visibility pause freezes only active GHOST order deadline and keeps scene/token',()=>{
 const {s,control,other}=fixture(),beforeOther=structuredClone(other);
 assert.equal(pauseTaiRemoteOnHide(s,20000),true);
 assert.equal(s.story55.ghostShare.phase,'controlling');
 assert.equal(s.story55.ghostShare.remote.active,true);
 assert.equal(s.story55.ghostShare.remote.pausedAt,20000);
 assert.equal(pauseTaiRemoteOnHide(s,27000),false,'repeated hide may not reset pause anchor');
 assert.equal(resumeTaiRemoteOnShow(s,27500),true);
 assert.equal(control.deadline,57500,'deadline retains exact time remaining');
 assert.equal(control.startedAt,17500);
 assert.equal(control.board.arcade.lockUntil,21500);
 assert.equal(control.moves,2);
 assert.equal(control.board.arcade.hits,2);
 assert.equal(s.story55.ghostShareTakeovers,1);
 assert.equal(s.story55.ghostShare.remote.token,'stable-token');
 assert.equal(s.story55.ghostShare.remote.pausedAt,null);
 assert.deepEqual(other,beforeOther,'unrelated commission must not freeze');
 assert.deepEqual(s.ghost.history,[]);
 assert.equal(resumeTaiRemoteOnShow(s,30000),false,'double foreground event may not add time');
});
test('B pause works when an already-started project or preview result is active',()=>{
 const {s,control}=fixture({sourceType:'ghost-project',status:'preview-win'});
 control.deadline=null;control.previewUntil=30000;
 assert.equal(pauseTaiRemoteOnHide(s,22000),true);
 assert.equal(resumeTaiRemoteOnShow(s,28000),true);
 assert.equal(control.previewUntil,36000,'3-second GHOST preview does not finish in background');
 assert.equal(control.deadline,null);
 assert.equal(control.startedAt,16000);
 assert.equal(control.status,'preview-win');
});
test('B pause during Mirage typing does not invent a GHOST deadline or consume a stage',()=>{
 const {s,control}=fixture({stage:'typing',status:'authorized'});
 const before=structuredClone(control);
 assert.equal(pauseTaiRemoteOnHide(s,500),true);
 assert.equal(resumeTaiRemoteOnShow(s,3500),true);
 assert.deepEqual(control,before);
 assert.equal(s.story55.ghostShare.phase,'controlling');
 assert.equal(s.story55.ghostShareTakeovers,1);
});
test('B repeated hide/show, inactive, stale order and clock reversals are safe',()=>{
 const {s,control,other}=fixture();
 const unrelated=structuredClone(other);
 assert.equal(pauseTaiRemoteOnHide(s,10000),true);
 assert.equal(resumeTaiRemoteOnShow(s,7000),true,'clock anomaly clamps to zero');
 assert.equal(control.deadline,50000);
 assert.equal(pauseTaiRemoteOnHide(s,12000),true);
 assert.equal(resumeTaiRemoteOnShow(s,16000),true);
 assert.equal(control.deadline,54000);
 assert.equal(pauseTaiRemoteOnHide(s,17000),true);
 assert.equal(resumeTaiRemoteOnShow(s,19000),true);
 assert.equal(control.deadline,56000);
 assert.deepEqual(other,unrelated);
 s.story55.ghostShare.remote.active=false;
 assert.equal(pauseTaiRemoteOnHide(s,24000),false);
 assert.equal(resumeTaiRemoteOnShow(s,30000),false);
 s.story55.ghostShare.remote.active=true;
 s.story55.ghostShare.source.orderId='other-unshared';
 assert.equal(pauseTaiRemoteOnHide(s,30000),true);
 assert.equal(resumeTaiRemoteOnShow(s,34000),true);
 assert.equal(control.deadline,56000,'mismatched order cannot gain a time extension');
});

function visibilityDocument(){
 const listeners=new Map();
 return {
  hidden:false,
  addEventListener(name,fn){
   if(!listeners.has(name))listeners.set(name,new Set());
   listeners.get(name).add(fn);
  },
  removeEventListener(name,fn){listeners.get(name)?.delete(fn);},
  querySelector(){return null;},
  toggle(hidden){
   this.hidden=hidden;
   for(const fn of [...(listeners.get('visibilitychange')||[])])fn();
  },
  count(name){return listeners.get(name)?.size||0;}
 };
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('controller listens to actual visibility events and preserves the same active session',()=>{
 const {s,control,other}=fixture(),doc=visibilityDocument(),beforeOther=structuredClone(other);
 const store={get:()=>s,update:fn=>fn(s)};
 const tasks={visible:false,show(){},hide(){},action(){}};
 const controller=createTaiRemoteController({
  store,router:{open(){}},tasks,document:doc,toast:()=>{}
 });
 assert.equal(controller.busy,false);
 doc.toggle(true);
 assert.ok(Number.isFinite(s.story55.ghostShare.remote.pausedAt));
 assert.equal(s.story55.ghostShare.phase,'controlling');
 // The store retains the previous board and count while hidden.
 assert.equal(control.moves,2);
 doc.toggle(false);
 assert.equal(s.story55.ghostShare.remote.pausedAt,null);
 assert.equal(s.story55.ghostShare.remote.active,true);
 assert.equal(s.story55.ghostShare.remote.token,'stable-token');
 assert.equal(s.story55.ghostShareTakeovers,1);
 assert.deepEqual(other,beforeOther);
});
test('animation timer stays frozen while hidden, then resumes on foreground',async()=>{
 const doc=visibilityDocument(),delay=createTaiForegroundDelay(doc);
 doc.toggle(true);
 let finished=false;
 const pending=delay(45).then(()=>finished=true);
 await sleep(95);
 assert.equal(finished,false,'must not consume hidden time or fire an old click');
 doc.toggle(false);
 await pending;
 assert.equal(finished,true);
 assert.equal(doc.count('visibilitychange'),0,'all temporary visibility listeners removed');
});
test('partial animation progress is retained across hidden interval',async()=>{
 const doc=visibilityDocument(),delay=createTaiForegroundDelay(doc);
 let done=false;
 const pending=delay(200).then(()=>done=true);
 await sleep(50);
 doc.toggle(true);
 await sleep(235);
 assert.equal(done,false,'hidden background cannot complete an unfinished tap');
 const visibleAt=Date.now();
 doc.toggle(false);
 await pending;
 assert.ok(Date.now()-visibleAt>=55,'remaining foreground time must still elapse');
 assert.equal(doc.count('visibilitychange'),0);
});
