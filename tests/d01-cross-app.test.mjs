import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {completed} from '../src/services/story55/state.js';
import {advanceGameMinutes,absoluteMinute,worldMinuteRate} from '../src/system/time/clock.js';
import {chargingBlock} from '../src/system/power/story.js';
import {plugIn} from '../src/system/power/battery.js';
import {toggleReminder} from '../src/services/reminders.js';
import {tickFlowD03,FLOW_CONTACT} from '../src/services/story55/flow-d03.js';
import {rebuildStory55AtDay} from '../src/services/story55/rebuild.js';
import {
 ensureD01,tickD01,claimD01Bank,acceptD01Order,openD01Key,deployD01,
 receiveD01Round,submitD01Order,onD01Message,d01Draft,sendD01Draft,d01WechatLocked,
 D01_OPENING_MAIL,D01_ORDER_MAIL,D01_DONE_MAIL,D01_CONTACT,D01_ORDER,D01_HUNT,D01_BANK_TX,D01_BTC_TX
} from '../src/services/story55/d01.js';
import {
 createLinkPuzzle,linkSolved,ensureLinkPuzzle,rotateLinkPuzzle,
 startExitPrompt,chooseExit,renderD01Link
} from '../src/apps/ghost/games/link-repair/index.js';
import {renderD01Mail} from '../src/apps/kira/features/d01/index.js';

const state=()=>{const s=initialState();activateStory55(s);return s;};
const group=s=>s.content.conversations.wechat.find(c=>c.id==='group');
const wang=s=>s.content.conversations.wechat.find(c=>c.id==='wang');
const mail=(s,id)=>s.content.mail.find(x=>x.id===id);
function setupMail(s,at=1000){s.unlocked=true;tickD01(s,at);tickD01(s,at+3000);}
function acceptAndDeploy(s,at=5000){
 acceptD01Order(s,at);tickD01(s,at+2000);openD01Key(s);deployD01(s,'mirage001');
}
function solveFive(s){
 for(let n=0;n<5;n++){
  const b=ensureLinkPuzzle(s);
  assert.ok(b);
  assert.equal(b.size,n<2?3:4);
  assert.ok(b.solution?.length===b.size*b.size);
  assert.equal(linkSolved({...b,masks:[...b.solution]}),true);
  b.masks=[...b.solution];b.done=true;
  assert.equal(receiveD01Round(s),n+1);
 }
}
test('D01 opens on 2025-05-19 08:00 with zero cash and BTC, one Flow contact, two bounties and historic scan',()=>{
 const s=state();
 assert.equal(s.day,1);assert.equal(s.clock,'08:00');
 assert.equal(s.calendar.anchorDate,'2025-05-19');
 assert.equal(s.bankData.balance,0);assert.equal(s.content.mirage.digitalBalance,0);
 assert.deepEqual(s.content.conversations.mirage.map(x=>x.name),['Flow']);
 assert.deepEqual(s.content.orders.filter(x=>x.status==='OPEN').map(x=>x.id).sort(),[D01_HUNT,D01_ORDER].sort());
 assert.equal(s.content.orders.find(x=>x.id===D01_HUNT).viewOnly,true);
 assert.equal(s.content.orders.filter(x=>x.status==='COMPLETED').length,1);
 assert.equal(s.content.reminders.filter(x=>x.story55D01&&x.auto).length,2);
 assert.equal(mail(s,D01_OPENING_MAIL),undefined);
});
test('KIRA letter is delivered only 3s after first unlock and never again on a duplicate tick',()=>{
 const s=state();
 tickD01(s,1000);assert.equal(mail(s,D01_OPENING_MAIL),undefined);
 s.unlocked=true;tickD01(s,1200);
 tickD01(s,4199);assert.equal(mail(s,D01_OPENING_MAIL),undefined);
 tickD01(s,4200);
 assert.match(mail(s,D01_OPENING_MAIL).subject,/Order Completed/);
 assert.match(renderD01Mail(s,D01_OPENING_MAIL),/data-action="kira-d01-bank"/);
 tickD01(s,50000);
 assert.equal(s.content.mail.filter(x=>x.id===D01_OPENING_MAIL).length,1);
 assert.equal(s.bankData.balance,0);
});
test('the blue KIRA bank link is the only $2000 credit trigger; bank timestamp, notification and reminder are idempotent',()=>{
 const s=state();
 assert.throws(()=>claimD01Bank(s),/尚未送達/);
 setupMail(s);
 s.clock='10:37';
 assert.equal(claimD01Bank(s),true);
 assert.equal(claimD01Bank(s),false);
 assert.equal(s.bankData.balance,2000);
 assert.deepEqual(s.bankData.transactions.filter(t=>t.id===D01_BANK_TX).map(x=>[x.amount,x.time,x.date]),[[2000,'10:37','2025-05-19']]);
 const n=s.notifications.find(x=>x.id==='notice-'+D01_BANK_TX);
 assert.match(n.body,/10時37分/);
 assert.equal(n.link.appId,'bank');
 assert.equal(s.content.reminders.find(x=>x.id==='d01-bank-reminder').done,true);
});
test('MIRAGE acceptance adds exactly one independent Cipher-7 Easter egg, unlocks KIRA attachment after 2s, and rejects wrong deployment keys',()=>{
 const s=state();setupMail(s);
 assert.equal(acceptD01Order(s,5000),true);
 assert.equal(acceptD01Order(s,5000),false);
 const contact=s.content.conversations.mirage.find(c=>c.id===D01_CONTACT);
 assert.equal(contact.name,'Cipher-7');
 assert.equal(contact.messages.length,1);
 assert.equal(contact.messages[0].text,'通信已建立。');
 assert.equal(contact.unread,1);
 tickD01(s,6999);
 assert.equal(mail(s,D01_ORDER_MAIL),undefined);
 tickD01(s,7000);
 assert.equal(mail(s,D01_ORDER_MAIL).read,false);
 assert.match(renderD01Mail(s,D01_ORDER_MAIL),/data-action="kira-d01-key"/);
 assert.throws(()=>deployD01(s,'mirage001'),/KIRA/);
 openD01Key(s);
 assert.match(renderD01Mail(s,D01_ORDER_MAIL),/data-action="kira-d01-ghost"/);
 assert.throws(()=>deployD01(s,'wrong'),/密鑰錯誤/);
 assert.equal(deployD01(s,'mirage001'),true);
 assert.equal(s.story55.d01.order.deployed,true);
});
test('GHOST LINK generates 100 genuinely varied solvable 3x3 and 4x4 puzzles with no timer and keeps GHOST circuit styling',()=>{
 const seen=new Set();
 for(let i=0;i<100;i++){
  const b=createLinkPuzzle(i%5);
  assert.equal(b.size,(i%5)<2?3:4);
  assert.equal(b.solution.length,b.masks.length);
  assert.equal(linkSolved({...b,masks:[...b.solution]}),true);
  seen.add(b.size+':'+b.solution.join(','));
 }
 assert.ok(seen.size>30,'Random route generator repeats too many layouts');
 const s=state();setupMail(s);acceptAndDeploy(s);
 const b=ensureLinkPuzzle(s);
 assert.equal(renderD01Link(s).includes('gh-d01-pipes'),true);
 assert.match(renderD01Link(s),/data-action="gh-d01-rotate"/);
 assert.equal(s.story55.d01.order.board===b,true);
 const before=b.moves;rotateLinkPuzzle(s,0);
 assert.equal(b.moves,before+1);
 assert.equal(s.story55.d01.order.completed,0);
});
test('GHOST save/discard prompts only for unfinished rounds and never removes previously repaired percentages',()=>{
 const s=state();setupMail(s);acceptAndDeploy(s);
 let b=ensureLinkPuzzle(s);
 b.masks=[...b.solution];b.done=true;
 assert.equal(receiveD01Round(s),1);
 b=ensureLinkPuzzle(s);
 const original=[...b.masks];rotateLinkPuzzle(s,0);
 assert.equal(startExitPrompt(s),true);
 assert.equal(chooseExit(s,true),true);
 assert.deepEqual(ensureLinkPuzzle(s).masks,b.masks);
 assert.equal(s.story55.d01.order.completed,1);
 assert.equal(startExitPrompt(s),true);
 assert.equal(chooseExit(s,false),true);
 assert.equal(s.story55.d01.order.board,null);
 const renewed=ensureLinkPuzzle(s);
 assert.ok(renewed);
 assert.equal(s.story55.d01.order.leaveApproved,false);
 assert.equal(s.story55.d01.order.completed,1);
 assert.equal(startExitPrompt(s),true);
});
test('five distinct LINK completions, KIRA submission and automatic 0.04 BTC reward only once after 2s; bounty migrates to completed',()=>{
 const s=state();setupMail(s);claimD01Bank(s);acceptAndDeploy(s);solveFive(s);
 assert.match(renderD01Mail(s,D01_ORDER_MAIL),/data-action="kira-d01-submit"/);
 assert.equal(submitD01Order(s,10000),true);
 assert.equal(submitD01Order(s,10001),false);
 tickD01(s,11999);
 assert.equal(mail(s,D01_DONE_MAIL),undefined);
 assert.equal(s.content.mirage.digitalBalance,0);
 tickD01(s,12000);tickD01(s,20000);
 assert.equal(s.content.mirage.digitalBalance,0.04);
 assert.equal(s.content.mirage.digitalTransactions.filter(x=>x.id===D01_BTC_TX).length,1);
 assert.equal(s.content.orders.find(x=>x.id===D01_ORDER).status,'COMPLETED');
 assert.equal(s.content.mail.filter(x=>x.id===D01_DONE_MAIL).length,1);
 assert.equal(s.story55.d01.order.paid,true);
 assert.equal(s.content.reminders.find(x=>x.id==='d01-repair-reminder').done,true);
 assert.equal(completed(s,'intro'),true);
});
test('D01 reminders cannot be manually ticked; 03:00 freezes game date and charging advances to D02 only after both tasks',()=>{
 const s=state();
 const store={update:fn=>fn(s)};
 toggleReminder(store,'d01-bank-reminder');
 assert.equal(s.content.reminders.find(x=>x.id==='d01-bank-reminder').done,false);
 const stopped=advanceGameMinutes(s,5000);
 assert.equal(stopped.event,'d01-gate');
 assert.equal(s.day,1);assert.equal(s.clock,'03:00');
 assert.equal(s.story55.d01.nightPhase,true);
 assert.equal(absoluteMinute(s),1620);
 assert.equal(advanceGameMinutes(s,60).minutes,0);
 assert.equal(chargingBlock(s),'plot');
 assert.equal(plugIn(s),false);
 setupMail(s);claimD01Bank(s);acceptAndDeploy(s);solveFive(s);
 submitD01Order(s,12000);tickD01(s,14000);
 assert.equal(chargingBlock(s),null);
 assert.equal(plugIn(s),true);
 assert.equal(s.day,2);assert.equal(s.clock,'08:00');
});
test('WeChat group is optional and only starts after player sends; before noon and after noon use different Xin openers',()=>{
 for(const [clock,expected] of [['08:00','嗯？蒙蒙哥怎么今天起得那么早？'],['13:00','蒙蒙哥，你不会现在才起吧？']]){
  const s=state();s.clock=clock;
  assert.equal(group(s).messages.length,0);
  onD01Message(s,'wechat','group','早',1000);
  tickD01(s,3999);assert.equal(group(s).messages.length,0);
  tickD01(s,4000);
  assert.equal(group(s).messages.at(-1).text,expected);
  tickD01(s,5000);tickD01(s,8000);tickD01(s,10000);
  assert.equal(group(s).messages.length,4);
  assert.equal(d01Draft(s,'wechat','group'),null);
  tickD01(s,12000);
  assert.equal(d01Draft(s,'wechat','group')?.text,'不知道怎么就醒了');
  assert.equal(d01WechatLocked(s,'xiaoxin'),true);
  assert.equal(d01WechatLocked(s,'group'),false);
  sendD01Draft(s,'不知道怎么就醒了',12001);
  tickD01(s,14001);
  assert.equal(d01Draft(s,'wechat','group')?.text,'还不是小辛说打赢boss才睡觉');
  sendD01Draft(s,'还不是小辛说打赢boss才睡觉',14001);
  tickD01(s,16001);
  sendD01Draft(s,'谢谢哥，我要吃牛腩饭',16001);
  tickD01(s,18001);tickD01(s,20001);
  assert.deepEqual(group(s).messages.slice(-2).map(x=>x.text),['还不是我们太菜了，哈哈。','好']);
  assert.equal(group(s).messages.filter(x=>x.from==='me').length,3);
 }
});
test('Wang reply waits for 2 game minutes after last of 3 messages, then locks only his D01 DM',()=>{
 const s=state();
 onD01Message(s,'wechat','wang','哥',1000);
 tickD01(s,1500);
 assert.equal(wang(s).messages.at(-1).text,'嗯？');
 for(let i=0;i<3;i++)onD01Message(s,'wechat','wang','消息'+i,2000+i);
 assert.equal(s.story55.d01.brother.sent,3);
 const due=s.story55.d01.brother.replyAt;
 assert.equal(due,482);
 s.clock='08:01';tickD01(s,4000);
 assert.equal(wang(s).messages.length,1);
 onD01Message(s,'wechat','wang','再发一条',4500);
 assert.equal(s.story55.d01.brother.sent,4);
 assert.equal(s.story55.d01.brother.replyAt,483);
 s.clock='08:03';tickD01(s,5000);tickD01(s,5000);
 assert.equal(wang(s).messages.at(-1).text,'刚才在开车');
 tickD01(s,7000);
 assert.match(wang(s).messages.at(-1).text,/当面跟我讲吧/);
 assert.equal(d01WechatLocked(s,'wang'),true);
 assert.equal(d01WechatLocked(s,'group'),false);
});
test('Flow D01 message is saved with no reply, then only one simple acknowledgement precedes original D03 invitation',()=>{
 const s=state();const flow=s.content.conversations.mirage.find(x=>x.id===FLOW_CONTACT);
 const original=flow.messages.length;
 onD01Message(s,'mirage',FLOW_CONTACT,'你在嗎',1000);
 assert.equal(flow.messages.length,original);
 s.day=3;s.clock='09:00';tickFlowD03(s);
 const last=flow.messages.slice(-2).map(x=>x.text);
 assert.deepEqual(last[0],'之前在忙，才看到你給我發信息。');
 assert.match(last[1],/flow-1234/);
 tickFlowD03(s);assert.equal(flow.messages.filter(x=>x.id==='flow-d03-late-reply').length,1);
});
test('Developer D03 rebuild automatically completes and archives mandatory D01 bank and data repair while preserving game history',()=>{
 const s=state();
 const g=group(s);
 g.messages.push({id:'test-history-2024',text:'換新手機',from:'me',sentDate:'2024-03-10',time:'08:00',storyImported:true});
 rebuildStory55AtDay(s,3,'08:00');
 assert.equal(s.day,3);
 assert.equal(completed(s,'intro'),true);
 assert.equal(s.content.conversations.wechat.find(x=>x.id==='group').messages.some(x=>x.id==='test-history-2024'),true);
 assert.equal(s.story55.d01.bankPaid,true);
 assert.equal(s.story55.d01.order.paid,true);
 assert.equal(s.content.mirage.digitalTransactions.filter(x=>x.id===D01_BTC_TX).length,1);
 assert.equal(s.bankData.transactions.filter(x=>x.id===D01_BANK_TX).length,1);
 assert.ok(mail(s,D01_ORDER_MAIL));
});
