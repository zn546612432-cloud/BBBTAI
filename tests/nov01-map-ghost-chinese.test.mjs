import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {story55Map,selectStory55Pin} from '../src/apps/maps/features/story55/index.js';
import {render as ghostRender} from '../src/apps/ghost/index.js';
test('map pin selection works as local UI, not a navigation and clock change',()=>{
 const s=initialState();activateStory55(s);
 s.story55.completed.uk=true;
 const html=story55Map(s,{params:{area:'WORLD'}});
 assert.match(html,/data-map-area="WORLD"/);
 assert.match(html,/data-map-detail=/);
 assert.match(html,/s55-map-placeholder/);
 assert.equal(selectStory55Pin(null),false);
});
test('GHOST descriptions are Chinese and include instructions for puzzles',()=>{
 const s=initialState();activateStory55(s);
 const html=ghostRender({store:{get:()=>s},refresh(){}},{appId:'ghost',route:'/',params:{}});
 assert.match(html,/工具程序/);
 assert.match(html,/拼图：交换方块/);
 assert.doesNotMatch(html,/PRIVATE TOOL LIBRARY|ACTION AUTHORIZATION/);
});
