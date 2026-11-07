import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {render as kiraRender,handle as kiraHandle} from '../src/apps/kira/index.js';
import {render as filesRender,handle as filesHandle} from '../src/apps/files/index.js';
import {render as ghostRender,handle as ghostHandle} from '../src/apps/ghost/index.js';
import {render as smsRender,handle as smsHandle} from '../src/apps/messages/replica.js';
import {registry} from '../src/system/registry.js';
import {render as browserRender,submit as browserSubmit} from '../src/apps/browser/index.js';
import {render as mirageRender,handle as mirageHandle} from '../src/apps/mirage/index.js';
import {setMirageAuthenticated} from '../src/apps/mirage/session.js';
import {kiraDetail} from '../src/apps/kira/features/detail/index.js';
import {tools as ghostCatalog} from '../src/apps/ghost/catalog.js';
import {renderArcade} from '../src/apps/ghost/games/arcade-ui.js';
import {activateStory55,tickStory55} from '../src/services/story55/runtime.js';
import {completeNode} from '../src/services/story55/state.js';
import {rebuildStory55AtDay} from '../src/services/story55/rebuild.js';
import {begin,finish} from '../src/apps/ghost/state.js';
import {d02Draft,d02WeChatDue,tickD02Wechat,sendD02WeChat,seedD02Wechat} from '../src/story/d02/wechat.js';
import {entryFor,tickD02Diary,saveDiaryEntry} from '../src/story/diary/entries.js';
import {renderWeChatChat} from '../src/apps/wechat/components/chat-view.js';
import {AODONG_PRODUCTS,aodongPrice,HARDWARE_GOAL} from '../src/apps/browser/aodong-shop.js';
import {
 D02_S,D02_A,D02_MAIL,D02_A_MAIL,D02_KEYS,D02_KEY_FILES,D02_BRIEFS,D02_AODONG_URL,D02_AODONG_SMS,D02_TALIA,D02_NOTE,D02_REMINDER,D02_STAGES,D02_REWARDS,
 seedD02,acceptD02,revealD02Key,armD02Ghost,d02StepId,d02NextStep,
 submitD02,deployD02,tickD02Contracts,d02ReminderId,onD02TaliaMessage,d02TaliaDraft,createD02Reminder,d02CompleteBuild,toggleD02Build
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
 assert.equal(s.content.notes.filter(n=>n.id===D02_NOTE).length,0);
 assert.match(entryFor(s,2).body,/机房/);
 const sms=s.content.conversations.messages.find(c=>c.id==='sms-aodong-2025');
 assert.match(sms.messages[0].text,/八折/);
 assert.equal(sms.messages[0].schedule.clock,'09:00');
 assert.equal(s.content.conversations.wechat.find(c=>c.id==='wang').messages.filter(m=>m.storyD02).length,0);
 assert.equal(s.content.conversations.wechat.find(c=>c.name==='小辛').messages.filter(m=>m.storyD02).length,0);
 assert.equal(s.story55.d02.wechat.version,2);
});
test('S bounty requires KIRA key, three existing Ghost minigames, manual Mirage submission and optional nonduplicating bonus',()=>{
 const s=phone(),opening=s.bankData.balance;
 assert.equal(acceptD02(s,D02_S),true);
 assert.equal(acceptD02(s,D02_S),false);
 assert.equal(s.content.conversations.mirage.some(c=>c.id===D02_TALIA),true);
 assert.equal(s.content.mail.filter(m=>m.id===D02_MAIL).length,1);
 assert.equal(armD02Ghost(s,D02_S,0),null);
 assert.equal(revealD02Key(s),true);
 assert.equal(deployD02(s,D02_S,'not-the-key'),false);
 assert.equal(deployD02(s,D02_S,D02_KEYS[D02_S]),true);
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
 assert.equal(s.story55.d02.bonusRequested,true);
 assert.equal(s.bankData.balance,opening+D02_REWARDS[D02_S]);
 contact.messages.find(m=>m.id==='d02-talia-worth').delivery={day:2,clock:'13:03'};
 tickD02Contracts(s,1000);
 tickD02Contracts(s,4999);
 assert.equal(s.bankData.balance,opening+D02_REWARDS[D02_S]);
 tickD02Contracts(s,5000);
 assert.equal(s.bankData.balance,opening+D02_REWARDS[D02_S]*2);
 tickD02Contracts(s,10000);
 assert.equal(s.bankData.transactions.filter(t=>t.id==='d02-payment-'+D02_S+'-talia').length,1);
 assert.equal(onD02TaliaMessage(s,D02_TALIA,'哦？这份贡献值得再加一笔赏金吗？'),false);
 assert.equal(contact.messages.filter(m=>m.id==='d02-talia-goodbye').length,1);
});
test('A bounty requires Kira authorization and plays cipher-route-strike once each',()=>{
 const s=phone(),opening=s.bankData.balance;
 assert.equal(acceptD02(s,D02_A),true);
 assert.equal(s.content.mail.some(m=>m.id===D02_A_MAIL),true);
 assert.equal(armD02Ghost(s,D02_A,0),null);
 assert.equal(deployD02(s,D02_A,'INVALID-KEY'),false);
 s.content.mail.find(m=>m.id===D02_A_MAIL).read=true;
 assert.equal(deployD02(s,D02_A,D02_KEYS[D02_A]),true);
 win(s,D02_A);
 assert.deepEqual(D02_STAGES[D02_A],['cipher','route','strike']);
 assert.equal(s.content.orders.find(o=>o.id===D02_A).status,'READY');
 assert.equal(submitD02(s,D02_A),true);
 assert.equal(s.bankData.balance,opening+D02_REWARDS[D02_A]);
 assert.equal(s.story55.d02.bonus,false);
});
test('Aodong offers 8 categories with 20% May sale and completed hardware reminder triggers group chat once',()=>{
 const s=phone();
 assert.ok(AODONG_PRODUCTS.length>=8);
 assert.equal(new Set(HARDWARE_GOAL.map(p=>p.category)).size,11);
 const gpu=AODONG_PRODUCTS.find(p=>p.category==='gpu');
 assert.equal(aodongPrice(s,gpu),7840);
 assert.equal(createD02Reminder(s),true);
 assert.equal(createD02Reminder(s),false);
 assert.equal(toggleD02Build(s),false);
 s.story55.d02.purchased=HARDWARE_GOAL.map(p=>({...p}));
 assert.equal(d02CompleteBuild(s),true);
 assert.equal(toggleD02Build(s),true);
 assert.equal(s.content.reminders.find(r=>r.id===D02_REMINDER).done,true);
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 assert.equal(group.messages.filter(m=>m.id?.startsWith('d02-newpc-group-')).length,7);
 assert.equal(toggleD02Build(s),true);
 assert.equal(toggleD02Build(s),true);
 assert.equal(group.messages.filter(m=>m.id?.startsWith('d02-newpc-group-')).length,7);
 s.day=14;assert.equal(aodongPrice(s,gpu),9800);
});
test('Developer D03 jump replays both bounties and Talia contact without doubling money or leaking D02 note into D01',()=>{
 const s=phone();
 rebuildStory55AtDay(s,3,'08:00');
 assert.equal(s.content.orders.find(o=>o.id===D02_S).status,'COMPLETED');
 assert.equal(s.content.orders.find(o=>o.id===D02_A).status,'COMPLETED');
 assert.equal(s.content.conversations.mirage.some(c=>c.id===D02_TALIA),true);
 assert.equal(s.ghost.history.filter(h=>h.orderId?.startsWith('d02-')).length,6);
 assert.equal(s.bankData.transactions.filter(x=>x.id==='d02-payment-'+D02_S).length,1);
 assert.equal(s.bankData.transactions.filter(x=>x.id==='d02-payment-'+D02_A).length,1);
 rebuildStory55AtDay(s,1,'08:00');
 assert.equal(s.content.notes.some(n=>n.id===D02_NOTE),false);
 assert.equal(s.content.conversations.wechat.some(c=>c.messages.some(m=>m.storyD02)),false);
 assert.equal(s.content.orders.some(o=>o.id===D02_S),false);
});

test('D02 brother: no authored me bubbles before Send; real Send -> delayed NPC reply, two-bubble ending and no duplicates',()=>{
 const s=phone(),store={get:()=>s,update:fn=>fn(s)},c=s.content.conversations.wechat.find(c=>c.id==='wang');
 s.clock='12:15';tickStory55(s);assert.equal(d02Draft(s,'wang'),null);
 s.clock='12:16';tickStory55(s);
 assert.match(d02Draft(s,'wang').text,/哥，你现在出车吗/);
 assert.match(renderWeChatChat(s,'wang'),/data-story-type=/);
 assert.equal(c.messages.filter(m=>m.storyD02).length,0);
 assert.match(sendD02WeChat(store,'wang','不匹配',1000).reason,/完整的预设台词/);
 assert.equal(c.messages.filter(m=>m.storyD02).length,0);
 const first=d02Draft(s,'wang').text;
 assert.ok(sendD02WeChat(store,'wang',first,1000).messageId);
 assert.equal(c.messages.filter(m=>m.storyD02&&m.from==='me').length,1);
 assert.equal(d02Draft(s,'wang'),null);
 assert.equal(d02WeChatDue(s,2799),false);
 assert.equal(tickD02Wechat(s,2800),true);
 assert.match(c.messages.at(-1).text,/刚送完一单/);
 assert.ok(d02Draft(s,'wang'));
 assert.ok(sendD02WeChat(store,'wang',d02Draft(s,'wang').text,3000).messageId);
 assert.equal(tickD02Wechat(s,4800),true);
 assert.match(c.messages.at(-1).text,/缺钱跟哥说/);
 assert.ok(sendD02WeChat(store,'wang',d02Draft(s,'wang').text,5000).messageId);
 s.clock='12:25';
 assert.equal(tickD02Wechat(s,6800),true);
 assert.equal(c.messages.at(-1).text,'好，哥哥知道。');
 assert.equal(tickD02Wechat(s,8999),false);
 assert.equal(tickD02Wechat(s,9000),true);
 assert.equal(c.messages.at(-1).text,'我晚上收车经过你那边，给你带点吃的。');
 assert.equal(s.story55.d02.wechat.wang.completed,true);
 assert.equal(d02Draft(s,'wang'),null);
 assert.equal(tickD02Wechat(s,10000),false);
 assert.equal(c.messages.filter(m=>m.storyD02).length,7);
 assert.equal(c.messages.filter(m=>m.storyD02&&m.from==='me').length,3);
 tickD02Diary(s);assert.equal(s.story55.d02.diary.due.brother,2*1440+12*60+45);
 s.clock='12:44';tickD02Diary(s);assert.doesNotMatch(entryFor(s,2).body,/中午和哥聊/);
 s.clock='12:45';tickD02Diary(s);assert.match(entryFor(s,2).body,/中午和哥聊/);
 tickD02Diary(s);assert.equal(entryFor(s,2).body.match(/中午和哥聊/g).length,1);
 assert.equal(s.content.calendarEvents.length,0);
});

test('D02 Xiao Xin sends only one proactive 16:08 WeChat; player reply is not automatic',()=>{
 const s=phone(),store={get:()=>s,update:fn=>fn(s)},c=s.content.conversations.wechat.find(c=>c.name==='小辛');
 s.clock='16:07';tickStory55(s);
 assert.equal(d02WeChatDue(s),false);
 s.clock='16:08';
 assert.equal(d02WeChatDue(s),true);
 tickD02Wechat(s,1000);
 assert.equal(c.messages.filter(m=>m.storyD02).length,1);
 assert.equal(c.messages.at(-1).from,'小辛');
 assert.equal(c.messages.at(-1).time,'16:08');
 assert.match(d02Draft(s,c.id).text,/先看看/);
 tickD02Wechat(s,2000);
 assert.equal(c.messages.filter(m=>m.storyD02).length,1);
 assert.ok(sendD02WeChat(store,c.id,d02Draft(s,c.id).text,3000).messageId);
 assert.equal(c.messages.filter(m=>m.storyD02&&m.from==='me').length,1);
 assert.equal(tickD02Wechat(s,4800),true);
 assert.match(c.messages.at(-1).text,/我还没下单/);
 assert.equal(s.notifications.filter(n=>n.id?.includes('d02-xin-script-0')).length,1);
});

test('D02 Schedule stages are independent of Calendar, preserve editor overrides and activate only after buying',()=>{
 const s=phone();
 assert.doesNotMatch(entryFor(s,2).body,/在澳东买了/);
 s.story55.d02.purchased=[{category:'ssd',id:'ad-ssd'}];
 tickD02Diary(s);
 assert.equal(s.story55.d02.diary.due.purchase,2*1440+8*60+50);
 s.clock='08:49';tickD02Diary(s);assert.doesNotMatch(entryFor(s,2).body,/在澳东买了/);
 s.clock='08:50';tickD02Diary(s);assert.match(entryFor(s,2).body,/在澳东买了/);
 saveDiaryEntry(s,2,{title:'测试日记',weather:'雨',body:'今天看看机器。',stages:{brother:'哥哥的事',purchase:'已经下单'}});
 assert.equal(entryFor(s,2).title,'测试日记');
 assert.equal(entryFor(s,2).body,'今天看看机器。\n\n已经下单');
 assert.equal(s.content.calendarEvents.length,0);
});

test('D02 migration removes only legacy auto-sent chat bubbles and stale notices',()=>{
 const s=phone(),c=s.content.conversations.wechat.find(c=>c.id==='wang');
 delete s.story55.d02.wechat;
 c.messages.push({id:'d02-wang-01',from:'me',storyD02:true,text:'旧自动发消息',day:2,sentDate:'2025-05-20'});
 c.messages.push({id:'player-authored-example',from:'me',actual:true,text:'玩家原有记录',day:2,sentDate:'2025-05-20'});
 c.messages.push({id:'d02-wang-02',from:'熙旺',storyD02:true,text:'旧自动回复',day:2,sentDate:'2025-05-20',delivery:{day:2,clock:'12:19'}});
 s.notifications.push({id:'message-wechat-wang-d02-wang-02',messageId:'d02-wang-02',conversationId:'wang'});
 c.unread=1;
 assert.equal(seedD02Wechat(s),true);
 assert.equal(c.messages.some(m=>m.id==='d02-wang-01'||m.id==='d02-wang-02'),false);
 assert.equal(c.messages.some(m=>m.id==='player-authored-example'),true);
 assert.equal(c.unread,0);
 assert.equal(seedD02Wechat(s),false);
});

test('D02 A contract uses the exact approved anonymous brief and two independent reminders',()=>{
 const s=phone(),o=s.content.orders.find(o=>o.id===D02_A);
 assert.equal(o.description,'有三个远程监控节点，我需要它们在指定时段内停止向主控端回传数据。\n\n我要中断记录和恢复记录。没有完整结果就不要提交。\n\n期限三天。报酬写在上面了。');
 assert.equal(acceptD02(s,D02_A),true);
 const r=s.content.reminders.find(x=>x.id===d02ReminderId(D02_A));
 assert.ok(r);assert.equal(r.status,'进行中');assert.equal(r.progress,0);
 assert.equal(r.deadlineDay,4);
 assert.equal(s.notifications.filter(n=>n.id==='d02-anonymous-mail-notice').length,1);
 assert.equal(acceptD02(s,D02_A),false);
});
test('unfinished accepted A commission expires, cannot be restarted and stays in reminder history',()=>{
 const s=phone();
 assert.equal(acceptD02(s,D02_A),true);
 s.content.mail.find(m=>m.id===D02_A_MAIL).read=true;
 assert.equal(deployD02(s,D02_A,D02_KEYS[D02_A]),true);
 const step=d02StepId(D02_A,0);
 assert.equal(begin(s,step),true);
 finish(s,step,true);
 s.day=5;s.clock='08:00';tickStory55(s);
 assert.equal(s.content.orders.find(o=>o.id===D02_A).status,'EXPIRED');
 assert.equal(s.content.reminders.find(r=>r.id===d02ReminderId(D02_A)).failed,true);
 assert.equal(armD02Ghost(s,D02_A,1),null);
 assert.equal(submitD02(s,D02_A),false);
 assert.equal(acceptD02(s,D02_A),false);
});
test('completed A before D04 deadline remains submit-ready on D05 and pays exactly once',()=>{
 const s=phone(),opening=s.bankData.balance;
 assert.equal(acceptD02(s,D02_A),true);
 s.content.mail.find(m=>m.id===D02_A_MAIL).read=true;
 assert.equal(deployD02(s,D02_A,D02_KEYS[D02_A]),true);
 s.day=4;s.clock='23:58';win(s,D02_A);
 s.day=5;s.clock='08:00';tickStory55(s);
 assert.equal(s.content.orders.find(o=>o.id===D02_A).status,'READY');
 assert.equal(submitD02(s,D02_A),true);
 assert.equal(s.content.reminders.find(r=>r.id===d02ReminderId(D02_A)).done,true);
 assert.equal(submitD02(s,D02_A),false);
 assert.equal(s.bankData.balance,opening+4500);
 assert.equal(s.bankData.transactions.filter(t=>t.id==='d02-payment-'+D02_A).length,1);
});
test('first D02 commission submission unlocks Wang immediately and Xiao Xin after 15 game minutes',()=>{
 const s=phone(),store={get:()=>s,update:fn=>fn(s)};
 assert.equal(d02Draft(s,'wang'),null);
 assert.equal(acceptD02(s,D02_A),true);
 s.content.mail.find(m=>m.id===D02_A_MAIL).read=true;
 assert.equal(deployD02(s,D02_A,D02_KEYS[D02_A]),true);
 win(s,D02_A);assert.equal(submitD02(s,D02_A),true);
 assert.match(d02Draft(s,'wang').text,/哥，你现在出车吗/);
 assert.equal(d02WeChatDue(s),false);
 s.clock='08:44';assert.equal(d02WeChatDue(s),false);
 s.clock='08:45';assert.equal(d02WeChatDue(s),true);
 tickD02Wechat(s,1000);
 assert.equal(s.content.conversations.wechat.find(c=>c.name==='小辛').messages.filter(m=>m.storyD02).length,1);
 assert.ok(sendD02WeChat(store,'wang',d02Draft(s,'wang').text,3000).messageId);
});

test('legacy accepted A order receives one missing Kira mail',()=>{const s=phone();const o=s.content.orders.find(o=>o.id===D02_A);o.status='ACCEPTED';tickStory55(s);tickStory55(s);assert.equal(s.content.mail.filter(m=>m.id===D02_A_MAIL).length,1);assert.equal(o.wasAccepted,true);});

test('D02 accepting either commission notifies through KIRA only',()=>{
 for(const id of [D02_S,D02_A]){
  const s=phone();
  assert.equal(acceptD02(s,id),true);
  const acceptanceNotices=s.notifications.filter(n=>n.id?.startsWith('d02-')&&n.id?.includes('mail-notice'));
  assert.equal(acceptanceNotices.length,1);
  assert.equal(acceptanceNotices[0].title,'KIRA');
  assert.equal(acceptanceNotices[0].link?.appId,'kira');
  assert.equal(s.notifications.some(n=>n.title==='MIRAGE'&&/委托已接取/.test(n.body||'')),false);
  assert.equal(acceptD02(s,id),false);
  assert.equal(s.notifications.filter(n=>n.id===acceptanceNotices[0].id).length,1);
 }
});

test('D02 KIRA key attachments open through native Files preview and GHOST for both commissions',()=>{
 for(const [id,mailId] of [[D02_S,D02_MAIL],[D02_A,D02_A_MAIL]]){
  const s=phone(),routes=[],store={get:()=>s,update:fn=>fn(s)};
  const ctx={store,router:{open:link=>routes.push(link)},toast:()=>{}};
  assert.equal(acceptD02(s,id),true);
  const mail=s.content.mail.find(m=>m.id===mailId);
  assert.deepEqual(mail.attachments,[D02_KEY_FILES[id]]);
  assert.doesNotMatch(mail.body,/PROJECT ACCESS KEY|TALIA-CHIP-0520|GHOST-A-0520/);
  const email=kiraRender({store},{route:'/mail/'+mailId,params:{}});
  assert.match(email,/data-action="kira-d02-open-file"/);
  assert.match(email,/kira-d01-attachment/);
  assert.match(email,new RegExp(D02_KEY_FILES[id].replace('.','\\.')));
  assert.doesNotMatch(email,/kira-d02-key|PROJECT ACCESS KEY|直接显示密钥/);
  kiraHandle('kira-d02-open-file',{dataset:{id:mailId}},ctx);
  assert.deepEqual(routes.at(-1),{appId:'files',route:'/attachment/d02/'+mailId,params:{mailId}});
  assert.equal(mail.read,true);
  const preview=filesRender({store},{route:'/attachment/d02/'+mailId,params:{mailId}});
  assert.match(preview,/files-d01-preview/);
  assert.match(preview,/此加密檔案無法直接預覽/);
  assert.match(preview,/data-action="files-d02-open-ghost"/);
  assert.match(preview,/<strong>GHOST<\/strong>/);
  assert.equal(armD02Ghost(s,id,0),null);
  filesHandle('files-d02-open-ghost',{dataset:{id:mailId}},ctx);
  assert.equal(s.story55.d02.deployed[id],true);
  if(id===D02_S)assert.equal(s.story55.d02.keyOpened,true);
  assert.equal(s.ghost.orders[d02StepId(id,0)].status,'authorized');
  assert.deepEqual(routes.at(-1),{appId:'ghost',route:'/contract',params:{orderId:d02StepId(id,0)}});
  const before=Object.keys(s.ghost.orders).length;
  filesHandle('files-d02-open-ghost',{dataset:{id:mailId}},ctx);
  assert.equal(Object.keys(s.ghost.orders).length,before);
  const home=ghostRender(ctx,{route:'/',params:{}});
  assert.doesNotMatch(home,/MIRAGE 委托|gh-d02-projects|gh-d02-key|gh-d02-deploy/);
 }
});
test('D02 Files direct link rejects nonexistent or unread Kira attachment',()=>{
 const s=phone(),routes=[],store={get:()=>s,update:fn=>fn(s)};
 const ctx={store,router:{open:link=>routes.push(link)},toast:()=>{}};
 assert.equal(acceptD02(s,D02_A),true);
 const route='/attachment/d02/'+D02_A_MAIL;
 assert.match(filesRender({store},{route,params:{mailId:D02_A_MAIL}}),/不可用/);
 filesHandle('files-d02-open-ghost',{dataset:{id:D02_A_MAIL}},ctx);
 assert.equal(s.story55.d02.deployed[D02_A],undefined);
 assert.equal(routes.length,0);
});
test('old D02 key mail is converted back to a native attachment without revealing key in its body',()=>{
 const s=phone();assert.equal(acceptD02(s,D02_A),true);
 const mail=s.content.mail.find(m=>m.id===D02_A_MAIL);
 mail.body='PROJECT ACCESS KEY: GHOST-A-0520';delete mail.attachments;
 tickStory55(s);
 assert.deepEqual(mail.attachments,[D02_KEY_FILES[D02_A]]);
 assert.doesNotMatch(mail.body,/PROJECT ACCESS KEY/);
});

test('GHOST D02 shows the original execution report without counters or a separate commission page',()=>{
 for(const [master,mailId] of [[D02_S,D02_MAIL],[D02_A,D02_A_MAIL]]){
  const s=phone(),routes=[],store={get:()=>s,update:fn=>fn(s)};
  const ctx={store,router:{open:link=>routes.push(link)},toast:()=>{}};
  assert.equal(acceptD02(s,master),true);
  s.content.mail.find(m=>m.id===mailId).read=true;
  if(master===D02_S)assert.equal(revealD02Key(s),true);
  assert.equal(deployD02(s,master,D02_KEYS[master]),true);
  win(s,master);
  assert.equal(s.content.orders.find(o=>o.id===master).status,'READY');
  const lastStep=d02StepId(master,D02_STAGES[master].length-1);
  const report=ghostRender(ctx,{route:'/run',params:{orderId:lastStep}});
  assert.match(report,/执行报告/);
  assert.match(report,/成功/);
  assert.match(report,/项目完成/);
  assert.match(report,/data-action="gh-d02-next"/);
  assert.match(report,/返回 KIRA/);
  assert.doesNotMatch(report,/尝试次数|操作次数|undefined|等待玩家|MIRAGE 委托/);
  assert.equal(s.content.orders.find(o=>o.id===master).status,'READY');
  filesHandle('files-d02-open-ghost',{dataset:{id:mailId}},ctx);
  assert.deepEqual(routes.at(-1),{appId:'ghost',route:'/run',params:{orderId:lastStep}});
  ghostHandle('gh-d02-next',{dataset:{}},ctx,{route:'/run',params:{orderId:lastStep}});
  assert.deepEqual(routes.at(-1),{appId:'kira',route:'/mail/'+mailId,params:{}});
 }
});
test('GHOST D02 retains the next step in-place, and legacy D01 reports without counters',()=>{
 const s=phone(),routes=[],store={get:()=>s,update:fn=>fn(s)};
 const ctx={store,router:{open:link=>routes.push(link)},toast:()=>{}};
 assert.equal(acceptD02(s,D02_A),true);
 s.content.mail.find(m=>m.id===D02_A_MAIL).read=true;
 assert.equal(deployD02(s,D02_A,D02_KEYS[D02_A]),true);
 const first=d02StepId(D02_A,0);
 assert.equal(begin(s,first,1000),true);
 finish(s,first,true,2000);
 const report=ghostRender(ctx,{route:'/run',params:{orderId:first}});
 assert.match(report,/执行报告/);
 assert.match(report,/繼續處理/);
 ghostHandle('gh-d02-next',{dataset:{}},ctx,{route:'/run',params:{orderId:first}});
 assert.deepEqual(routes.at(-1),{appId:'ghost',route:'/contract',params:{orderId:d02StepId(D02_A,1)}});
 const d01=s.ghost.orders.mirage001;
 if(d01&&d01.status==='success'){
  const historyReport=ghostRender(ctx,{route:'/run',params:{orderId:'mirage001'}});
  assert.match(historyReport,/执行报告/);
  assert.doesNotMatch(historyReport,/undefined|操作次数|尝试次数/);
 }
 const home=ghostRender(ctx,{route:'/',params:{}});
 assert.doesNotMatch(home,/MIRAGE 委托|gh-d02-projects/);
});

test('D02 promotional SMS migrates old copy, shows one tappable virtual URL and opens the existing Safari shop',()=>{
 const s=phone(),sms=s.content.conversations.messages.find(c=>c.id==='sms-aodong-2025');
 const bubble=sms.messages.find(m=>m.id==='d02-aodong-sale');
 assert.ok(bubble);
 bubble.text='浏览器搜索「澳东商城」进入选购。';
 seedD02(s);seedD02(s);
 assert.equal(bubble.text,D02_AODONG_SMS);
 assert.equal(sms.messages.filter(m=>m.id==='d02-aodong-sale').length,1);
 assert.match(bubble.text,/https:\/\/aodong\.shop/);
 bubble.delivery={day:2,clock:'09:00'};
 s.clock='09:05';
 const store={get:()=>s,update:fn=>fn(s)};
 const smsHtml=smsRender({store},{route:'/chat/sms-aodong-2025',params:{}});
 assert.match(smsHtml,/data-action="sms-aodong-link"/);
 assert.match(smsHtml,/class="ios-msg-detected ios-msg-shop-link"/);
 assert.match(smsHtml,/https:\/\/aodong\.shop/);
 const routes=[],ctx={store,router:{open:link=>routes.push(link)}};
 smsHandle('sms-aodong-link',{dataset:{}},ctx);
 assert.deepEqual(routes.at(-1),{appId:'browser',route:'/aodong',params:{}});
 const shop=browserRender({store},{route:'/aodong',params:{}});
 assert.match(shop,/澳东商城/);
 assert.match(shop,/购物车/);
 assert.match(shop,/加入购物车/);
});
test('Safari direct search by Aodong name or virtual URL opens the same in-phone storefront',()=>{
 const s=phone(),store={get:()=>s,update:fn=>fn(s)},routes=[];
 const ctx={store,router:{open:link=>routes.push(link)}};
 const OriginalFormData=globalThis.FormData;
 try{
  globalThis.FormData=class{constructor(form){this.form=form;}get(key){return key==='query'?this.form.query:null;}};
  for(const query of ['澳东商城','澳東商城',D02_AODONG_URL]){
   browserSubmit({dataset:{form:'browser-search'},query},ctx,{route:'/',params:{}});
   assert.deepEqual(routes.at(-1),{appId:'browser',route:'/aodong',params:{}});
  }
 }finally{globalThis.FormData=OriginalFormData;}
});
test('Mirage READY D02 contract displays one actionable English submit CTA and settles once',()=>{
 const s=phone(),store={get:()=>s,update:fn=>fn(s)},routes=[],notices=[];
 const ctx={store,router:{open:link=>routes.push(link)},toast:line=>notices.push(line)};
 assert.equal(acceptD02(s,D02_A),true);
 s.content.mail.find(m=>m.id===D02_A_MAIL).read=true;
 assert.equal(deployD02(s,D02_A,D02_KEYS[D02_A]),true);
 win(s,D02_A);
 const oldBalance=s.bankData.balance;
 setMirageAuthenticated(true);
 try{
  const screen=mirageRender({store},{route:'/order/'+D02_A,params:{}});
  assert.match(screen,/data-action="mc-d02-submit"[^>]*>READY TO SUBMIT/);
  assert.equal((screen.match(/data-action="mc-d02-submit"/g)||[]).length,1);
  assert.doesNotMatch(screen,/提交任务成果 · 领取赏金/);
  assert.doesNotMatch(screen,/data-action="mc-accept-bounty"/);
  mirageHandle('mc-d02-submit',{dataset:{id:D02_A}},ctx,{route:'/order/'+D02_A,params:{}});
  assert.equal(s.bankData.balance,oldBalance+D02_REWARDS[D02_A]);
  assert.equal(s.content.orders.find(o=>o.id===D02_A).status,'COMPLETED');
  assert.equal(s.bankData.transactions.filter(t=>t.id==='d02-payment-'+D02_A).length,1);
  assert.deepEqual(routes.at(-1),{appId:'mirage',route:'/my-orders/completed',params:{}});
  const after=mirageRender({store},{route:'/order/'+D02_A,params:{}});
  assert.match(after,/CONTRACT COMPLETED/);
  assert.doesNotMatch(after,/READY TO SUBMIT/);
  assert.doesNotMatch(after,/提交任务成果 · 领取赏金/);
 }finally{setMirageAuthenticated(false);}
});
test('Kira D02 attachments show the exact D01 receipt only after successful submission and bank payout',()=>{
 for(const [master,mailId] of [[D02_S,D02_MAIL],[D02_A,D02_A_MAIL]]){
  const s=phone(),start=s.bankData.balance;
  assert.equal(acceptD02(s,master),true);
  s.content.mail.find(m=>m.id===mailId).read=true;
  if(master===D02_S)assert.equal(revealD02Key(s),true);
  assert.equal(deployD02(s,master,D02_KEYS[master]),true);
  win(s,master);
  const before=kiraDetail(s,mailId);
  assert.match(before,/data-action="kira-d02-open-file"/);
  assert.doesNotMatch(before,/文件已驗收 · 交易回執已寄送/);
  assert.equal(submitD02(s,master),true);
  assert.equal(s.bankData.balance,start+D02_REWARDS[master]);
  const after=kiraDetail(s,mailId);
  assert.match(after,/✓ 文件已驗收 · 交易回執已寄送/);
  assert.equal((after.match(/文件已驗收 · 交易回執已寄送/g)||[]).length,1);
  assert.match(after,/data-action="kira-d02-open-file"/);
  assert.equal(submitD02(s,master),false);
 }
});
test('Ghost retains all six tool names and uses tool-oriented help text without altering mechanics',()=>{
 const expected=[
  ['部署','导入授权凭证，安装并初始化工具'],
  ['破译','解析加密结构，恢复可读取的数据'],
  ['链接','建立节点连接，验证数据传输通路'],
  ['窃取','定位目标文件，提取并校验数据'],
  ['隐匿','分析监测路径，验证隐匿方案'],
  ['攻击','执行定向测试，记录目标响应']
 ];
 assert.deepEqual(ghostCatalog.map(t=>[t.name,t.detail]),expected);
 const s=phone(),store={get:()=>s,update:fn=>fn(s)};
 const home=ghostRender({store},{route:'/',params:{}});
 for(const [name,description] of expected){assert.match(home,new RegExp(name));assert.ok(home.includes(description));}
 assert.doesNotMatch(home,/不是小游戏|拼图：|翻牌配对|迷宫潜行|完成六次命中/);
 assert.equal(acceptD02(s,D02_A),true);
 s.content.mail.find(m=>m.id===D02_A_MAIL).read=true;
 assert.equal(deployD02(s,D02_A,D02_KEYS[D02_A]),true);
 const cipher=d02StepId(D02_A,0);
 assert.equal(begin(s,cipher,1000),true);
 const operational=ghostRender({store},{route:'/run',params:{orderId:cipher}});
 assert.match(operational,/根据参考映射调整模块排列/);
 assert.match(operational,/依据右下角编号 01–09 校准参考结构/);
 assert.doesNotMatch(operational,/普通关卡|玩家|小游戏/);
 const fakeStrike={kind:'strike',goal:6,maxMisses:3,target:1,hits:2,misses:0};
 const strike=renderArcade(fakeStrike,{},10000);
 assert.match(strike,/目标响应测试/);
 assert.doesNotMatch(strike,/攻防反应挑战|任务失败/);
});

test('registered Messages uses the native source module while retaining SMS navigation and actions',()=>{
 const s=phone(),live=registry.get('messages'),store={get:()=>s,update:fn=>fn(s)},routes=[];
 const ctx={store,refresh:()=>{},toast:()=>{},router:{open:x=>routes.push(x)}};
 assert.ok(live);
 const list=live.render({store},{route:'/',params:{}});
 assert.match(list,/data-ui-source="foundphone-messages"/);
 assert.doesNotMatch(list,/class="sms-screen"/);
 const sms=s.content.conversations.messages.find(c=>c.id==='sms-aodong-2025');
 const sale=sms.messages.find(m=>m.id==='d02-aodong-sale');
 sale.delivery={day:2,clock:'09:00'};s.clock='09:09';
 assert.match(live.render({store},{route:'/',params:{}}),/catalog-chat ios-msg-row/);
 const chat=live.render({store},{route:'/chat/'+sms.id,params:{}});
 assert.match(chat,/ios-chat-header/);
 assert.match(chat,/catalog-bubbles sms-bubbles chat-messages/);
 assert.doesNotMatch(chat,/class="chat-screen"/);
 assert.match(chat,/data-action="sms-aodong-link"/);
 live.handle('sms-aodong-link',{dataset:{}},ctx);
 assert.deepEqual(routes.at(-1),{appId:'browser',route:'/aodong',params:{}});
 live.handle('sms-compose',{dataset:{}},ctx);
 assert.deepEqual(routes.at(-1),{appId:'messages',route:'/compose'});
 assert.match(live.render({store},{route:'/compose',params:{}}),/data-form="sms-new"/);
 live.handle('sms-back',{dataset:{}},ctx);
 assert.deepEqual(routes.at(-1),{appId:'messages',route:'/'});
});
test('restored Messages keeps select/delete with confirmation without touching other messages',()=>{
 const s=phone(),live=registry.get('messages'),store={get:()=>s,update:fn=>fn(s)};
 const ctx={store,refresh:()=>{},toast:()=>{},router:{open:()=>{}}};
 const id=s.content.conversations.messages[0].id;
 const count=s.content.conversations.messages.length;
 live.handle('sms-edit',{dataset:{}},ctx);
 assert.match(live.render({store},{route:'/',params:{}}),/class="ios-msg-selection-bar"/);
 live.handle('sms-pick',{dataset:{id}},ctx);
 live.handle('sms-delete',{dataset:{}},ctx);
 assert.match(live.render({store},{route:'/',params:{}}),/删除选中的 1 条信息/);
 live.handle('sms-confirm-delete',{dataset:{}},ctx);
 assert.equal(s.content.conversations.messages.length,count-1);
 assert.equal(s.content.conversations.messages.some(c=>c.id===id),false);
 assert.doesNotMatch(live.render({store},{route:'/',params:{}}),/class="ios-msg-selection-bar"/);
});
