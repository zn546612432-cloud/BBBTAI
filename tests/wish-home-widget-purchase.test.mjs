import test from 'node:test';
import assert from 'node:assert/strict';
import {reminderWidget} from '../src/system/shell.js';
import {toggleReminder} from '../src/services/reminders.js';
import {beginD06Celebration,addWish,purchaseWish,tickWishes,syncWishReminders,d06DinnerDraft,sendD06DinnerReply,D06_DINNER_PLAYER_LINE} from '../src/services/wishes/index.js';
import {openWishPurchase,wishPurchaseOverlay,handle} from '../src/apps/reminders/index.js';

const conversation=id=>({id,name:id,messages:[],unread:0});
const initial=()=>({
 day:6,clock:'10:25',unlocked:true,story55:{version:1,completed:{wallet:{day:6,clock:'09:00'}},ended:false},
 content:{reminders:[],conversations:{wechat:['group','xiaoxin','hufeng','awei','wang','zaizai'].map(conversation)}},
 bankData:{balance:1000,transactions:[]},events:[],notifications:[]
});
const fixture=()=>{
 let s=initial(),refreshes=0,navigation=[];
 const store={get:()=>s,update:fn=>{let cloned=structuredClone(s);fn(cloned);s=cloned;return cloned}};
 const ctx={store,refresh:()=>{refreshes++;},router:{open:loc=>navigation.push(loc)},toast:()=>{}};
 return {store,ctx,navigation,get refreshes(){return refreshes}};
};
function addDinner(store){
 store.update(s=>{
  s.content.conversations.wechat.find(c=>c.id==='group').messages.push({
   id:'d06-dinner-source',wishId:'d06-dinner',wishText:'一起出去吃饭',text:'晚上一起出去吃饭？',from:'仔仔'
  });
  addWish(s,'d06-dinner');
 });
}
test('Home widget wish tap is a purchase entry; ordinary reminders remain normal checkboxes',()=>{
 const s=initial();
 s.content.reminders=[
  {id:'wish-d06-dinner',wishId:'d06-dinner',title:'今晚和大家吃饭',done:false},
  {id:'ordinary',title:'记得买牛奶',done:false}
 ];
 const html=reminderWidget(s);
 assert.match(html,/data-action="home-reminder-wish" data-id="wish-d06-dinner" data-wish-id="d06-dinner"/);
 assert.match(html,/data-action="home-reminder-toggle" data-id="ordinary"/);
 const store={get:()=>s,update:fn=>fn(s)};
 assert.equal(toggleReminder(store,'wish-d06-dinner'),false);
 assert.equal(s.content.reminders[0].done,false);
 assert.equal(toggleReminder(store,'ordinary'),true);
 assert.equal(s.content.reminders[1].done,true);
});
test('Existing players whose wish was wrongly checked complete are repaired without losing orders',()=>{
 const s=initial();
 s.story55.wishes={records:{'d06-dinner':{id:'d06-dinner',status:'saved'}},story:{lines:[]}};
 s.content.reminders=[{id:'wish-d06-dinner',wishId:'d06-dinner',title:'今晚和大家吃饭',done:true}];
 assert.equal(syncWishReminders(s),true);
 assert.equal(s.content.reminders[0].done,false);
 assert.equal(s.content.reminders[0].wishStatus,'saved');
 assert.equal(syncWishReminders(s),false);
 s.story55.wishes.records['d06-dinner'].status='delivered';
 assert.equal(syncWishReminders(s),true);
 assert.equal(s.content.reminders[0].done,false,'payment alone is not booking');
 s.story55.wishes.story.delivered=['wish-dinner-booking-01'];
 assert.equal(syncWishReminders(s),true);
 assert.equal(s.content.reminders[0].done,true);
});
test('Home widget opens a confirmation, one purchase makes receipt, then opens WeChat chat',()=>{
 const f=fixture();addDinner(f.store);
 assert.equal(openWishPurchase('d06-dinner',f.ctx),true);
 assert.match(wishPurchaseOverlay(f.store.get()),/是否花费 350 USD 购买聚餐/);
 handle('reminder-wish-buy',{},f.ctx);
 assert.equal(f.store.get().bankData.balance,650);
 assert.equal(f.store.get().bankData.transactions.length,1);
 assert.equal(f.store.get().content.reminders[0].done,false,'payment remains pending until dinner is booked');
 assert.match(wishPurchaseOverlay(f.store.get()),/聚餐费用已支付/);
 assert.match(wishPurchaseOverlay(f.store.get()),/去狼崽团回复大家/);
 handle('reminder-wish-chat',{},f.ctx);
 assert.equal(wishPurchaseOverlay(f.store.get()),'');
 assert.deepEqual(f.navigation[0],{appId:'wechat',route:'/chat/group',params:{}});
 assert.equal(openWishPurchase('d06-dinner',f.ctx),false);
 assert.equal(f.store.get().bankData.transactions.length,1);
});
test('D06 paid dinner waits for player Send, friends thank him, then Zaizai books',()=>{
 const s=initial();
 beginD06Celebration(s,0);
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 group.messages.push({id:'dinner-source',wishId:'d06-dinner',wishText:'一起出去吃饭',text:'一起出去吃饭',from:'仔仔'});
 addWish(s,'d06-dinner');purchaseWish(s,'d06-dinner');
 const msgs=()=>group.messages;
 assert.equal(d06DinnerDraft(s,'group').text,D06_DINNER_PLAYER_LINE);
 assert.equal(s.content.reminders.find(r=>r.wishId==='d06-dinner').done,false);
 for(let i=0;i<10;i++){s.story55.wishes.story.nextAt=0;tickWishes(s,10000+i*3000);}
 assert.equal(msgs().some(m=>m.id.startsWith('wish-dinner-thanks-')),false);
 assert.equal(msgs().some(m=>m.id==='wish-dinner-booking-01'),false);
 assert.equal(msgs().some(m=>m.id==='wish-dinner-photo'),false);
 const store={get:()=>s,update:fn=>fn(s)};
 assert.equal(sendD06DinnerReply(store,'group',D06_DINNER_PLAYER_LINE,0).messageId,'wish-dinner-player');
 assert.equal(sendD06DinnerReply(store,'group',D06_DINNER_PLAYER_LINE,0).handled,false);
 for(let i=0;i<25;i++){s.story55.wishes.story.nextAt=0;tickWishes(s,10000+i*3000);}
 const positions=['wish-dinner-player','wish-dinner-thanks-01','wish-dinner-thanks-02',
  'wish-dinner-thanks-03','wish-dinner-thanks-04','wish-dinner-booking-ask',
  'wish-dinner-booking-reply','wish-dinner-booking-01'].map(id=>msgs().findIndex(m=>m.id===id));
 assert.ok(positions.every(x=>x>=0),JSON.stringify(positions));
 assert.deepEqual(positions,[...positions].sort((a,b)=>a-b),'player speaks, friends thank him, Zaizai books');
 assert.equal(s.content.reminders.find(r=>r.wishId==='d06-dinner').done,true);
 assert.equal(msgs().some(m=>m.id==='wish-dinner-photo'),false);
 s.clock='20:31';
 for(let i=0;i<40;i++){s.story55.wishes.story.nextAt=0;tickWishes(s,200000+i*3000);}
 assert.equal(msgs().filter(m=>m.id==='wish-dinner-photo').length,1);
 assert.equal(s.bankData.transactions.length,1);
});

test('Old paid dinner save removes premature booking; player Send still required, no second debit',()=>{
 const s=initial();
 s.bankData.balance=650;
 s.bankData.transactions.push({id:'wish-purchase-d06-dinner',wishId:'d06-dinner',amount:-350});
 s.story55.wishes={
  records:{'d06-dinner':{id:'d06-dinner',status:'delivered',purchasedDay:6,purchasedClock:'10:25',rewardQueued:true}},
  story:{started:true,d07Started:false,nextAt:0,lines:[{
   id:'wish-dinner-01',channel:'wechat',chat:'group',from:'仔仔',
   text:'地方我联系好了，今晚七点半。阿蒙你付款了？',
   dueDay:6,dueClock:'19:30',wishRewardId:'d06-dinner'
  }],delivered:[]}
 };
 s.content.reminders.push({id:'wish-d06-dinner',wishId:'d06-dinner',title:'今晚和大家吃饭',done:true,wishStatus:'delivered'});
 assert.equal(syncWishReminders(s),true);
 assert.equal(s.content.reminders[0].done,false);
 assert.equal(s.story55.wishes.story.lines.some(x=>x.id==='wish-dinner-01'),false);
 assert.equal(s.story55.wishes.records['d06-dinner'].rewardQueued,false);
 assert.equal(syncWishReminders(s),false);
 tickWishes(s,10000);
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 assert.equal(group.messages.some(m=>m.id.startsWith('wish-dinner-')),false);
 const store={get:()=>s,update:fn=>fn(s)};
 assert.equal(sendD06DinnerReply(store,'group',D06_DINNER_PLAYER_LINE,0).handled,true);
 for(let i=0;i<20;i++){s.story55.wishes.story.nextAt=0;tickWishes(s,10000+i*3000);}
 assert.equal(group.messages.filter(m=>m.id==='wish-dinner-booking-01').length,1);
 assert.equal(s.bankData.balance,650);
 assert.equal(s.bankData.transactions.length,1);
});
