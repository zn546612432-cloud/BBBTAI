import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {postBankTransaction} from '../src/services/bank.js';
import {activateStory55,syncLegacyLoanReceipt55} from '../src/services/story55/runtime.js';
import {queueableNotices} from '../src/services/messaging/incoming-banner-queue.js';
import {deploymentReadiness,startDeploymentStep,upgradeHardware} from '../src/services/story55/projects.js';
import {deploymentView} from '../src/apps/ghost/deployment/index.js';

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

test('Ghost readiness and its actual runner share hardware and authorization rules',()=>{
 const s=story();s.day=16;s.clock='09:35';
 s.story55.completed.code={day:14,clock:'09:16'};
 s.story55.projects.base={authorized:true,batches:[],active:null};
 const blocked=deploymentReadiness(s,'base');
 assert.equal(blocked.canStart,false);
 assert.match(blocked.reason,/設備等級不足/);
 assert.match(deploymentView(s,'base'),/disabled aria-disabled="true"/);
 assert.throws(()=>startDeploymentStep(s,'base'),/設備等級不足/);
 s.bankData.balance=1000000;
 upgradeHardware(s);
 assert.equal(s.story55.hardware,2);
 assert.equal(deploymentReadiness(s,'base').canStart,true);
 const runId=startDeploymentStep(s,'base');
 assert.equal(runId,'s55:base:0:0');
 assert.equal(startDeploymentStep(s,'base'),runId);
 assert.equal(s.ghost.orders[runId].type,s.story55.config.projects.find(p=>p.id==='base').steps[0]);
 assert.doesNotMatch(deploymentView(s,'base'),/disabled aria-disabled="true"/);
});

test('Ghost day capacity is enforced by the same readiness used in the view',()=>{
 const s=story();s.day=14;s.clock='12:00';s.story55.hardware=2;
 s.story55.completed.code={day:14,clock:'09:16'};
 s.story55.projects.base={authorized:true,batches:[],active:null};
 const stages=s.story55.config.projects.find(p=>p.id==='base').steps;
 s.story55.projects.base.batches.push({complete:true,steps:stages.map((_,i)=>({id:'completed-'+i}))});
 const availability=deploymentReadiness(s,'base');
 assert.equal(availability.canStart,false);
 assert.match(availability.reason,/今日可執行/);
 assert.throws(()=>startDeploymentStep(s,'base'),/今日可執行/);
});
