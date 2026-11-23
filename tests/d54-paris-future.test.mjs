import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55,scene55,tickStory55,tickQueuedStoryScenes55} from '../src/services/story55/runtime.js';
import {nodeStatus,story55ChargeGate} from '../src/services/story55/state.js';
import {currentScript55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {taiCanonicalMilestones} from '../src/services/ai/worldbook/plot-memory.js';
import {taiRelationshipDirector} from '../src/services/ai/relationship-director.js';
import {D54_PARIS_FUTURE,D54_PARIS_FUTURE_LINES,applyD54ParisFuture} from '../src/story/d54/paris-future.js';
import {D54_TAI} from '../src/story/d54/definition.js';

const promise='所以別讓我失望，熙蒙。我們巴黎見。';
function setup({reciprocal=true,paris=true,day=54,completeD54=true}={}){
 const s=activateStory55(initialState());
 s.day=day;s.clock='20:30';
 s.story55.completed.recognition={day:33,clock:'08:00'};
 if(completeD54)s.story55.completed[D54_TAI]={day:54,clock:'18:00'};
 s.aiDraft??={};
 s.aiDraft.taiBond={score:92,meaningfulTurns:50,signals:{affection:10}};
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');
 if(paris)chat.messages.push({id:'s55-d43-paris-15',day:43,from:'tai',text:promise,kind:'text',actual:true});
 if(reciprocal)for(const d of [49,50,51]){
  chat.messages.push({id:'tai-romance-me-'+d,day:d,from:'me',text:'我喜歡你',kind:'text',actual:true});
  chat.messages.push({id:'tai-romance-tai-'+d,day:d,from:'tai',text:'我也喜歡你',kind:'text',actual:true});
 }
 tickStory55(s);
 return {s,chat};
}

test('scene 05 preserves all 32 approved lines with exactly one verbatim ending',()=>{
 assert.equal(D54_PARIS_FUTURE_LINES.length,32);
 assert.deepEqual(D54_PARIS_FUTURE_LINES.slice(0,4),[
  ['tai','我問你件事。'],['me','問。'],
  ['tai','如果真的見面了，你第一件事想做什麼？'],['me','看你長什麼樣。']
 ]);
 assert.deepEqual(D54_PARIS_FUTURE_LINES.slice(-4),[
  ['tai','那就多待幾天。'],['me','要是一直不走呢？'],
  ['tai','……'],['tai','你先來再說。']
 ]);
 assert.equal(D54_PARIS_FUTURE_LINES.find(l=>l[1].includes('去埃及的機票。'))?.[0],'tai');
 assert.equal(D54_PARIS_FUTURE_LINES.find(l=>l[1].includes('……我就想見見你。'))?.[0],'tai');
});

test('real D43 Paris promise uses current s55-d43-paris ID and legacy ID remains accepted',()=>{
 const {s,chat}=setup();
 assert.equal(taiCanonicalMilestones(s).find(m=>m.id==='story55-paris-promise')?.sourceId,'s55-d43-paris-15');
 chat.messages.find(m=>m.id==='s55-d43-paris-15').id='s55-paris-15';
 assert.equal(taiCanonicalMilestones(s).find(m=>m.id==='story55-paris-promise')?.sourceId,'s55-paris-15');
 chat.messages.find(m=>m.id==='s55-paris-15').actual=false;
 assert.equal(taiCanonicalMilestones(s).some(m=>m.id==='story55-paris-promise'),false);
});
test('R5 or R6 plus actually delivered D43 promise and completed D54 chat unlock this optional episode',()=>{
 const {s}=setup();
 assert(taiRelationshipDirector(s).stage>=5);
 assert.equal(nodeStatus(s,D54_PARIS_FUTURE).state,'ready');
 const n=s.story55.config.nodes.find(x=>x.id===D54_PARIS_FUTURE);
 assert.equal(n.optional,true);
 assert.equal(n.pauseTimeUntilComplete,false);
 assert.equal(n.gateDay,undefined);
 assert.equal(n.at,undefined,'no invented hour');
});
test('high bond alone never unlocks a romantic plot',()=>{
 const {s}=setup({reciprocal:false});
 assert.equal(nodeStatus(s,D54_PARIS_FUTURE).state,'locked');
 assert.equal(taiRelationshipDirector(s).canDeclareLove,false);
});
test('undelivered Paris reference, unmet D54 prerequisite, day 55 and explicit rejection all stop the scene',()=>{
 const missing=setup({paris:false});
 assert.equal(nodeStatus(missing.s,D54_PARIS_FUTURE).state,'locked');
 const before=setup({completeD54:false});
 assert.equal(nodeStatus(before.s,D54_PARIS_FUTURE).state,'locked');
 const after=setup({day:55});
 assert.equal(nodeStatus(after.s,D54_PARIS_FUTURE).state,'locked');
 const rejected=setup();
 rejected.chat.messages.push({id:'rejected',day:54,from:'me',text:'我不喜歡你',kind:'text',actual:true});
 assert.equal(nodeStatus(rejected.s,D54_PARIS_FUTURE).state,'locked');
});
test('queued NPC speaks in real NoApp; player lines still require their own native Send',()=>{
 const {s,chat}=setup();
 // This isolated fixture has not played the other 54 days. Mark their
 // earlier queued scenes done so the single shared scheduler can reach
 // the optional R5 bonus without changing its real production priority.
 for(const node of s.story55.config.nodes){
  if(node.kind==='scene'&&node.day<=54&&node.id!==D54_PARIS_FUTURE)
   s.story55.completed[node.id]??={day:node.day,clock:'19:00'};
 }
 s.story55.activeScene=null;
 // tickStory55() may have armed the initial reply with the real wall clock.
 // This test supplies a deterministic fake "now", so reset only that timer.
 if(s.story55.scenes[D54_PARIS_FUTURE])delete s.story55.scenes[D54_PARIS_FUTURE].nextAt;
 const initial=chat.messages.length;
 const now=10000;
 // The first tick sets the normal delivery deadline; it never sends every line at once.
 assert.equal(tickQueuedStoryScenes55(s,now),true);
 assert.equal(chat.messages.length,initial);
 assert.equal(tickQueuedStoryScenes55(s,now+30000),true);
 assert.equal(chat.messages.at(-1).text,'我問你件事。');
 assert.equal(chat.messages.at(-1).from,'tai');
 assert.equal(scene55(s,D54_PARIS_FUTURE).index,1);
 const draft=currentScript55(s,'noapp','tai');
 assert.equal(draft?.id,D54_PARIS_FUTURE);
 assert.equal(draft?.text,'問。');
 assert.equal(draft?.kind,'me');
 assert.equal(tickQueuedStoryScenes55(s,now+60000),false,'NPC timer must not fabricate a player reply');
 sendScriptedDraft55(s,'noapp','tai','問。',now+60000);
 assert.equal(scene55(s,D54_PARIS_FUTURE).index,2);
 assert.equal(chat.messages.at(-1).from,'me');
 assert.equal(chat.messages.at(-1).text,'問。');
 assert.equal(chat.messages.at(-1).id,'s55-d54-paris-future-1');
});
test('optional episode is not an overnight charge gate and install is idempotent',()=>{
 const {s}=setup();
 const a=s.story55.config.scenes[D54_PARIS_FUTURE];
 const content=a.map(x=>x.join('|')).join('\n');
 assert.equal(applyD54ParisFuture(s.story55.config),false);
 assert.equal(s.story55.config.scenes[D54_PARIS_FUTURE].map(x=>x.join('|')).join('\n'),content);
 // All other older mandatory chapters still apply their own gates;
 // the bonus itself must not be classified as a mandatory gate.
 const n=s.story55.config.nodes.find(x=>x.id===D54_PARIS_FUTURE);
 assert.equal(n.gateDay,undefined);
 assert.equal(n.holdAt03,undefined);
 assert.equal(n.optional,true);
});
