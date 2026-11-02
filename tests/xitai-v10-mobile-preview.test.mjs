import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {taiRecognized} from '../src/services/story55/state.js';
import {isTaiV10MobilePreview,prepareTaiV10MobilePreview} from '../src/services/ai/v10-mobile-preview.js';

test('v10 shortcut only activates within exact isolated review path with opt-in',()=>{
 assert.equal(isTaiV10MobilePreview('/BBBTAI/review/xitai-v10-20261102/','?panel=tai-v10',true),true);
 assert.equal(isTaiV10MobilePreview('/BBBTAI/','?panel=tai-v10',true),false);
 assert.equal(isTaiV10MobilePreview('/BBBTAI/review/xitai-v10-20261102/','',true),false);
 assert.equal(isTaiV10MobilePreview('/BBBTAI/review/xitai-v10-20261102/','?panel=tai-v10',false),false);
 assert.equal(isTaiV10MobilePreview('/BBBTAI/review/xitai-phone-20261102/','?panel=tai-v10',true),false);
});
test('mobile preview jumps only once and keeps NoApp real game content',()=>{
 const s=activateStory55(initialState());
 const original=JSON.stringify(s.content.conversations.wechat);
 assert.equal(taiRecognized(s),false);
 assert.equal(prepareTaiV10MobilePreview(s),true);
 assert.equal(s.day,37);
 assert.equal(s.clock,'20:00');
 assert.equal(taiRecognized(s),true);
 assert.equal(s.story55.noappInstalled,true);
 assert.equal(s.nav.current.appId,'noapp');
 assert.equal(s.nav.current.route,'/chat/tai');
 assert.equal(s.unlocked,true);
 assert.equal(s.story55.completed.recognition.test,true);
 assert.equal(JSON.stringify(s.content.conversations.wechat),original);
 const count=s.events.length;
 s.day=38;s.clock='21:45';
 prepareTaiV10MobilePreview(s);
 assert.equal(s.events.length,count);
 assert.equal(s.day,38);
 assert.equal(s.clock,'21:45');
});
test('does not bootstrap legacy/non-story state',()=>{
 const s=initialState();
 assert.equal(prepareTaiV10MobilePreview(s),false);
 assert.equal(s.day,56);
});
