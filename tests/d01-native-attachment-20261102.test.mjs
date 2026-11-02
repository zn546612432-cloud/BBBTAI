import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {seedD01,acceptD01Repair,deliverD01Attachment,D01_REPAIR,D01_ATTACHMENT,D01_DONE,tickD01,deployD01} from '../src/story/d01/runtime.js';
import {authorize,begin,finish} from '../src/apps/ghost/state.js';
import {render as kiraRender,handle as kiraHandle} from '../src/apps/kira/index.js';
import {kiraDetail} from '../src/apps/kira/features/detail/index.js';
import {render as filesRender,handle as filesHandle} from '../src/apps/files/index.js';

function fixture(){
 const state=initialState();
 activateStory55(state);
 seedD01(state);
 acceptD01Repair(state);
 deliverD01Attachment(state);
 const routes=[];
 const store={get:()=>state,update:fn=>fn(state)};
 const ctx={store,router:{open:link=>routes.push(link)},toast:()=>{}};
 return {state,store,ctx,routes};
}
test('KIRA displays a single native attachment instead of mission debug buttons',()=>{
 const {state}=fixture(),html=kiraDetail(state,D01_ATTACHMENT);
 assert.match(html,/mirage001\.key/);
 assert.match(html,/data-action="kira-d01-open-file"/);
 assert.match(html,/kira-d01-attachment/);
 for(const action of ['kira-d01-key','kira-d01-ghost','kira-d01-submit'])assert.doesNotMatch(html,new RegExp(action));
 assert.doesNotMatch(html,/提交附件|打開 GHOST 完成鏈接|kira-attachment/);
 assert.match(html,/僱主已透過加密通道/);
});
test('attachment tap opens Files and Files passes the existing key to GHOST',()=>{
 const {state,ctx,routes}=fixture();
 kiraHandle('kira-d01-open-file',{dataset:{}},ctx);
 assert.deepEqual(routes.at(-1),{appId:'files',route:'/attachment/d01-mirage001',params:{mailId:D01_ATTACHMENT}});
 assert.equal(state.content.mail.find(x=>x.id===D01_ATTACHMENT).read,true);
 let html=filesRender({store:ctx.store},{route:'/attachment/d01-mirage001',params:{mailId:D01_ATTACHMENT}});
 assert.match(html,/data-action="files-d01-open-ghost"/);
 assert.match(html,/mirage001\.key/);
 assert.doesNotMatch(html,/提交附件/);
 filesHandle('files-d01-open-ghost',{dataset:{}},ctx);
 assert.equal(state.story55.d01.keyRevealed,true);
 assert.equal(state.ghost.orders[D01_REPAIR].key,'mirage001');
 assert.equal(state.ghost.orders[D01_REPAIR].type,'route');
 assert.deepEqual(routes.at(-1),{appId:'ghost',route:'/contract',params:{orderId:D01_REPAIR}});
 filesHandle('files-d01-back',{dataset:{}},ctx);
 assert.equal(routes.at(-1).route,'/mail/'+D01_ATTACHMENT);
});
test('direct Files link cannot bypass an unreceived or unaccepted key',()=>{
 const s=initialState();activateStory55(s);
 const ctx={store:{get:()=>s,update:fn=>fn(s)},router:{open:()=>{throw Error('should not navigate');}},toast:()=>{}};
 const html=filesRender({store:ctx.store},{route:'/attachment/d01-mirage001',params:{}});
 assert.match(html,/不可用/);
 filesHandle('files-d01-open-ghost',{dataset:{}},ctx);
 assert.ok(!s.ghost.orders[D01_REPAIR]);
});
test('fifth valid GHOST success auto-submits once and settles after 2 seconds; no double reward',()=>{
 const {state:s}=fixture();
 authorize(s,{orderId:D01_REPAIR,mailId:D01_ATTACHMENT,type:'route'});
 deployD01(s);
 for(let i=0;i<5;i++){
  const o=s.ghost.orders[D01_REPAIR];
  o.status='authorized';
  assert.equal(begin(s,D01_REPAIR,1000+i*10000),true);
  o.status='preview-win';o.previewUntil=2000+i*10000;
  finish(s,D01_REPAIR,true,o.previewUntil);
  assert.equal(s.story55.d01.completedRounds,i+1);
  assert.equal(!!s.story55.d01.submitted,i===4);
 }
 const when=s.story55.d01.submittedAt;
 assert.ok(Number.isFinite(when));
 assert.equal(s.content.mirage.digitalBalance,0);
 tickD01(s,when+1999);
 assert.equal(s.content.mirage.digitalBalance,0);
 tickD01(s,when+2001);
 tickD01(s,when+3000);
 assert.equal(s.content.mirage.digitalBalance,0.04);
 assert.equal(s.content.mirage.digitalTransactions.filter(x=>x.orderId===D01_REPAIR).length,1);
 assert.equal(s.content.mail.filter(m=>m.id===D01_DONE).length,1);
 assert.equal(s.content.orders.find(x=>x.id===D01_REPAIR).status,'COMPLETED');
 assert.doesNotMatch(kiraDetail(s,D01_ATTACHMENT),/提交附件/);
});


test('legacy save with five finished rounds is automatically submitted; old mail gets new body',()=>{
 const {state:s}=fixture(),d=s.story55.d01;
 d.completedRounds=5;d.deployed=true;d.submitted=false;
 const m=s.content.mail.find(x=>x.id===D01_ATTACHMENT);
 m.body='舊郵件文字：直接点击按钮';
 assert.match(kiraDetail(s,D01_ATTACHMENT),/僱主已透過加密通道/);
 assert.doesNotMatch(kiraDetail(s,D01_ATTACHMENT),/直接点击按钮/);
 assert.equal(tickD01(s,Date.now()),true);
 assert.equal(d.submitted,true);
 assert.equal(tickD01(s,d.submittedAt+2001),true);
 assert.equal(s.content.mirage.digitalBalance,0.04);
});
