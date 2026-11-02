import test from 'node:test';
import assert from 'node:assert/strict';
import {randomRouteSolution,connected,createBoard} from '../src/apps/ghost/games/logic.js';
import {seedD01,deliverD01Opening,claimD01Bank,acceptD01Repair,deliverD01Attachment,deployD01,finishD01Round,submitD01Attachment,settleD01Repair,D01_REPAIR,d01Gate} from '../src/story/d01/runtime.js';

const fixture=()=>({
 day:1,clock:'08:00',calendar:{anchorDate:'2025-05-19'},
 story55:{version:1,d01:{}},
 content:{orders:[],mail:[],mirage:{digitalBalance:0,digitalTransactions:[]},conversations:{mirage:[]}},
 bankData:{balance:0,transactions:[]},notifications:[]
});
test('D01 bank claim requires email click and is idempotent',()=>{
 const s=fixture();seedD01(s);assert.equal(s.bankData.balance,0);
 assert.equal(deliverD01Opening(s),true);assert.equal(deliverD01Opening(s),false);
 s.clock='08:15';assert.equal(claimD01Bank(s),true);assert.equal(claimD01Bank(s),false);
 assert.equal(s.bankData.balance,2000);assert.equal(s.bankData.transactions.length,1);
 assert.equal(s.bankData.transactions[0].time,'08:15');
});
test('D01 five LINK repairs settle exactly 0.04 BTC once',()=>{
 const s=fixture();seedD01(s);assert.equal(d01Gate(s),true);
 assert.equal(acceptD01Repair(s),true);assert.equal(acceptD01Repair(s),false);
 assert.equal(s.content.conversations.mirage.length,1);
 assert.equal(s.content.conversations.mirage[0].messages[0].text,'通信已建立。');
 assert.equal(deliverD01Attachment(s),true);assert.equal(deliverD01Attachment(s),false);
 assert.equal(deployD01(s),true);
 for(let i=0;i<5;i++)assert.equal(finishD01Round(s),true);
 assert.equal(finishD01Round(s),false);
 assert.equal(submitD01Attachment(s),true);assert.equal(submitD01Attachment(s),false);
 assert.equal(settleD01Repair(s),true);assert.equal(settleD01Repair(s),false);
 assert.equal(s.content.mirage.digitalBalance,0.04);
 assert.equal(s.content.mirage.digitalTransactions.length,1);
 assert.equal(s.content.orders.find(o=>o.id===D01_REPAIR).status,'COMPLETED');
 assert.equal(d01Gate(s),true);
 deliverD01Opening(s);claimD01Bank(s);assert.equal(d01Gate(s),false);
});
test('random LINK geometry is solvable and not fixed',()=>{
 const variants=new Set();
 for(let i=0;i<64;i++){
  const solution=randomRouteSolution();
  assert.equal(solution.length,9);assert.ok(connected(solution).has(8));
  variants.add(solution.join(','));
  assert.equal(createBoard('route',{}).masks.length,9);
 }
 assert.ok(variants.size>=12,'expected varied solvable network geometries');
});
