import {D13_WALLET_ID} from '../d13/definition.js';
import {completed,completeNode,nodeStatus,date55} from '../../services/story55/state.js';
import {appendAuthoredPhoneMessage} from '../../services/messaging/phone-messages.js';
import {D45_WALLET_SCENE,D45_PUBLISH,D46_ACCEPT,D46_CHAT,D46_CONTACT,PRIVATE_ORDER,PRIVATE_REMINDER,PRIVATE_CONTRACT,PRIVATE_ACCEPT_DAY} from './definition.js';

export function releaseD45Wallet(s){
 if(s.story55.d45WalletReleased)return;
 const m=s.content.mirage, wallets=m.wallets??=[];
 let w=wallets.find(w=>w.id===D13_WALLET_ID);
 if(!w){w={id:D13_WALLET_ID,address:'MIR-WLT-0013',asset:'BTC',balance:50};wallets.push(w);}
 Object.assign(w,{status:'available',spendable:true,controlledBy:'me'});
 s.story55.d45WalletReleased=true;
}
export function transferD45Wallet(s){
 const m=s.content.mirage,w=m.wallets?.find(w=>w.id===D13_WALLET_ID);
 if(!s.story55?.d45WalletReleased||w?.status!=='available'||!w.spendable||!(w.balance>0))return false;
 const amount=w.balance;
 m.digitalTransactions??=[];
 if(m.digitalTransactions.some(t=>t.id==='s55-d45-wallet-transfer'))return false;
 m.digitalBalance=Number(m.digitalBalance||0)+amount;
 m.digitalTransactions.unshift({id:'s55-d45-wallet-transfer',type:'WALLET TRANSFER',amount,day:s.day,clock:s.clock,date:date55(s.day)});
 Object.assign(w,{balance:0,status:'transferred',spendable:false});
 return true;
}
export function publishPrivateContract(s){
 if(nodeStatus(s,D45_PUBLISH).state!=='ready')return false;
 if(s.content.orders.some(o=>o.id===PRIVATE_ORDER))return false;
 s.content.orders.unshift({...PRIVATE_CONTRACT,status:'PUBLISHED',storyDay:s.day,publishedClock:s.clock});
 completeNode(s,D45_PUBLISH);
 syncD46(s);
 return true;
}
export function syncD46(s){
 const order=s.content.orders.find(o=>o.id===PRIVATE_ORDER);
 if(completed(s,D45_WALLET_SCENE)&&(!s.story55.completed[D45_WALLET_SCENE].legacySkipped||s.day<=PRIVATE_ACCEPT_DAY)){
  const reminders=s.content.reminders??=[];
  let r=reminders.find(r=>r.id===PRIVATE_REMINDER);
  if(!r){r={id:PRIVATE_REMINDER,title:'發佈僱傭兵招募訂單',done:false,storyPrivateContract:true};reminders.push(r);}
  r.done=!!order;
 }
 if(order&&completed(s,D46_ACCEPT)){
  const chats=s.content.conversations.mirage??=[];
  let chat=chats.find(c=>c.id===D46_CONTACT);
  if(!chat){chat={id:D46_CONTACT,name:'Isolde Mirage',avatar:'I',messages:[],unread:0};chats.push(chat);}
  if(!chat.messages.some(m=>m.id==='s55-d46-isolde-contact'))appendAuthoredPhoneMessage(s,{channel:'mirage',conversationId:D46_CONTACT,messageId:'s55-d46-isolde-contact',from:'system',kind:'system',text:'── NEW CONTACT ──',notify:false,day:PRIVATE_ACCEPT_DAY,clock:'14:20',sentDate:date55(PRIVATE_ACCEPT_DAY),storyTag:'story55'});
  order.status=completed(s,D46_CHAT)?'AGREED':'TAKEN';
  order.contractor='Isolde Mirage';
  if(completed(s,D46_CHAT)){order.reward='HK$ 10,000,000';order.currency='HKD';order.agreedAmount=10000000;}
 }
}
