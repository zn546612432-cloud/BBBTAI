import test from 'node:test';
import assert from 'node:assert/strict';
import {reminderWidget} from '../src/system/shell.js';
import {toggleReminder} from '../src/services/reminders.js';
import {beginD06Celebration,addWish,purchaseWish,tickWishes,syncWishReminders} from '../src/services/wishes/index.js';
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
 assert.equal(s.content.reminders[0].done,true);
});
test('Home widget opens a confirmation, one purchase makes receipt, then opens WeChat chat',()=>{
 const f=fixture();addDinner(f.store);
 assert.equal(openWishPurchase('d06-dinner',f.ctx),true);
 assert.match(wishPurchaseOverlay(f.store.get()),/是否花费 350 USD 购买聚餐/);
 handle('reminder-wish-buy',{},f.ctx);
 assert.equal(f.store.get().bankData.balance,650);
 assert.equal(f.store.get().bankData.transactions.length,1);
 assert.equal(f.store.get().content.reminders[0].done,true);
 assert.match(wishPurchaseOverlay(f.store.get()),/晚餐已预订/);
 assert.match(wishPurchaseOverlay(f.store.get()),/今晚19:30和大家吃饭/);
 handle('reminder-wish-chat',{},f.ctx);
 assert.equal(wishPurchaseOverlay(f.store.get()),'');
 assert.deepEqual(f.navigation[0],{appId:'wechat',route:'/chat/group',params:{}});
 assert.equal(openWishPurchase('d06-dinner',f.ctx),false);
 assert.equal(f.store.get().bankData.transactions.length,1);
});
test('Paid dinner confirmation arrives promptly, while dinner photos wait until evening',()=>{
 const s=initial();
 beginD06Celebration(s,0);
 s.content.conversations.wechat.find(c=>c.id==='group').messages.push({
  id:'dinner-source',wishId:'d06-dinner',wishText:'一起出去吃饭',text:'一起出去吃饭',from:'仔仔'
 });
 addWish(s,'d06-dinner');purchaseWish(s,'d06-dinner');
 tickWishes(s,10000);
 const msgs=()=>s.content.conversations.wechat.find(c=>c.id==='group').messages;
 assert.equal(msgs().filter(m=>m.id==='wish-dinner-01').length,1,'reservation should be first eligible reply');
 assert.equal(msgs().some(m=>m.id==='wish-dinner-photo'),false);
 assert.match(msgs().find(m=>m.id==='wish-dinner-01').text,/七点半见/);
 s.clock='20:31';
 for(let i=0;i<35;i++){s.story55.wishes.story.nextAt=0;tickWishes(s,Date.now()+i*3000);}
 assert.equal(msgs().filter(m=>m.id==='wish-dinner-photo').length,1);
 assert.equal(s.bankData.transactions.length,1);
});
