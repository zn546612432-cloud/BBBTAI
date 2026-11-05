import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {story55MinutesPerSecond,setStory55MinutesPerSecond,worldMinuteRate,tickWorld,STORY55_SPEED_DEFAULT} from '../src/system/time/clock.js';
import {story55Editor} from '../src/apps/developer/features/story55/index.js';
import {change as developerChange,input as developerInput,handle as developerHandle} from '../src/apps/developer/index.js';

const start=()=>activateStory55(initialState());
test('D03 slider UI is a real mobile range control with default 5 minutes per second',()=>{
 const s=start();
 const html=story55Editor(s);
 assert.match(html,/data-s55-clock-speed/);
 assert.match(html,/type="range"/);
 assert.match(html,/min="0" max="10" step="0.5"/);
 assert.match(html,/value="5" aria-label="遊戲時間流速"/);
 assert.match(html,/5 分鐘／秒/);
 assert.match(html,/s55-speed-default/);
});
test('speed slider readout changes without persisting until release',()=>{
 const s=start(),out={textContent:''};
 const t={value:'7.5',dataset:{s55ClockSpeed:''},closest:()=>({querySelector:()=>out}),setAttribute(){}};
 const ctx={store:{get:()=>s,update:fn=>fn(s)}};
 developerInput(t,ctx);
 assert.equal(out.textContent,'7.5 分鐘／秒');
 assert.equal(story55MinutesPerSecond(s),STORY55_SPEED_DEFAULT);
 developerChange(t,ctx);
 assert.equal(story55MinutesPerSecond(s),7.5);
 assert.equal(worldMinuteRate(s),0.0075);
 tickWorld(s,2000);
 assert.equal(s.clock,'08:15');
});
test('speed persists across save/reload, clamps unsafe values, and zero pauses gameplay clock',()=>{
 const s=start();
 assert.equal(setStory55MinutesPerSecond(s,'not-a-number'),false);
 assert.equal(setStory55MinutesPerSecond(s,18),true);
 assert.equal(story55MinutesPerSecond(s),10);
 assert.equal(setStory55MinutesPerSecond(s,0),true);
 assert.equal(tickWorld(s,60_000).minutes,0);
 assert.equal(s.clock,'08:00');
 const restored=JSON.parse(JSON.stringify(s));
 assert.equal(story55MinutesPerSecond(restored),0);
 assert.equal(setStory55MinutesPerSecond(restored,0.5),true);
 tickWorld(restored,2000);
 assert.equal(restored.clock,'08:01');
});
test('private/typing time rates remain slow and the reset button restores 5',()=>{
 const s=start();
 setStory55MinutesPerSecond(s,9);
 assert.equal(worldMinuteRate(s,{taiChat:true}),2/60000);
 assert.equal(worldMinuteRate(s,{focused:true}),2/60000);
 let message='';
 developerHandle('s55-speed-default',{dataset:{}},{
  store:{get:()=>s,update:fn=>fn(s)},toast:t=>{message=t;},router:{}
 });
 assert.equal(story55MinutesPerSecond(s),5);
 assert.match(message,/5 分鐘/);
});
test('invalid or missing saved options fall back safely to 5',()=>{
 const s=start();
 assert.equal(story55MinutesPerSecond(s),5);
 s.story55.minutesPerSecond='999';
 assert.equal(story55MinutesPerSecond(s),5);
 s.story55.minutesPerSecond=NaN;
 assert.equal(story55MinutesPerSecond(s),5);
});

test('developer new-run reset preserves the selected clock speed without preserving plot progress',()=>{
 const s=start();
 setStory55MinutesPerSecond(s,6.5);
 s.day=3;s.clock='14:20';s.story55.completed.fake={day:3};
 activateStory55(s);
 assert.equal(s.day,1);
 assert.equal(s.clock,'08:00');
 assert.equal(story55MinutesPerSecond(s),6.5);
 assert.equal(s.story55.completed.fake,undefined);
});
