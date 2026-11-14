import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {D15_D55_CONTRACTS,D15_D55_RESTRICTED} from '../src/story/d15-d55/commissions.js';
import {seedD04Contracts,acceptD04Contract,submitD04Contract,tickD04Contracts,D04_STEP,D04_MAIL,D04_RECEIPT} from '../src/story/d04/contract.js';

const fixture=(day=15,clock='10:00')=>{
 const s=initialState();activateStory55(s);s.day=day;s.clock=clock;seedD04Contracts(s);return s;
};
const contact=(s,owner)=>s.content.conversations.mirage.find(c=>c.name===owner);
const msgs=(s,owner)=>contact(s,owner)?.messages||[];
const count=(s,owner,kind)=>msgs(s,owner).filter(m=>m.id.startsWith('mirage-commission-')&&m.id.endsWith('-'+kind)).length;

test('approved plan has exactly 82 daily offers, 70 unique employers and unchanged 15 locked listings',()=>{
 assert.equal(D15_D55_CONTRACTS.length,82);
 assert.equal(D15_D55_RESTRICTED.length,15);
 assert.equal(new Set(D15_D55_CONTRACTS.map(x=>x.owner)).size,70);
 assert.equal(D15_D55_CONTRACTS.find(x=>x.id==='M-012').owner,'@quietterminal');
 assert.equal(D15_D55_CONTRACTS.find(x=>x.id==='M-016').owner,'@rancor');
 assert.equal(D15_D55_CONTRACTS.find(x=>x.id==='M-019').owner,'@oldmoney');
 const ids=new Set(D15_D55_CONTRACTS.map(o=>o.id));
 assert.equal(ids.size,82);
 for(let day=15;day<=55;day++)assert.equal(D15_D55_CONTRACTS.filter(o=>o.day===day).length,2,'D'+day);
});

test('accepted new owner becomes a real Mirage contact, system marker precedes private reply, and duplicate clicks do nothing',()=>{
 const s=fixture(19);
 assert.equal(contact(s,'@quietterminal'),undefined,'an unaccepted employer must not be added early');
 assert.equal(acceptD04Contract(s,'M-012'),true);
 const c=contact(s,'@quietterminal');assert.ok(c);
 assert.equal(c.id,'mc-employer-quietterminal');
 assert.equal(c.messages[0].kind,'system');
 assert.equal(c.messages[0].from,'system');
 assert.equal(c.messages[0].text,'── NEW CONTACT ──');
 assert.equal(c.messages[1].from,c.id);
 assert.ok(c.messages[1].text.trim());
 assert.equal(c.messages.length,2);
 assert.equal(acceptD04Contract(s,'M-012'),false);
 assert.equal(contact(s,'@quietterminal'),c);
 assert.equal(msgs(s,'@quietterminal').length,2);
 assert.equal(s.content.mail.filter(m=>m.id===D04_MAIL('M-012')).length,1);
});

test('20 featured employers retain a single thread across orders with a fresh marker for each accepted order',()=>{
 const s=fixture(19);
 assert.equal(acceptD04Contract(s,'M-013'),true);
 const thread=contact(s,'@oldmoney');
 assert.ok(thread);
 s.day=22;s.clock='08:00';seedD04Contracts(s);
 assert.equal(acceptD04Contract(s,'M-019'),true);
 assert.equal(contact(s,'@oldmoney')?.id,thread.id);
 assert.equal(s.content.conversations.mirage.filter(x=>x.name==='@oldmoney').length,1);
 assert.equal(thread.messages.filter(m=>m.kind==='system'&&m.text==='── NEW CONTACT ──').length,2);
 assert.equal(count(s,'@oldmoney','accepted'),2);
});

test('manual completion emits one employer receipt without altering canonical bank/KIRA settlement',()=>{
 const s=fixture(15);
 assert.equal(acceptD04Contract(s,'M-001'),true);
 const o=s.content.orders.find(x=>x.id==='M-001');o.status='READY';
 const c=D15_D55_CONTRACTS.find(x=>x.id==='M-001');
 s.ghost.orders??={};
 for(let i=0;i<c.stages.length;i++)s.ghost.orders[D04_STEP(c.id,i)]={status:'success'};
 const previousBalance=s.bankData.balance;
 assert.equal(submitD04Contract(s,c.id),true);
 assert.equal(count(s,c.owner,'completed'),1);
 assert.equal(s.bankData.balance,previousBalance+c.amount);
 assert.equal(s.bankData.transactions.filter(t=>t.id===D04_RECEIPT(c.id)).length,1);
 assert.equal(s.content.mail.filter(m=>m.id===D04_RECEIPT(c.id)).length,1);
 assert.equal(submitD04Contract(s,c.id),false);
 assert.equal(count(s,c.owner,'completed'),1);
});

test('accepted expired order gets failure message, OPEN expired order does not create a contact, and retries are idempotent',()=>{
 const s=fixture(19);
 assert.equal(acceptD04Contract(s,'M-012'),true);
 assert.equal(contact(s,'@quietterminal')!==undefined,true);
 s.day=30;s.clock='12:00';tickD04Contracts(s);
 assert.equal(s.content.orders.find(x=>x.id==='M-012').status,'EXPIRED');
 assert.equal(count(s,'@quietterminal','expired'),1);
 assert.equal(contact(s,'@executor'),undefined);
 assert.equal(acceptD04Contract(s,'M-012'),false);
 tickD04Contracts(s);
 assert.equal(count(s,'@quietterminal','expired'),1);
});

test('pre-existing accepted orders keep original owner, while pristine OPEN orders adopt reviewed mapping',()=>{
 const s=fixture(19);
 const old=s.content.orders.find(x=>x.id==='M-012');
 old.owner='@moth';old.status='ACCEPTED';old.wasAccepted=true;
 const next=s.content.orders.find(x=>x.id==='M-023');
 // future order should not yet exist; inject one OPEN legacy listing to check migration
 assert.equal(next,undefined);
 s.content.orders.push({id:'M-023',owner:'@basalt',status:'OPEN',storyDay:24,marketDaily:true});
 s.day=24;s.clock='10:00';seedD04Contracts(s);
 assert.equal(old.owner,'@moth','never rewrite a progressed order');
 assert.equal(s.content.orders.find(x=>x.id==='M-023').owner,'@rowan_17');
});
