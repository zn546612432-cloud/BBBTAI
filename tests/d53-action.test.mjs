import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55,scene55,sceneLines} from '../src/services/story55/runtime.js';
import {nodeStatus,completed,pendingTimedStoryEvent} from '../src/services/story55/state.js';
import {sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {D53_ACTION_START,D53_ACTION_END,D53_START_LINES,D53_END_LINES} from '../src/story/d53/definition.js';
import {D53_CALL} from '../src/story/d53/call.js';
import {applyD47Definition} from '../src/story/d47/definition.js';
import {allMoments} from '../src/apps/wechat/features/moments/model.js';

test('D47 removes old relative date and German post without touching the remaining dialogue',()=>{
 const s=activateStory55(initialState());
 assert.equal(sceneLines(s,'d47-wang')[4][1],'你去暗殺黃德忠……');
 assert.equal(allMoments(s).some(m=>m.id==='xs-d47'),false);
 const c=s.story55.config;c.d47Revision=1;c.scenes['d47-wang'][4][1]='明天晚上，你去暗殺黃德忠。';
 assert.equal(applyD47Definition(c),false);
 assert.equal(c.scenes['d47-wang'][4][1],'你去暗殺黃德忠……');
});

test('D53 advances through native Send, the original phone checkpoint, then the outcome',()=>{
 const s=activateStory55(initialState());s.day=53;s.clock='19:59';s.story55.activeScene=null;
 for(const n of s.story55.config.nodes)if(n.day<53)s.story55.completed[n.id]={day:n.day,clock:'23:00'};
 assert.equal(nodeStatus(s,D53_ACTION_START).state,'locked');
 advanceGameMinutes(s,60);assert.equal(s.clock,'20:00');
 assert.equal(pendingTimedStoryEvent(s).id,D53_ACTION_START);
 const finish=(id,lines)=>{
  for(const [who,text] of lines){
   assert.equal(sceneLines(s,id)[scene55(s,id).index][1],text);
   if(who==='me')sendScriptedDraft55(s,'wechat','wang',text,scene55(s,id).nextAt??Date.now());
   else advanceScene55(s,id);
  }
  assert.equal(completed(s,id),true);
 };
 finish(D53_ACTION_START,D53_START_LINES);
 advanceGameMinutes(s,180);assert.equal(s.clock,'21:30');
 assert.equal(pendingTimedStoryEvent(s).id,D53_CALL.id);
 s.story55.scriptedCallCompleted={[D53_CALL.id]:true};
 advanceGameMinutes(s,180);assert.equal(s.clock,'23:00');
 assert.equal(nodeStatus(s,D53_ACTION_END).state,'ready');
 finish(D53_ACTION_END,D53_END_LINES);
 assert.equal(pendingTimedStoryEvent(s),null);
});
