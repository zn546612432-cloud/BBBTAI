import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {
 saveLinkedMission,acceptLinkedMission,advanceLinkedMission,
 linkedDeliveryId,linkedReceiptId,linkedMailId,linkedArtifactId,linkedMissionVisible,
 linkedMission,resetLinkedMission
} from '../src/apps/mirage/linked-missions.js';
import {deliverLinkedArtifact,linkedArtifacts,createLinkedArtifact,tickLinkedContracts,linkedNeedsWorldTick} from '../src/apps/mirage/linked-contract-runtime.js';
import {authorize,begin,finish,submit,settle,needsWorldTick,advanceGhost} from '../src/apps/ghost/state.js';
import {render as kiraRender,handle as kiraHandle,submit as kiraSubmit} from '../src/apps/kira/index.js';
import {render as filesRender} from '../src/apps/files/index.js';
import {render as mirageRender} from '../src/apps/mirage/index.js';
import {validateLinkedContract} from '../src/apps/mirage/linked-contract-validator.js';

const ID='contract-archive-002';
const create=({publishDay=1,expiryDay=55,deadlineDay=null,deadlineClock='23:59',reviewMinutes=60}={})=>{
 const s=initialState();activateStory55(s);
 saveLinkedMission(s,{
  id:ID,title:'虚构档案比对',description:'检查加密文件',owner:'CLIENT-42',reward:2500,
  subject:'【MIRAGE】档案比对委托',body:'完成分析后请通过KIRA回复加密文件。',
  type:'cipher',seconds:60,browserQuery:'档案',publishDay,expiryDay,
  deadlineDay,deadlineClock,reviewMinutes
 });
 return s;
};
const accept=s=>{
 assert.equal(acceptLinkedMission(s,ID),true);
 assert.ok(s.content.mail.some(m=>m.id===linkedMailId(ID)));
 assert.equal(advanceLinkedMission(s,ID,2),true);
 assert.equal(advanceLinkedMission(s,ID,3),true);
 const o=authorize(s,{orderId:ID,mailId:linkedMailId(ID),type:'cipher'});
 advanceLinkedMission(s,ID,4);
 assert.equal(begin(s,ID,1000),true);
 finish(s,ID,true,2000);
 assert.equal(o.status,'success');
 assert.equal(linkedMission(s,ID).stage,5);
 return o;
};
test('GHOST completion creates file but never sends KIRA mail or deposits money',()=>{
 const s=create(),run=accept(s);
 assert.equal(run.status,'success');
 const file=linkedArtifacts(s).find(f=>f.id===linkedArtifactId(ID));
 assert.ok(file);assert.equal(file.source,'ghost');
 assert.equal(submit(s,ID),false);
 assert.equal(settle(s,Date.now()+10000000),false);
 assert.equal(s.content.mirage.digitalBalance,0);
 assert.equal(s.content.mail.some(m=>m.id===linkedDeliveryId(ID)),false);
 assert.equal(s.content.orders.find(o=>o.id===ID).status,'ACCEPTED');
 assert.match(kiraRender({store:{get:()=>s}},{route:'/mail/'+linkedMailId(ID),params:{}}),/回复邮件并附上成果文件/);
 assert.match(filesRender({store:{get:()=>s}},{route:'/linked/'+ID,params:{}}),/GH-CONTRACT-ARCHIVE-002\.enc/);
});
test('KIRA composer must explicitly select actual GHOST-produced attachment',()=>{
 const s=create(),run=accept(s),ctx={
  store:{get:()=>s,update:fn=>fn(s)},router:{open:()=>{}},toast:()=>{}
 };
 const html=kiraRender({store:{get:()=>s}},{route:'/compose/linked/'+ID,params:{}});
 assert.match(html,/name="attachment" required/);
 assert.match(html,new RegExp(linkedArtifactId(ID).replaceAll('.','\\.') ));
 assert.throws(()=>deliverLinkedArtifact(s,ID,''),/选择/);
 assert.throws(()=>deliverLinkedArtifact(s,ID,'some-other-contract.enc'),/选择/);
 assert.equal(run.status,'success');
});
test('manual send then game-time review pays once and generates payment receipt',()=>{
 const s=create({reviewMinutes:90});s.clock='10:00';const run=accept(s);
 const file=linkedArtifacts(s)[0];
 deliverLinkedArtifact(s,ID,file.id,{note:'请查收。'});
 assert.equal(run.status,'settling');
 assert.equal(s.content.orders.find(o=>o.id===ID).status,'REVIEWING');
 assert.equal(s.content.mail.find(m=>m.id===linkedDeliveryId(ID)).attachments[0],file.id);
 assert.equal(s.content.mail.find(m=>m.id===linkedDeliveryId(ID)).body.includes('请查收。'),true);
 assert.equal(s.content.mirage.digitalBalance,0);
 s.clock='11:29';assert.equal(needsWorldTick(s),false);assert.equal(tickLinkedContracts(s),false);
 s.clock='11:30';assert.equal(linkedNeedsWorldTick(s),true);assert.equal(advanceGhost(s,100000),undefined);
 assert.equal(s.content.mirage.digitalBalance,2500);
 assert.equal(s.ghost.balance,2500);
 assert.equal(s.content.orders.find(o=>o.id===ID).status,'COMPLETED');
 assert.equal(s.content.mirage.digitalTransactions.filter(m=>m.orderId===ID).length,1);
 assert.equal(s.content.mail.filter(m=>m.id===linkedReceiptId(ID)).length,1);
 assert.equal(linkedMission(s,ID).stage,6);
 assert.equal(tickLinkedContracts(s),false);
 assert.equal(s.content.mirage.digitalBalance,2500);
 assert.match(kiraRender({store:{get:()=>s}},{route:'/mail/'+linkedReceiptId(ID),params:{}}),/PAYMENT RECEIVED/);
});
test('deadline invalidates accepted unfinished job, cannot submit or pay',()=>{
 const s=create({deadlineDay:2,deadlineClock:'12:00'});
 s.day=2;s.clock='11:55';accept(s);
 s.clock='12:01';assert.equal(tickLinkedContracts(s),true);
 assert.equal(s.content.orders.find(o=>o.id===ID).status,'FAILED');
 assert.equal(s.ghost.orders[ID].status,'expired');
 assert.throws(()=>deliverLinkedArtifact(s,ID,linkedArtifactId(ID)),/请先完成|超过/);
 assert.equal(s.content.mirage.digitalBalance,0);
 assert.equal(acceptLinkedMission(s,ID),false);
});
test('submitted before deadline can be paid even after delivery deadline',()=>{
 const s=create({deadlineDay:2,deadlineClock:'12:00',reviewMinutes:120});
 s.day=2;s.clock='11:59';accept(s);
 deliverLinkedArtifact(s,ID,linkedArtifactId(ID));
 s.clock='14:00';tickLinkedContracts(s);
 assert.equal(s.content.orders.find(o=>o.id===ID).status,'COMPLETED');
 assert.equal(s.content.mirage.digitalBalance,2500);
});
test('publication days hide unreleased contracts without mutating authored config',()=>{
 const s=create({publishDay:10,expiryDay:12});
 s.day=1;
 assert.equal(linkedMissionVisible(s,ID),false);
 assert.equal(acceptLinkedMission(s,ID),false);
 s.day=10;assert.equal(linkedMissionVisible(s,ID),true);
 s.day=13;assert.equal(acceptLinkedMission(s,ID),false);
 assert.equal(linkedMissionVisible(s,ID),false);
});
test('retries after failure do not spend wallet or cap attempts',()=>{
 const s=create(),run=undefined;acceptLinkedMission(s,ID);
 advanceLinkedMission(s,ID,2);advanceLinkedMission(s,ID,3);
 authorize(s,{orderId:ID,mailId:linkedMailId(ID),type:'cipher'});advanceLinkedMission(s,ID,4);
 const o=s.ghost.orders[ID];
 o.attempts=10000;o.settings.retries=1;
 assert.equal(begin(s,ID),true);finish(s,ID,false);
 assert.equal(begin(s,ID),true);finish(s,ID,true);
 assert.ok(linkedArtifacts(s).length===1);
 assert.equal(s.content.mirage.digitalBalance,0);
});
test('explicit reset removes attached sent record, digital credit and generated artifact once',()=>{
 const s=create(),run=accept(s);deliverLinkedArtifact(s,ID,linkedArtifactId(ID));
 s.clock='10:00';tickLinkedContracts(s);
 assert.equal(s.ghost.orders[ID].status,'paid');
 assert.equal(resetLinkedMission(s,ID),true);
 assert.equal(s.content.mirage.digitalBalance,0);
 assert.equal(linkedArtifacts(s).length,0);
 assert.equal(s.content.mail.some(m=>m.id===linkedDeliveryId(ID)),false);
 assert.equal(s.content.mail.some(m=>m.id===linkedReceiptId(ID)),false);
 assert.equal(s.content.orders.find(o=>o.id===ID).status,'OPEN');
});

test('developer one-click simulation detects missing links without altering the current save',()=>{
 const s=create({publishDay:10,reviewMinutes:60}),before=JSON.stringify(s);
 const result=validateLinkedContract(s,ID);
 assert.equal(result.ok,true,result.error);
 assert.equal(result.steps.filter(x=>x.ok).length,5);
 assert.equal(JSON.stringify(s),before,'the dry-run must not affect player data');
 const broken=structuredClone(s);
 delete broken.content.orders[broken.content.orders.findIndex(o=>o.id===ID)];
 const failure=validateLinkedContract(broken,ID);
 assert.equal(failure.ok,false);
 assert.match(failure.error,/MIRAGE/);
});
test('developer validator reports review finishing beyond D55 instead of lying about payout',()=>{
 const s=create({publishDay:55,reviewMinutes:200});
 const result=validateLinkedContract(s,ID);
 assert.equal(result.ok,false);
 assert.match(result.error,/D55/);
 assert.equal(s.content.mirage.digitalBalance,0);
});
