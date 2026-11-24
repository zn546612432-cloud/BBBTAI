import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,advanceScene55,scene55,sceneLines} from '../src/services/story55/runtime.js';
import {sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {completed} from '../src/services/story55/state.js';
import {mainlineTasks,mainlineTask} from '../src/apps/reminders/features/mainline/model.js';
import {render,openReminderTask} from '../src/apps/reminders/index.js';
import {reminderWidget} from '../src/system/shell.js';
import {syncD55Reminders} from '../src/story/d55/reminders.js';
import {seedD01,deliverD01Opening,acceptD01Repair,deliverD01Attachment,revealD01Key} from '../src/story/d01/runtime.js';
import {D06_ORDER_ID} from '../src/story/d06/commission.js';
import {D02_AODONG_CHAT_ID,seedD02} from '../src/story/d02/runtime.js';
import {MessageDelivery} from '../src/services/messaging/delivery.js';
import {reminderDestination} from '../src/services/reminders.js';
import {STORY55_WALLET_MAIL_ID} from '../src/apps/mirage/data.js';
const find=(s,id)=>mainlineTasks(s).find(t=>t.id==='mainline:'+id);
function at(day,clock){
 const s=initialState();activateStory55(s);s.day=day;s.clock=clock;s.story55.activeScene=null;
 for(const n of s.story55.config.nodes)if(n.day<day)
  s.story55.completed[n.id]={day:n.day,clock:n.at||'23:00',test:true};
 return s;
}
test('D01 launches at the contract hall and advances its one task to the real KIRA/Files location',()=>{
 const s=at(1,'10:00');
 seedD01(s);deliverD01Opening(s);
 assert.equal(find(s,'d01-repair').link.route,'/bounties/hall');
 const store={get:()=>s,update:fn=>fn(s)},opened=[];
 assert.equal(openReminderTask('mainline:d01-repair',{store,router:{open:t=>opened.push(t)}}),true);
 assert.equal(opened.at(-1).route,'/bounties/hall');
 assert.equal(acceptD01Repair(s),true);
 deliverD01Attachment(s);
 assert.equal(find(s,'d01-repair').link.route,'/mail/d01-mirage001-attachment');
 assert.equal(revealD01Key(s),true);
 assert.equal(find(s,'d01-repair').link.route,'/attachment/d01-mirage001');
});
test('the Flow task appears at 08:15, then links to existing GHOST deployment',()=>{
 const s=at(3,'08:14');
 assert.equal(find(s,'flow-d03'),undefined);
 s.clock='08:15';
 assert.equal(find(s,'flow-d03').link.route,'/chat/mc-flow-d03');
 s.story55.flowD03={linkOpened:true};
 assert.equal(find(s,'flow-d03').link.route,'/flow-deploy');
});
test('D06 wallet appears only after Flow schedule, following acceptance and authorization',()=>{
 const s=at(6,'08:09');
 assert.equal(find(s,'wallet'),undefined);
 s.clock='08:10';
 s.content.orders.push({id:D06_ORDER_ID,status:'OPEN'});
 assert.equal(find(s,'wallet').link.route,'/bounties/hall');
 s.content.orders.find(o=>o.id===D06_ORDER_ID).status='ACCEPTED';
 s.content.mail.push({id:STORY55_WALLET_MAIL_ID,read:false});
 assert.equal(find(s,'wallet').link.route,'/mail/'+STORY55_WALLET_MAIL_ID);
 s.content.mail.find(m=>m.id===STORY55_WALLET_MAIL_ID).read=true;
 assert.equal(find(s,'wallet').link.route,'/deployment');
});
test('D23 chess remains visible during the real 03:00 overnight power hold',()=>{
 const s=at(23,'03:00');
 s.story55.d23??={};s.story55.d23.nightAfterMidnight=true;
 assert.ok(find(s,'d23-chess'),'the overnight clock must not hide the overdue chess');
 assert.equal(find(s,'d23-chess').link.appId,'mirage');
});
test('timed D54 father task and D55 briefing are hidden before their actual time',()=>{
 const s=at(54,'18:59');
 s.story55.completed['d54-isolde-ready']={day:54,clock:'08:20'};
 s.story55.completed['d54-departure-group']={day:54,clock:'08:40'};
 assert.equal(find(s,'ready'),undefined);
 s.clock='19:00';
 const t=find(s,'ready');assert.equal(t.title,'給傅隆生發信息');
 assert.equal(t.link.route,'/chat/fulongsheng');
 assert.match(reminderWidget(s),/給傅隆生發信息/);
 const end=at(55,'09:49');
 assert.equal(find(end,'d55-briefing'),undefined);
 end.clock='09:50';
 assert.equal(find(end,'d55-briefing')?.link.route,'/chat/group');
 assert.equal(find(end,'d55-wang-last'),undefined);
});
test('optional everyday banter and wish shopping stay off the mainline screen',()=>{
 const s=at(35,'18:00');
 s.content.reminders.push({id:'custom',title:'買奶茶',done:false});
 s.content.reminders.push({id:'wish',wishId:'d06-dinner',title:'買炸雞',done:false});
 assert.equal(find(s,'d35-training'),undefined);
 const html=render({store:{get:()=>s}},{route:'/'});
 assert.doesNotMatch(html,/買奶茶|買炸雞/);
 assert.match(html,/data-native-scroll="reminders"/);
 assert.match(reminderWidget(s),/買奶茶/);
 assert.match(reminderWidget(s),/買炸雞/);
});
test('legacy personal reminders and purchased wishes still have a separate list',()=>{
 const s=at(6,'18:00');
 s.content.reminders.push({id:'personal-keep',title:'買牛奶',done:false});
 s.content.reminders.push({id:'wish-keep',wishId:'d06-dinner',title:'和大家吃飯',done:false});
 const today=render({store:{get:()=>s}},{route:'/'});
 assert.match(today,/個人事項/);
 assert.doesNotMatch(today,/買牛奶|和大家吃飯/);
 const personal=render({store:{get:()=>s}},{route:'/personal'});
 assert.match(personal,/買牛奶|和大家吃飯/);
 assert.match(reminderWidget(s),/home-reminder-wish/);
 assert.match(reminderWidget(s),/home-reminder-toggle/);
});
test('D55 ending is automatic in NoApp and never becomes a mainline reminder',()=>{
 const s=at(55,'22:46');
 s.story55.completed['d55-briefing']={day:55,clock:'09:50'};
 s.story55.completed['d55-departure']={day:55,clock:'18:00'};
 s.story55.completed['d55-wang-last']={day:55,clock:'19:00'};
 s.story55.completed['d55-xiaoxin']={day:55,clock:'19:02'};
 assert.equal(find(s,'ending'),undefined);
 s.story55.d55Disconnected=true;
 assert.equal(find(s,'ending'),undefined);
 s.story55.endingVoiceAvailable=true;
 assert.equal(find(s,'ending'),undefined);
 assert.equal(mainlineTask(s,'mainline:ending'),null);
 assert.doesNotMatch(reminderWidget(s),/收聽最後的語音/);
});

test('D55 cleans the D41 23:00 operation reminder from old saves without deleting personal tasks',()=>{
 const s=at(55,'22:46');
 s.content.reminders.push({id:'s55-d41-operation-reminder',title:'23:00 行动开始',done:false});
 s.content.reminders.push({id:'custom',title:'買奶茶',done:false});
 s.notifications.push({id:'s55-d41-operation-reminder-notice',title:'提醒事項',body:'23:00 行动开始'});
 assert.match(reminderWidget(s),/23:00 行动开始/);
 assert.equal(syncD55Reminders(s),true);
 assert.equal(s.content.reminders.some(r=>r.id==='s55-d41-operation-reminder'),false);
 assert.equal(s.notifications.some(n=>n.id==='s55-d41-operation-reminder-notice'),false);
 assert.doesNotMatch(reminderWidget(s),/23:00 行动开始/);
 assert.match(reminderWidget(s),/買奶茶/);
 assert.equal(syncD55Reminders(s),false,'cleanup is idempotent after removal');
});


test('D02 workstation reminder appears after Aodong SMS delivery and opens the SMS thread',()=>{
 const s=at(2,'08:59');seedD02(s);
 assert.equal(find(s,'workstation'),undefined);
 s.clock='09:00';
 assert.equal(find(s,'workstation'),undefined,'a scheduled but undelivered SMS must not reveal its reminder');
 const store={get:()=>s,update:fn=>fn(s)};
 new MessageDelivery(store).tick(1000);
 const item=find(s,'workstation');
 assert.ok(item,'the task appears after the SMS has been delivered');
 assert.deepEqual(item.link,{appId:'messages',route:'/chat/'+D02_AODONG_CHAT_ID,params:{}});
 assert.match(reminderWidget(s),/準備工作站配件/);
 const opened=[];
 assert.equal(openReminderTask(item.id,{store,router:{open:target=>opened.push(target)}}),true);
 assert.deepEqual(opened,[item.link]);
 assert.deepEqual(reminderDestination(s,{id:'d02-pc-build-reminder',storyD02:true}),{
  kind:'link',link:{appId:'messages',route:'/chat/'+D02_AODONG_CHAT_ID}
 });
 assert.ok(s.content.conversations.messages.find(c=>c.id===D02_AODONG_CHAT_ID)
  .messages.find(m=>m.id==='d02-aodong-sale').delivery);
});


test('D41 uses the 23:30 operation scene for its reminder, deep link and automatic completion',()=>{
 const s=at(41,'23:00');
 assert.equal(find(s,'d41-opening'),undefined);
 s.clock='23:29';assert.equal(find(s,'d41-opening'),undefined);
 s.clock='23:30';
 const item=find(s,'d41-opening');
 assert.equal(item.title,'23:30 行動開始前');assert.equal(item.done,false);
 assert.deepEqual(item.link,{appId:'wechat',route:'/chat/group',params:{node:'d41-opening'}});
 assert.match(reminderWidget(s),/23:30 行動開始前/);
 assert.match(render({store:{get:()=>s}},{route:'/'}),/23:30 行動開始前/);
 const store={get:()=>s,update:fn=>fn(s)},opened=[];
 assert.equal(openReminderTask(item.id,{store,router:{open:link=>opened.push(link)}}),true);
 assert.deepEqual(opened,[item.link]);
 assert.equal(completed(s,'d41-opening'),false,'opening the reminder is not scene completion');
 let now=Date.now();
 for(let i=0;i<sceneLines(s,'d41-opening').length&&!completed(s,'d41-opening');i++){
  const [who,text]=sceneLines(s,'d41-opening')[scene55(s,'d41-opening').index];
  if(who==='me')sendScriptedDraft55(s,'wechat','group',text,now+=10000);
  else advanceScene55(s,'d41-opening',{now:now+=10000});
 }
 assert.equal(find(s,'d41-opening').done,true);
 assert.doesNotMatch(reminderWidget(s),/23:30 行動開始前/);
 assert.doesNotMatch(render({store},{route:'/'}),/23:30 行動開始前/);
 assert.match(render({store},{route:'/completed'}),/23:30 行動開始前/);
 s.day=42;s.clock='08:00';assert.equal(find(s,'d41-opening'),undefined);
});

test('old unlinked operation reminders are removed on D41 and later days without changing personal tasks',()=>{
 for(const day of [41,42,55]){
  const s=at(day,'08:00');
  s.story55.d41OperationReminderAdded=true;
  s.content.reminders.push({id:'s55-d41-operation-reminder',title:'23:00 行动开始',done:false},{id:'personal-operation-note',title:'23:00 行动开始',done:false});
  s.notifications.push({id:'s55-d41-operation-reminder-notice',title:'提醒事項',body:'23:00 行动开始'});
  tickStory55(s);
  assert.equal(s.content.reminders.some(r=>r.id==='s55-d41-operation-reminder'),false);
  assert.equal(s.notifications.some(n=>n.id==='s55-d41-operation-reminder-notice'),false);
  assert.ok(s.content.reminders.some(r=>r.id==='personal-operation-note'));
  tickStory55(s);
  assert.equal(s.content.reminders.some(r=>r.id==='s55-d41-operation-reminder'),false);
 }
});

test('D02 Wang reminder follows the authored start, opens WeChat and completes only with the scene',()=>{
 const s=at(2,'12:15');seedD02(s);
 assert.equal(find(s,'d02-wang-chat'),undefined);
 s.clock='12:16';
 const item=find(s,'d02-wang-chat');
 assert.equal(item.title,'給熙旺發消息');
 assert.deepEqual(item.link,{appId:'wechat',route:'/chat/wang',params:{}});
 const opened=[],store={get:()=>s,update:fn=>fn(s)};
 assert.equal(openReminderTask(item.id,{store,router:{open:link=>opened.push(link)}}),true);
 assert.deepEqual(opened,[item.link]);
 const q=s.story55.d02.wechat.wang;
 q.started=true;q.index=1;
 assert.equal(find(s,'d02-wang-chat').done,false);
 q.completed=true;
 assert.equal(find(s,'d02-wang-chat').done,true);
 s.day=3;assert.equal(find(s,'d02-wang-chat'),undefined);
});
test('D02 Wang reminder follows early settlement and author-edited opening time',()=>{
 const s=at(2,'09:30');seedD02(s);
 assert.equal(find(s,'d02-wang-chat'),undefined);
 s.story55.d02.wechat.earlyAt=2*1440+570;
 assert.equal(find(s,'d02-wang-chat').done,false);
 s.story55.chatSceneEdits={'d02:wang':{at:'10:00'}};
 assert.equal(find(s,'d02-wang-chat'),undefined);
 s.clock='10:00';assert.ok(find(s,'d02-wang-chat'));
});

test('daily MIRAGE reminder follows a real accepted order, resets each story day and opens the hall',()=>{
 const s=at(2,'08:00');
 const item=find(s,'daily-mirage');
 assert.equal(item.title,'前往 MIRAGE 接單');
 assert.deepEqual(item.link,{appId:'mirage',route:'/bounties/hall',params:{}});
 const opened=[],store={get:()=>s,update:fn=>fn(s)};
 assert.equal(openReminderTask(item.id,{store,router:{open:link=>opened.push(link)}}),true);
 assert.deepEqual(opened,[item.link]);
 assert.equal(find(s,'daily-mirage').done,false);
 s.content.orders.push({id:'test-accepted',status:'ACCEPTED',acceptedDay:2});
 assert.equal(find(s,'daily-mirage').done,true);
 s.day=3;assert.equal(find(s,'daily-mirage').done,false);
});
test('approved optional D01, D20 and D37 proactive chat reminders follow real scene state',()=>{
 const d1=at(1,'08:00');
 assert.equal(find(d1,'d01-group-chat').link.route,'/chat/group');
 assert.equal(find(d1,'d01-brother-chat').link.route,'/chat/wang');
 d1.story55.d01??={};d1.story55.d01.group={completed:true};
 assert.equal(find(d1,'d01-group-chat').done,true);
 const d20=at(20,'10:44');
 assert.equal(find(d20,'d20-monitoring-chat'),undefined);
 d20.clock='10:45';
 assert.equal(find(d20,'d20-monitoring-chat').title,'確認人員安排');
 d20.story55.authoredDays??={};d20.story55.authoredDays.d20={monitoring:{completed:true}};
 assert.equal(find(d20,'d20-monitoring-chat').done,true);
 const d37=at(37,'16:20');
 assert.equal(find(d37,'d37-workstation'),undefined);
 d37.clock='16:21';assert.equal(find(d37,'d37-workstation').title,'分享移動工作站照片');
});
test('workstation group reminder requires the actual build-ready flag and completes only after chat',()=>{
 const s=at(2,'15:00');seedD02(s);
 assert.equal(find(s,'d02-newpc-chat'),undefined);
 s.story55.d02.buildReady=true;s.story55.d02.buildReadyClock='15:00';
 assert.equal(find(s,'d02-newpc-chat').link.route,'/chat/group');
 s.story55.d02.wechat.newpc={completed:true};s.story55.d02.buildCelebrated=true;
 assert.equal(find(s,'d02-newpc-chat').done,true);
});

test('D06 celebration reminds only when wallet completion unlocks the real group draft',()=>{
 const s=at(6,'15:16');
 assert.equal(find(s,'d06-celebration-chat'),undefined);
 s.story55.completed.wallet={day:6,clock:'15:16'};
 const item=find(s,'d06-celebration-chat');
 assert.equal(item.title,'回群裡發消息');
 assert.deepEqual(item.link,{appId:'wechat',route:'/chat/group',params:{}});
 assert.match(reminderWidget(s),/回群裡發消息/);
 const opened=[],store={get:()=>s,update:fn=>fn(s)};
 assert.equal(openReminderTask(item.id,{store,router:{open:link=>opened.push(link)}}),true);
 assert.deepEqual(opened,[item.link]);assert.equal(find(s,'d06-celebration-chat').done,false);
 s.story55.wishes={records:{},story:{started:true,delivered:[]}};
 assert.equal(find(s,'d06-celebration-chat').done,false);
 s.story55.wishes.story.delivered.push('d06-celebrate-11');
 assert.equal(find(s,'d06-celebration-chat').done,true);
 assert.doesNotMatch(reminderWidget(s),/回群裡發消息/);
 s.day=7;assert.equal(find(s,'d06-celebration-chat'),undefined);
});
test('D06 dinner reminder follows payment and the actual booking confirmation',()=>{
 const s=at(6,'15:16');
 s.story55.wishes={records:{'d06-dinner':{status:'saved'}},story:{delivered:[]}};
 assert.equal(find(s,'d06-dinner-chat'),undefined);
 s.story55.wishes.records['d06-dinner'].purchasedDay=6;
 const item=find(s,'d06-dinner-chat');
 assert.equal(item.title,'回群裡確認聚餐');
 assert.equal(item.link.route,'/chat/group');
 s.story55.wishes.records['d06-dinner'].confirmedByXimeng=true;
 assert.equal(find(s,'d06-dinner-chat').done,false);
 s.story55.wishes.story.delivered.push('wish-dinner-booking-01');
 assert.equal(find(s,'d06-dinner-chat').done,true);
});
