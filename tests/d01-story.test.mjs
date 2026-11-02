import test from 'node:test';
import assert from 'node:assert/strict';
import {sendD01WeChat,tickD01WeChat,d01Draft,d01ComposerDisabled,closeD01WeChat} from '../src/story/d01/wechat.js';
import {exitD01Puzzle} from '../src/apps/ghost/state.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {plugIn} from '../src/system/power/battery.js';
import {randomRouteSolution,connected,createBoard} from '../src/apps/ghost/games/logic.js';
import {seedD01,deliverD01Opening,claimD01Bank,acceptD01Repair,deliverD01Attachment,deployD01,finishD01Round,submitD01Attachment,settleD01Repair,D01_REPAIR,d01Gate} from '../src/story/d01/runtime.js';

const fixture=()=>({
 day:1,clock:'08:00',calendar:{anchorDate:'2025-05-19'},
 story55:{version:1,d01:{}},
 content:{orders:[],mail:[],mirage:{digitalBalance:0,digitalTransactions:[]},conversations:{mirage:[],wechat:[{id:'group',name:'狼崽團',messages:[],unread:0},{id:'wang',name:'熙旺',messages:[],unread:0},{id:'hufeng',name:'胡楓',messages:[],unread:0}]}},
 bankData:{balance:0,transactions:[],account:'•• 1846'},notifications:[],events:[],drafts:{},unlocked:true,nav:{current:{appId:'home',route:'/'},stack:[]}
});
test('D01 bank claim requires email click and is idempotent',()=>{
 const s=fixture();seedD01(s);assert.equal(s.bankData.balance,0);
 assert.equal(deliverD01Opening(s),true);assert.equal(deliverD01Opening(s),false);
 s.clock='08:15';assert.equal(claimD01Bank(s),true);assert.equal(claimD01Bank(s),false);
 assert.equal(s.bankData.balance,2000);assert.equal(s.bankData.transactions.length,1);
 assert.equal(s.bankData.transactions[0].time,'08:15');
});
test('D01 five LINK repairs settle exactly 0.04 BTC once',()=>{
 const s=fixture();seedD01(s);assert.equal(d01Gate(s),true);
 assert.equal(acceptD01Repair(s),true);assert.equal(acceptD01Repair(s),false);
 assert.equal(s.content.conversations.mirage.length,1);
 assert.equal(s.content.conversations.mirage[0].messages[0].text,'通信已建立。');
 assert.equal(deliverD01Attachment(s),true);assert.equal(deliverD01Attachment(s),false);
 assert.equal(deployD01(s),true);
 for(let i=0;i<5;i++)assert.equal(finishD01Round(s),true);
 assert.equal(finishD01Round(s),false);
 assert.equal(submitD01Attachment(s),true);assert.equal(submitD01Attachment(s),false);
 assert.equal(settleD01Repair(s),true);assert.equal(settleD01Repair(s),false);
 assert.equal(s.content.mirage.digitalBalance,0.04);
 assert.equal(s.content.mirage.digitalTransactions.length,1);
 assert.equal(s.content.orders.find(o=>o.id===D01_REPAIR).status,'COMPLETED');
 assert.equal(d01Gate(s),true);
 deliverD01Opening(s);claimD01Bank(s);assert.equal(d01Gate(s),false);
});
test('random LINK geometry is solvable and not fixed',()=>{
 const variants=new Set();
 for(let i=0;i<64;i++){
  const solution=randomRouteSolution();
  assert.equal(solution.length,9);assert.ok(connected(solution).has(8));
  variants.add(solution.join(','));
  assert.equal(createBoard('route',{}).masks.length,9);
 }
 assert.ok(variants.size>=12,'expected varied solvable network geometries');
});

test('D01 scripted group bubbles pause for real manual send, continue offscreen and do not duplicate on reload',()=>{
 const s=fixture(),store={get:()=>s,update:fn=>fn(s)};
 assert.equal(sendD01WeChat(store,'hufeng','你好').messageId,undefined);
 sendD01WeChat(store,'group','早',100);
 for(const at of [3100,4100,7100,9100,11100])tickD01WeChat(s,at);
 assert.equal(s.content.conversations.wechat[0].messages.length,5);
 assert.equal(d01Draft(s,'group').text,'不知道怎么就醒了');
 assert.equal(d01ComposerDisabled(s,'group'),false);
 tickD01WeChat(s,15000);assert.equal(s.content.conversations.wechat[0].messages.length,5);
 assert.equal(sendD01WeChat(store,'group','错误台词',16000).messageId,undefined);
 assert.equal(s.content.conversations.wechat[0].messages.length,5);
 sendD01WeChat(store,'group','不知道怎么就醒了',16500);
 tickD01WeChat(s,18500);
 assert.equal(d01Draft(s,'group').text,'还不是小辛说打赢boss才睡觉');
 sendD01WeChat(store,'group','还不是小辛说打赢boss才睡觉',19000);
 tickD01WeChat(s,21000);
 sendD01WeChat(store,'group','谢谢哥，我要吃牛腩饭',22000);
 tickD01WeChat(s,24000);tickD01WeChat(s,26000);
 assert.equal(s.content.conversations.wechat[0].messages.filter(m=>m.id==='d01-group-script-8').length,1);
 assert.equal(s.story55.d01.group.completed,true);
});
test('D01 afternoon group opening differs and unfinished scene is canceled without deleting sent bubbles',()=>{
 const s=fixture(),store={get:()=>s,update:fn=>fn(s)};
 s.clock='12:30';sendD01WeChat(store,'group','午安',1000);tickD01WeChat(s,4000);
 assert.equal(s.content.conversations.wechat[0].messages[1].text,'蒙蒙哥，你不会现在才起吧？');
 const count=s.content.conversations.wechat[0].messages.length;
 closeD01WeChat(s);s.day=2;tickD01WeChat(s,12000);
 assert.equal(s.content.conversations.wechat[0].messages.length,count);
});
test('D01 brother private replies after 3 followup bubbles and 2 game minutes across apps',()=>{
 const s=fixture(),store={get:()=>s,update:fn=>fn(s)};
 sendD01WeChat(store,'wang','哥',0);tickD01WeChat(s,900);
 assert.equal(s.content.conversations.wechat[1].messages[1].text,'嗯？');
 for(const [i,text] of ['啊','你在吗','给我回一下'].entries())sendD01WeChat(store,'wang',text,1000+i*100);
 s.clock='08:01';tickD01WeChat(s,1300);
 assert.equal(s.content.conversations.wechat[1].messages.length,5);
 s.clock='08:02';tickD01WeChat(s,2300);
 assert.equal(s.content.conversations.wechat[1].messages.at(-1).text,'刚才在开车');
 tickD01WeChat(s,3800);
 assert.equal(d01ComposerDisabled(s,'wang'),true);
 assert.equal(s.content.conversations.wechat[1].messages.at(-1).text,'怎么发了那么多消息？现在看不及时，不重要的话，有什么话等我回家当面跟我讲吧。');
});
test('D01 03:00 freeze keeps all apps usable and charging alone switches to D02',()=>{
 const s=fixture();seedD01(s);
 advanceGameMinutes(s,5000);assert.equal(s.day,1);assert.equal(s.clock,'03:00');
 assert.equal(s.story55.d01.nightAfterMidnight,true);assert.equal(s.emergencyCharge,undefined);
 assert.equal(advanceGameMinutes(s,200).minutes,0);
 assert.equal(plugIn(s),false);
 deliverD01Opening(s);claimD01Bank(s);acceptD01Repair(s);deliverD01Attachment(s);deployD01(s);
 for(let i=0;i<5;i++)finishD01Round(s);
 submitD01Attachment(s);settleD01Repair(s);
 assert.equal(s.story55.completed.intro.day,1);
 assert.equal(plugIn(s),true);assert.equal(s.day,2);assert.equal(s.clock,'08:00');
});

test('GHOST save exit keeps current rotations; discard removes only unfinished level',()=>{
 const s=fixture();s.story55.d01={deployed:true,completedRounds:2};
 s.ghost={orders:{[D01_REPAIR]:{id:D01_REPAIR,type:'route',status:'running',board:{masks:[1,2,3,4,5,6,7,8,9]},moves:8,deadline:null}},history:[]};
 const before=structuredClone(s.ghost.orders[D01_REPAIR].board);
 assert.equal(exitD01Puzzle(s),true);
 assert.deepEqual(s.ghost.orders[D01_REPAIR].board,before);
 assert.equal(s.ghost.orders[D01_REPAIR].status,'running');
 assert.equal(exitD01Puzzle(s,{discard:true}),true);
 assert.equal(s.ghost.orders[D01_REPAIR].board,null);
 assert.equal(s.ghost.orders[D01_REPAIR].status,'authorized');
 assert.equal(s.story55.d01.completedRounds,2);
});
test('D01 delayed mail and BTC reward survive timers after refresh',async()=>{
 const s=fixture();seedD01(s);acceptD01Repair(s);const when=s.story55.d01.acceptedAt;
 assert.equal(s.content.mail.some(m=>m.id==='d01-mirage001-attachment'),false);
 const {tickD01}=await import('../src/story/d01/runtime.js');
 tickD01(s,when+2001);tickD01(s,when+2500);
 assert.equal(s.content.mail.filter(m=>m.id==='d01-mirage001-attachment').length,1);
 deployD01(s);for(let i=0;i<5;i++)finishD01Round(s);
 submitD01Attachment(s);const payoutDue=s.story55.d01.submittedAt;
 tickD01(s,payoutDue+2001);tickD01(s,payoutDue+3000);
 assert.equal(s.content.mirage.digitalTransactions.length,1);
});
