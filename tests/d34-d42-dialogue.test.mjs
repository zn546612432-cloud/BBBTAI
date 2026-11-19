import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55,scene55,sceneLines,tickStory55} from '../src/services/story55/runtime.js';
import {nodeStatus,completed,date55,story55ChargeGate} from '../src/services/story55/state.js';
import {rebuildStory55AtDay} from '../src/services/story55/rebuild.js';
import {sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {visibleMessages} from '../src/services/messaging/delivery.js';
import {D42_CALL,RETIRED_SCENES} from '../src/story/d34-d42/definition.js';
import {d42CallDue,playScriptedCallSequence} from '../src/apps/noapp/voice-call.js';

function phone(day,clock){const s=initialState();activateStory55(s);rebuildStory55AtDay(s,day,clock);return s;}
function finish(s,id,chat){while(!completed(s,id)){
 const next=sceneLines(s,id)[scene55(s,id).index];
 if(next[0]==='me')sendScriptedDraft55(s,'wechat',chat,next[1]);
 else advanceScene55(s,id);
}}
test('D34 is recognition-dependent, optional and expires; D39 requires actual delivery',()=>{
 const s=phone(34,'14:00');
 delete s.story55.completed.recognition;
 assert.equal(nodeStatus(s,'d34-wang').state,'locked');
 s.day=37;s.story55.completed.recognition={day:37,clock:'14:00'};
 assert.equal(nodeStatus(s,'d34-wang').state,'ready');
 advanceScene55(s,'d34-wang');assert.equal(s.story55.activeScene,null);
 s.day=39;s.clock='16:48';assert.equal(nodeStatus(s,'d34-wang').state,'locked');
 assert.equal(nodeStatus(s,'d39-wang').state,'locked');
 tickStory55(s);assert.equal(nodeStatus(s,'d39-wang').state,'ready');
 assert.equal(s.story55.config.nodes.some(n=>n.day===40&&n.channel==='wechat'),false);
});
test('D41 23:30 and next calendar day 02:00 use native send and shared overnight clock',()=>{
 const s=phone(41,'23:29'),group=s.content.conversations.wechat.find(c=>c.id==='group');
 assert.equal(nodeStatus(s,'d41-opening').state,'locked');
 assert.equal(nodeStatus(s,'show').state,'locked');
 advanceGameMinutes(s,1);assert.equal(s.clock,'23:30');
 finish(s,'d41-opening','group');
 assert.equal(group.messages.find(m=>m.id==='s55-d41-opening-0').time,'23:30');
 assert.equal(nodeStatus(s,'show').state,'locked');
 advanceGameMinutes(s,149);assert.equal(s.day,41);assert.equal(s.clock,'01:59');
 assert.equal(nodeStatus(s,'show').state,'locked');
 advanceGameMinutes(s,1);assert.equal(nodeStatus(s,'show').state,'ready');
 finish(s,'show','group');
 const messages=visibleMessages(group,s).filter(m=>m.id.startsWith('s55-d42-celebration-'));
 assert.equal(messages.length,9);assert.equal(messages[0].time,'02:00');assert.equal(messages[0].sentDate,date55(42));
 assert.equal(messages[5].kind,'image');assert.equal(messages[5].from,'me');
 assert.equal(story55ChargeGate(s),null);
});
test('D42 morning call is due once at 09:25 and unconfirmed later scenes have no copy',()=>{
 const s=phone(42,'09:24');assert.equal(completed(s,'show'),true);assert.equal(d42CallDue(s),false);
 s.clock='09:25';assert.equal(d42CallDue(s),true);s.story55.d42CallTriggered=true;assert.equal(d42CallDue(s),false);
 for(const id of RETIRED_SCENES){assert.equal(sceneLines(s,id).length,0);assert.equal(nodeStatus(s,id).state,'locked');}
});
test('D42 preset plays the three exact lines in order with two 2500ms post-playback gaps; hangup cancels',async()=>{
 const events=[];let active=true;
 const opts={current:()=>active,synthesize:async text=>text,play:async(clip,text)=>{assert.equal(clip,text);events.push(text);return 'completed';},wait:async ms=>events.push(ms)};
 await playScriptedCallSequence(D42_CALL,opts);
 assert.deepEqual(events,[D42_CALL.lines[0],2500,D42_CALL.lines[1],2500,D42_CALL.lines[2]]);
 events.length=0;await playScriptedCallSequence(D42_CALL,{...opts,wait:async ms=>{events.push(ms);active=false;}});
 assert.deepEqual(events,[D42_CALL.lines[0],2500]);
});
