import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {D53_CALL} from '../src/story/d53/call.js';
import {D53_ACTION_START,D53_ISOLDE_DEAL,D53_DEAL_LINES} from '../src/story/d53/definition.js';
import {D46_CONTACT} from '../src/story/d46/definition.js';
import {d53DealReminderDue,syncD53DealReminder,D53_REMINDER_ID} from '../src/story/d53/reminders.js';
import {reminderDestination,toggleReminder} from '../src/services/reminders.js';
import {openReminderTask} from '../src/apps/reminders/index.js';
import {reminderWidget} from '../src/system/shell.js';
import {listHome} from '../src/apps/reminders/features/lists/index.js';
import {scene55,sceneLines,advanceScene55} from '../src/services/story55/runtime.js';
import {sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';

function fixture(){
 const s=activateStory55(initialState());
 s.day=53;s.clock='21:33';
 s.story55.completed[D53_ACTION_START]={day:53,clock:'20:00'};
 s.story55.scriptedCallCompleted={[D53_CALL.id]:true};
 s.story55.d53DealPromptAt=5000;
 if(!s.content.conversations.mirage.some(c=>c.id===D46_CONTACT))
  s.content.conversations.mirage.push({id:D46_CONTACT,name:'Isolde Mirage',messages:[],unread:0});
 return s;
}
test('D53 reminder appears only two seconds after the fully completed call and deep-links to Isolde',()=>{
 const s=fixture(),store={get:()=>s,update:fn=>fn(s)};
 assert.equal(d53DealReminderDue(s,4999),false);
 assert.equal(syncD53DealReminder(s,4999),false);
 assert.equal(d53DealReminderDue(s,5000),true);
 assert.equal(syncD53DealReminder(s,5000),true);
 assert.equal(syncD53DealReminder(s,6000),false);
 const r=s.content.reminders.find(r=>r.id===D53_REMINDER_ID);
 assert.ok(r);assert.equal(r.done,false);
 assert.equal(reminderDestination(s,r).link.route,'/chat/'+D46_CONTACT);
 const n=s.notifications.find(n=>n.id==='s55-d53-isolde-deal-notice');
 assert.ok(n);assert.equal(n.body,'Isolde｜確認第二筆委託');
 assert.match(reminderWidget(s),/data-action="home-reminder-open"/);
 assert.match(reminderWidget(s),/Isolde｜確認第二筆委託/);
 assert.match(listHome(s.content.reminders,''),/data-action="reminder-follow"/);
 assert.equal(toggleReminder(store,D53_REMINDER_ID),false,'story reminders cannot be checked off');
 let opened;
 assert.equal(openReminderTask(D53_REMINDER_ID,{store,router:{open:link=>{opened=link;}},toast:()=>{}}),true);
 assert.equal(opened.appId,'mirage');assert.equal(opened.route,'/chat/'+D46_CONTACT);
});

test('the 50 million deal uses the native Send sequence and completes its existing reminder',()=>{
 const s=fixture();syncD53DealReminder(s,5000);
 let now=10000;
 for(const [who,text] of D53_DEAL_LINES){
  const line=sceneLines(s,D53_ISOLDE_DEAL)[scene55(s,D53_ISOLDE_DEAL).index];
  assert.equal(line[1],text);
  if(who==='me')sendScriptedDraft55(s,'mirage',D46_CONTACT,text,now+=10000);
  else advanceScene55(s,D53_ISOLDE_DEAL,{now:now+=10000});
 }
 assert.equal(s.story55.completed[D53_ISOLDE_DEAL]?.day,53);
 syncD53DealReminder(s);
 assert.equal(s.content.reminders.find(r=>r.id===D53_REMINDER_ID)?.done,true);
 assert.equal(sceneLines(s,D53_ISOLDE_DEAL)[4][1],'五千萬美金。');
 assert.equal(s.story55.config.nodes.find(n=>n.id===D53_ISOLDE_DEAL).lineDelayMs[4],3000);
});

test('a normal user reminder stays checkable while the task title opens its listing',()=>{
 const s=initialState(),store={get:()=>s,update:fn=>fn(s)};
 s.content.reminders=[{id:'personal',title:'整理資料',done:false}];
 assert.equal(reminderDestination(s,s.content.reminders[0]).link.route,'/all');
 assert.match(reminderWidget(s),/data-action="home-reminder-toggle"/);
 assert.match(reminderWidget(s),/data-action="home-reminder-open"/);
 assert.equal(toggleReminder(store,'personal'),true);
 assert.equal(s.content.reminders[0].done,true);
});
