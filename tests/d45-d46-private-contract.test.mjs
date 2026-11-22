import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,tickQueuedStoryScenes55,scene55,story55Presence} from '../src/services/story55/runtime.js';
import {sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {timedStoryPaused,completed,nodeStatus,date55} from '../src/services/story55/state.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {publishPrivateContract,transferD45Wallet} from '../src/story/d46/runtime.js';
import {D45_WALLET_SCENE,D45_WALLET_DIALOGUE,D46_CHAT,D46_DIALOGUE,D46_CONTACT,D46_MAIL,PRIVATE_ORDER,PRIVATE_REMINDER} from '../src/story/d46/definition.js';
import {D13_WALLET_ID} from '../src/story/d13/definition.js';
import {prepareD45D46Preview} from '../src/story/d46/preview.js';
import {privateContractEntry,privateContractPage} from '../src/apps/mirage/features/private-contract/index.js';
import {walletPage} from '../src/apps/mirage/features/wallet/index.js';

function play(s,id,channel,cid,lines){
 let now=Date.now();
 for(let i=0;i<lines.length;i++){
  if(i===0)tickQueuedStoryScenes55(s,now);
  const q=scene55(s,id);assert.equal(q.index,i);now=q.nextAt??now;
  const before=s.clock;assert.equal(timedStoryPaused(s),true);
  advanceGameMinutes(s,90);assert.equal(s.clock,before);
  tickQueuedStoryScenes55(s,now);
  if(lines[i][0]==='me')sendScriptedDraft55(s,channel,cid,lines[i][1],now);
 }
 assert.ok(completed(s,id));return s.content.conversations[channel].find(c=>c.id===cid).messages.filter(m=>m.id.startsWith('s55-'+id+'-'));
}
test('D47 morning unlocks the frozen wallet, preserves all lines and posts an actual outgoing contract once; D48 mail and chat are clock-gated',()=>{
 const s=activateStory55(initialState());
 s.day=46;s.clock='10:29';s.story55.activeScene=null;s.story55.noappInstalled=true;
 for(const n of s.story55.config.nodes)if(n.day<47)s.story55.completed[n.id]={day:n.day,clock:'23:00'};
 s.content.mirage.wallets=[{id:D13_WALLET_ID,balance:50,status:'frozen',spendable:false}];
 assert.equal(publishPrivateContract(s),false);assert.equal(transferD45Wallet(s),false);
 tickStory55(s);assert.equal(nodeStatus(s,D45_WALLET_SCENE).state,'locked');assert.ok(!s.content.reminders.some(r=>r.id===PRIVATE_REMINDER));
 s.day=47;
 advanceGameMinutes(s,10);assert.equal(s.clock,'10:30');
 const log=play(s,D45_WALLET_SCENE,'noapp','tai',D45_WALLET_DIALOGUE);
 assert.equal(log.length,20);assert.equal(log[0].time,'10:30');assert.equal(log[0].day,47);assert.equal(log[6].kind,'image');assert.match(log[6].text,/d45-ximeng-photo\.jpg$/);
 assert.equal(log.at(-1).time,s.clock);assert.equal(story55Presence(s).status,'offline');assert.equal(timedStoryPaused(s),false);
 assert.match(walletPage(s,'/wallet/'+D13_WALLET_ID),/轉帳/);
 const balance=s.content.mirage.digitalBalance;assert.equal(transferD45Wallet(s),true);assert.equal(transferD45Wallet(s),false);assert.equal(s.content.mirage.digitalBalance,balance+50);
 const r=s.content.reminders.find(r=>r.id===PRIVATE_REMINDER);assert.equal(r.done,false);
 assert.match(privateContractEntry(s),/發佈委託/);
 assert.match(privateContractPage(s,()=>'',()=>''),/確認發佈/);
 const cash=s.bankData.balance;assert.equal(publishPrivateContract(s),true);assert.equal(publishPrivateContract(s),false);assert.equal(r.done,true);assert.equal(s.bankData.balance,cash);
 assert.equal(s.content.orders.find(o=>o.id===PRIVATE_ORDER).status,'PUBLISHED');
 s.day=48;s.clock='14:19';tickStory55(s);assert.ok(!s.content.mail.some(m=>m.id===D46_MAIL));
 advanceGameMinutes(s,1);tickStory55(s);const m=s.content.mail.find(m=>m.id===D46_MAIL);assert.equal(m.time,'14:20');assert.equal(m.read,false);
 assert.equal(s.content.orders.find(o=>o.id===PRIVATE_ORDER).status,'TAKEN');
 assert.equal(m.date,date55(48));assert.equal(s.content.conversations.mirage.find(c=>c.id===D46_CONTACT).messages[0].day,48);
 advanceGameMinutes(s,30); assert.equal(s.clock,'14:23');
 const chat=play(s,D46_CHAT,'mirage',D46_CONTACT,D46_DIALOGUE);assert.equal(chat[0].time,'14:23');assert.equal(chat.length,17);
 const order=s.content.orders.find(o=>o.id===PRIVATE_ORDER);assert.equal(order.currency,'HKD');assert.equal(order.agreedAmount,10000000);assert.equal(order.status,'AGREED');
 tickStory55(s);assert.equal(s.content.mail.filter(m=>m.id===D46_MAIL).length,1);assert.equal(s.content.orders.filter(o=>o.id===PRIVATE_ORDER).length,1);
 assert.equal(nodeStatus(s,'mercenary').state,'locked');s.day=49;assert.equal(nodeStatus(s,'mercenary').state,'locked');s.day=50;assert.equal(nodeStatus(s,'mercenary').state,'locked');s.clock='10:00';assert.equal(nodeStatus(s,'d50-deposit-request').state,'ready');
});
test('isolated preview entry uses real prior-day reconstruction, not completed target content',()=>{
 const s=activateStory55(initialState());prepareD45D46Preview(s,47);assert.equal(s.clock,'10:30');assert.equal(s.nav.current.appId,'noapp');assert.equal(completed(s,D45_WALLET_SCENE),false);
 prepareD45D46Preview(s,48);assert.equal(s.clock,'14:20');assert.equal(s.nav.current.appId,'kira');assert.ok(s.content.mail.some(m=>m.id===D46_MAIL));assert.equal(completed(s,D46_CHAT),false);
});
test('revision 1 saves move unfinished scenes without deleting completed historical receipts',()=>{
 const s=activateStory55(initialState()),c=s.story55.config;
 c.d46Revision=1;c.nodes.find(n=>n.id===D45_WALLET_SCENE).day=45;c.nodes.find(n=>n.id==='d45-group').requires.push(D45_WALLET_SCENE);
 s.day=46;s.story55.completed[D45_WALLET_SCENE]={day:45,clock:'10:30',legacySkipped:true};
 tickStory55(s);assert.equal(c.d46Revision,2);assert.equal(completed(s,D45_WALLET_SCENE),false);assert.equal(nodeStatus(s,D45_WALLET_SCENE).state,'locked');assert.ok(!c.nodes.find(n=>n.id==='d45-group').requires.includes(D45_WALLET_SCENE));
 c.d46Revision=1;s.story55.completed[D45_WALLET_SCENE]={day:45,clock:'10:40'};s.content.mirage.digitalTransactions=[{id:'s55-d45-wallet-transfer',amount:50}];
 tickStory55(s);assert.equal(s.story55.completed[D45_WALLET_SCENE].day,45);assert.equal(s.content.mirage.digitalTransactions.filter(t=>t.id==='s55-d45-wallet-transfer').length,1);
});
