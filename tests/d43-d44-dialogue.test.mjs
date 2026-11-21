import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {activateStory55,scene55,tickStory55,tickQueuedStoryScenes55,pacedStorySceneDue55} from '../src/services/story55/runtime.js';
import {completed,nodeStatus,timedStoryPaused} from '../src/services/story55/state.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {currentScript55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {entryFor} from '../src/story/diary/entries.js';
import {D43_PARIS_LINES,D44_CONFIDE_LINES,D44_DIARY,PARIS_PHOTO} from '../src/story/d43-d44/definition.js';
import {render as renderNoApp} from '../src/apps/noapp/index.js';
import {nativeWeChatComposer} from '../src/services/messaging/preset-replies.js';

function phone(day,clock){
 const s=activateStory55(initialState());
 s.day=day;s.clock=clock;s.story55.activeScene=null;s.story55.noappInstalled=true;
 for(const n of s.story55.config.nodes)if(n.day<day)s.story55.completed[n.id]={day:n.day,clock:'23:00'};
 return s;
}
const messages=(s,channel,chat,prefix)=>s.content.conversations[channel].find(c=>c.id===chat)?.messages.filter(m=>m.id.startsWith(prefix))||[];
function play(s,id,channel,chat,lines,now){
 for(let i=0;i<lines.length;i++){
  const q=scene55(s,id),delay=i===0?0:id==='paris'?(i===9?10000:3000):1900;
  assert.equal(q.index,i);
  if(i===0){assert.equal(pacedStorySceneDue55(s,now),true);tickQueuedStoryScenes55(s,now);}
  if(i>0){assert.equal(q.nextAt,now+delay);assert.equal(pacedStorySceneDue55(s,now+delay-1),false);}
  if(lines[i][0]==='me'){
   const early=currentScript55(s,channel,chat,now+delay-1);
   assert.equal(early.kind,'waiting');
   assert.throws(()=>sendScriptedDraft55(s,channel,chat,lines[i][1],now+delay-1));
  }
  now+=delay;
  assert.equal(pacedStorySceneDue55(s,now),true);
  tickQueuedStoryScenes55(s,now);
  if(lines[i][0]==='me'){
   assert.equal(scene55(s,id).index,i);
   const draft=currentScript55(s,channel,chat,now);
   assert.equal(draft.text,lines[i][1]);
   sendScriptedDraft55(s,channel,chat,draft.text,now);
  }
 }
 assert.equal(completed(s,id),true);
}
test('D43 10:20 photo, exact message pacing and ten-second silence, manual sends, real image bubble',()=>{
 const s=phone(43,'10:19');
 s.story55.completed['d43-xin']={day:43,clock:'10:00'};
 assert.equal(nodeStatus(s,'paris').state,'locked');
 advanceGameMinutes(s,100);assert.equal(s.clock,'10:20');assert.equal(timedStoryPaused(s),true);
 play(s,'paris','noapp','tai',D43_PARIS_LINES,Date.now());
 const list=messages(s,'noapp','tai','s55-d43-paris-');
 assert.equal(list.length,16);assert.equal(list[0].kind,'image');assert.equal(list[0].text,PARIS_PHOTO);
 assert.equal(list[0].time,'10:20');assert.equal(list[0].sentDate,'2025-06-30');
 assert.deepEqual(list.slice(1).map(m=>[m.from,m.text]),D43_PARIS_LINES.slice(1));
 assert.match(renderNoApp({store:{get:()=>s}},{route:'/chat/tai',params:{}}),/d43-eiffel\.webp/);
 assert.equal(readFileSync(new URL('../public'+PARIS_PHOTO,import.meta.url)).subarray(8,12).toString(),'WEBP');
 assert.equal(timedStoryPaused(s),false);tickStory55(s);assert.equal(messages(s,'noapp','tai','s55-d43-paris-').length,16);
});
test('D44 13:15 confide replaces D50, native WeChat and diary unlock only after final send',()=>{
 const s=phone(44,'13:14');assert.equal(entryFor(s,44),null);
 assert.equal(nodeStatus(s,'confide').state,'locked');assert.equal(s.story55.config.nodes.filter(n=>n.id==='confide').length,1);
 advanceGameMinutes(s,100);assert.equal(s.clock,'13:15');assert.equal(timedStoryPaused(s),true);
 assert.equal(nativeWeChatComposer(s,'wang').disabled,true);
 play(s,'confide','wechat','wang',D44_CONFIDE_LINES,Date.now());
 const list=messages(s,'wechat','wang','s55-d44-confide-');
 assert.deepEqual(list.map(m=>[m.from,m.text]),D44_CONFIDE_LINES);
 assert.equal(list[0].time,'13:15');assert.equal(list[0].sentDate,'2025-07-01');
 assert.equal(entryFor(s,44).body,D44_DIARY.body);assert.equal(entryFor(s,44).title,'十天');
 assert.equal(timedStoryPaused(s),false);
 assert.equal(s.story55.config.nodes.find(n=>n.id==='failure').requires.includes('confide'),true);
});
test('legacy incomplete Paris line index is reset without deleting existing chat; completed Paris remains done',()=>{
 const s=phone(43,'09:00');
 delete s.story55.config.d43D44Revision;
 s.story55.scenes.paris={index:2};s.story55.activeScene='paris';
 tickStory55(s);assert.equal(scene55(s,'paris').index,0);assert.equal(s.story55.activeScene,null);
 s.story55.completed.paris={day:43,clock:'10:30'};
 delete s.story55.config.d43D44Revision;
 tickStory55(s);assert.equal(completed(s,'paris'),true);
});
