import test from 'node:test';
import assert from 'node:assert/strict';
import {tickD03Chats,d03Draft,sendD03WeChat} from '../src/story/d03/wechat.js';
import {D03_ORDER,D03_REWARD,D03_STAGES,d03StepId,seedD03Contract,acceptD03Contract,onD03GhostWin,submitD03Contract,tickD03Contract} from '../src/story/d03/contract.js';
import {tickD03MomentReply} from '../src/story/d03/moments.js';
import {addGameMomentComment} from '../src/apps/wechat/features/moments/model.js';

function state(clock='08:00'){
 return {
  story55:{version:1,flowD03:{submitted:false}},day:3,clock,unlocked:true,
  nav:{current:{appId:'home',route:'/',params:{}}},
  content:{conversations:{wechat:[
   {id:'group',name:'GROUP',group:true,messages:[],unread:0},
   {id:'hufeng',name:'胡枫',messages:[],unread:0},
   {id:'xiaoxin',name:'小辛',messages:[],unread:0},
   {id:'wang',name:'熙旺',messages:[],unread:0}
  ]},orders:[],mail:[],missionFiles:[],moments:{posts:[],comments:{},likes:{},editedPosts:{},deletedIds:[],profiles:{}}},
  notifications:[],events:[],drafts:{},ghost:{orders:{},history:[],balance:0,config:{}},
  bankData:{balance:0,transactions:[]}
 };
}
const store=s=>({get:()=>s,update:fn=>fn(s)});

test('morning group time fallback includes Xiao Xin 1 before the afternoon recall',()=>{
 const s=state('08:39');
 tickD03Chats(s,0);
 assert.equal(s.content.conversations.wechat[0].messages.length,0);
 s.clock='08:40';
 tickD03Chats(s,0);
 assert.equal(s.story55.d03Chats.morning.mode,'fallback');
 for(let now=1000;now<30000;now+=2300)tickD03Chats(s,now);
 const messages=s.content.conversations.wechat[0].messages;
 assert.equal(messages.filter(m=>m.text==='1'&&m.from==='小辛').length,1);
 assert.ok(messages.some(m=>m.text.includes('下午去一趟')));
 assert.equal(messages.filter(m=>m.from==='me').length,0);
 tickD03Chats(s,50000);
 assert.equal(messages.filter(m=>m.text==='1'&&m.from==='小辛').length,1);
});
test('Flow completion triggers early delivery, but never double-sends fallback',()=>{
 const s=state('08:20');s.story55.flowD03.submitted=true;
 tickD03Chats(s,0);
 assert.equal(s.story55.d03Chats.morning.mode,'completed-task');
 tickD03Chats(s,1000);
 s.clock='08:55';tickD03Chats(s,6000);
 assert.equal(s.content.conversations.wechat[0].messages.filter(x=>x.id==='d03-morning-0').length,1);
});
test('Hu Feng scripted player bubbles are not auto-sent',()=>{
 const s=state('10:45');tickD03Chats(s,0);
 tickD03Chats(s,1000);
 tickD03Chats(s,3500);
 const c=s.content.conversations.wechat.find(c=>c.id==='hufeng');
 assert.equal(c.messages.length,2);
 assert.equal(d03Draft(s,'hufeng')?.text,'幹嘛');
 assert.equal(sendD03WeChat(store(s),'hufeng','亂發').reason,'請發送輸入框裡完整的預設台詞');
 assert.equal(c.messages.length,2);
 assert.equal(sendD03WeChat(store(s),'hufeng','幹嘛',4000).messageId,'d03-hufeng-2');
 assert.equal(c.messages.at(-1).from,'me');
});
test('B-class mission requires 3 successful games, manual submission, pays once',()=>{
 const s=state('13:40');
 assert.equal(seedD03Contract(s),true);
 assert.equal(s.content.orders.find(o=>o.id===D03_ORDER).status,'OPEN');
 assert.equal(acceptD03Contract(s),true);
 assert.equal(s.bankData.balance,0);
 assert.equal(submitD03Contract(s),false);
 for(let i=0;i<D03_STAGES.length;i++){
  const run=s.ghost.orders[d03StepId(i)];
  assert.ok(run);
  run.status='success';
  assert.equal(onD03GhostWin(s,d03StepId(i)),true);
 }
 assert.equal(s.content.orders[0].status,'READY');
 assert.equal(submitD03Contract(s),true);
 assert.equal(s.bankData.balance,D03_REWARD);
 assert.equal(submitD03Contract(s),false);
 assert.equal(s.bankData.transactions.filter(x=>x.id==='d03-intelligence-settlement').length,1);
 assert.equal(s.content.mail.filter(x=>x.id==='d03-intelligence-settlement').length,1);
});
test('mission clock expiry never pays an unfinished commission',()=>{
 const s=state('13:40');seedD03Contract(s);acceptD03Contract(s);
 s.day=5;s.clock='13:41';tickD03Contract(s);
 assert.equal(s.content.orders[0].status,'EXPIRED');
 assert.equal(submitD03Contract(s),false);
 assert.equal(s.bankData.balance,0);
});
test('D04 rose requires manual player comment on D03; not just a like',()=>{
 const s=state('19:15');
 s.content.moments.likes['xw-d03']=true;
 s.day=4;s.clock='08:30';
 assert.equal(tickD03MomentReply(s),false);
 s.day=3;s.clock='19:16';
 addGameMomentComment(s,'xw-d03','想你了快回來');
 assert.equal(tickD03MomentReply(s),false);
 s.day=4;s.clock='08:29';assert.equal(tickD03MomentReply(s),false);
 s.clock='08:30';assert.equal(tickD03MomentReply(s),true);
 assert.equal(tickD03MomentReply(s),false);
 assert.equal(s.content.moments.comments['xw-d03'].filter(x=>x.text==='🌹').length,1);
});
test('D04 comments cannot fabricate a reply that belonged to D03',()=>{
 const s=state('09:30');s.day=4;
 addGameMomentComment(s,'xw-d03','想你了快回來');
 assert.equal(tickD03MomentReply(s),false);
});
