import test from 'node:test';
import assert from 'node:assert/strict';
import {exchange} from '../src/services/bank.js';
import {beginD06Celebration,tickWishes,addWish,purchaseWish,sendD06DinnerReply,D06_DINNER_PLAYER_LINE} from '../src/services/wishes/index.js';
import {historicalBtcUsd} from '../src/services/finance/historical-btc-usd.js';

function createPhone(){
 let s={
  version:2,day:6,clock:'16:00',unlocked:false,
  nav:{current:{appId:'home',route:'/'},stack:[]},
  story55:{version:1,completed:{wallet:{day:6,clock:'15:30'}}},
  bankData:{balance:0,rate:1,transactions:[],account:'•• 1846'},
  content:{mirage:{digitalBalance:10,digitalTransactions:[{type:'REWARD',amount:10}],transactions:[]},
   reminders:[],conversations:{wechat:['group','xiaoxin','hufeng','awei','wang','zaizai'].map(id=>({id,name:id,messages:[],unread:0,group:id==='group'}))}},
  events:[],notifications:[]
 };
 return {get:()=>s,update(fn){const next=structuredClone(s);fn(next);s=next;}};
}
function deliver(phone,n=60){
 for(let i=0;i<n;i++)phone.update(s=>tickWishes(s,Date.now()+50000+i*2100));
}
const messages=s=>s.content.conversations.wechat.flatMap(c=>c.messages);
test('D06 BTC reward -> one USD conversion -> four optional purchases -> D07/D09 notifications, single shared store',()=>{
 const phone=createPhone();
 assert.equal(phone.get().bankData.balance,0);
 assert.equal(historicalBtcUsd(6),107791.16);
 exchange(phone,'0.02');
 assert.equal(phone.get().bankData.balance,2155.82);
 assert.equal(phone.get().content.mirage.digitalBalance,9.98);
 assert.equal(phone.get().bankData.transactions.length,1);
 phone.update(s=>beginD06Celebration(s));
 deliver(phone);
 const wishes=['d06-dinner','d06-keyboard'];
 for(const id of wishes)phone.update(s=>addWish(s,id));
 for(const id of wishes)phone.update(s=>purchaseWish(s,id));
 assert.equal(phone.get().bankData.balance,906.82);
 assert.equal(phone.get().content.reminders.length,2);
 assert.equal(messages(phone.get()).some(m=>m.id.startsWith('wish-dinner-thanks-')),false,'no NPC thank-you at payment');
 assert.equal(messages(phone.get()).some(m=>m.id==='wish-dinner-photo'),false,'no photo at payment');
 assert.equal(sendD06DinnerReply(phone,'group',D06_DINNER_PLAYER_LINE,0).handled,true);
 deliver(phone);
 assert.equal(messages(phone.get()).filter(m=>m.id==='wish-dinner-booking-01').length,1,'Zaizai books after Ximeng');
 phone.update(s=>{s.clock='20:30'});
 deliver(phone);
 assert.equal(messages(phone.get()).filter(m=>m.id==='wish-dinner-photo').length,1);
 phone.update(s=>{s.day=7;s.clock='11:00'});
 deliver(phone);
 for(const id of ['d07-headphones','d07-tableware'])phone.update(s=>addWish(s,id));
 for(const id of ['d07-headphones','d07-tableware'])phone.update(s=>purchaseWish(s,id));
 assert.equal(phone.get().bankData.balance,566.82);
 assert.equal(phone.get().bankData.transactions.filter(t=>t.wishId).length,4);
 phone.update(s=>{s.day=9;s.clock='17:00'});
 deliver(phone,120);
 const pictures=['wish-keyboard-photo','wish-headphones-photo','wish-tableware-photo'];
 for(const id of pictures)assert.equal(messages(phone.get()).filter(m=>m.id===id).length,1,id);
 const before=phone.get().bankData.balance;
 deliver(phone,60);
 assert.equal(phone.get().bankData.balance,before);
 assert.equal(phone.get().content.mirage.digitalBalance,9.98);
 for(const id of pictures)assert.equal(messages(phone.get()).filter(m=>m.id===id).length,1,id+' duplicate');
});
