import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,tickQueuedStoryScenes55,scene55,scene55ReplyDelay} from '../src/services/story55/runtime.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {completed,timedStoryPaused,nodeStatus} from '../src/services/story55/state.js';
import {D46_GROUP,D46_GROUP_ID,D46_GROUP_AT} from '../src/story/d46/group.js';

function phone(day=46){
 const s=activateStory55(initialState());s.day=day;s.clock='18:09';
 for(const n of s.story55.config.nodes)if(n.day<day)s.story55.completed[n.id]={day:n.day,clock:'23:00'};
 return s;
}
const log=s=>s.content.conversations.wechat.find(c=>c.id==='group').messages.filter(m=>m.id.startsWith('s55-'+D46_GROUP_ID+'-'));
test('D46 group delivers six authored messages automatically at 18:10, then resumes and retains both daily commissions',()=>{
 const s=phone();tickStory55(s);assert.equal(nodeStatus(s,D46_GROUP_ID).state,'locked');assert.equal(log(s).length,0);
 const blocked=structuredClone(s);blocked.clock=D46_GROUP_AT;delete blocked.story55.completed['d45-wang'];assert.equal(nodeStatus(blocked,D46_GROUP_ID).state,'locked');
 assert.equal(s.content.orders.filter(o=>o.storyDay===46&&o.marketDaily&&o.status==='OPEN').length,2);
 advanceGameMinutes(s,100);assert.equal(s.clock,D46_GROUP_AT);assert.equal(timedStoryPaused(s),true);
 let now=Date.now();tickQueuedStoryScenes55(s,now);
 for(let i=0;i<D46_GROUP.length;i++){
  const q=scene55(s,D46_GROUP_ID);assert.equal(q.index,i);now=q.nextAt;
  const before=s.clock;advanceGameMinutes(s,100);assert.equal(s.clock,before);
  tickQueuedStoryScenes55(s,now);assert.equal(log(s).length,i+1);
 }
 assert.deepEqual(log(s).map(m=>[m.from,m.text]),D46_GROUP);
 assert.equal(log(s)[0].time,D46_GROUP_AT);assert.ok(log(s).every(m=>m.day===46&&m.sentDate==='2025-07-03'));
 assert.deepEqual(log(s).map(m=>m.time),['18:10','18:10','18:11','18:11','18:12','18:12']);assert.equal(s.clock,log(s).at(-1).time);
 assert.ok(scene55ReplyDelay(s,D46_GROUP_ID,3)>scene55ReplyDelay(s,D46_GROUP_ID,2));
 assert.equal(completed(s,D46_GROUP_ID),true);assert.equal(timedStoryPaused(s),false);
 tickStory55(s);tickQueuedStoryScenes55(s,now+60000);assert.equal(log(s).length,6);
});
test('old D46 save gets the scene once; a save already beyond D46 does not replay it',()=>{
 for(const day of [46,47]){
  const s=phone(day);s.story55.config.nodes=s.story55.config.nodes.filter(n=>n.id!==D46_GROUP_ID);delete s.story55.config.scenes[D46_GROUP_ID];delete s.story55.completed[D46_GROUP_ID];
  tickStory55(s);tickStory55(s);assert.equal(s.story55.config.nodes.filter(n=>n.id===D46_GROUP_ID).length,1);
  assert.equal(completed(s,D46_GROUP_ID),day>46);assert.equal(log(s).length,0);
 }
});
