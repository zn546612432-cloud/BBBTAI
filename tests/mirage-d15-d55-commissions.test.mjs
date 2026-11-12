import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {D15_D55_CONTRACTS,D15_D55_RESTRICTED} from '../src/story/d15-d55/commissions.js';
import {
 DAILY_CONTRACTS,D04_MAIL,D04_STEP,seedD04Contracts,tickD04Contracts,
 acceptD04Contract,onD04GhostWin,submitD04Contract
} from '../src/story/d04/contract.js';
import {commissionAttachment,openCommissionWithGhost} from '../src/services/commissions/attachment-flow.js';
import {taiRemoteOrderAllowed} from '../src/system/remote-control/policy.js';

const state=(day,clock='08:00')=>{
 const s=activateStory55(initialState());
 s.day=day;s.clock=clock;
 return s;
};
const get=(s,id)=>s.content.orders.find(o=>o.id===id);
test('D15–D55 authored market has exactly two playable and three restricted listings per day',()=>{
 assert.equal(D15_D55_CONTRACTS.length,82);
 assert.equal(D15_D55_RESTRICTED.length,15);
 const ids=new Set([...D15_D55_CONTRACTS,...D15_D55_RESTRICTED].map(c=>c.id));
 assert.equal(ids.size,97);
 const stageLimits={C:[1,2],B:[2,3],A:[3,5],S:[2,5]};
 for(let day=15;day<=55;day++){
  assert.equal(D15_D55_CONTRACTS.filter(c=>c.day===day).length,2,'daily open D'+day);
  assert.equal(D15_D55_RESTRICTED.filter(c=>day>=c.day&&day<=c.endDay).length,3,'daily restricted D'+day);
 }
 for(const o of D15_D55_CONTRACTS){
  assert.ok(o.title&&o.description&&o.owner&&o.key&&o.attachment&&o.letter,o.id);
  assert.ok(o.stages.length>=stageLimits[o.grade][0]&&o.stages.length<=stageLimits[o.grade][1],o.id);
  assert.deepEqual(o.deadline,o.grade==='S'?{day:o.day,clock:'23:59'}:o.deadline);
  assert.ok(DAILY_CONTRACTS.some(c=>c.id===o.id),o.id);
  assert.doesNotMatch(o.title+' '+o.description+' '+o.letter,/玩家|遊戲|任務關卡|Ghost：|小遊戲|點擊開始|模擬操作/);
 }
 for(const o of D15_D55_RESTRICTED)assert.equal(DAILY_CONTRACTS.some(c=>c.id===o.id),false,o.id);
});
test('D15/D16 approved texts and sequence are preserved',()=>{
 const a=id=>D15_D55_CONTRACTS.find(c=>c.id===id);
 assert.equal(a('M-001').title,'收私人會所會員資料');
 assert.equal(a('M-001').amount,650);
 assert.deepEqual(a('M-001').stages,['cipher']);
 assert.equal(a('M-002').title,'碼頭倉庫監控處理');
 assert.deepEqual(a('M-002').stages,['route','veil']);
 assert.equal(a('M-006').amount,1450);
 assert.deepEqual(a('M-006').stages,['route','cipher']);
 assert.equal(a('M-007').amount,6800);
 assert.deepEqual(a('M-007').stages,['route','cipher','veil']);
});
test('seeding is idempotent; restricted contracts cannot enter the playable order runner',()=>{
 const s=state(15,'00:00');
 assert.equal(seedD04Contracts(s),true);
 const daily=s.content.orders.filter(o=>o.marketDaily&&o.storyDay===15);
 const locked=s.content.orders.filter(o=>o.marketRestricted&&o.storyDay<=15&&o.endDay>=15);
 assert.equal(daily.length,2);assert.equal(locked.length,3);
 assert.equal(seedD04Contracts(s),false);
 for(const o of locked){
  assert.equal(o.status,'RESTRICTED');
  assert.equal(acceptD04Contract(s,o.id),false);
  assert.equal(commissionAttachment(s,D04_MAIL(o.id)),null);
 }
 s.day=23;tickD04Contracts(s);
 assert.equal(s.content.orders.filter(o=>o.marketRestricted&&o.storyDay<=23&&o.endDay>=23).length,3);
 assert.equal(get(s,'M-003').status,'RESTRICTED');
});
test('D15 commissions take the original KIRA attachment, GHOST stages and one bank settlement',()=>{
 const s=state(15);
 seedD04Contracts(s);
 const c=D15_D55_CONTRACTS.find(o=>o.id==='M-002');
 assert.equal(acceptD04Contract(s,c.id),true);
 assert.equal(acceptD04Contract(s,c.id),false);
 assert.deepEqual(s.content.mail.filter(m=>m.orderId===c.id&&m.attachments?.length===1).map(m=>m.attachments[0]),[c.attachment]);
 const first=openCommissionWithGhost(s,D04_MAIL(c.id));
 assert.equal(first,D04_STEP(c.id,0));
 assert.equal(commissionAttachment(s,D04_MAIL(c.id)).name,c.attachment);
 assert.equal(s.ghost.orders[first].story55Commission,true);
 assert.equal(taiRemoteOrderAllowed(s,s.ghost.orders[first]),true);
 for(let i=0;i<c.stages.length;i++){
  const step=D04_STEP(c.id,i);
  assert.equal(s.ghost.orders[step].type,c.stages[i]);
  s.ghost.orders[step].status='success';
  assert.equal(onD04GhostWin(s,step),true);
 }
 assert.equal(get(s,c.id).status,'READY');
 // Completion on time, submission after the deadline: retain completed work.
 s.day=c.deadline.day+1;s.clock='09:00';
 tickD04Contracts(s);
 assert.equal(get(s,c.id).status,'READY');
 const before=s.bankData.balance;
 assert.equal(submitD04Contract(s,c.id),true);
 assert.equal(s.bankData.balance,before+c.amount);
 assert.equal(submitD04Contract(s,c.id),false);
 assert.equal(s.bankData.transactions.filter(x=>x.id.endsWith(c.id)).length,1);
 assert.equal(s.content.mail.filter(m=>m.id==='d04-receipt-'+c.id).length,1);
});
test('uncompleted S contracts expire at midnight without duplicate payouts',()=>{
 const s=state(27,'20:00');
 seedD04Contracts(s);
 const c=D15_D55_CONTRACTS.find(o=>o.id==='M-028');
 assert.equal(c.grade,'S');
 assert.equal(acceptD04Contract(s,c.id),true);
 s.day=28;s.clock='00:00';
 tickD04Contracts(s);
 assert.equal(get(s,c.id).status,'EXPIRED');
 assert.equal(submitD04Contract(s,c.id),false);
 assert.ok(!s.bankData.transactions.some(x=>x.id.endsWith(c.id)));
});

test('Mirage shows exactly five daily rows and never offers acceptance on restricted details',async()=>{
 const {setMirageAuthenticated}=await import('../src/apps/mirage/session.js');
 const {render}=await import('../src/apps/mirage/index.js');
 const s=state(15,'08:00'),store={get:()=>s};
 seedD04Contracts(s);
 setMirageAuthenticated(true);
 try{
  let html=render({store},{route:'/bounties'});
  assert.equal((html.match(/data-action="mc-open-bounty"/g)||[]).length,5);
  for(const id of ['M-001','M-002','M-003','M-004','M-005'])assert.ok(html.includes(id),id);
  const restricted=render({store},{route:'/order/M-003'});
  assert.ok(restricted.includes('非技術委託'));
  assert.ok(!restricted.includes('data-action="mc-accept-bounty"'));
  assert.ok(render({store},{route:'/order/M-001'}).includes('data-action="mc-accept-bounty"'));

  s.day=16;tickD04Contracts(s);
  html=render({store},{route:'/bounties'});
  assert.equal((html.match(/data-action="mc-open-bounty"/g)||[]).length,5);
  assert.ok(html.includes('M-006')&&html.includes('M-007'));
  assert.ok(!html.includes('M-001'));
  assert.ok(get(s,'M-001'),'yesterday\'s listing remains saved');
  assert.equal(render({store},{route:'/my-orders/active'}).includes('M-003'),false);

  s.day=23;tickD04Contracts(s);
  html=render({store},{route:'/bounties'});
  assert.equal((html.match(/data-action="mc-open-bounty"/g)||[]).length,5);
  assert.ok(html.includes('R-004')&&html.includes('R-005')&&html.includes('R-006'));
  assert.ok(!html.includes('M-003'));
 }finally{setMirageAuthenticated(false);}
});
