import {advanceGameMinutes} from '../src/system/time/clock.js';
import {revealEndingVoice55,ENDING_VOICE_APPEAR_DELAY_MS} from '../src/services/story55/finale.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55,nodeLink55,sceneLines,scene55} from '../src/services/story55/runtime.js';
import {completed,story55Config} from '../src/services/story55/state.js';
import {previewNode55,handleStory55Action} from '../src/services/story55/controller.js';
import {installed,appUnlocked,registry} from '../src/system/registry.js';
import {callAction,callState,callView,incomingCallBanner,scriptedCallDraft} from '../src/apps/noapp/voice-call.js';
import {RECOGNITION_STEPS} from '../src/story/d29/recognition-call.js';
import {timedStoryPaused} from '../src/services/story55/state.js';

const make=()=>{const s=initialState();activateStory55(s);return s;};
const show=(s,route='/chat/tai')=>registry.get('noapp').render({store:{get:()=>s}},{route,params:{}});

test('NoApp is hidden at D01 until invitation installation',()=>{
 const s=make();
 assert.equal(appUnlocked('noapp',s),false);
 assert.ok(!installed(s).some(app=>app.id==='noapp'));
 assert.match(show(s,'/'),/尚未收到私人频道的内测邀请/);
 assert.doesNotMatch(show(s,'/'),/class="composer"/);
});
test('NoApp installation rings immediately; recognition is an automatic preset call, not chat bubbles',async()=>{
 const s=make();previewNode55(s,'recognition');
 assert.equal(completed(s,'invite'),true);
 assert.equal(completed(s,'recognition'),false);
 assert.equal(s.story55.noappInstalled,undefined);
 assert.match(show(s),/安装并打开 NoApp/);
 const ctx={store:{get:()=>s,update:fn=>fn(s)},refresh(){},router:{open:link=>{s.nav.current=link;}}};
 const old={Audio:globalThis.Audio,fetch:globalThis.fetch,setTimeout:globalThis.setTimeout};let audio;
 class FakeAudio{constructor(){audio=this;this.src='';this.paused=true;this.listeners=new Map();}addEventListener(n,cb){const a=this.listeners.get(n)||new Set();a.add(cb);this.listeners.set(n,a);}removeEventListener(n,cb){this.listeners.get(n)?.delete(cb);}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}finish(){this.paused=true;for(const cb of [...(this.listeners.get('ended')||[])])cb();}}
 const waitFor=async pred=>{for(let i=0;i<500;i++){if(pred())return;await new Promise(r=>old.setTimeout(r,2));}throw Error('Recognition call timed out');};
 try{
 globalThis.Audio=FakeAudio;globalThis.fetch=async url=>{assert.match(String(url),/d33\/d33-recognition-\d+\.mp3$/);return new Response(new Uint8Array([73,68,51]),{headers:{'Content-Type':'audio/mpeg'}});};
 globalThis.setTimeout=(fn,ms,...args)=>old.setTimeout(fn,ms>=2200&&ms<=30000?2:ms,...args);
 await handleStory55Action('s55-install-noapp',{dataset:{}},ctx);
 assert.equal(s.story55.noappInstalled,true);
 assert.equal(s.nav.current.appId,'noapp');
 assert.equal(s.nav.current.route,'/chat/tai');
 assert.deepEqual(nodeLink55(s,'recognition'),{appId:'noapp',route:'/chat/tai',params:{node:'recognition'}});
 assert.doesNotMatch(show(s),/class="composer"/);
 assert.match(show(s),/tai-portrait\.webp/);
 assert.match(show(s),/私人頻道/);
 assert.doesNotMatch(show(s),/尚未相[认認]/);
 assert.doesNotMatch(show(s),/data-action="s55-scene-next"/);
 assert.equal(callState().state,'ringing');assert.match(incomingCallBanner(s),/接听来电/);assert.equal(timedStoryPaused(s),true);
 callAction('tai-accept',ctx);assert.equal(scriptedCallDraft(),null);
 for(const [i,[role,line]] of RECOGNITION_STEPS.entries()){
  if(role==='tai'){
   await waitFor(()=>audio?.src?.startsWith('blob:')&&!audio.paused);
   const html=callView(s),visible=line.replace(/…+/g,'').trim();
   assert.ok(html.includes('class="tai-call-spoken-caption theirs">'+visible+'</p>'));
   assert.doesNotMatch(html,/正在說話|正在回覆|tai-live-captions/);
   audio.finish();
  }
  await waitFor(()=>callState().turnCount>=i+1||completed(s,'recognition'));
 }
 await waitFor(()=>completed(s,'recognition')&&callState().state==='ended');assert.equal(timedStoryPaused(s),false);
 const messages=s.content.conversations.noapp.find(c=>c.id==='tai').messages;
 assert.equal(messages.filter(m=>m.kind==='call').length,1);assert.equal(messages.filter(m=>m.id.startsWith('s55-recognition-')&&m.kind==='text').length,0);
 assert.deepEqual(messages.find(m=>m.kind==='call').transcript.split('\n').map(line=>line.slice(8)),RECOGNITION_STEPS.map(([role,text])=>(role==='me'?'熙蒙':'熙泰')+'：'+text));
 assert.match(show(s),/class="composer"/);
 }finally{callAction('tai-hangup',ctx);Object.assign(globalThis,old);}
});
test('D55 final recording is prompted and persisted inside NoApp, not Calendar',()=>{
 const s=make();previewNode55(s,'ending');
 assert.equal(s.day,55);
 assert.equal(s.story55.noappInstalled,true);
 assert.deepEqual(nodeLink55(s,'ending'),{appId:'noapp',route:'/chat/tai',params:{node:'ending'}});
 assert.match(show(s),/noapp-story55-active/);
 for(let i=0;i<40;i++){
  const line=sceneLines(s,'ending')[scene55(s,'ending').index];
  if(line[0]==='watch')break;
  advanceScene55(s,'ending');
 }
 assert.equal(sceneLines(s,'ending')[scene55(s,'ending').index][0],'watch');
 assert.doesNotMatch(show(s),/data-action="s55-final-audio"/);
 assert.equal(s.clock,'22:25');
 assert.equal(revealEndingVoice55(s,s.story55.endingVoiceQueuedAt+ENDING_VOICE_APPEAR_DELAY_MS),true);
 assert.match(show(s),/data-action="s55-final-audio"/);
 assert.match(show(s),/22:46/);
 s.story55.finalAudioHeard=true;advanceScene55(s,'ending');
 assert.ok(s.content.conversations.noapp.find(c=>c.id==='tai').messages.some(m=>m.kind==='story55_final_audio'));
 assert.match(show(s),/noapp-final-voice/);
 assert.match(show(s),/aria-label="播放语音"/);
 assert.doesNotMatch(show(s),/最后的密钥录音/);
 assert.equal(scene55(s,'ending').index,6);
 assert.equal(s.clock,'22:46');
 advanceGameMinutes(s,3);advanceScene55(s,'ending');
 assert.equal(s.story55.ended,true);
 assert.equal(s.deathPhase,'s55-accelerating');
 assert.ok(story55Config(s).finalAudio.endsWith('.mp3'));
});
test('D55 NoApp composer is never removed for 22:25, 22:46, 22:49 or after the last reply',()=>{
 const s=make();previewNode55(s,'ending');
 for(let i=0;i<5;i++)advanceScene55(s,'ending');
 assert.equal(scene55(s,'ending').index,5);
 assert.match(show(s),/data-form="send-chat"/);
 assert.match(show(s),/class="composer"/);
 revealEndingVoice55(s,s.story55.endingVoiceQueuedAt+ENDING_VOICE_APPEAR_DELAY_MS);
 assert.match(show(s),/data-form="send-chat"/);
 s.story55.finalAudioHeard=true;
 advanceScene55(s,'ending');
 assert.equal(scene55(s,'ending').index,6);
 assert.match(show(s),/data-form="send-chat"/);
 advanceGameMinutes(s,3);advanceScene55(s,'ending');
 assert.equal(s.story55.ended,true);
 assert.match(show(s),/data-form="send-chat"/);
 assert.match(show(s),/placeholder="发送消息…"/);
 s.story55.secondView=true;s.deathPhase='recovered';
 assert.match(show(s),/data-form="send-chat"/);
});

test('a previously bookmarked Calendar scene no longer renders D55 dialogue',()=>{
 const s=make();previewNode55(s,'ending');
 const html=registry.get('calendar').render({store:{get:()=>s}},{route:'/story55/scene',params:{node:'ending'}});
 assert.match(html,/cl-screen/);
 assert.doesNotMatch(html,/s55-scene-next|剧情消息|前往 NoApp/);
 assert.doesNotMatch(html,/CALENDAR \/ D55/);
});
