import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,tickQueuedStoryScenes55,advanceScene55,markMail55,sceneLines} from '../src/services/story55/runtime.js';
import {date55,completed,nodeStatus} from '../src/services/story55/state.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {plugIn} from '../src/system/power/battery.js';
import {chargingBlock} from '../src/system/power/story.js';
import {deliverD01Opening,claimD01Bank,acceptD01Repair,deliverD01Attachment,revealD01Key,deployD01,finishD01Round,submitD01Attachment,settleD01Repair,D01_REPAIR} from '../src/story/d01/runtime.js';
import {sendD01WeChat} from '../src/story/d01/wechat.js';
import {openFlowTest,acceptFlowKey,FLOW_KEY,installFlowTool,submitFlowScan,flowOnMirageEntry,sendFlowReply,flushFlowReply,FLOW_INVITE} from '../src/services/story55/flow-d03.js';
import {acceptD04Contract,D04_MAIL,D04_STEP,submitD04Contract} from '../src/story/d04/contract.js';
import {D06_ORDER_ID,D06_CONTRACT} from '../src/story/d06/commission.js';
import {openCommissionWithGhost} from '../src/services/commissions/attachment-flow.js';
import {begin,finish} from '../src/apps/ghost/state.js';
import {currentScript55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {bindD13Wallet,transferD13Wallet,enterD13Chat} from '../src/story/d13/runtime.js';

const store=s=>({get:()=>s,update:f=>f(s)});
const thread=(s,id)=>s.content.conversations.wechat.find(c=>c.id===id);
function forward(s,clock){
 const before=Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3));
 const to=Number(clock.slice(0,2))*60+Number(clock.slice(3));
 assert.ok(to>=before,'test timeline cannot rewind: '+s.clock+' to '+clock);
 const delta=advanceGameMinutes(s,to-before);
 assert.equal(delta.minutes,to-before,'game clock must reach '+clock);
 assert.equal(s.clock,clock);
 tickStory55(s);
}
function nextDay(s,expected){
 forward(s,'23:30');
 assert.equal(chargingBlock(s),null,'cannot charge after required day '+s.day+' events');
 assert.equal(plugIn(s),true,'player uses native overnight charge');
 assert.equal(s.day,expected);
 assert.equal(s.clock,'08:00');
 s.dayChargeRemainingMs=0; // finish the native 1.2s wake screen transition
 s.unlocked=true;tickStory55(s);
}
function completeQueued(s,id,channel,conversationId){
 const lines=sceneLines(s,id);let n=0;
 while(!completed(s,id)&&n++<lines.length*5+10){
  const q=s.story55.scenes[id]||{index:0};
  const next=lines[q.index||0];
  assert.ok(next,'no missing line in '+id);
  if(next[0]==='me'){
   const draft=currentScript55(s,channel,conversationId);
   assert.equal(draft?.id,id,'must use the native preset draft');
   assert.equal(draft?.kind,'me');
   sendScriptedDraft55(s,channel,conversationId,draft.text);
  }else if(next[0]==='call'){
   // Native handset establishes the call before the voice line is released.
   s.phoneCall={id:'story-call-'+id,node:id,source:'story55',direction:'incoming',state:'connected'};
   advanceScene55(s,id);
  }else if(id==='intrusion'&&q.accepted){
   // After the native handset is connected, incoming D13 lines are paced
   // by telephony audio, not by the pre-call message queue. This models
   // completion of one played voice clip without fetching live MiniMax audio.
   advanceScene55(s,id);
  }else{
   const due=Math.max(Date.now(),Number(q.nextAt)||0)+20;
   tickQueuedStoryScenes55(s,due);
  }
 }
 assert.ok(completed(s,id),'queued '+id+' must finish with real player Sends');
}
test('D01 → D14 follows actual charge / KIRA / MIRAGE / GHOST / message interactions without developer reconstruction or pre-completed nodes',()=>{
 const s=activateStory55(initialState());
 s.unlocked=true;
 assert.deepEqual(Object.keys(s.story55.completed),[]);
 assert.equal(s.day,1);assert.equal(date55(s.day),'2025-05-19');
 // D01 is completed through the original explicit mail, bank, commission
 // acceptance, key and five actual Ghost stage settlement functions.
 assert.ok(sendD01WeChat(store(s),'group','早',100).messageId);
 assert.equal(deliverD01Opening(s),true);
 forward(s,'08:15');assert.equal(claimD01Bank(s),true);
 assert.equal(acceptD01Repair(s),true);
 assert.equal(deliverD01Attachment(s),true);
 assert.equal(revealD01Key(s),true);
 assert.equal(deployD01(s),true);
 for(let i=0;i<5;i++)assert.equal(finishD01Round(s),true);
 assert.equal(submitD01Attachment(s),true);
 assert.equal(settleD01Repair(s),true);
 assert.ok(completed(s,'intro'));
 assert.equal(s.content.orders.find(o=>o.id===D01_REPAIR).status,'COMPLETED');
 assert.equal(s.content.mirage.digitalTransactions.length,1);
 // D01 only advances by plugging in, including with unfinished optional chat.
 assert.equal(plugIn(s),true);assert.equal(s.day,2);
 s.dayChargeRemainingMs=0;s.unlocked=true;tickStory55(s);

 nextDay(s,3);
 forward(s,'08:15');
 assert.ok(s.content.conversations.mirage.find(c=>c.id==='mc-flow-d03').messages.some(m=>m.id===FLOW_INVITE));
 assert.equal(openFlowTest(s),true);
 assert.equal(acceptFlowKey(s,FLOW_KEY).ok,true);
 assert.equal(installFlowTool(s),true);
 assert.equal(submitFlowScan(s),true);
 assert.equal(flowOnMirageEntry(s),true);
 assert.equal(sendFlowReply(s,'很强。'),true);
 assert.equal(flushFlowReply(s,s.story55.flowD03.replyDueAt),true);
 assert.ok(completed(s,'flow-d03'));
 assert.equal(s.bankData.transactions.filter(t=>t.id==='flow-d03-reward').length,1);
 nextDay(s,4);
 nextDay(s,5);
 nextDay(s,6);
 // D06 uses the existing commission runner; no developer wallet shortcut.
 forward(s,'08:10');
 const flow=s.content.conversations.mirage.find(c=>c.id==='mc-flow-d03');
 assert.equal(flow.messages.filter(m=>m.id==='flow-d06-wallet-bounty').length,1);
 assert.equal(acceptD04Contract(s,D06_ORDER_ID),true);
 assert.equal(openCommissionWithGhost(s,D04_MAIL(D06_ORDER_ID)),D04_STEP(D06_ORDER_ID,0));
 for(let i=0;i<D06_CONTRACT.stages.length;i++){
  const id=D04_STEP(D06_ORDER_ID,i),run=s.ghost.orders[id];
  assert.ok(run&&run.key===D06_CONTRACT.key);
  if(run.requiresKeyEntry){
   assert.equal(begin(s,id,10000+i*1000),false,'requires KIRA key');
   run.keyVerified=true; // equivalent to entering the matched KIRA key in Ghost
  }
  assert.equal(begin(s,id,11000+i*1000),true,id);
  finish(s,id,true,12000+i*1000); // puzzle completion is independently tested
  assert.equal(s.ghost.orders[id].status,'success');
 }
 assert.equal(submitD04Contract(s,D06_ORDER_ID),true);
 assert.ok(completed(s,'wallet'));assert.equal(s.content.mirage.digitalBalance,10.04);
 tickStory55(s);
 completeQueued(s,'invitation','mirage','s55-ouroboros');
 assert.equal(s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.filter(m=>m.from==='me').length,6);
 nextDay(s,7);
 nextDay(s,8);
 nextDay(s,9);
 nextDay(s,10);
 nextDay(s,11);
 assert.equal(date55(s.day),'2025-05-29');
 forward(s,'08:40');
 completeQueued(s,'return','wechat','wang');
 assert.ok(thread(s,'wang').messages.some(m=>m.id==='s55-return-2'&&m.from==='me'));
 assert.ok(!thread(s,'group').messages.some(m=>m.from==='傅隆生'));
 nextDay(s,12);
 assert.equal(date55(s.day),'2025-05-30');
 forward(s,'10:10');
 completeQueued(s,'move','wechat','group');
 nextDay(s,13);
 assert.equal(date55(s.day),'2025-05-31');
 forward(s,'22:09');
 assert.equal(s.content.mail.some(m=>m.id==='s55-d13-wallet-mail'),false);
 forward(s,'22:10');
 assert.equal(s.content.mail.filter(m=>m.id==='s55-d13-wallet-mail').length,1);
 assert.equal(s.story55.completed.exhibition,undefined,'planning note is not an implicit requirement');
 markMail55(s,'s55-d13-wallet-mail');
 assert.equal(bindD13Wallet(s),true);
 assert.equal(transferD13Wallet(s,300000),true);
 assert.equal(enterD13Chat(s),true);
 completeQueued(s,'intrusion','mirage','s55-ouroboros');
 assert.ok(completed(s,'intrusion'));
 assert.equal(chargingBlock(s),null,'D13 call completed, planning note must not strand charge');
 nextDay(s,14);
 forward(s,'09:16');
 assert.equal(nodeStatus(s,'code').state,'ready');
 assert.equal(s.content.mail.filter(m=>m.id==='code-mail').length,1);
 assert.equal(s.story55.developerRebuild,undefined,'never used developer skip');
 assert.equal(s.story55.completed.exhibition,undefined);
 const group=thread(s,'group'),p=group.messages.filter(m=>m.from==='me');
 assert.ok(p.length>=2,'real user Send lines survived 13 charges');
 assert.ok(group.messages.some(m=>m.id==='d12-arrival-0'&&m.text.includes('澳門好熱')));
 assert.equal(new Set(group.messages.map(m=>m.id)).size,group.messages.length,'no duplicate group IDs');
 assert.ok(group.messages.every(m=>!m.sentDate||m.sentDate<='2025-06-01'),'future scenes never leak');
});
