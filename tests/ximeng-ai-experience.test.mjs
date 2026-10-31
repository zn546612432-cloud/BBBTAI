import {acceptOuroborosChallenge,sendOuroborosPreset} from '../src/apps/mirage/ouroboros-flow.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,PhoneStore} from '../src/services/storage.js';
import {tickWorld,isTaiConversation} from '../src/system/time/clock.js';
import {taiPresence,markTaiEngaged,clearTaiEngagement} from '../src/services/presence.js';
import {nextScheduledTaiInvite,deliverTaiChessInvite} from '../src/services/chess-invites.js';
import {rememberTaiConversation} from '../src/services/ai/memory.js';
import {initializeMirage,WALLET_CHALLENGE_ID,completeWalletChallenge,contacts} from '../src/apps/mirage/data.js';

function mockStore(s=initialState()){let state=s;return{get:()=>state,update(fn){let n=structuredClone(state);fn(n);state=n;return state;}};}
test('NoApp chat and call proceed 1 real minute per 1 game minute and restore normal speed on exit',()=>{
 const s=initialState();s.nav.current={appId:'noapp',route:'/chat/tai',params:{}};s.powerMode='idle';const prior=s.clock;
 assert.equal(isTaiConversation(s),true);
 tickWorld(s,60000,{taiChat:isTaiConversation(s)});
 assert.equal(prior,'21:18');assert.equal(s.clock,'21:19');
 s.nav.current={appId:'home',route:'/',params:{}};
 assert.equal(isTaiConversation(s),false);
 tickWorld(s,60000,{taiChat:isTaiConversation(s)});
 assert.equal(s.clock,'22:07');
 s.nav.current={appId:'noapp',route:'/call',params:{}};
 assert.equal(isTaiConversation(s),true);
});
test('Xitai may be contacted between 18:00 and next 08:00, engaged chat stays online',()=>{
 const s=initialState();s.day=60;s.clock='19:20';clearTaiEngagement();
 assert.equal(taiPresence(s).status,'online');
 s.clock='04:20';assert.equal(taiPresence(s).status,'busy');
 s.clock='11:30';assert.equal(taiPresence(s).status,'away');
 markTaiEngaged();assert.equal(taiPresence(s).status,'online');
 clearTaiEngagement();
});
test('chess initiations are only offered twice and are persistent',()=>{
 const s=initialState();s.invitations=[];s.content.conversations.noapp[0].messages=[];s.events=[];
 s.day=56;s.clock='21:18';
 let due=nextScheduledTaiInvite(s);assert.equal(due.index,0);assert.equal(deliverTaiChessInvite(s,due),true);
 assert.equal(nextScheduledTaiInvite(s),null);
 s.day=65;s.clock='21:32';due=nextScheduledTaiInvite(s);assert.equal(due.index,1);
 assert.equal(deliverTaiChessInvite(s,due),true);
 s.day=70;assert.equal(nextScheduledTaiInvite(s),null);
 assert.equal(s.invitations.filter(i=>i.source==='story-invitation').length,2);
 assert.equal(s.content.conversations.noapp[0].messages.filter(m=>m.kind==='app_invitation').length,2);
});
test('D01 retains at least four established MIRAGE identities and D05 challenge credits 10 BTC once',()=>{
 const s=initialState();s.day=1;s.content.conversations.mirage=[];s.content.mirage=null;
 const store=mockStore(s);
 initializeMirage(store);
 assert.equal(contacts(store.get()).length,4);
 assert.ok(contacts(store.get()).some(c=>c.name==='BASILISK SUPPLY'));
 initializeMirage(store);
 assert.equal(contacts(store.get()).length,4);
 store.update(n=>{n.day=5;n.clock='21:30';});
 initializeMirage(store);
 assert.equal(contacts(store.get()).length,4);
 assert.ok(store.get().content.orders.some(o=>o.id===WALLET_CHALLENGE_ID));
 store.update(n=>{
  assert.equal(acceptOuroborosChallenge(n),true);
  assert.equal(completeWalletChallenge(n),true);
  assert.equal(completeWalletChallenge(n),false);
  assert.equal(sendOuroborosPreset(n,'mc-ourob-d05','我拿到了。'),true);
  n.content.conversations.mirage.find(c=>c.id==='mc-ourob-d05').messages.find(m=>m.id==='ou-group').delivery={day:5,clock:'21:31'};
  assert.equal(sendOuroborosPreset(n,'mc-ourob-d05','我单干。'),true);
  assert.equal(sendOuroborosPreset(n,'mc-ourob-d05','因为我是天才。'),true);
 });
 const s5=store.get();
 assert.equal(s5.content.mirage.transactions.filter(x=>x.id==='ou-btc10').length,1);
 assert.equal(contacts(s5).length,5);
 assert.equal(s5.content.conversations.mirage.find(c=>c.id==='mc-ourob-d05').messages.filter(m=>m.text.includes('奖励饼干')).length,1);
});
test('remember only directly disclosed NoApp preferences, never invent future memories',()=>{
 const s=initialState();s.aiDraft.memories=[];s.day=65;
 assert.equal(rememberTaiConversation(s,'我喜欢圣诞惊魂夜'),true);
 assert.equal(rememberTaiConversation(s,'我喜欢圣诞惊魂夜'),false);
 assert.equal(rememberTaiConversation(s,'晚安'),false);
 assert.equal(s.aiDraft.memories.length,1);
 assert.equal(s.aiDraft.memories[0].visibility,'noapp');
});
