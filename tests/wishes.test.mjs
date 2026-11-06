import test from 'node:test';
import assert from 'node:assert/strict';
import {beginD06Celebration,tickWishes,addWish,purchaseWish,getWish,wishExpired} from '../src/services/wishes/index.js';

const conversation=id=>({id,name:id==='group'?'狼崽团':id,messages:[],unread:0});
function phone({day=6,clock='18:00',wallet=true,balance=5000}={}){
 return {version:2,day,clock,unlocked:true,nav:{current:{appId:'home',route:'/'},stack:[]},
  story55:{version:1,completed:wallet?{wallet:{day:6,clock:'17:00'}}:{},ended:false},
  content:{conversations:{wechat:['group','xiaoxin','hufeng','awei','wang','zaizai'].map(conversation)},reminders:[]},
  bankData:{balance,transactions:[]},notifications:[],events:[]};
}
const all=s=>s.content.conversations.wechat.flatMap(c=>c.messages);
function flush(s,count=50){
 for(let n=0;n<count;n++){
  if(s.story55.wishes)s.story55.wishes.story.nextAt=0;
  tickWishes(s,Date.now()+n*2100);
 }
}
test('D06 celebration starts only after real wallet completion, by explicit player action',()=>{
 const s=phone({wallet:false});
 assert.throws(()=>beginD06Celebration(s));
 s.story55.completed.wallet={day:6,clock:'17:00'};
 assert.equal(beginD06Celebration(s),true);
 assert.equal(beginD06Celebration(s),false);
 assert.equal(all(s).filter(m=>m.id==='d06-celebration-player').length,1);
 flush(s);
 assert.equal(all(s).filter(m=>m.wishId==='d06-keyboard').length,1);
 assert.equal(all(s).filter(m=>m.wishId==='d06-dinner').length,1);
 assert.equal(all(s).filter(m=>m.wishId==='d06-shoes').length,1);
});
test('Reminders and bank are idempotent; same wishlist item cannot debit twice',()=>{
 const s=phone();beginD06Celebration(s);flush(s);
 assert.equal(addWish(s,'d06-keyboard'),true);
 assert.equal(addWish(s,'d06-keyboard'),false);
 assert.equal(s.content.reminders.filter(r=>r.wishId==='d06-keyboard').length,1);
 assert.equal(purchaseWish(s,'d06-keyboard'),true);
 assert.equal(s.bankData.balance,4101);
 assert.equal(s.bankData.transactions.filter(x=>x.id==='wish-purchase-d06-keyboard').length,1);
 assert.throws(()=>purchaseWish(s,'d06-keyboard'));
 assert.equal(s.bankData.balance,4101);
});
test('Physical gifts wait until their configured delivery game day',()=>{
 const s=phone();beginD06Celebration(s);flush(s);
 addWish(s,'d06-keyboard');purchaseWish(s,'d06-keyboard');
 flush(s);
 assert.equal(all(s).some(m=>m.id==='wish-keyboard-thanks-1'),false);
 s.day=7;s.clock='17:00';flush(s);
 assert.equal(all(s).some(m=>m.id==='wish-keyboard-thanks-1'),false);
 s.day=8;s.clock='17:00';flush(s);
 assert.equal(getWish(s,'d06-keyboard').status,'delivered');
 assert.equal(all(s).filter(m=>m.id==='wish-keyboard-thanks-1').length,1);
 assert.equal(all(s).filter(m=>m.id==='wish-keyboard-photo').length,1);
 flush(s);
 assert.equal(all(s).filter(m=>m.id==='wish-keyboard-photo').length,1);
});
test('D06 timed dinner expires while physical gifts remain purchasable',()=>{
 const s=phone();beginD06Celebration(s);flush(s);
 addWish(s,'d06-dinner');addWish(s,'d06-keyboard');
 s.day=7;s.clock='09:30';tickWishes(s,Date.now());
 assert.equal(wishExpired(s,'d06-dinner'),true);
 assert.equal(getWish(s,'d06-dinner').status,'expired');
 assert.throws(()=>purchaseWish(s,'d06-dinner'));
 assert.equal(purchaseWish(s,'d06-keyboard'),true);
});
test('D07 follows the existing celebration without inventing a dinner if unpaid',()=>{
 const s=phone();beginD06Celebration(s);flush(s);
 s.day=7;s.clock='11:00';flush(s);
 assert.equal(all(s).some(m=>m.id==='d07-chat-01'),true);
 assert.equal(all(s).some(m=>m.id==='d07-dinner-after'),false);
 const bought=phone();beginD06Celebration(bought);flush(bought);
 addWish(bought,'d06-dinner');purchaseWish(bought,'d06-dinner');
 bought.day=7;bought.clock='11:00';flush(bought);
 assert.equal(all(bought).some(m=>m.id==='d07-dinner-after'),true);
});
