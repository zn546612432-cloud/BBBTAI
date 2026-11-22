import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,scene55,scene55ReplyDelay,tickQueuedStoryScenes55,tickStory55} from '../src/services/story55/runtime.js';
import {completed,nodeStatus,timedStoryPaused} from '../src/services/story55/state.js';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {D45_GROUP,D45_TAI,D45_WANG,D45_CALL,D45_DIARY} from '../src/story/d45/definition.js';
import {entryFor} from '../src/story/diary/entries.js';
import {d45CallDue,maybeStartD45Call,callAction,callView,callState,scriptedCallDraft,submitCall,scriptedCallCameraActive} from '../src/apps/noapp/voice-call.js';
import {presetReplyDelay,stampFixedLine} from '../src/services/story55/fixed-timeline.js';
import {dynamicIsland} from '../src/system/power/island.js';

function phone(){
 const s=activateStory55(initialState());s.day=45;s.clock='11:22';s.story55.activeScene=null;s.story55.noappInstalled=true;
 for(const n of s.story55.config.nodes)if(n.day<45)s.story55.completed[n.id]={day:n.day,clock:'23:00'};
 return s;
}
function play(s,id,channel,chat,lines,start){
 let now=Date.now();
 for(let i=0;i<lines.length;i++){
  if(i===0)tickQueuedStoryScenes55(s,now);
  const q=scene55(s,id);assert.equal(q.index,i);now=q.nextAt??now;
  const before=s.clock;assert.equal(timedStoryPaused(s),true);advanceGameMinutes(s,180);assert.equal(s.clock,before);
  tickQueuedStoryScenes55(s,now);
  if(lines[i][0]==='me')sendScriptedDraft55(s,channel,chat,lines[i][1],now);
 }
 assert.equal(completed(s,id),true);
 const log=s.content.conversations[channel].find(c=>c.id===chat).messages.filter(m=>m.id.startsWith('s55-'+id+'-'));
 assert.equal(log.length,lines.length);assert.equal(log[0].time,start);assert.equal(log.at(-1).time,s.clock);
 assert.ok(log.every((m,i)=>/^\d\d:\d\d$/.test(m.time)&&(!i||m.time>=log[i-1].time)));
}
test('D45 native conversations freeze and resume at the authored last message, call and diary have prerequisites',()=>{
 const s=phone();advanceGameMinutes(s,60);assert.equal(s.clock,'11:23');
 play(s,'d45-group','wechat','group',D45_GROUP,'11:23');
 const last=s.clock;assert.equal(timedStoryPaused(s),false);advanceGameMinutes(s,1);assert.notEqual(s.clock,last);
 advanceGameMinutes(s,600);assert.equal(s.clock,'16:40');assert.equal(d45CallDue(s),false);
 play(s,'d45-tai','noapp','tai',D45_TAI,'16:40');assert.equal(d45CallDue(s),true);assert.equal(timedStoryPaused(s),true);
 assert.equal(nodeStatus({...s,clock:'22:36'},'d45-wang').state,'locked');assert.equal(entryFor(s,45),null);
 s.story55.scriptedCallCompleted={[D45_CALL.id]:true};assert.equal(timedStoryPaused(s),false);
 advanceGameMinutes(s,600);assert.equal(s.clock,'22:36');
 play(s,'d45-wang','wechat','wang',D45_WANG,'22:36');assert.equal(entryFor(s,45).body,D45_DIARY.body);assert.equal(timedStoryPaused(s),false);
 assert.ok(scene55ReplyDelay(s,'d45-tai',3)>scene55ReplyDelay(s,'d45-tai',2));
});
test('explicit per-message time anchors subsequent stamps; longer messages are slower',()=>{
 const s=phone(),p={},lines=[['tai','嗯'],['me','長'.repeat(90)],['tai','好']];
 assert.equal(stampFixedLine(s,p,lines,0,{at:'11:23'}),'11:23');
 assert.equal(stampFixedLine(s,p,lines,1,{explicit:'11:30'}),'11:30');
 assert.equal(stampFixedLine(s,p,lines,2),'11:31');
 assert.ok(presetReplyDelay(lines[1][1])>presetReplyDelay(lines[0][1]));
});
test('older saves beyond D45 do not replay new historical conversations',()=>{
 const s=phone();s.day=46;delete s.story55.config.d45Revision;
 s.story55.config.nodes=s.story55.config.nodes.filter(n=>!n.id.startsWith('d45-'));
 tickStory55(s);assert.ok(s.story55.completed['d45-wang'].legacySkipped);
});
test('D45 full scripted call plays both sides automatically with reading pauses, timestamps, camera, and hangup',async()=>{
 const s=phone();s.clock='16:45';s.unlocked=true;s.story55.completed['d45-group']={day:45,clock:'11:25'};s.story55.completed['d45-tai']={day:45,clock:'16:45'};
 const ctx={store:{get:()=>s,update:fn=>fn(s)},refresh(){},router:{open(){}},toast(){}};
 const old=Object.fromEntries(['Audio','fetch','setTimeout'].map(k=>[k,globalThis[k]]));let audio;const delays=[];
 class FakeAudio{constructor(){audio=this;this.src='';this.paused=true;this.listeners=new Map();}addEventListener(n,cb){const a=this.listeners.get(n)||new Set();a.add(cb);this.listeners.set(n,a);}removeEventListener(n,cb){this.listeners.get(n)?.delete(cb);}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}finish(){this.paused=true;for(const cb of [...(this.listeners.get('ended')||[])])cb();}}
 const waitFor=async pred=>{for(let i=0;i<500;i++){if(pred())return;await new Promise(r=>old.setTimeout(r,2));}throw Error('Scripted call timed out');};
 try{
  globalThis.Audio=FakeAudio;globalThis.fetch=async url=>{assert.match(String(url),/d45\/d45-call-\d+\.mp3$/);return new Response(new Uint8Array([73,68,51]),{headers:{'Content-Type':'audio/mpeg'}});};
  globalThis.setTimeout=(fn,ms,...args)=>{if(ms>=2200&&ms<=30000){delays.push(ms);return old.setTimeout(fn,2,...args);}return old.setTimeout(fn,ms,...args);};
  assert.equal(maybeStartD45Call(ctx),true);callAction('tai-accept',ctx);assert.equal(scriptedCallCameraActive(),true);assert.match(callView(s),/攝像頭已開啟/);assert.match(dynamicIsland(s),/island-remote-dot/);
  assert.match(callView(s),/熙蒙正在說話/);assert.match(callView(s),/<p class="mine">/);assert.equal(scriptedCallDraft(),null);
  callAction('tai-expand',ctx);assert.doesNotMatch(callView(s),/data-form="tai-call-turn"/);callAction('tai-expand',ctx);
  assert.equal(submitCall({dataset:{form:'tai-call-turn'}},ctx),true);assert.equal(callState().turnCount,1);
  assert.equal(timedStoryPaused(s),true);
  assert.deepEqual(delays,[Math.max(2200,Array.from(D45_CALL.steps[0][1]).length*180)]);
  for(const [i,[role,text]] of D45_CALL.steps.entries()){
   if(role==='tai'){await waitFor(()=>audio?.src?.startsWith('blob:')&&!audio.paused);assert.equal(delays.at(-1),D45_CALL.gapMs);audio.finish();}
   await waitFor(()=>callState().turnCount>=i+1||s.story55.scriptedCallCompleted?.[D45_CALL.id]);
   assert.equal(scriptedCallDraft(),null);
  }
  await waitFor(()=>s.story55.scriptedCallCompleted?.[D45_CALL.id]&&callState().state==='ended');assert.equal(scriptedCallCameraActive(),false);assert.equal(timedStoryPaused(s),false);
  const record=s.content.conversations.noapp.find(c=>c.id==='tai').messages.find(m=>m.kind==='call'&&m.transcript?.includes(D45_CALL.steps.at(-1)[1]));
  assert.equal(record.transcript.split('\n').length,D45_CALL.steps.length);assert.ok(record.transcript.split('\n').every(line=>/^\[\d\d:\d\d\]/.test(line)));
  assert.deepEqual(record.transcript.split('\n').map(line=>line.slice(8)),D45_CALL.steps.map(([role,text])=>(role==='me'?'熙蒙':'熙泰')+'：'+text));
 }finally{callAction('tai-hangup',ctx);for(const [k,v] of Object.entries(old)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});
