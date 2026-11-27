import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {activateStory55,scene55,scene55ReplyDelay,tickStory55,tickQueuedStoryScenes55,pacedStorySceneDue55,pendingSceneVideoCall55,advanceScene55} from '../src/services/story55/runtime.js';
import {completed,nodeStatus,timedStoryPaused} from '../src/services/story55/state.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {currentScript55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {entryFor} from '../src/story/diary/entries.js';
import {D43_PARIS_LINES,D43_PARIS_LEGACY_LINES,D43_PARIS_REFLECTION_INDEX,D44_CONFIDE_LINES,D44_DIARY,PARIS_PHOTO,PARIS_VIDEO,D43_PARIS_CALL} from '../src/story/d43-d44/definition.js';
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
  const q=scene55(s,id),delay=i===0?0:scene55ReplyDelay(s,id,i);
  assert.equal(q.index,i);
  if(i===0){assert.equal(pacedStorySceneDue55(s,now),true);tickQueuedStoryScenes55(s,now);}
  if(i>0){assert.equal(q.nextAt,now+delay);assert.equal(pacedStorySceneDue55(s,now+delay-1),false);}
  if(lines[i][0]==='me'){
   const early=currentScript55(s,channel,chat,now+delay-1);
   assert.equal(early.kind,'waiting');
   assert.throws(()=>sendScriptedDraft55(s,channel,chat,lines[i][1],now+delay-1));
  }
  now+=delay;
  if(s.story55.config.nodes.find(n=>n.id===id)?.videoCallLines?.[i]){
   const script=pendingSceneVideoCall55(s,now);assert.equal(script.id,D43_PARIS_CALL.id);assert.equal(pacedStorySceneDue55(s,now),false);
   assert.throws(()=>advanceScene55(s,id,{now}));assert.equal(currentScript55(s,channel,chat,now).kind,'waiting');
   s.story55.scriptedCallCompleted??={};s.story55.scriptedCallCompleted[script.id]=true;
   s.content.conversations.noapp.find(c=>c.id==='tai').messages.push({id:script.messageId,from:'tai',kind:'call',callType:'video',text:'視訊通話 · 00:07',callStatus:'ended',endedBy:'tai'});
   advanceScene55(s,id,{now});continue;
  }
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
 assert.equal(list.length,D43_PARIS_LINES.length);assert.equal(list[0].kind,'image');assert.equal(list[0].text,PARIS_PHOTO);
 assert.equal(list[0].time,'10:20');assert.equal(list[0].sentDate,'2025-06-30');
 assert.equal(list[3].kind,'call');assert.equal(list[3].callType,'video');assert.equal(list[3].endedBy,'tai');
 assert.deepEqual(list.slice(1).filter((_,i)=>i!==2).map(m=>[m.from,m.text]),D43_PARIS_LINES.slice(1).filter((_,i)=>i!==2));
 assert.doesNotMatch(renderNoApp({store:{get:()=>s}},{route:'/chat/tai',params:{}}),/d43-paris-original\.mp4/);
 assert.equal(readFileSync(new URL('../public'+PARIS_VIDEO,import.meta.url)).subarray(4,8).toString(),'ftyp');
 assert.match(renderNoApp({store:{get:()=>s}},{route:'/chat/tai',params:{}}),/d43-eiffel\.webp/);
 assert.equal(readFileSync(new URL('../public'+PARIS_PHOTO,import.meta.url)).subarray(8,12).toString(),'WEBP');
 assert.equal(timedStoryPaused(s),false);tickStory55(s);assert.equal(messages(s,'noapp','tai','s55-d43-paris-').length,D43_PARIS_LINES.length);
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

test('unstarted Paris saves receive the original video without resetting existing progress',()=>{
 const s=phone(43,'09:00'),node=s.story55.config.nodes.find(n=>n.id==='paris');
 const old=D43_PARIS_LEGACY_LINES.filter((_,i)=>i!==3);
 s.story55.config.scenes.paris=structuredClone(old);delete node.videoCallLines;delete node.videoLines;node.lineDelayMs={9:10000};
 tickStory55(s);assert.deepEqual(s.story55.config.scenes.paris,D43_PARIS_LINES);assert.equal(node.videoCallLines[3].video,PARIS_VIDEO);
 s.story55.config.scenes.paris=structuredClone(old);delete node.videoCallLines;delete node.videoLines;node.lineDelayMs={9:10000};s.story55.scenes.paris={index:2};
 tickStory55(s);assert.deepEqual(s.story55.config.scenes.paris,old);assert.equal(scene55(s,'paris').index,2);
});

test('Paris revision keeps the accepted call and expands only undelivered dialogue',()=>{
 const s=phone(43,'10:20'),node=s.story55.config.nodes.find(n=>n.id==='paris');
 s.story55.config.scenes.paris=structuredClone(D43_PARIS_LEGACY_LINES);node.lineDelayMs={10:10000};
 s.story55.scenes.paris={index:4,nextAt:123};s.story55.activeScene='paris';
 s.story55.scriptedCallCompleted={[D43_PARIS_CALL.id]:true};
 tickStory55(s);assert.deepEqual(s.story55.config.scenes.paris,D43_PARIS_LINES);assert.equal(scene55(s,'paris').index,4);assert.equal(node.lineDelayMs[D43_PARIS_REFLECTION_INDEX],10000);
 assert.deepEqual(D43_PARIS_LINES[4],['tai','…不小心按錯了']);assert.deepEqual(D43_PARIS_LINES.at(-1),['tai','我們埃及見，或者巴黎見']);
 s.story55.config.scenes.paris=structuredClone(D43_PARIS_LEGACY_LINES);s.story55.scenes.paris.index=5;
 tickStory55(s);assert.deepEqual(s.story55.config.scenes.paris,D43_PARIS_LEGACY_LINES);assert.equal(scene55(s,'paris').index,5);
});
