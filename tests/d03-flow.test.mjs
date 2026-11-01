import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {completeNode,story55ChargeGate} from '../src/services/story55/state.js';
import {
 FLOW_CONTACT,FLOW_INVITE,FLOW_REWARD_ID,FLOW_KEY,ensureFlowHistory,
 tickFlowD03,openFlowTest,acceptFlowKey,installFlowTool,submitFlowScan,
 flowOnMirageEntry,flowDraft,sendFlowReply,flowState
} from '../src/services/story55/flow-d03.js';
import {rebuildStory55AtDay} from '../src/services/story55/rebuild.js';
import {renderFlowD03} from '../src/apps/ghost/features/flow-d03/index.js';

const newPhone=()=>{const s=initialState();activateStory55(s);completeNode(s,'intro');return s;};
const atInvite=s=>{s.day=3;s.clock='09:00';tickFlowD03(s);};
const contact=s=>s.content.conversations.mirage.find(c=>c.id===FLOW_CONTACT);

test('D01 history is visible; 09:00 D03 invite only once, with a deep-link notice',()=>{
 const s=newPhone();
 ensureFlowHistory(s);ensureFlowHistory(s);
 const older=contact(s).messages.filter(m=>m.sentDate==='2025-04-10');
 assert.equal(older.length,6);
 assert.match(older.at(-1).text,/开发个工具/);
 s.day=3;s.clock='08:59';assert.equal(tickFlowD03(s),false);
 assert.equal(contact(s).messages.some(m=>m.id===FLOW_INVITE),false);
 s.clock='09:00';assert.equal(tickFlowD03(s),true);
 assert.equal(tickFlowD03(s),false);
 assert.equal(contact(s).messages.filter(m=>m.id===FLOW_INVITE).length,1);
 assert.equal(s.notifications.filter(n=>n.id==='flow-d03-mirage-invite').length,1);
 assert.equal(s.notifications.find(n=>n.id==='flow-d03-mirage-invite').link.route,'/chat/'+FLOW_CONTACT);
});

test('D03 requires Flow link before Ghost key; wrong key never locks or changes progress',()=>{
 const s=newPhone();atInvite(s);
 assert.equal(story55ChargeGate(s),'plot');
 assert.equal(acceptFlowKey(s,FLOW_KEY).ok,false);
 assert.equal(installFlowTool(s),false);
 assert.equal(openFlowTest(s),true);
 assert.equal(openFlowTest(s),false);
 assert.equal(s.notifications.filter(n=>n.id==='flow-d03-ghost-install').length,1);
 assert.equal(s.notifications.at(0).link.appId,'ghost');
 assert.deepEqual(acceptFlowKey(s,'wrong'),{ok:false,error:'密钥错误'});
 assert.equal(flowState(s).keyAccepted,undefined);
 assert.equal(acceptFlowKey(s,FLOW_KEY).ok,true);
 assert.equal(installFlowTool(s),true);
 assert.equal(installFlowTool(s),false);
 assert.match(renderFlowD03(s,{route:'/flow-projects'}),/漏洞扫描工具/);
});

test('Cancel preserves unsubmitted scan; settlement gives one Kira mail and exactly 2000 USD',()=>{
 const s=newPhone();atInvite(s);openFlowTest(s);acceptFlowKey(s,FLOW_KEY);installFlowTool(s);
 const opening=s.bankData.balance;
 assert.equal(flowState(s).submitted,undefined);
 assert.equal(s.content.mail.some(m=>m.id===FLOW_REWARD_ID),false);
 assert.equal(submitFlowScan(s),true);
 assert.equal(submitFlowScan(s),false);
 assert.equal(s.bankData.balance,opening+2000);
 assert.equal(s.bankData.transactions.filter(t=>t.id===FLOW_REWARD_ID).length,1);
 assert.equal(s.content.mail.filter(m=>m.id===FLOW_REWARD_ID).length,1);
 assert.equal(s.notifications.filter(n=>n.id==='flow-d03-kira-reward').length,1);
 assert.match(renderFlowD03(s,{route:'/flow-record'}),/已提交/);
 assert.doesNotMatch(renderFlowD03(s,{route:'/flow-record'}),/再次扫描/);
 assert.equal(story55ChargeGate(s),'plot');
});

test('Flow follow-up waits for Mirage entry and player Send, then unlocks D04',()=>{
 const s=newPhone();atInvite(s);openFlowTest(s);acceptFlowKey(s,FLOW_KEY);installFlowTool(s);submitFlowScan(s);
 assert.equal(flowDraft(s),null);
 assert.equal(flowOnMirageEntry(s),true);
 assert.equal(flowOnMirageEntry(s),false);
 assert.equal(contact(s).messages.filter(m=>m.id==='flow-d03-followup').length,1);
 assert.equal(flowDraft(s).text,'很强。');
 assert.throws(()=>sendFlowReply(s,'好用'),/预设台词/);
 assert.equal(sendFlowReply(s,'很强。'),true);
 assert.equal(flowState(s).completed,true);
 assert.equal(story55ChargeGate(s),null);
 assert.equal(contact(s).messages.filter(m=>m.id==='flow-d03-finish').length,1);
 assert.throws(()=>sendFlowReply(s,'很强。'),/预设台词/);
});

test('D04 developer reconstruction completes prior D03 without duplicating history or reward',()=>{
 const s=newPhone();
 rebuildStory55AtDay(s,4,'08:00');
 assert.equal(s.day,4);
 assert.equal(flowState(s).completed,true);
 assert.equal(s.bankData.transactions.filter(t=>t.id===FLOW_REWARD_ID).length,1);
 assert.equal(contact(s).messages.filter(m=>m.id===FLOW_INVITE).length,1);
 assert.equal(contact(s).messages.filter(m=>m.sentDate==='2025-04-10').length,6);
});
