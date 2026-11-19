import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,nodeLink55,tickStory55} from '../src/services/story55/runtime.js';
import {completed} from '../src/services/story55/state.js';
import {ghostCarTasks,ghostCarProgress,syncGhostCarProgress} from '../src/services/story55/ghost-car.js';
import {deploymentPercent,authorizeProject,completeDeploymentRun} from '../src/services/story55/projects.js';
import {syncTearReminders} from '../src/apps/ghost/deployment/reminders.js';
import {render,handle} from '../src/apps/reminders/index.js';
import {reminderWidget} from '../src/system/shell.js';
import {archiveFile} from '../src/apps/files/features/local-library/story-archives.js';
import {sendAgent,tickTearAgent,DOCUMENT_READ_MS} from '../src/apps/ghost/deployment/tear-agent/state.js';
import {GHOST_CAR_MODEL_FILES} from '../src/story/d35-d40/progress.js';
import {chatView} from '../src/components/chat.js';
import {handle as noappHandle} from '../src/apps/noapp/index.js';
const fixture=()=>activateStory55(initialState());
const stamp=(s,id)=>s.story55.completed[id]={day:s.day,clock:s.clock};
const sync=s=>{syncGhostCarProgress(s);syncTearReminders(s);};
const record=s=>s.content.reminders.find(r=>r.id==='ghost-car-plan');
test('checklist appears after the plan, migrates old rows and uses only the game day for routine preparation',()=>{
 const s=fixture();s.day=34;sync(s);assert.equal(record(s),undefined);
 stamp(s,'plan');s.content.reminders.push({id:'ghost-car-plan',title:'鬼車行動',storyProject:true,children:[{title:'old'}]});
 for(const [day,percent] of [[34,0],[35,30],[36,40],[37,50],[38,70],[39,70],[40,70]]){
  s.day=day;sync(s);sync(s);assert.equal(record(s).progress,percent);assert.equal(deploymentPercent(s,'prep'),percent);
  assert.equal(record(s).children.length,10);assert.equal(s.content.reminders.filter(r=>r.id==='ghost-car-plan').length,1);
 }
 assert.equal(completed(s,'prep'),false);assert.throws(()=>authorizeProject(s,'prep','GHOST-CAR-29'));
 assert.equal(completeDeploymentRun(s,{story55Project:'prep',status:'success'}),false);
 assert.equal(nodeLink55(s,'prep').route,'/project/ghost-car-plan');
 const routes=[],ctx={store:{get:()=>s,update:fn=>fn(s)},router:{open:loc=>routes.push(loc)}};
 assert.match(render(ctx,{route:'/'}),/reminder-project-open/);assert.match(render(ctx,{route:'/project/ghost-car-plan'}),/aria-valuenow="70"/);
 assert.match(reminderWidget(s),/home-reminder-project/);handle('reminder-project-open',{dataset:{id:'ghost-car-plan'}},ctx);
 assert.equal(routes[0].route,'/project/ghost-car-plan');
});
test('D39 files from TAI contact, actual user parsing, D40 final report, no replay on reload',async t=>{
 let now=50000;t.mock.method(Date,'now',()=>now);
 const s=fixture();s.day=38;stamp(s,'plan');stamp(s,'recognition');sync(s);
 for(const f of GHOST_CAR_MODEL_FILES)assert.equal(archiveFile(s,f.id),null);
 s.day=39;sync(s);sync(s);
 const c=s.content.conversations.noapp.find(c=>c.id==='tai');
 for(const f of GHOST_CAR_MODEL_FILES){assert.equal(c.messages.filter(m=>m.id===f.messageId).length,1);assert.equal(c.messages.find(m=>m.id===f.messageId).from,'tai');assert.ok(archiveFile(s,f.id));}
 assert.match(chatView(s,'noapp','tai'),/tai-story-archive/);
 const routes=[],ctx={store:{get:()=>s},router:{open:loc=>routes.push(loc)}};
 await noappHandle('tai-story-archive',{dataset:{id:GHOST_CAR_MODEL_FILES[0].id}},ctx);assert.equal(routes[0].appId,'files');
 for(const [index,f] of GHOST_CAR_MODEL_FILES.entries()){
  sendAgent(s,'',f.id);sync(s);assert.equal(ghostCarProgress(s),70+10*index);now+=DOCUMENT_READ_MS;tickTearAgent(s);sync(s);assert.equal(ghostCarProgress(s),80+10*index);
 }
 assert.equal(completed(s,'prep'),false);assert.equal(archiveFile(s,'story-archive-validation'),null);
 s.day=40;sync(s);assert.equal(ghostCarProgress(s),100);assert.ok(completed(s,'prep'));assert.ok(record(s).done);
 assert.ok(archiveFile(s,'story-archive-validation'));const saved=JSON.parse(JSON.stringify(s));sync(saved);
 assert.equal(ghostCarProgress(saved),100);assert.equal(saved.events.filter(e=>e.type==='story55_node_completed'&&e.id==='prep').length,1);
});
test('old completed prep remains completed instead of asking players to redo it',()=>{
 const s=fixture();s.day=40;stamp(s,'plan');stamp(s,'prep');sync(s);
 assert.equal(ghostCarProgress(s),100);assert.ok(ghostCarTasks(s).every(t=>t.done));assert.ok(archiveFile(s,'story-archive-validation'));
});
