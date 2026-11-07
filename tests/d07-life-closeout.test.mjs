import test from 'node:test';
import assert from 'node:assert/strict';
import {tickWishes,beginD06Celebration,addWish,purchaseWish,
 sendD06DinnerReply,D06_DINNER_PLAYER_LINE,getWish} from '../src/services/wishes/index.js';
import {STORY55_CONFIG} from '../src/story/story55/catalog.js';
import {date55} from '../src/services/story55/state.js';

const conv=id=>({id,name:id==='group'?'狼崽团':id,group:id==='group',messages:[],unread:0});
function state(day=7,clock='09:15'){
 return {
  day,clock,unlocked:false,nav:{current:{appId:'home',route:'/'},stack:[]},
  story55:{version:1,completed:{},ended:false},
  content:{reminders:[],conversations:{wechat:['group','xiaoxin','hufeng','awei','wang','zaizai'].map(conv)}},
  bankData:{balance:5000,transactions:[]},notifications:[],events:[]
 };
}
const group=s=>s.content.conversations.wechat.find(c=>c.id==='group').messages;
const all=s=>s.content.conversations.wechat.flatMap(c=>c.messages);
function deliver(s,n=75){
 for(let i=0;i<n;i++){
  if(s.story55?.wishes?.story)s.story55.wishes.story.nextAt=0;
  tickWishes(s,1000000+i*2100);
 }
}
test('D07 ordinary WeChat begins independently of D06 victory and completes Wang grocery request in afternoon',()=>{
 const s=state();
 deliver(s);
 assert.equal(group(s).filter(m=>m.id==='d07-chat-01').length,1);
 assert.equal(group(s).filter(m=>m.id.startsWith('d07-errand-')).length,0);
 assert.equal(all(s).filter(m=>m.id.startsWith('wish-')).length,0);
 s.clock='11:15';deliver(s);
 assert.equal(all(s).some(m=>m.id==='d07-awei-01'),true);
 assert.equal(all(s).some(m=>m.id==='d07-wang-01'),true);
 assert.equal(all(s).filter(m=>m.id.startsWith('d07-errand-')).length,0);
 s.clock='13:30';deliver(s);
 const ids=['d07-chat-07','d07-errand-01','d07-errand-02','d07-errand-03','d07-errand-04'];
 const index=ids.map(id=>group(s).findIndex(m=>m.id===id));
 assert.ok(index.every(i=>i>=0),JSON.stringify(index));
 assert.deepEqual(index,[...index].sort((a,b)=>a-b));
 assert.match(group(s).find(m=>m.id==='d07-errand-01').text,/盐/);
 assert.equal(all(s).some(m=>m.id==='d07-dinner-after'),false);
 assert.equal(s.bankData.transactions.length,0);
 deliver(s);
 for(const id of ids)assert.equal(group(s).filter(m=>m.id===id).length,1,id);
});
test('D07 is an optional-life chapter: wish links never charge money until actual purchase',()=>{
 const s=state(7,'11:20');deliver(s);
 assert.equal(all(s).filter(m=>m.wishId==='d07-headphones').length,1);
 assert.equal(all(s).filter(m=>m.wishId==='d07-tableware').length,1);
 assert.equal(s.bankData.balance,5000);
 assert.equal(s.content.reminders.length,0);
 assert.equal(all(s).some(m=>m.id==='wish-headphones-photo'),false);
 addWish(s,'d07-headphones');
 assert.equal(s.bankData.balance,5000,'saving a reminder is not buying');
 purchaseWish(s,'d07-headphones');
 assert.equal(s.bankData.balance,4780);
 assert.equal(s.bankData.transactions.length,1);
 assert.equal(getWish(s,'d07-headphones').deliveryDay,9);
});
test('Booking alone does not permit D07 memory of a dinner without a completed meal',()=>{
 const s=state(7,'11:00');
 s.story55.wishes={
  records:{'d06-dinner':{id:'d06-dinner',status:'delivered',purchasedDay:6,confirmedByXimeng:true}},
  story:{started:true,lines:[],nextAt:0,d07Started:false,delivered:['wish-dinner-booking-01']}
 };
 deliver(s);
 assert.equal(group(s).some(m=>m.id==='d07-dinner-after'),false);
 assert.equal(s.story55.wishes.story.lines.some(x=>x.id==='d07-dinner-after'),false);
 s.story55.wishes.story.delivered.push('wish-dinner-photo');
 deliver(s);
 assert.equal(group(s).filter(m=>m.id==='d07-dinner-after').length,1);
 deliver(s);
 assert.equal(group(s).filter(m=>m.id==='d07-dinner-after').length,1);
});
test('Actual D06 paid dinner, player Send, booking and evening photo earn one D07 callback',()=>{
 const s=state(6,'16:00');s.story55.completed.wallet={day:6,clock:'15:30'};
 assert.equal(beginD06Celebration(s,0),true);
 deliver(s);
 addWish(s,'d06-dinner');purchaseWish(s,'d06-dinner');
 const store={get:()=>s,update:fn=>fn(s)};
 assert.equal(sendD06DinnerReply(store,'group',D06_DINNER_PLAYER_LINE,0).handled,true);
 deliver(s);
 assert.equal(group(s).some(m=>m.id==='wish-dinner-booking-01'),true);
 assert.equal(group(s).some(m=>m.id==='wish-dinner-photo'),false);
 s.clock='20:35';deliver(s);
 assert.equal(group(s).some(m=>m.id==='wish-dinner-photo'),true);
 s.day=7;s.clock='11:00';deliver(s);
 assert.equal(group(s).filter(m=>m.id==='d07-dinner-after').length,1);
 assert.equal(s.bankData.transactions.filter(t=>t.wishId==='d06-dinner').length,1);
});
test('Skipping to D09 backfills D07 messages with their original date, silently and once',()=>{
 const s=state(9,'17:00');
 deliver(s,100);
 const message=group(s).find(m=>m.id==='d07-errand-04');
 assert.ok(message);
 assert.equal(message.sentDate,date55(7));
 assert.equal(message.historical,true);
 const notification=s.notifications.find(n=>n.messageId==='d07-errand-04');
 assert.equal(notification?.silent,true);
 deliver(s,100);
 for(const id of ['d07-chat-01','d07-awei-01','d07-errand-01','d07-errand-04']){
  assert.equal(all(s).filter(m=>m.id===id).length,1,id);
 }
 assert.equal(s.bankData.transactions.length,0);
});
test('D07 is not a forced new story gate; it does not replace Dr Ouroboros invitation or D08',()=>{
 const gates=STORY55_CONFIG.nodes.filter(x=>x.gateDay===7);
 assert.deepEqual(gates,[]);
 assert.ok(STORY55_CONFIG.nodes.some(x=>x.id==='invitation'&&x.day===6));
 assert.equal(date55(7),'2025-05-25');
 assert.equal(date55(8),'2025-05-26');
});
