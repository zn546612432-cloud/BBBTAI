import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {activateStory55,sceneLines} from '../src/services/story55/runtime.js';
import {previewNode55} from '../src/services/story55/controller.js';
import {completed} from '../src/services/story55/state.js';
import {D55_BRIEFING,D55_XIAOXIN} from '../src/story/d55/definition.js';
import {D55_OPENING_CALL,D55_WARNING_CALL,D55_FINAL_CALL,D55_FATHER_CALL,D55_RECALL} from '../src/story/d55/calls.js';
import {tickD55NoApp,callState,callAction,scriptedCallDraft,startIncoming,incomingCallBanner,callView} from '../src/apps/noapp/voice-call.js';
import {nativePhoneCallDue,tickAuthoredPhoneCalls} from '../src/services/telephony/authored.js';
import {telephonyFullscreen,telephonyIncomingBanner} from '../src/services/telephony/view.js';
import {SCRIPTED_VOICE_CLIPS} from '../src/story/d34-d42/voice-assets.js';

const fixture=()=>{
 const s=initialState();activateStory55(s);previewNode55(s,'ending');
 s.unlocked=true;s.batteryPercent=90;s.deathPhase=null;s.powerMode='idle';
 const ctx={store:{get:()=>s,update:fn=>fn(s)},refresh(){},router:{open(){}},toast(){}};
 return {s,ctx};
};

test('D55 daylight scenes preserve player Send and the approved chronology',()=>{
 const {s}=fixture();
 assert.equal(completed(s,D55_XIAOXIN),true);
 assert.equal(sceneLines(s,D55_BRIEFING)[0][0],'me');
 assert.equal(sceneLines(s,D55_XIAOXIN).find(x=>x[1]==='熙旺死了。')?.[0],'me');
 assert.equal(sceneLines(s,'ending').length,1);
 assert.equal(s.story55.config.nodes.find(n=>n.id==='ending').requires.includes(D55_XIAOXIN),true);
});

test('D55 starts a real NoApp call at 22:00, then waits for manual player speech',()=>{
 const {s,ctx}=fixture();s.clock='22:00';s.story55.d55Disconnected=false;
 assert.equal(callState().state==='connected',false);
 assert.equal(tickD55NoApp(ctx,{now:1000}),true);
 assert.equal(callState().state,'ringing');
 assert.match(incomingCallBanner(s),/NoApp/);
 assert.equal(callAction('tai-accept',ctx),true);
 assert.equal(callState().state,'connected');
 assert.equal(scriptedCallDraft(),D55_OPENING_CALL.steps[0][1]);
 assert.equal(callState().turnCount,0,'no player line may be auto-sent');
 assert.equal(D55_WARNING_CALL.steps[2][0],'me');
 assert.equal(D55_FINAL_CALL.steps.at(-1)[1],'我……');
 callAction('tai-hangup',ctx,{endedBy:'system',endReason:'d55_disconnect'});
});

test('D55 native Father call waits for the NoApp takeover and uses six user recordings',()=>{
 const {s,ctx}=fixture();s.clock='22:30';s.story55.d55FatherReady=false;
 assert.equal(nativePhoneCallDue(s,D55_FATHER_CALL),false);
 s.story55.d55FatherReady=true;
 assert.equal(nativePhoneCallDue(s,D55_FATHER_CALL),true);
 const audio=D55_FATHER_CALL.steps.filter(x=>x.audio);
 assert.equal(audio.length,6);
 for(const step of audio)assert.ok(existsSync(new URL('../public'+step.audio,import.meta.url)),step.audio);
 tickAuthoredPhoneCalls(ctx,{audio:null,running:false,playing:null},1000);
 assert.equal(s.phoneCall.scriptId,D55_FATHER_CALL.id);
 assert.match(telephonyIncomingBanner(s),/傅隆生/);
 assert.equal(telephonyFullscreen(s),'','native ring waits until Ximeng says hold on');
 s.story55.d55FatherTakeover=true;
 assert.match(telephonyFullscreen(s),/傅隆生/);
 assert.equal(D55_FATHER_CALL.hangupDelayMs,3000);
});

test('D55 last callback is visible but never answerable or manually hangable',()=>{
 const {s,ctx}=fixture();s.clock='22:46';
 assert.equal(startIncoming(ctx,'熙泰回撥',{scripted:D55_RECALL}),true);
 assert.equal(callState().state,'ringing');
 assert.match(incomingCallBanner(s),/disabled/);
 assert.match(callView(s),/disabled/);
 assert.equal(callAction('tai-accept',ctx),false);
 callAction('tai-hangup',ctx);
 assert.equal(callState().state,'ringing');
 callAction('tai-hangup',ctx,{endedBy:'tai',endReason:'d55_unanswered_end'});
 assert.equal(callState().state,'ended');
});

test('D55 fixed Tai dialogue has prerecording preparation and old shouted finale is gone',()=>{
 const d55=SCRIPTED_VOICE_CLIPS.filter(x=>x.id.startsWith('d55-'));
 assert.ok(d55.length>=12);
 assert.ok(d55.every(x=>x.prewarmRequired));
 assert.equal(D55_FINAL_CALL.steps.some(x=>x[1]==='熙蒙！熙蒙！'),false);
 assert.equal(D55_FINAL_CALL.steps.some(x=>x[1]==='熙蒙？'),false);
});
