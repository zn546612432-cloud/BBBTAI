import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {isNoAppV3Review,prepareNoAppV3Review} from '../src/apps/noapp/preview-v3.js';
import {isNoAppV2Review} from '../src/apps/noapp/preview-v2.js';
import {taiRecognized} from '../src/services/story55/state.js';

test('V3 demo entry is opt-in and cannot appear on production or V2 review',()=>{
 assert.equal(isNoAppV3Review('/BBBTAI/','?panel=noapp-v3',true),false);
 assert.equal(isNoAppV3Review('/BBBTAI/review/noapp-v2-20261103/','?panel=noapp-v3',true),false);
 assert.equal(isNoAppV3Review('/BBBTAI/review/noapp-v3-20261103/','?panel=noapp-v2',true),false);
 assert.equal(isNoAppV3Review('/BBBTAI/review/noapp-v3-20261103/','?panel=noapp-v3',false),false);
 assert.equal(isNoAppV3Review('/BBBTAI/review/noapp-v3-20261103/','?panel=noapp-v3',true),true);
 assert.equal(isNoAppV2Review('/BBBTAI/review/noapp-v3-20261103/','?panel=noapp-v3',true),false);
});
test('V3 demo opens already recognized call-ready chat and does not reset later progress',()=>{
 const s=activateStory55(initialState());
 assert.equal(prepareNoAppV3Review(s),true);
 assert.equal(s.day,37);assert.equal(taiRecognized(s),true);
 assert.equal(s.unlocked,true);assert.equal(s.nav.current.appId,'noapp');
 assert.equal(s.nav.current.route,'/chat/tai');
 s.day=38;
 assert.equal(prepareNoAppV3Review(s),true);assert.equal(s.day,38);
 assert.equal(s.events.filter(x=>x.type==='noapp_v3_review_ready').length,1);
});
