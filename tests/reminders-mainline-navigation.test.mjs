import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {mainlineTasks,mainlineTask} from '../src/apps/reminders/features/mainline/model.js';
import {render,openReminderTask} from '../src/apps/reminders/index.js';
import {reminderWidget} from '../src/system/shell.js';
import {syncD55Reminders} from '../src/story/d55/reminders.js';
import {seedD01,deliverD01Opening,acceptD01Repair,deliverD01Attachment,revealD01Key} from '../src/story/d01/runtime.js';
import {D06_ORDER_ID} from '../src/story/d06/commission.js';
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
