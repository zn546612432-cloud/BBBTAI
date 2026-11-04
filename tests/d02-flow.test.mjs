import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55} from '../src/services/story55/runtime.js';
import {completeNode} from '../src/services/story55/state.js';
import {rebuildStory55AtDay} from '../src/services/story55/rebuild.js';
import {begin,finish} from '../src/apps/ghost/state.js';
import {AODONG_PRODUCTS,aodongPrice} from '../src/apps/browser/aodong-shop.js';
import {
 D02_S,D02_A,D02_MAIL,D02_TALIA,D02_NOTE,D02_REMINDER,D02_STAGES,D02_REWARDS,
 seedD02,acceptD02,revealD02Key,armD02Ghost,d02StepId,d02NextStep,
 submitD02,onD02TaliaMessage,d02TaliaDraft,createD02Reminder,d02CompleteBuild,toggleD02Build
} from '../src/story/d02/runtime.js';

const phone=()=>{
 const s=initialState();activateStory55(s);completeNode(s,'intro');
 s.day=2;s.clock='08:30';tickStory55(s);return s;
};
const win=(s,master)=>{
 const types=D02_STAGES[master];
 types.forEach((type,i)=>{
  const id=d02StepId(master,i);
  const run=armD02Ghost(s,master,i);
  assert.equal(run,id);
  assert.equal(s.ghost.orders[id].type,type);
  assert.equal(begin(s,id,1000+i*1000),true);
  finish(s,id,true,2000+i*1000);
  assert.equal(s.ghost.orders[id].status,'success');
  assert.equal(d02NextStep(s,id),i+1<types.length?d02StepId(master,i+1):null);
 });
};
test('D01 is unchanged; D02 seeds two ranked bounties, dated SMS and two WeChat private chats exactly once',()=>{
 const s=initialState();activateStory55(s);
 assert.equal(s.content.orders.some(o=>o.id===D02_S),false);
 assert.equal(s.content.notes.some(n=>n.id===D02_NOTE),false);
 s.day=2;tickStory55(s);tickStory55(s);
 assert.equal(s.content.orders.filter(o=>[D02_S,D02_A].includes(o.id)).length,2);
 assert.equal(s.content.orders.find(o=>o.id===D02_S).category,'S');
 assert.equal(s.content.orders.find(o=>o.id===D02_A).category,'A');
 assert.equal(s.content.notes.filter(n=>n.id===D02_NOTE).length,1);
 const sms=s.content.conversations.messages.find(c=>c.id==='sms-aodong-2025');
 assert.match(sms.messages[0].text,/八折/);
 assert.equal(sms.messages[0].schedule.clock,'09:00');
 assert.equal(s.content.conversations.wechat.find(c=>c.id==='wang').messages.filter(m=>m.storyD02).length,6);
 assert.equal(s.content.conversations.wechat.find(c=>c.name==='小辛').messages.filter(m=>m.storyD02).length,6);
});
test('S bounty requires KIRA key, three existing Ghost minigames, manual Mirage submission and optional nonduplicating bonus',()=>{
 const s=phone(),opening=s.bankData.balance;
 assert.equal(acceptD02(s,D02_S),true);
 assert.equal(acceptD02(s,D02_S),false);
 assert.equal(s.content.conversations.mirage.some(c=>c.id===D02_TALIA),true);
 assert.equal(s.content.mail.filter(m=>m.id===D02_MAIL).length,1);
 assert.equal(armD02Ghost(s,D02_S,0),null);
 assert.equal(revealD02Key(s),true);
 win(s,D02_S);
 assert.equal(s.story55.d02.completed[D02_S],true);
 assert.equal(s.content.missionFiles.filter(f=>f.orderId===D02_S).length,1);
 assert.equal(s.bankData.balance,opening);
 assert.equal(submitD02(s,D02_S),true);
 assert.equal(submitD02(s,D02_S),false);
 assert.equal(s.bankData.balance,opening+D02_REWARDS[D02_S]);
 assert.equal(d02TaliaDraft(s,D02_TALIA),'东西已经拿到手。');
 assert.equal(onD02TaliaMessage(s,D02_TALIA,'东西已经拿到手。'),true);
 assert.equal(onD02TaliaMessage(s,D02_TALIA,'东西已经拿到手。'),false);
 const contact=s.content.conversations.mirage.find(c=>c.id===D02_TALIA);
 assert.deepEqual(contact.messages.filter(m=>m.id==='d02-talia-peace').map(m=>m.text),['你不会知道自己刚刚为世界和平作出多大贡献。']);
 assert.equal(onD02TaliaMessage(s,D02_TALIA,'哦？这份贡献值得再加一笔赏金吗？'),false);
 contact.messages.find(m=>m.id==='d02-talia-peace').delivery={day:2,clock:'13:00'};
 assert.equal(d02TaliaDraft(s,D02_TALIA),'哦？这份贡献值得再加一笔赏金吗？');
 assert.equal(onD02TaliaMessage(s,D02_TALIA,'哦？这份贡献值得再加一笔赏金吗？'),true);
 assert.equal(s.story55.d02.bonus,true);
 assert.equal(s.bankData.balance,opening+D02_REWARDS[D02_S]*2);
 assert.equal(onD02TaliaMessage(s,D02_TALIA,'哦？这份贡献值得再加一笔赏金吗？'),false);
 assert.equal(contact.messages.filter(m=>m.id==='d02-talia-goodbye').length,1);
});
test('A bounty plays cipher plus exactly three strike stages and has no Talia easter egg',()=>{
 const s=phone(),opening=s.bankData.balance;
 assert.equal(acceptD02(s,D02_A),true);
 assert.equal(s.content.mail.some(m=>m.id===D02_MAIL),false);
 win(s,D02_A);
 assert.deepEqual(D02_STAGES[D02_A],['cipher','strike','strike','strike']);
 assert.equal(submitD02(s,D02_A),true);
 assert.equal(s.bankData.balance,opening+D02_REWARDS[D02_A]);
 assert.equal(s.story55.d02.bonus,false);
});
test('Aodong offers 8 categories with 20% May sale and completed hardware reminder triggers group chat once',()=>{
 const s=phone();
 assert.ok(AODONG_PRODUCTS.length>=8);
 assert.equal(new Set(AODONG_PRODUCTS.map(p=>p.category)).size,8);
 const gpu=AODONG_PRODUCTS.find(p=>p.category==='gpu');
 assert.equal(aodongPrice(s,gpu),679.2);
 assert.equal(createD02Reminder(s),true);
 assert.equal(createD02Reminder(s),false);
 assert.equal(toggleD02Build(s),false);
 s.story55.d02.purchased=AODONG_PRODUCTS.map(p=>({category:p.category,id:p.id}));
 assert.equal(d02CompleteBuild(s),true);
 assert.equal(toggleD02Build(s),true);
 assert.equal(s.content.reminders.find(r=>r.id===D02_REMINDER).done,true);
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 assert.equal(group.messages.filter(m=>m.id?.startsWith('d02-newpc-group-')).length,7);
 assert.equal(toggleD02Build(s),true);
 assert.equal(toggleD02Build(s),true);
 assert.equal(group.messages.filter(m=>m.id?.startsWith('d02-newpc-group-')).length,7);
 s.day=14;assert.equal(aodongPrice(s,gpu),849);
});
test('Developer D03 jump replays both bounties and Talia contact without doubling money or leaking D02 note into D01',()=>{
 const s=phone();
 rebuildStory55AtDay(s,3,'08:00');
 assert.equal(s.content.orders.find(o=>o.id===D02_S).status,'COMPLETED');
 assert.equal(s.content.orders.find(o=>o.id===D02_A).status,'COMPLETED');
 assert.equal(s.content.conversations.mirage.some(c=>c.id===D02_TALIA),true);
 assert.equal(s.ghost.history.filter(h=>h.orderId?.startsWith('d02-')).length,7);
 assert.equal(s.bankData.transactions.filter(x=>x.id==='d02-payment-'+D02_S).length,1);
 assert.equal(s.bankData.transactions.filter(x=>x.id==='d02-payment-'+D02_A).length,1);
 rebuildStory55AtDay(s,1,'08:00');
 assert.equal(s.content.notes.some(n=>n.id===D02_NOTE),false);
 assert.equal(s.content.conversations.wechat.some(c=>c.messages.some(m=>m.storyD02)),false);
 assert.equal(s.content.orders.some(o=>o.id===D02_S),false);
});
