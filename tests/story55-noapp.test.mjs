import {advanceGameMinutes} from '../src/system/time/clock.js';
import {revealEndingVoice55,ENDING_VOICE_APPEAR_DELAY_MS} from '../src/services/story55/finale.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55,nodeLink55,sceneLines,scene55} from '../src/services/story55/runtime.js';
import {completed,story55Config} from '../src/services/story55/state.js';
import {previewNode55,handleStory55Action} from '../src/services/story55/controller.js';
import {installed,appUnlocked,registry} from '../src/system/registry.js';

const make=()=>{const s=initialState();activateStory55(s);return s;};
const show=(s,route='/chat/tai')=>registry.get('noapp').render({store:{get:()=>s}},{route,params:{}});

test('NoApp icon opens at D01 with invitation gate; it is not a dead app',()=>{
 const s=make();
 assert.equal(appUnlocked('noapp',s),true);
 assert.ok(installed(s).some(app=>app.id==='noapp'));
 assert.match(show(s,'/'),/尚未收到私人频道的内测邀请/);
 assert.doesNotMatch(show(s,'/'),/class="composer"/);
});
test('D30 invite installs NoApp and recognition is visible in real chat bubbles',async()=>{
 const s=make();previewNode55(s,'recognition');
 assert.equal(completed(s,'invite'),true);
 assert.equal(completed(s,'recognition'),false);
 assert.equal(s.story55.noappInstalled,undefined);
 assert.match(show(s),/安装并打开 NoApp/);
 const ctx={store:{get:()=>s,update:fn=>fn(s)},router:{open:link=>{s.nav.current=link;}}};
 await handleStory55Action('s55-install-noapp',{dataset:{}},ctx);
 assert.equal(s.story55.noappInstalled,true);
 assert.equal(s.nav.current.appId,'noapp');
 assert.equal(s.nav.current.route,'/chat/tai');
 assert.deepEqual(nodeLink55(s,'recognition'),{appId:'noapp',route:'/chat/tai',params:{node:'recognition'}});
 assert.match(show(s),/class="composer"/);
 assert.doesNotMatch(show(s),/data-action="s55-scene-next"/);
 advanceScene55(s,'recognition');
 assert.match(show(s),/欢迎回家/);
 while(!completed(s,'recognition'))advanceScene55(s,'recognition');
 assert.match(show(s),/陈熙泰/);
 assert.match(show(s),/class="composer"/);
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
