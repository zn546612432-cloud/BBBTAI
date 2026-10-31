import {acceptOuroborosChallenge,ouroborosDraft,sendOuroborosPreset} from '../src/apps/mirage/ouroboros-flow.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {contacts,initializeMirage,completeWalletChallenge,WALLET_CHALLENGE_ID} from '../src/apps/mirage/data.js';
import {readConversationInState} from '../src/services/messaging/read.js';
import {MessageDelivery,visibleMessages} from '../src/services/messaging/delivery.js';
import {setMirageAuthenticated} from '../src/apps/mirage/session.js';
import {PhoneRouter} from '../src/services/router.js';
import {authorize,begin,finish,nextGhostRound} from '../src/apps/ghost/state.js';
import {missionProgress} from '../src/apps/developer/features/mission/index.js';
import {XITAI_VOICE_ID,apiConfig,saveApiConfig} from '../src/services/ai/gateway.js';
import {ORIGINAL_WORLDBOOKS} from '../src/services/ai/original-worldbooks.js';

const makeStore=(state=initialState())=>({get:()=>state,update(fn){fn(state);}});
test('Mirage unread badge clears when the player actually opens that chat',()=>{
 const store=makeStore();store.get().day=1;initializeMirage(store);
 const c=store.get().content.conversations.mirage[0];c.unread=3;const other=store.get().content.conversations.mirage[1];other.unread=1;
 assert.equal(readConversationInState(store.get(),'mirage',c.id),true);
 assert.equal(c.unread,0);assert.equal(other.unread,1);
});
test('Only opened Mirage conversation rises to top; no other conversation is reshuffled',()=>{
 const store=makeStore();initializeMirage(store);
 const items=contacts(store.get());const selected=items.at(-1);
 selected.lastOpened=100;assert.equal(contacts(store.get())[0].id,selected.id);
 const another=items[1];another.lastOpened=101;assert.equal(contacts(store.get())[0].id,another.id);
 assert.equal(contacts(store.get())[1].id,selected.id);
});
test('Ouroboros appears only after D05 acceptance and waits for player-authored typed messages',()=>{
 const store=makeStore();store.get().day=5;store.get().clock='21:00';initializeMirage(store);
 assert.equal(contacts(store.get()).some(x=>x.id==='mc-ourob-d05'),false);
 assert.equal(acceptOuroborosChallenge(store.get()),true);
 const c=contacts(store.get()).find(x=>x.id==='mc-ourob-d05');
 assert.equal(c.messages.length,1);
 assert.match(c.messages[0].text,/ORDER CREATED/);
 assert.equal(completeWalletChallenge(store.get()),true);
 assert.deepEqual(c.messages.map(x=>x.text),[c.messages[0].text]);
 assert.equal(ouroborosDraft(store.get(),c.id),'我拿到了。');
 assert.equal(sendOuroborosPreset(store.get(),c.id,'我拿到了。'),true);
 assert.equal(c.messages.at(-1).text,'你属于哪个组织？');
 assert.equal(sendOuroborosPreset(store.get(),c.id,'我单干。'),true);
 assert.match(c.messages.at(-1).text,/百分之八十/);
 assert.equal(sendOuroborosPreset(store.get(),c.id,'因为我是天才。'),true);
 assert.match(c.messages.at(-1).text,/奖励饼干/);
 assert.equal(completeWalletChallenge(store.get()),false);
});
test('Ghost board generator uses unseen board signatures for retries and stages',()=>{
 const s={ghost:{orders:{},history:[],balance:0,config:{}}};
 for(const t of ['cipher','route','extract','veil','strike']){
  for(let i=0;i<4;i++){
   const id=t+'-'+i;authorize(s,{orderId:id,type:t});
   assert.equal(begin(s,id),true);
   if(t==='extract'||t==='veil')for(let j=0;j<3;j++)nextGhostRound(s,id);
  }
  const signatures=s.ghost.usedBoardSignatures[t];
  assert.equal(signatures.length,new Set(signatures).size,'repeated level in '+t);
 }
});
test('developer workflow inspector progresses through dependent apps',()=>{
 const store=makeStore();initializeMirage(store);
 let p=missionProgress(store.get());assert.equal(p.steps[0].done,false);
 const bounty=store.get().content.orders.find(o=>o.id==='mirage-recruit-hacker');
 bounty.status='ACCEPTED';
 store.get().content.mail.push({id:'mirage-new-order',missionStep:3});
 p=missionProgress(store.get());assert.equal(p.steps[0].done,true);assert.equal(p.steps[3].done,true);
});
test('only the supplied fixed voice can be saved; original worldbook text stays complete',()=>{
 const original=globalThis.sessionStorage;
 const m=new Map();globalThis.sessionStorage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
 try{saveApiConfig({voiceId:'different-voice'});assert.equal(apiConfig().voiceId,XITAI_VOICE_ID);}
 finally{if(original===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=original;}
 assert.equal(Object.keys(ORIGINAL_WORLDBOOKS).length,4);
 assert.ok(ORIGINAL_WORLDBOOKS.relationship.length>13000);
});

test('D05 wallet reward is locked behind successful GHOST run, never issued on mere acceptance',()=>{
 const store=makeStore(),s=store.get();s.day=5;s.clock='21:00';
 initializeMirage(store);
 const order=s.content.orders.find(x=>x.id===WALLET_CHALLENGE_ID);
 assert.equal(acceptOuroborosChallenge(s),true);
 s.ghost??={orders:{},history:[],balance:0,config:{}};
 s.ghost.orderConfigs??={};
 s.ghost.orderConfigs[WALLET_CHALLENGE_ID]={seconds:90,rounds:1,codeLength:3,retries:3,reward:null};
 authorize(s,{orderId:WALLET_CHALLENGE_ID,type:'veil',mailId:null});
 assert.equal(s.events.some(x=>x.type==='mirage_wallet_challenge_completed'),false);
 assert.equal(s.content.conversations.mirage.some(x=>x.id==='mc-ourob-d05'),true);
 assert.equal(begin(s,WALLET_CHALLENGE_ID,1000),true);
 finish(s,WALLET_CHALLENGE_ID,true,2000);
 assert.equal(s.content.orders.find(x=>x.id===WALLET_CHALLENGE_ID).status,'COMPLETED');
 assert.equal(s.content.mirage.transactions.filter(x=>x.id==='ou-btc10').length,1);
 assert.equal(s.events.filter(x=>x.type==='mirage_wallet_challenge_completed').length,1);
 assert.equal(s.content.conversations.mirage.find(x=>x.id==='mc-ourob-d05').messages.length,1);
 finish(s,WALLET_CHALLENGE_ID,true,3000);
 assert.equal(s.events.filter(x=>x.type==='mirage_wallet_challenge_completed').length,1);
});
test('failed D05 Ghost attempts leave the 10BTC reward and congratulations locked',()=>{
 const store=makeStore(),s=store.get();s.day=5;
 initializeMirage(store);acceptOuroborosChallenge(s);
 authorize(s,{orderId:WALLET_CHALLENGE_ID,type:'veil',mailId:null});
 assert.equal(begin(s,WALLET_CHALLENGE_ID,1000),true);
 finish(s,WALLET_CHALLENGE_ID,false,2000);
 assert.equal(s.content.orders.find(x=>x.id===WALLET_CHALLENGE_ID).status,'ACCEPTED');
 assert.equal(s.content.mirage.transactions.some(x=>x.id==='ou-btc10'),false);
 assert.equal(s.events.some(x=>x.type==='mirage_wallet_challenge_completed'),false);
});

test('D05 payout writes no fake player bubbles; players reveal each script line by sending',()=>{
 const store=makeStore(),s=store.get();s.day=5;s.clock='21:00';initializeMirage(store);
 acceptOuroborosChallenge(s);completeWalletChallenge(s);
 const c=s.content.conversations.mirage.find(c=>c.id==='mc-ourob-d05');
 assert.deepEqual(visibleMessages(c).map(m=>m.text),[c.messages[0].text]);
 assert.equal(ouroborosDraft(s,c.id),'我拿到了。');
 assert.equal(sendOuroborosPreset(s,c.id,'其他内容'),false);
 assert.equal(visibleMessages(c).length,1);
 assert.equal(sendOuroborosPreset(s,c.id,'我拿到了。'),true);
 assert.equal(visibleMessages(c).length,4);
});
test('MIRAGE deep link does not clear unread messages while sign-in is still visible',()=>{
 const store=makeStore(),s=store.get();s.day=5;s.unlocked=true;
 initializeMirage(store);
 assert.equal(acceptOuroborosChallenge(s),true);
 completeWalletChallenge(s);
 const c=s.content.conversations.mirage.find(c=>c.id==='mc-ourob-d05');
 const previous=globalThis.document;
 globalThis.document={querySelector:()=>null};
 setMirageAuthenticated(false);
 try{
  new PhoneRouter(store,new Map([['mirage',{manifest:{id:'mirage'}}]])).open({appId:'mirage',route:'/chat/'+c.id});
  assert.equal(c.unread,1);
  assert.equal(s.notifications.filter(n=>n.id==='ourob-story-accepted').length,1);
  const e=new MessageDelivery(store);e.tick(1000,true);e.tick(11000,true);
  assert.match(visibleMessages(c)[0].text,/ORDER CREATED/);
 }finally{setMirageAuthenticated(false);if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
