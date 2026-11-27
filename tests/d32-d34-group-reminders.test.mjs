import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55,scene55,sceneLines,tickStory55} from '../src/services/story55/runtime.js';
import {nodeStatus,completed} from '../src/services/story55/state.js';
import {sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {mainlineTasks} from '../src/apps/reminders/features/mainline/model.js';
import {openReminderTask} from '../src/apps/reminders/index.js';
import {brotherPublicMemory} from '../src/services/ai/worldbook/brother-public-memory.js';
import {indexAuthoredPresetKnowledge} from '../src/services/ai/worldbook/preset-knowledge.js';
import {D32_D34_GROUP_SCENES} from '../src/story/d32-d34/group.js';
const rows=[
 ['d32-group-plan',32,'15:31','15:32','回群裡確認計劃',11],
 ['d33-group-truck',33,'18:41','18:42','回群裡確認設備搬運',13],
 ['d34-group-rehearsal',34,'19:27','19:28','回群裡確認明日演練',20]
];
function fixture(day,clock){
 const s=activateStory55(initialState());s.day=day;s.clock=clock;s.story55.activeScene=null;
 for(const n of s.story55.config.nodes)if(n.day<day&&!n.optional)s.story55.completed[n.id]={day:n.day,clock:n.at||'23:00'};
 s.story55.completed.plan={day:29,clock:'22:00'};
 delete s.story55.completed.recognition;
 return s;
}
const find=(s,id)=>mainlineTasks(s).find(t=>t.id==='mainline:'+id);
for(const [id,day,before,at,title,count] of rows)test(id+' follows native timed group and reminder lifecycle',()=>{
 const s=fixture(day,before);
 assert.equal(nodeStatus(s,id).state,'locked');assert.equal(find(s,id),undefined);
 const n=s.story55.config.nodes.find(n=>n.id===id);
 assert.equal(n.optional,true);assert.equal(n.throughDay,day);assert.equal(n.gateDay,undefined);
 assert.equal(n.pauseTimeUntilComplete,undefined);
 assert.deepEqual(sceneLines(s,id),D32_D34_GROUP_SCENES.find(x=>x.id===id).lines);
 assert.equal(sceneLines(s,id).length,count);
 assert.ok(sceneLines(s,id).every(([,text])=>text.trim()&&!/大哥|二哥|三哥|四哥/.test(text)));
 s.clock=at;
 assert.equal(nodeStatus(s,id).state,'ready');
 const item=find(s,id);assert.equal(item.title,title);assert.equal(item.done,false);
 assert.deepEqual(item.link,{appId:'wechat',route:'/chat/group',params:{node:id}});
 const links=[],store={get:()=>s,update:fn=>fn(s)};
 assert.equal(openReminderTask(item.id,{store,router:{open:link=>links.push(link)}}),true);
 assert.deepEqual(links,[item.link]);assert.equal(completed(s,id),false);
 let now=Date.now();
 for(let i=0;i<count;i++){
  const [who,text]=sceneLines(s,id)[scene55(s,id).index];
  if(who==='me')sendScriptedDraft55(s,'wechat','group',text,now+=10000);
  else advanceScene55(s,id,{now:now+=10000});
 }
 assert.equal(completed(s,id),true);assert.equal(find(s,id).done,true);
 const chat=s.content.conversations.wechat.find(c=>c.id==='group');
 assert.equal(chat.messages.filter(m=>m.id.startsWith('s55-'+id+'-')).length,count);
 s.day=day+1;s.clock='08:00';assert.equal(find(s,id),undefined);
});
test('old saves acquire the three optional scenes idempotently without changing current day or auto-completing',()=>{
 const s=fixture(33,'18:42'),ids=new Set(rows.map(r=>r[0]));
 s.story55.config.nodes=s.story55.config.nodes.filter(n=>!ids.has(n.id));
 for(const id of ids)delete s.story55.config.scenes[id];
 tickStory55(s);tickStory55(s);
 for(const id of ids)assert.equal(s.story55.config.nodes.filter(n=>n.id===id).length,1);
 assert.equal(s.day,33);assert.equal(completed(s,'d33-group-truck'),false);
 assert.equal(nodeStatus(s,'d32-group-plan').state,'locked');
});
test('worldbook indexes approved scenes but public recall requires actual delivery',()=>{
 const s=fixture(33,'18:42'),id='d33-group-truck';
 const entries=indexAuthoredPresetKnowledge(s.story55.config).filter(e=>e.sceneId===id);
 assert.equal(entries.length,13);
 assert.equal(brotherPublicMemory(s,'車裡的設備').some(e=>e.id==='s55-'+id+'-0'),false);
 advanceScene55(s,id);
 assert.equal(brotherPublicMemory(s,'車裡的設備').some(e=>e.id==='s55-'+id+'-0'),true);
});
