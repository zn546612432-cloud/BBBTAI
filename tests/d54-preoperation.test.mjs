import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55,scene55,sceneLines,tickStory55,story55Presence} from '../src/services/story55/runtime.js';
import {completed,nodeStatus,pendingTimedStoryEvent} from '../src/services/story55/state.js';
import {currentScript55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {taiLife} from '../src/services/ai/life-context.js';
import {taiPresence} from '../src/services/presence.js';
import {D46_CONTACT} from '../src/story/d46/definition.js';
import {D53_TAI_NIGHT} from '../src/story/d53/definition.js';
import {
 D54_ISOLDE,D54_GROUP,D54_TAI,D54_FATHER,
 D54_ISOLDE_LINES,D54_GROUP_LINES,D54_TAI_LINES,D54_FATHER_LINES,D54_STICKER
} from '../src/story/d54/definition.js';
import {syncD54FatherReminder,D54_FATHER_REMINDER,D54_FATHER_LINK} from '../src/story/d54/reminders.js';
import {toggleReminder,reminderDestination} from '../src/services/reminders.js';
import {openReminderTask} from '../src/apps/reminders/index.js';
import {reminderWidget} from '../src/system/shell.js';
import * as noapp from '../src/apps/noapp/index.js';

function fixture(clock='08:19'){
 const s=activateStory55(initialState());s.day=54;s.clock=clock;
 s.story55.activeScene=null;s.story55.noappInstalled=true;
 for(const n of s.story55.config.nodes)if(n.day<54)
  s.story55.completed[n.id]={day:n.day,clock:n.at||'23:00',test:true};
 if(!s.content.conversations.mirage.find(c=>c.id===D46_CONTACT))
  s.content.conversations.mirage.push({id:D46_CONTACT,name:'Isolde Mirage',messages:[],unread:0});
 return s;
}
function play(s,id,lines,channel,cid,{start=Date.now()+100000}={}){
 let now=start;
 for(const [actor,text] of lines){
  assert.deepEqual(sceneLines(s,id)[scene55(s,id).index],[actor,text]);
  if(actor==='me'){
   const draft=currentScript55(s,channel,cid,now);
   assert.equal(draft?.text,text,'real composer must offer the exact approved message');
   sendScriptedDraft55(s,channel,cid,text,now);
  }else advanceScene55(s,id,{now});
  now+=10000;
 }
 assert.equal(completed(s,id),true,'complete '+id);
}

test('D54 follows morning Isolde → 08:40 group → NoApp → 19:00 father; D55 requires actual completion',()=>{
 const s=fixture();
 assert.equal(completed(s,D53_TAI_NIGHT),true);
 assert.equal(nodeStatus(s,D54_ISOLDE).state,'locked');
 assert.equal(pendingTimedStoryEvent(s).id,D54_ISOLDE);
 advanceGameMinutes(s,8);assert.equal(s.clock,'08:20');
 play(s,D54_ISOLDE,D54_ISOLDE_LINES,'mirage',D46_CONTACT);
 assert.equal(nodeStatus(s,D54_GROUP).state,'locked');
 advanceGameMinutes(s,20);assert.equal(s.clock,'08:40');
 assert.equal(pendingTimedStoryEvent(s).id,D54_GROUP);
 play(s,D54_GROUP,D54_GROUP_LINES,'wechat','group');
 assert.equal(s.story55.config.nodes.find(n=>n.id===D54_GROUP).imageLines[17],D54_STICKER);
 const msg=s.content.conversations.wechat.find(c=>c.id==='group')?.messages.find(m=>m.id==='s55-'+D54_GROUP+'-17');
 assert.equal(msg?.kind,'image','sticker must use the existing WeChat picture bubble');
 play(s,D54_TAI,D54_TAI_LINES,'noapp','tai');
 assert.equal(currentScript55(s,'noapp','tai'),null,'fixed script releases native AI/free composer');
 assert.equal(syncD54FatherReminder(s),false);
 advanceGameMinutes(s,800);assert.equal(s.clock,'19:00');
 assert.equal(pendingTimedStoryEvent(s).id,D54_FATHER);
 assert.equal(s.story55.config.nodes.find(n=>n.id==='ready').authoredPending,false);
 assert.equal(completed(s,'ready'),false);
 tickStory55(s);
 const reminder=s.content.reminders.find(r=>r.id===D54_FATHER_REMINDER);
 assert.ok(reminder,'19:00 must create a real reminder');
 assert.equal(reminder.done,false);
 assert.equal(reminderDestination(s,reminder).link.route,'/chat/fulongsheng');
 assert.match(reminderWidget(s),/給傅隆生發信息/);
 const store={get:()=>s,update:fn=>fn(s)},opened=[];
 assert.equal(toggleReminder(store,reminder.id),false,'must not bypass scripted Send');
 assert.equal(openReminderTask(reminder.id,{store,router:{open:route=>opened.push(route)},toast:()=>{}}),true);
 assert.equal(opened.at(-1).route,'/chat/fulongsheng');
 assert.equal(currentScript55(s,'wechat','fulongsheng')?.text,D54_FATHER_LINES[0][1]);
 play(s,D54_FATHER,D54_FATHER_LINES,'wechat','fulongsheng');
 assert.equal(s.content.reminders.find(r=>r.id===D54_FATHER_REMINDER).done,true);
 s.day=55;s.clock='09:00';
 assert.equal(nodeStatus(s,'ending').state,'locked','D55 ending waits until 22:46');
 s.clock='22:46';
 assert.equal(nodeStatus(s,'ending').state,'ready');
});

test('D54 keeps Tai online at every hour, including his normal London sleep window',()=>{
 for(const clock of ['00:10','08:39','12:00','19:00','23:55']){
  const s=fixture(clock);
  assert.equal(story55Presence(s).status,'online',clock);
  assert.equal(taiPresence(s).contactable,true,clock);
  assert.equal(taiPresence(s).status,'online',clock);
  assert.equal(taiLife(s).status,'online',clock);
 }
});

test('19:00 father reminder arrives on time even if the NoApp chat is unfinished',()=>{
 const s=fixture('08:40');
 play(s,D54_ISOLDE,D54_ISOLDE_LINES,'mirage',D46_CONTACT);
 play(s,D54_GROUP,D54_GROUP_LINES,'wechat','group');
 assert.equal(completed(s,D54_TAI),false);
 s.clock='19:00';
 assert.equal(syncD54FatherReminder(s),true,'the timed task must not depend on finishing the daytime NoApp conversation');
 assert.equal(s.content.reminders.some(r=>r.id===D54_FATHER_REMINDER&&!r.done),true);
 assert.equal(nodeStatus(s,D54_FATHER).state,'ready');
 const store={get:()=>s,update:fn=>fn(s)};
 assert.equal(toggleReminder(store,D54_FATHER_REMINDER),false);
 play(s,D54_FATHER,D54_FATHER_LINES,'wechat','fulongsheng');
 assert.equal(completed(s,D54_TAI),false);
 assert.equal(s.story55.config.nodes.find(n=>n.id==='ending').requires.includes(D54_TAI),true);
});

test('NoApp fixed Send is saved as one authored scene message, not a free AI request',()=>{
 const s=fixture('08:40');
 play(s,D54_ISOLDE,D54_ISOLDE_LINES,'mirage',D46_CONTACT);
 play(s,D54_GROUP,D54_GROUP_LINES,'wechat','group');
 const backInTime=Date.now()-15000;
 advanceScene55(s,D54_TAI,{now:backInTime});
 assert.equal(currentScript55(s,'noapp','tai')?.text,D54_TAI_LINES[1][1]);
 const store={get:()=>s,update:fn=>fn(s)};
 const original=globalThis.FormData;
 globalThis.FormData=class{constructor(f){this.f=f;}get(key){return this.f.fields[key]}};
 try{
  const form={dataset:{form:'send-chat',id:'tai',channel:'noapp'},fields:{text:D54_TAI_LINES[1][1]}};
  noapp.submit(form,{store});
 }finally{globalThis.FormData=original;}
 assert.equal(scene55(s,D54_TAI).index,2);
 const msgs=s.content.conversations.noapp.find(c=>c.id==='tai').messages;
 assert.equal(msgs.filter(m=>m.id==='s55-'+D54_TAI+'-1').length,1);
 assert.equal(msgs.filter(m=>m.from==='me'&&m.text===D54_TAI_LINES[1][1]).length,1);
 assert.equal(msgs.filter(m=>m.from==='me'&&m.text===D54_TAI_LINES[1][1]&&!m.story55).length,0);
});

test('old D55+ saves keep their position without synthetic past messages',()=>{
 const s=fixture('17:00');
 const c=s.story55.config;
 c.nodes=c.nodes.filter(n=>![D54_ISOLDE,D54_GROUP,D54_TAI].includes(n.id));
 delete c.d54Revision;
 s.day=55;s.clock='09:10';
 const authoredD54Messages=()=>Object.values(s.content.conversations).flat().flatMap(c=>c.messages||[]).filter(m=>/^s55-(d54-|ready-)/.test(m.id||''));
 const baseline=authoredD54Messages().length;
 tickStory55(s);
 for(const node of [D54_ISOLDE,D54_GROUP,D54_TAI,D54_FATHER])
  assert.equal(s.story55.completed[node]?.legacySkipped,true,node);
 assert.equal(authoredD54Messages().length,baseline,'no newly generated D54 scene bubbles');
 assert.equal(s.day,55);assert.equal(s.clock,'09:10');
});
