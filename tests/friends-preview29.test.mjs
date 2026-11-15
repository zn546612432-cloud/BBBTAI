import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,KEY} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {story55Config} from '../src/services/story55/state.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {plugIn} from '../src/system/power/battery.js';
import {powerFullscreen} from '../src/system/power/controls.js';
import {phoneRuntimePaused} from '../src/system/runtime/controller.js';
import {registry} from '../src/system/registry.js';
import {settingsHome} from '../src/apps/settings/features/home/index.js';
const day29=(done=false)=>{
 const s=activateStory55(initialState());
 s.day=29;s.clock='23:58';s.powerMode='idle';s.batteryPercent=30;
 for(const n of story55Config(s).nodes)if(n.day<29||done&&n.day===29)s.story55.completed[n.id]={day:n.day,clock:'22:00'};
 return s;
};
test('unfinished D29 holds at 03:00; finishing the plan then closes without D30',()=>{
 const s=day29();
 advanceGameMinutes(s,240);
 assert.equal(s.day,29);assert.equal(s.clock,'03:00');assert.equal(s.story55.friendsPreviewEnded,undefined);
 assert.equal(plugIn(s),false);
 s.story55.completed.plan={day:29,clock:'03:00'};
 for(const n of story55Config(s).nodes)if(n.day===29)s.story55.completed[n.id]={day:29,clock:'03:00'};
 advanceGameMinutes(s,1);
 assert.equal(s.day,29);assert.equal(s.story55.friendsPreviewEnded,true);
 assert.match(powerFullscreen(s),/本次試玩到這裡/);assert.equal(phoneRuntimePaused(s),true);
 advanceGameMinutes(s,1440);assert.equal(s.day,29);
});
test('D29 long charge ends only after the required scene; settings and registry contain no developer entry',()=>{
 const s=day29(true);
 assert.equal(plugIn(s),true);assert.equal(s.day,29);assert.equal(s.story55.friendsPreviewEnded,true);
 assert.equal(registry.has('editor'),false);assert.doesNotMatch(settingsHome(s),/开发者模式|data-route="editor"/);
 assert.equal(KEY,'ximeng-phone-friends-d29-v1');
});
