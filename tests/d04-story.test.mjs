import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {D04_GROUP,D04_PRIVATE} from '../src/story/d04/dialogue.js';
import {D04_MEDIA,tickD04Chats,d04Draft,d04DinnerConfirmed,sendD04WeChat,d04ChatDue} from '../src/story/d04/wechat.js';
import {D04_CONTRACTS,D04_STEP,seedD04Contracts,acceptD04Contract,onD04GhostWin,submitD04Contract,tickD04Contracts} from '../src/story/d04/contract.js';
import {D04_MAIL} from '../src/story/d04/contract.js';
import {openCommissionWithGhost} from '../src/services/commissions/attachment-flow.js';
import {allMoments,addGameMomentComment} from '../src/apps/wechat/features/moments/model.js';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55} from '../src/services/story55/runtime.js';
import {worldMinuteRate,STORY55_CHAT_MINUTES_PER_MS} from '../src/system/time/clock.js';

function fixture(clock='08:00'){
 return {
  story55:{version:1,completed:{}},day:4,clock,unlocked:true,worldMinuteFraction:0,
  nav:{current:{appId:'home',route:'/',params:{}}},
  content:{conversations:{wechat:[
   {id:'group',name:'狼崽團',group:true,messages:[],unread:0},
   {id:'hufeng',name:'胡楓',messages:[],unread:0},
   {id:'wang',name:'熙旺',messages:[],unread:0},
   {id:'xiaoxin',name:'小辛',messages:[],unread:0}
  ]},orders:[],mail:[],missionFiles:[],moments:{posts:[],comments:{},likes:{},editedPosts:{},deletedIds:[],profiles:{}}},
  notifications:[],events:[],drafts:{},ghost:{orders:{},history:[],balance:0,config:{}},
  bankData:{balance:100,transactions:[]}
 };
}
const store=s=>({get:()=>s,update:fn=>fn(s)});
const byId=(s,id)=>s.content.conversations.wechat.find(c=>c.id===id).messages;
test('D04 group has all ten authored, independent daily scenes and no Xiaoxin DM',()=>{
 assert.equal(D04_GROUP.filter(x=>!x.condition).length,9);
 assert.equal(D04_GROUP.filter(x=>x.condition==='dinner').length,2);
 assert.equal(D04_GROUP.filter(x=>x.condition==='no-dinner').length,1);
 assert.equal(D04_PRIVATE.length,4);
 assert.equal(D04_PRIVATE.filter(x=>x.chat==='xiaoxin').length,0);
 assert.ok(D04_GROUP.reduce((sum,x)=>sum+x.lines.length,0)>180);
});
test('D04 group delivers NPC bubbles one by one outside the group and counts every unread',()=>{
 const s=fixture('08:20');
 assert.equal(tickD04Chats(s,0),true); // scene timer starts, but no bubble is preloaded
 assert.equal(byId(s,'group').length,0);
 tickD04Chats(s,500);
 assert.equal(byId(s,'group').length,1);
 assert.equal(s.content.conversations.wechat[0].unread,1);
 assert.equal(s.notifications.filter(n=>n.conversationId==='group').length,1);
 tickD04Chats(s,700);
 assert.equal(byId(s,'group').length,1);
 tickD04Chats(s,2500);
 assert.equal(byId(s,'group').length,2);
 assert.equal(s.content.conversations.wechat[0].unread,2);
 assert.equal(s.notifications.filter(n=>n.conversationId==='group').length,2);
 assert.equal(byId(s,'group').filter(x=>x.from==='me').length,0);
});
test('overdue D04 scenes reconcile silently without fake dinner or player messages',()=>{
 const s=fixture('23:10');let now=0;
 tickD04Chats(s,now);
 assert.ok(s.notifications.filter(n=>n.conversationId==='group').every(n=>n.silent));
 const messages=byId(s,'group');
 assert.ok(messages.length>160);
 assert.ok(messages.some(m=>m.text==='晚安😡'));
 assert.ok(!messages.some(m=>m.from==='me'));
 assert.ok(messages.some(m=>m.id==='d04-cat-1'&&m.kind==='image'));
 assert.match(messages.find(m=>m.id==='d04-outfit-0').text,/d04-jacket.webp/);
 assert.ok(!messages.some(m=>m.id.startsWith('d04-dinner-confirmed-')));
 assert.ok(!messages.some(m=>m.id.startsWith('d04-dinner-post-')));
 assert.ok(messages.some(m=>m.id.startsWith('d04-dinner-unanswered-')));
 assert.equal(byId(s,'xiaoxin').length,0);
 assert.equal(s.content.conversations.wechat[0].unread,messages.length);
 assert.equal(s.notifications.filter(n=>n.conversationId==='group').length,messages.length);
 const previousCount=messages.length;
 tickD04Chats(s,now+100000);
 assert.equal(byId(s,'group').length,previousCount);
});
test('private Hufeng dialogue never fabricates player messages',()=>{
 const s=fixture('09:50');tickD04Chats(s,0);tickD04Chats(s,1900);
 assert.deepEqual(byId(s,'hufeng').map(x=>x.text),['阿蒙','我電腦還有救嗎']);
 assert.equal(d04Draft(s,'hufeng')?.text,'有');
 assert.equal(sendD04WeChat(store(s),'hufeng','隨便亂打').messageId,undefined);
 assert.equal(byId(s,'hufeng').length,2);
 const sent=sendD04WeChat(store(s),'hufeng','有',3000);
 assert.equal(sent.messageId,'d04-hufeng-am-2');
 assert.equal(byId(s,'hufeng').at(-1).from,'me');
 tickD04Chats(s,5000);
 assert.equal(byId(s,'hufeng').at(-1).text,'真的？！');
});
test('skipping all protagonist responses does not block family chatter',()=>{
 const s=fixture('23:10');
 for(let now=0;now<1050000;now+=2100)tickD04Chats(s,now);
 assert.ok(byId(s,'group').some(x=>x.text==='晚安😡'));
 assert.equal(byId(s,'hufeng').some(x=>x.from==='me'),false);
 assert.equal(byId(s,'wang').some(x=>x.from==='me'),false);
});
test('dinner moment and family group require a real kiss reply by 18:30',()=>{
 const s=fixture('17:45');
 assert.equal(allMoments(s).some(x=>x.id==='xw-d04'),false);
 tickD04Chats(s,0);
 let now=0,sent=false;
 for(let i=0;i<75&&!sent;i++){
  const draft=d04Draft(s,'wang');
  if(draft){
   sendD04WeChat(store(s),'wang',draft.text,now);
   if(draft.text==='😘')sent=true;
  }else{
   now+=2000;tickD04Chats(s,now);
  }
 }
 assert.equal(sent,true);
 assert.equal(d04DinnerConfirmed(s),true);
 assert.ok(allMoments(s).some(x=>x.id==='xw-d04'));
 s.clock='20:45';
 for(let i=0;i<350;i++)tickD04Chats(s,now+10000+i*2100);
 assert.ok(byId(s,'group').some(x=>x.text==='哥你們出去吃飯不帶我'));
 assert.equal(byId(s,'group').filter(x=>x.text==='我跟阿蒙出去吃').length,1);
 assert.ok(!byId(s,'group').some(x=>x.id.startsWith('d04-dinner-unanswered-')));
});
test('missed D04 dinner never creates an unconditional late-night private scene',()=>{
 const s=fixture('22:00');tickD04Chats(s,0);
 assert.equal(d04DinnerConfirmed(s),false);
 assert.equal(allMoments(s).some(x=>x.id==='xw-d04'),false);
 assert.ok(!byId(s,'wang').some(x=>x.text==='到家跟我說一聲'));
});
test('D04 Moments contain no automatic protagonist comments, but manual one triggers Xiaoxin preset',()=>{
 const s=fixture('14:21');
 const post=allMoments(s).find(x=>x.id==='xs-d04');
 assert.ok(post);
 assert.deepEqual(post.comments.filter(x=>x.by==='熙蒙'),[]);
 assert.ok(!s.content.moments.comments['xs-d04']);
 addGameMomentComment(s,'xs-d04','刪掉');
 const comments=s.content.moments.comments['xs-d04'];
 assert.equal(comments.filter(x=>x.by==='熙蒙'&&x.text==='刪掉').length,1);
 assert.equal(comments.filter(x=>x.by==='小辛'&&x.text.includes('不刪')).length,1);
 assert.deepEqual(allMoments(s).find(x=>x.id==='xw-d04'),undefined);
});
test('exactly two D04 commissions appear from midnight and earlier orders remain',()=>{
 const s=fixture('00:00');s.day=3;
 assert.equal(seedD04Contracts(s),false);
 s.content.orders.push({id:'d03-intelligence-analysis',status:'ACCEPTED'});
 s.day=4;assert.equal(seedD04Contracts(s),true);
 assert.equal(seedD04Contracts(s),false);
 assert.equal(D04_CONTRACTS.length,2);
 assert.equal(s.content.orders.length,3);
 assert.equal(s.content.orders.filter(x=>x.storyD04&&x.publishedClock==='00:00').length,2);
 assert.ok(s.content.orders.every(o=>o.status==='OPEN'||o.id==='d03-intelligence-analysis'));
});
test('two commissions keep separate KIRA, GHOST steps, one-time bank settlement',()=>{
 const s=fixture('08:15');seedD04Contracts(s);
 for(const def of D04_CONTRACTS){
  assert.equal(acceptD04Contract(s,def.id),true);
  assert.equal(acceptD04Contract(s,def.id),false);
  assert.equal(s.ghost.orders[D04_STEP(def.id,0)],undefined);
  assert.equal(openCommissionWithGhost(s,D04_MAIL(def.id)),D04_STEP(def.id,0));
  assert.equal(submitD04Contract(s,def.id),false);
  const order=s.content.orders.find(o=>o.id===def.id);
  for(let i=0;i<def.stages.length;i++){
   const id=D04_STEP(def.id,i),o=s.ghost.orders[id];
   assert.ok(o,'stage is authorized: '+id);
   o.status='success';
   assert.equal(onD04GhostWin(s,id),true);
  }
  assert.equal(order.status,'READY');
  assert.equal(submitD04Contract(s,def.id),true);
  assert.equal(order.status,'COMPLETED');
  assert.equal(submitD04Contract(s,def.id),false);
  assert.equal(s.bankData.transactions.filter(t=>t.orderId===def.id||t.id.endsWith(def.id)).length,1);
 }
 assert.equal(s.bankData.balance,100+1600+3600);
 assert.equal(s.content.mail.filter(m=>m.storyD04).length,4);
});
test('expired C and B commissions cannot be played or settled',()=>{
 const s=fixture('00:00');seedD04Contracts(s);
 assert.equal(acceptD04Contract(s,D04_CONTRACTS[0].id),true);
 s.day=6;s.clock='00:01';tickD04Contracts(s);
 assert.equal(s.content.orders.find(x=>x.id===D04_CONTRACTS[0].id).status,'EXPIRED');
 assert.equal(submitD04Contract(s,D04_CONTRACTS[0].id),false);
 assert.equal(s.bankData.balance,100);
 s.day=7;tickD04Contracts(s);
 assert.equal(s.content.orders.find(x=>x.id===D04_CONTRACTS[1].id).status,'EXPIRED');
});
test('all D04 image URLs are locally bundled and use nonzero valid WebP assets on branch',()=>{
 for(const source of Object.values(D04_MEDIA))assert.match(source,/\/apps\/wechat\/media\/d04-(cat|jacket)\.webp/);
});
test('the actual Story55 runtime naturally publishes D04 contracts, but not on D03',()=>{
 const s=activateStory55(initialState());
 s.day=3;s.clock='21:00';tickStory55(s);
 assert.equal(s.content.orders.filter(o=>o.storyD04).length,0);
 s.day=4;s.clock='08:00';tickStory55(s);
 assert.equal(s.content.orders.filter(o=>o.storyD04).length,2);
 s.nav.current={appId:'wechat',route:'/chat/wang',params:{}};
 assert.equal(worldMinuteRate(s),STORY55_CHAT_MINUTES_PER_MS);
});
test('D04 backlog becomes complete quiet history after a fast day transition',()=>{
 const s=fixture('10:00');tickD04Chats(s,0);
 s.day=5;s.clock='17:00';
 assert.equal(d04ChatDue(s,99999999),true);
 tickD04Chats(s,99999999);
 assert.ok(byId(s,'group').length>160);
 assert.ok(s.notifications.every(n=>n.silent));
 assert.ok(byId(s,'group').every(m=>m.day===4&&m.sentDate==='2025-05-22'));
 assert.equal(byId(s,'hufeng').some(m=>m.from==='me'),false);
});
