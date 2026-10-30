import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {contacts,initializeMirage,completeWalletChallenge,WALLET_CHALLENGE_ID} from '../src/apps/mirage/data.js';
import {readConversationInState} from '../src/services/messaging/read.js';
import {authorize,begin,nextGhostRound} from '../src/apps/ghost/state.js';
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
test('Ouroboros cannot send D05 congratulations before 10BTC reward is earned',()=>{
 const store=makeStore();store.get().day=5;initializeMirage(store);
 assert.ok(store.get().content.orders.some(x=>x.id===WALLET_CHALLENGE_ID));
 assert.equal(contacts(store.get()).some(x=>x.id==='mc-ourob-d05'),false);
 store.update(s=>{s.content.orders.find(x=>x.id===WALLET_CHALLENGE_ID).status='ACCEPTED';});
 store.update(s=>assert.equal(completeWalletChallenge(s),true));
 const c=contacts(store.get()).find(x=>x.id==='mc-ourob-d05');
 assert.equal(c.messages.length,6);
 assert.ok(c.messages[2].text.includes('我单干'));
 assert.ok(c.messages[3].text.includes('百分之八十'));
 assert.ok(c.messages[5].text.includes('奖励饼干'));
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
