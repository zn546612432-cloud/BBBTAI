import test from 'node:test';
import assert from 'node:assert/strict';
import {generatePipeNetwork,pipeFlow,pipeSolved} from '../src/apps/ghost/games/pipe-network.js';
import {createBoard} from '../src/apps/ghost/games/logic.js';
import {authorize,begin,finish,startD01PipePreview} from '../src/apps/ghost/state.js';
import {seedD01,acceptD01Repair,queueD01ContactReply,d01ContactDue,tickD01ContactReply,D01_REPAIR,D01_CONTACT,deliverD01Opening,D01_OPENING,D01_ATTACHMENT,deliverD01Attachment} from '../src/story/d01/runtime.js';
import {sendD01WeChat,tickD01WeChat} from '../src/story/d01/wechat.js';
import {kiraDetail} from '../src/apps/kira/features/detail/index.js';

const fixture=()=>({
 day:1,clock:'08:00',calendar:{anchorDay:1,anchorDate:'2025-05-19'},
 story55:{version:1,d01:{}},
 content:{orders:[],mail:[],reminders:[],conversations:{mirage:[],wechat:[{id:'group',name:'狼崽團',messages:[],unread:0},{id:'wang',name:'熙旺',messages:[],unread:0}]},mirage:{digitalBalance:0,digitalTransactions:[]}},
 bankData:{balance:0,transactions:[]},notifications:[],events:[],drafts:{},unlocked:true,
 nav:{current:{appId:'home',route:'/'},stack:[]}
});
test('GHOST network puzzle grows 5×5 to 7×7, two fixed glowing terminals on separate cells',()=>{
 for(const n of [5,6,7]){
  for(let i=0;i<32;i++){
   const board=generatePipeNetwork({size:n});
   assert.equal(board.size,n);
   assert.equal(board.masks.length,n*n);
   assert.equal(board.solvedMasks.length,n*n);
   assert.notEqual(board.source,board.sink);
   assert.ok(board.solutionSteps>=n*2);
   assert.equal(pipeFlow(board.masks,board.source,n).has(board.sink),false,'must not start connected');
   assert.equal(pipeSolved(board),false,'scrambled puzzle must not already be won');
   assert.equal(pipeSolved({...board,masks:board.solvedMasks.slice()}),true,'solution must connect targets');
   assert.equal(createBoard('route',{pipeNetwork:true,pipeSize:n}).size,n);
  }
 }
});
test('GHOST D01 shows the solved board for three full real seconds before awarding progress',()=>{
 const s=fixture();seedD01(s);acceptD01Repair(s);
 s.story55.d01.deployed=true;s.story55.d01.completedRounds=0;
 authorize(s,{orderId:D01_REPAIR,type:'route',mailId:D01_ATTACHMENT});
 assert.equal(begin(s,D01_REPAIR,1000),true);
 const o=s.ghost.orders[D01_REPAIR];
 assert.equal(o.board.size,5);
 o.board.masks=o.board.solvedMasks.slice();
 assert.equal(startD01PipePreview(s,D01_REPAIR,2000),true);
 assert.equal(o.status,'preview-win');
 assert.equal(o.previewUntil,5000);
 assert.equal(s.story55.d01.completedRounds,0,'do not count a round immediately');
 finish(s,D01_REPAIR,true,4999);
 assert.equal(o.status,'preview-win');
 assert.equal(s.story55.d01.completedRounds,0);
 finish(s,D01_REPAIR,true,5000);
 assert.equal(o.status,'success');
 assert.equal(s.story55.d01.completedRounds,1);
 finish(s,D01_REPAIR,true,5001);
 assert.equal(s.story55.d01.completedRounds,1);
 o.status='authorized';
 assert.equal(begin(s,D01_REPAIR,6000),true);
 assert.equal(o.board.size,5);
 s.story55.d01.completedRounds=2;o.status='authorized';
 assert.equal(begin(s,D01_REPAIR,7000),true);
 assert.equal(o.board.size,6);
 s.story55.d01.completedRounds=4;o.status='authorized';
 assert.equal(begin(s,D01_REPAIR,8000),true);
 assert.equal(o.board.size,7);
});
test('Rookery 13 gives at most one pre-completion key reply, one post-completion well done, then silence',()=>{
 const s=fixture();seedD01(s);
 assert.equal(queueD01ContactReply(s,D01_CONTACT,100),false);
 acceptD01Repair(s);
 assert.equal(queueD01ContactReply(s,D01_CONTACT,100),true);
 assert.equal(queueD01ContactReply(s,D01_CONTACT,101),false);
 assert.equal(d01ContactDue(s,2099),false);
 assert.equal(tickD01ContactReply(s,2099),false);
 assert.equal(d01ContactDue(s,2100),true);
 assert.equal(tickD01ContactReply(s,2100),true);
 const c=s.content.conversations.mirage.find(c=>c.id===D01_CONTACT);
 assert.equal(c.messages.at(-1).text,'密鑰已經發給你郵箱了。');
 assert.equal(queueD01ContactReply(s,D01_CONTACT,3200),false);
 s.story55.d01.rewardPaid=true;
 assert.equal(queueD01ContactReply(s,D01_CONTACT,4000),true);
 assert.equal(tickD01ContactReply(s,6000),true);
 assert.equal(c.messages.at(-1).text,'well done.');
 assert.equal(queueD01ContactReply(s,D01_CONTACT,8000),false);
 assert.equal(c.messages.filter(m=>m.id==='d01-rookery-well-done').length,1);
});
test('D01 WeChat group delays are +2s per beat and an extra +3s between Xiaoxin and Xiwang',()=>{
 const s=fixture(),store={get:()=>s,update:f=>f(s)};
 sendD01WeChat(store,'group','起床',0);
 assert.equal(s.story55.d01.group.dueAt,5000);
 tickD01WeChat(s,4999);
 assert.equal(s.content.conversations.wechat[0].messages.length,1);
 tickD01WeChat(s,5000);
 assert.equal(s.story55.d01.group.dueAt,8000);
 tickD01WeChat(s,8000);
 assert.equal(s.story55.d01.group.dueAt,16000,'3+2+3 seconds at XiaoXin to Xiwang handoff');
 tickD01WeChat(s,15999);
 assert.equal(s.content.conversations.wechat[0].messages.length,3);
 tickD01WeChat(s,16000);
 assert.equal(s.content.conversations.wechat[0].messages.at(-1).from,'熙旺');
 assert.equal(s.story55.d01.group.dueAt,20000);
});
test('KIRA opening bank account is inline text and no phantom attachment button remains',()=>{
 const s=fixture();seedD01(s);deliverD01Opening(s);
 const html=kiraDetail(s,D01_OPENING);
 assert.match(html,/class="kira-d01-inline-link"/);
 assert.match(html,/data-action="kira-d01-bank"/);
 assert.doesNotMatch(html,/kira-attachment|查看附件/);
 assert.doesNotMatch(html,/kira-d01-inline-link[^>]*button-quiet/);
 acceptD01Repair(s);deliverD01Attachment(s);
 assert.doesNotMatch(kiraDetail(s,D01_ATTACHMENT),/查看附件/);
});
