import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {postBankTransaction} from '../src/services/bank.js';
import {activateStory55,syncLegacyLoanReceipt55,tickStory55,advanceScene55,sceneLines} from '../src/services/story55/runtime.js';
import {queueableNotices} from '../src/services/messaging/incoming-banner-queue.js';
import {deploymentReadiness,deploymentPercent,startDeploymentStep,upgradeBaseFramework,completeDeploymentRun} from '../src/services/story55/projects.js';
import {deploymentView,deploymentHome} from '../src/apps/ghost/deployment/index.js';
import {nodeStatus,completed} from '../src/services/story55/state.js';
import {handleStory55Action} from '../src/services/story55/controller.js';

const story=()=>activateStory55(initialState());

test('a loan ledger posting creates exactly one persisted Pacific receipt in the same state',()=>{
 const s=story();
 s.day=15;s.clock='15:36';
 const before=s.bankData.balance;
 postBankTransaction(s,{id:'s55-loan',label:'ANONYMOUS LOAN',amount:1000000,
  metadata:{liabilityId:'s55-loan',kind:'loan'},
  receipt:{id:'s55-loan-receipt',title:'Pacific',body:'帳戶入帳 US$1,000,000.00'}});
 assert.equal(s.bankData.balance-before,1000000);
 assert.equal(s.bankData.transactions.filter(t=>t.id==='s55-loan').length,1);
 assert.equal(s.notifications.filter(n=>n.id==='s55-loan-receipt').length,1);
 assert.equal(s.notifications.find(n=>n.id==='s55-loan-receipt').bannerPending,true);
 assert.throws(()=>postBankTransaction(s,{id:'s55-loan',label:'ANONYMOUS LOAN',amount:1000000}),/已处理/);
 assert.equal(s.bankData.balance-before,1000000);
});

test('one-time old-save loan receipt repair leaves balance and pre-existing notices untouched',()=>{
 const s=story();s.day=16;s.clock='08:29';
 s.story55.completed.loan={day:15,clock:'15:36'};
 s.bankData.balance=1014500;
 s.bankData.transactions.unshift({id:'s55-loan',label:'ANONYMOUS LOAN',amount:1000000,date:'2025-06-02',time:'15:36'});
 const unrelated={id:'wx-keep',title:'微信',body:'朋友發來消息'};
 const old={id:'s55-loan-receipt',title:'太平洋銀行',body:'入帳 1,000,000',link:{appId:'bank',route:'/'}};
 s.notifications.push(unrelated,old);
 const previous=JSON.stringify(s.bankData);
 assert.equal(syncLegacyLoanReceipt55(s),true);
 assert.equal(syncLegacyLoanReceipt55(s),false);
 assert.equal(JSON.stringify(s.bankData),previous);
 assert.equal(s.notifications.length,2);
 assert.equal(s.notifications[0],unrelated);
 assert.equal(old.bannerPending,true);
 assert.equal(old.link.route,'/receipt/s55-loan');
 const seen=new Set(s.notifications.map(n=>n.id));
 assert.deepEqual(queueableNotices(s.notifications,seen).map(n=>n.id),['s55-loan-receipt']);
 old.bannerShown=true;
 assert.equal(queueableNotices(s.notifications,seen).length,0);
});

test('an older loan transaction without a receipt is recovered once, not recredited',()=>{
 const s=story();s.day=16;s.clock='09:00';s.bankData.balance=1000000;
 s.bankData.transactions.push({id:'s55-loan',amount:1000000});
 assert.equal(syncLegacyLoanReceipt55(s),true);
 assert.equal(syncLegacyLoanReceipt55(s),false);
 assert.equal(s.bankData.balance,1000000);
 assert.equal(s.notifications.filter(n=>n.id==='s55-loan-receipt').length,1);
});

const runFiveLinks=s=>{
 for(let i=0;i<5;i++){
  const id=startDeploymentStep(s,'base'),run=s.ghost.orders[id];
  assert.equal(run.type,'route');
  run.status='success';
  assert.equal(completeDeploymentRun(s,run),true);
 }
};
test('D14 framework opens without hardware purchase and fails runtime only after five real LINK wins',()=>{
 const s=story();s.day=14;s.clock='12:00';
 s.story55.completed.code={day:14,clock:'09:16'};
 s.story55.projects.base={authorized:true,batches:[],active:null};
 assert.equal(s.story55.hardware,1);
 assert.equal(deploymentReadiness(s,'base').canStart,true);
 runFiveLinks(s);
 assert.equal(s.story55.projects.base.batches[0].complete,true);
 assert.equal(s.story55.projects.base.batches[0].runFailed,true);
 assert.equal(s.story55.reports['base-0'].status,'runtime-failed');
 assert.match(deploymentView(s,'base'),/部署成功！运行失败！/);
 assert.equal(deploymentPercent(s,'base'),9);
 assert.equal(s.bankData.transactions.filter(t=>t.id.startsWith('s55-base-upgrade-')).length,0);
 assert.equal(deploymentReadiness(s,'base').canStart,false);
 assert.throws(()=>startDeploymentStep(s,'base'),/等待D15/);
});
test('D15 upgrades require five fresh LINK wins plus exactly one $100,000 Pacific debit',()=>{
 const s=story();s.day=14;s.clock='12:00';
 s.story55.completed.code={day:14,clock:'09:16'};
 s.story55.projects.base={authorized:true,batches:[],active:null};
 runFiveLinks(s);
 s.day=15;s.clock='15:36';
 assert.equal(deploymentReadiness(s,'base').canStart,false);
 s.story55.completed.loan={day:15,clock:'15:36'};
 s.bankData.balance=1000000;
 assert.throws(()=>upgradeBaseFramework(s),/五次链接测试|等待升级|開始鏈接|开始链接|可開始/);
 runFiveLinks(s);
 assert.equal(deploymentReadiness(s,'base').canUpgrade,true);
 assert.match(deploymentView(s,'base'),/US\$100,000/);
 const before=s.bankData.balance;
 assert.equal(upgradeBaseFramework(s),true);
 assert.equal(s.bankData.balance,before-100000);
 assert.equal(s.bankData.transactions.filter(t=>t.id==='s55-base-upgrade-1').length,1);
 assert.equal(s.notifications.filter(n=>n.id==='s55-base-upgrade-1-receipt').length,1);
 assert.throws(()=>upgradeBaseFramework(s),/本日|等待升级|程序/);
 assert.equal(deploymentReadiness(s,'base').canStart,false);
 assert.equal(s.story55.hardware,1,'framework upgrades must not secretly change unrelated global hardware');
});
test('five tests per day cannot become ten when an earlier date was skipped',()=>{
 const s=story();s.day=16;s.clock='12:00';
 s.story55.completed.code={day:14,clock:'09:16'};
 s.story55.completed.loan={day:15,clock:'15:36'};
 s.story55.projects.base={authorized:true,batches:[],active:null};
 runFiveLinks(s);
 assert.equal(deploymentReadiness(s,'base').canStart,false);
 assert.match(deploymentReadiness(s,'base').reason,/本日已完成五次链接测试/);
 assert.throws(()=>startDeploymentStep(s,'base'),/本日已完成/);
});


test('D14 project stays inside native GHOST Projects; runtime error is acknowledged once',async()=>{
 const s=story();s.day=14;s.clock='12:00';
 s.story55.completed.code={day:14,clock:'09:16'};
 s.story55.projects.base={authorized:true,batches:[],active:null};
 runFiveLinks(s);
 const page=deploymentView(s,'base'),list=deploymentHome(s);
 assert.match(page,/class="gh-shell gh-flow-shell gh-fw-shell"/);
 assert.match(page,/role="alertdialog"/);
 assert.match(page,/部署成功！运行失败！/);
 assert.match(page,/<span>链接<\/span><strong>5 \/ 5<\/strong>/);
 assert.doesNotMatch(page,/等待D15|現有設備無法|现在设备无法|本轮已完成|s55-card|s55-percent/);
 assert.match(list,/LOCAL FRAMEWORK/);
 const ctx={store:{get:()=>s,update:f=>f(s)}};
 assert.equal(await handleStory55Action('s55-base-dismiss-report',{dataset:{}},ctx),true);
 assert.equal(s.story55.projects.base.baseRunNoticePending,false);
 assert.doesNotMatch(deploymentView(s,'base'),/role="alertdialog"/);
 assert.equal(s.story55.projects.base.baseRunNoticeShown,true);
});
test('D15 15:36 unlocks Mirage message, not an automatic million-dollar deposit',()=>{
 const s=story();s.day=14;s.clock='12:00';
 s.story55.completed.code={day:14,clock:'09:16'};
 s.story55.projects.base={authorized:true,batches:[],active:null};
 runFiveLinks(s);
 s.day=15;s.clock='15:35';tickStory55(s);
 assert.equal(nodeStatus(s,'loan').state,'locked');
 assert.equal(s.bankData.transactions.some(t=>t.id==='s55-loan'),false);
 s.clock='15:36';tickStory55(s);
 assert.equal(nodeStatus(s,'loan').state,'ready');
 assert.equal(s.bankData.transactions.some(t=>t.id==='s55-loan'),false);
 for(let i=0;i<30&&!completed(s,'loan');i++){
  const pos=s.story55.scenes?.loan?.index||0;
  const kind=sceneLines(s,'loan')[pos]?.[0];
  advanceScene55(s,'loan',{disconnect:kind==='disconnect'});
 }
 assert.equal(completed(s,'loan'),true);
 assert.equal(s.bankData.transactions.filter(t=>t.id==='s55-loan').length,1);
 assert.equal(s.notifications.filter(n=>n.id==='s55-loan-receipt').length,1);
 assert.equal(s.story55.liabilities,1000000);
 assert.equal(s.story55.loanOfflineDay,15);
 assert.match(deploymentView(s,'base'),/LOCAL FRAMEWORK/);
});
