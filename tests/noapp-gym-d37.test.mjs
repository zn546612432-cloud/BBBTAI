import test from 'node:test';
import assert from 'node:assert/strict';
import {GYM_SCENE,GYM_SCENE_ID,startGymScene} from '../src/story/d34-d42/gym-chat.js';
import {taiPlotMemory} from '../src/services/ai/worldbook/plot-memory.js';
const state=()=>({day:37,clock:'19:30',story55:{version:1,completed:{recognition:true},scenes:{}}});
const message=(text='你在幹嘛')=>({id:'player-1',from:'me',kind:'text',text});
const online={contactable:true,status:'online'};
test('gym scene opens once only on the player question, with native scheduler at the next line',()=>{
 const s=state(),m=message();
 assert.equal(startGymScene(s,m,online,1000),true);
 assert.deepEqual(s.story55.scenes[GYM_SCENE_ID],{index:1,accepted:false,triggerMessageId:'player-1',nextAt:2600});
 assert.equal(startGymScene(s,message(),online),false);
 assert.equal(m.taiHandledAction,'gym_scene');
 assert.equal(GYM_SCENE.lines[14][1],'那可由不得你');
 assert.equal(GYM_SCENE.lines[9][1],'65kg啊');
});
test('no trigger before D37, after the window, while offline, or for unrelated text',()=>{
 for(const change of [{day:36},{day:41},{clock:'19:29'},{clock:'20:30'}])assert.equal(startGymScene({...state(),...change},message(),online),false);
 assert.equal(startGymScene(state(),message(),{contactable:false,status:'offline'}),false);
 assert.equal(startGymScene(state(),message('你在英國嗎'),online),false);
 assert.equal(startGymScene(state(),message('你在干嘛呢'),online),true);
});
test('worldbook remembers the weight only once the real message was sent',()=>{
 const s=state();
 assert.doesNotMatch(taiPlotMemory(s,[]),/65kg/);
 const m={id:'s55-d37-noapp-gym-9',day:37,from:'me',kind:'text',text:'65kg啊'};
 assert.match(taiPlotMemory(s,[m]),/65kg/);
 assert.doesNotMatch(taiPlotMemory(s,[{...m,actual:false}]),/65kg/);
});
