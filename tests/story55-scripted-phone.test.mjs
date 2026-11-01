import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55,scene55,sceneLines} from '../src/services/story55/runtime.js';
import {previewNode55} from '../src/services/story55/controller.js';
import {beginScriptedCall,scriptedCallView} from '../src/services/story55/scripted-phone.js';
test('forced story phone presents accept but never mic, type or hangup',()=>{
 const s=initialState();activateStory55(s);previewNode55(s,'intrusion');
 for(let i=0;i<100&&sceneLines(s,'intrusion')[scene55(s,'intrusion').index]?.[0]!=='call';i++)advanceScene55(s,'intrusion');
 assert.equal(sceneLines(s,'intrusion')[scene55(s,'intrusion').index]?.[0],'call');
 let route;const ctx={store:{get:()=>s,update(fn){fn(s)}},router:{open(x){route=x}},refresh(){}};
 assert.equal(beginScriptedCall(ctx,'intrusion'),true);assert.equal(route.route,'/story-call');
 const html=scriptedCallView(s);assert.match(html,/s55-call-answer/);
 assert.doesNotMatch(html,/tai-hangup|tai-mic|tai-call-turn|composer/);
});

test('interrupted fixed phone keeps a resumable marker in player state',()=>{
 const s=initialState();activateStory55(s);previewNode55(s,'intrusion');
 for(let i=0;i<100&&sceneLines(s,'intrusion')[scene55(s,'intrusion').index]?.[0]!=='call';i++)advanceScene55(s,'intrusion');
 const ctx={store:{get:()=>s,update(fn){fn(s)}},router:{open(){}},refresh(){}};
 beginScriptedCall(ctx,'intrusion');
 assert.deepEqual(s.story55.lockedCall,{node:'intrusion',day:s.day,startIndex:scene55(s,'intrusion').index});
 assert.match(scriptedCallView(s),/s55-call-answer/);
});
