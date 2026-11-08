import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55} from '../src/services/story55/runtime.js';
import {rebuildStory55AtDay,prepareStory55NodeAtDay} from '../src/services/story55/rebuild.js';
import {completed,story55Config,date55} from '../src/services/story55/state.js';
import {storySourceVersion} from '../src/services/story55/test-snapshots.js';
import {restartState} from '../src/system/restart/index.js';
import {D01_REPAIR,D01_ATTACHMENT,D01_DONE} from '../src/story/d01/runtime.js';
import {saveLinkedMission,linkedArtifactId,linkedDeliveryId,linkedReceiptId,linkedMissionVisible} from '../src/apps/mirage/linked-missions.js';

function phone(){
 const s=initialState();
 activateStory55(s);
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 group.messages.push({id:'history-2024-0310',from:'me',text:'我换新手机了',sentDate:'2024-03-10',time:'09:20',storyImported:true});
 group.messages.push({id:'author-d48',from:'wang',text:'未来通知',sentDate:'2025-07-05',
  schedule:{mode:'game-time',day:48,clock:'10:00'},authored:true});
 return s;
}
const ids=s=>new Set((s.content.conversations.wechat.find(c=>c.id==='group')?.messages||[]).map(m=>m.id));
test('developer D01 is playable; jumping to D02 auto-settles every D01 app without duplicates',()=>{
 const s=phone();
 rebuildStory55AtDay(s,1);
 assert.equal(s.day,1);
 assert.equal(s.content.orders.find(o=>o.id===D01_REPAIR).status,'OPEN');
 assert.equal(s.content.mirage.digitalBalance,0);
 assert.equal(s.story55.d01?.rewardPaid,undefined);
 rebuildStory55AtDay(s,2);
 assert.equal(s.content.orders.find(o=>o.id===D01_REPAIR).status,'COMPLETED');
 assert.equal(s.story55.d01.repairAccepted,true);
 assert.equal(s.story55.d01.completedRounds,5);
 assert.equal(s.story55.d01.developerCompleted,true);
 assert.equal(s.story55.d01.rewardPaid,true);
 assert.equal(s.story55.d01.bankClaimed,true);
 assert.equal(s.bankData.transactions.filter(x=>x.id==='d01-bank-1846').length,1);
 assert.equal(s.content.mirage.digitalBalance,0.04);
 assert.equal(s.content.mirage.digitalTransactions.filter(x=>x.orderId===D01_REPAIR).length,1);
 assert.equal(s.content.mail.filter(x=>x.id===D01_ATTACHMENT).length,1);
 assert.equal(s.content.mail.filter(x=>x.id===D01_DONE).length,1);
 assert.equal(s.ghost.orders[D01_REPAIR].status,'paid');
 assert.equal(s.ghost.history.filter(x=>x.orderId===D01_REPAIR&&x.success).length,5);
 rebuildStory55AtDay(s,2);
 assert.equal(s.content.mirage.digitalTransactions.filter(x=>x.orderId===D01_REPAIR).length,1);
 assert.equal(s.content.mail.filter(x=>x.id===D01_DONE).length,1);
 rebuildStory55AtDay(s,1);
 assert.equal(s.content.orders.find(o=>o.id===D01_REPAIR).status,'OPEN');
 assert.equal(s.content.mirage.digitalBalance,0);
 assert.equal(s.content.mail.some(x=>x.id===D01_DONE),false);
 assert.equal(s.ghost.orders[D01_REPAIR],undefined);
});
test('D45 rebuild reconstructs storyline, inbox, wallet, NoApp and phased GHOST',()=>{
 const s=phone(),oldVersion=storySourceVersion(s);
 rebuildStory55AtDay(s,45,'08:00');
 assert.equal(s.day,45);
 assert.equal(s.story55.developerRebuild.simulatedThrough,44);
 assert.equal(completed(s,'recognition'),true);
 assert.equal(s.story55.noappInstalled,true);
 assert.equal(s.content.conversations.noapp.find(c=>c.id==='tai').name,'陈熙泰');
 assert.equal(completed(s,'mercenary'),true);
 assert.equal(completed(s,'second'),false); // D43-D47 deployment cannot finish at D44
 assert.equal(s.story55.projects.second.batches.length,2);
 assert.equal(s.story55.projects.base.batches.length,11);
 assert.equal(s.story55.reports['base-10'].percent,100);
 assert.equal(s.content.orders.find(o=>o.id==='s55-mirage-wallet-bounty').status,'COMPLETED');
 assert.equal(s.content.mirage.transactions.filter(t=>t.id==='s55-wallet-10btc').length,1);
 assert.equal(s.content.mail.find(m=>m.id==='code-mail')?.read,true);
 assert.equal(s.content.mail.find(m=>m.id==='invite-mail')?.read,true);
 assert.equal(s.content.conversations.noapp.find(c=>c.id==='tai').messages.some(m=>m.id==='s55-recognition-0'),true);
 assert.equal(ids(s).has('history-2024-0310'),true);
 assert.equal(ids(s).has('author-d48'),true);
 assert.equal(s.content.conversations.wechat.find(c=>c.id==='group').messages.find(m=>m.id==='author-d48').delivery,undefined);
 assert.ok(s.bankData.transactions.some(t=>t.test===true&&t.label.startsWith('DEVELOPER TEST CAPITAL')));
 assert.equal(storySourceVersion(s),oldVersion);
});
test('jump backward reconstructs without retaining future unlocks or completed story',()=>{
 const s=phone();
 rebuildStory55AtDay(s,45);
 s.content.mirage.assets.push({id:'future-purchase',productId:'mc-p5',quantity:1});
 s.content.mirage.cart.push({id:'mc-p5',qty:1});
 s.content.mirage.balance=11;
 rebuildStory55AtDay(s,12);
 assert.equal(s.day,12);
 assert.equal(completed(s,'return'),true);
 assert.equal(completed(s,'move'),false);
 assert.equal(completed(s,'recognition'),false);
 assert.equal(s.story55.noappInstalled,undefined);
 assert.equal(s.content.conversations.noapp.find(c=>c.id==='tai').name,'Dr Ouroboros');
 assert.equal(s.content.mail.some(m=>m.id==='invite-mail'),false);
 assert.deepEqual(s.content.mirage.assets,[]);
 assert.deepEqual(s.content.mirage.cart,[]);
 assert.equal(s.content.mirage.balance,300000);
 assert.equal(ids(s).has('history-2024-0310'),true);
});
test('D55 leaves final scene and audio playable, but finishes the prior-day tasks',()=>{
 const s=phone();
 rebuildStory55AtDay(s,55);
 assert.equal(completed(s,'second'),true);
 assert.equal(completed(s,'ready'),true);
 assert.equal(completed(s,'ending'),false);
 assert.equal(s.story55.ended,false);
 assert.equal(s.story55.projects.second.batches.length,5);
});
test('scheduled authored messages are replayed chronologically and remain editable',()=>{
 const s=phone();
 s.storyPresets.rules=[{id:'d8-hi',enabled:true,kind:'proactive',mode:'scheduled',day:8,from:'10:30',to:'10:40',channel:'wechat',conversationId:'group',messages:['记得吃饭'],once:true}];
 rebuildStory55AtDay(s,12);
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 assert.ok(group.messages.some(m=>m.id==='preset-d8-hi-8-0'&&m.day===8&&m.time==='10:30'));
 assert.ok(s.storyPresets.usedIds.includes('d8-hi'));
 assert.equal(s.notifications.filter(n=>n.id==='preset-notice-d8-hi-8').length,1);
 assert.ok(!group.messages.some(m=>m.id==='author-d48'&&m.delivery));
 rebuildStory55AtDay(s,49);
 const newGroup=s.content.conversations.wechat.find(c=>c.id==='group');
 assert.deepEqual(newGroup.messages.find(m=>m.id==='author-d48').delivery,{day:48,clock:'10:00'});
});
test('node preview reconstructs same-day prerequisites but does not complete target',()=>{
 const s=phone();
 prepareStory55NodeAtDay(s,'recognition');
 assert.equal(s.day,30);
 assert.equal(completed(s,'invite'),true);
 assert.equal(completed(s,'recognition'),false);
 assert.equal(s.story55.noappInstalled,undefined);
 assert.equal(s.story55.previewNode,'recognition');
});
test('invalid target dates are atomic and reject rather than silently corrupt state',()=>{
 const s=phone(),before=JSON.stringify(s);
 assert.throws(()=>rebuildStory55AtDay(s,56),/日期或时间无效/);
 assert.equal(JSON.stringify(s),before);
});

test('phone reset returns to D01 but preserves authored future story and pre-D01 messages',()=>{
 const s=phone(),oldVersion=storySourceVersion(s);
 rebuildStory55AtDay(s,45);
 const reset=restartState(s);
 assert.equal(s.day,45);
 assert.equal(reset.day,1);
 assert.equal(reset.clock,'08:00');
 assert.equal(reset.unlocked,false);
 assert.equal(reset.nav.current.appId,'home');
 assert.equal(Object.keys(reset.story55.completed).length,0);
 assert.equal(reset.content.mail.some(m=>m.story55),false);
 assert.equal(ids(reset).has('history-2024-0310'),true);
 assert.equal(ids(reset).has('author-d48'),true);
 assert.equal(storySourceVersion(reset),oldVersion);
});

test('D45 reconstructs authored D20 MIRAGE→KIRA→GHOST→sent attachment→wallet once',()=>{
 const s=phone();
 saveLinkedMission(s,{id:'d20-bounty',title:'D20测试委托',owner:'AMBER',subject:'订单D20',
  body:'虚构的档案验证',type:'cipher',reward:5200,seconds:60,publishDay:20,expiryDay:29,
  reviewMinutes:60,deadlineDay:21,deadlineClock:'18:00'});
 const before=storySourceVersion(s);
 rebuildStory55AtDay(s,45);
 const order=s.content.orders.find(o=>o.id==='d20-bounty');
 assert.equal(order.status,'COMPLETED');
 assert.equal(s.content.mirage.digitalBalance,5210.04); // D01 0.04 BTC + D06 10 BTC + D20 5200
 assert.equal(s.content.mirage.digitalTransactions.filter(t=>t.orderId==='d20-bounty').length,1);
 assert.equal(s.content.mail.filter(m=>m.id===linkedDeliveryId('d20-bounty')).length,1);
 assert.equal(s.content.mail.filter(m=>m.id===linkedReceiptId('d20-bounty')).length,1);
 assert.equal(s.content.mail.find(m=>m.id===linkedDeliveryId('d20-bounty')).attachments[0],linkedArtifactId('d20-bounty'));
 assert.equal(s.content.missionFiles.filter(f=>f.orderId==='d20-bounty').length,1);
 assert.equal(storySourceVersion(s),before,'completing a test contract must not modify its authoring version');
 rebuildStory55AtDay(s,12);
 assert.equal(s.content.orders.find(o=>o.id==='d20-bounty').status,'OPEN');
 assert.equal(linkedMissionVisible(s,'d20-bounty'),false);
 assert.equal(s.content.mirage.digitalBalance,10.04); // D01 and D06 rewards remain after removing D20
 assert.equal((s.content.missionFiles||[]).filter(f=>f.orderId==='d20-bounty').length,0); // D02 completed mission files persist
 assert.equal(s.content.mail.some(m=>m.id===linkedDeliveryId('d20-bounty')),false);
 assert.equal(storySourceVersion(s),before);
});
test('D21 shows pending review for a D20 contract until the exact configured game minute',()=>{
 const s=phone();
 saveLinkedMission(s,{id:'d20-slow',title:'缓慢审核',owner:'AMBER',subject:'D20审核',
  body:'请查收',type:'extract',reward:2000,publishDay:20,expiryDay:22,reviewMinutes:2000});
 rebuildStory55AtDay(s,21,'08:00');
 assert.equal(s.content.orders.find(o=>o.id==='d20-slow').status,'REVIEWING');
 assert.equal(s.content.mirage.digitalBalance,10.04); // D20 pending; D01 and D06 completed
 rebuildStory55AtDay(s,22,'08:00');
 assert.equal(s.content.orders.find(o=>o.id==='d20-slow').status,'COMPLETED');
 assert.equal(s.content.mirage.digitalBalance,2010.04); // D01, D06 and D20 entries
});

test('developer day jump retains genuine D01-D13 Send records and unscripted replies without future leaks',()=>{
 const s=phone();s.day=31;s.clock='23:00';
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 const wang=s.content.conversations.wechat.find(c=>c.id==='wang');
 const feng=s.content.conversations.wechat.find(c=>c.id==='hufeng');
 const sent={id:'player-real-d11',from:'me',text:'我自己發出的群聊',day:11,time:'21:04',sentDate:'2025-05-29',actual:true,storyD11:true};
 const scriptedSend={id:'s55-return-2',from:'me',text:'我真實點擊 Send 的內容',day:11,time:'08:42',sentDate:'2025-05-29',actual:true,story55:true};
 const aiReply={id:'real-hufeng-reply',from:'胡枫',text:'我看到你的訊息了',day:12,time:'22:09',sentDate:'2025-05-30',actual:true};
 const future={id:'player-d30-future',from:'me',text:'D30才發出的消息',day:30,time:'22:10',sentDate:'2025-06-17',actual:true};
 group.messages.push(sent,future);wang.messages.push(scriptedSend);feng.messages.push(aiReply);
 rebuildStory55AtDay(s,13,'23:15');
 const g=()=>s.content.conversations.wechat.find(c=>c.id==='group');
 const w=()=>s.content.conversations.wechat.find(c=>c.id==='wang');
 const h=()=>s.content.conversations.wechat.find(c=>c.id==='hufeng');
 assert.equal(g().messages.find(m=>m.id===sent.id)?.text,sent.text);
 assert.equal(w().messages.find(m=>m.id===scriptedSend.id)?.text,scriptedSend.text);
 assert.equal(h().messages.find(m=>m.id===aiReply.id)?.text,aiReply.text);
 assert.equal(g().messages.some(m=>m.id===future.id),false,'D30 future messages stay hidden at D13');
 assert.ok(s.story55.developerChatArchive.some(x=>x.message.id===future.id));
 rebuildStory55AtDay(s,8,'08:00');
 assert.equal(g().messages.some(m=>m.id===sent.id),false);
 assert.ok(s.story55.developerChatArchive.some(x=>x.message.id===sent.id));
 rebuildStory55AtDay(s,11,'08:00');
 assert.equal(g().messages.some(m=>m.id===sent.id),false,'same-day future Send waits for original time');
 s.clock='21:05';tickStory55(s);
 assert.equal(g().messages.filter(m=>m.id===sent.id).length,1);
 assert.equal(w().messages.filter(m=>m.id===scriptedSend.id).length,1);
 tickStory55(s);assert.equal(g().messages.filter(m=>m.id===sent.id).length,1,'tick does not duplicate Send');
 rebuildStory55AtDay(s,31,'23:00');
 assert.equal(g().messages.filter(m=>m.id===future.id).length,1);
 assert.equal(g().messages.filter(m=>m.id===sent.id).length,1);
 assert.equal(s.content.conversations.wechat.find(c=>c.id==='group').messages.some(m=>m.id==='history-2024-0310'),true);
});

test('explicit phone reset discards developer runtime chat archive but retains old authored history',()=>{
 const s=phone();s.day=13;s.clock='23:00';
 const g=s.content.conversations.wechat.find(c=>c.id==='group');
 g.messages.push({id:'real-player-d12',from:'me',text:'only this playthrough',day:12,time:'13:00',sentDate:'2025-05-30',actual:true});
 rebuildStory55AtDay(s,13,'23:00');
 assert.ok(s.story55.developerChatArchive.length);
 const reset=restartState(s);
 assert.equal(reset.story55.developerChatArchive,undefined);
 assert.equal(reset.content.conversations.wechat.find(c=>c.id==='group').messages.some(m=>m.id==='real-player-d12'),false);
 assert.equal(reset.content.conversations.wechat.find(c=>c.id==='group').messages.some(m=>m.id==='history-2024-0310'),true);
 rebuildStory55AtDay(reset,13,'23:00');
 assert.equal(reset.content.conversations.wechat.find(c=>c.id==='group').messages.some(m=>m.id==='real-player-d12'),false);
});
