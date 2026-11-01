import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {voicePanel,voiceAction} from '../src/apps/developer/features/voice-authoring/index.js';
test('Tai-only voice authoring supports scripted call assets and NoApp bubbles',()=>{
 const s=initialState();activateStory55(s);
 assert.match(voicePanel(s),/tai-voice-call/);
 const ctx={store:{get:()=>s,update(fn){fn(s)}},toast(){}};
 assert.equal(voiceAction('tai-voice-add',{dataset:{}},ctx),true);
 const m=s.content.conversations.noapp.find(c=>c.id==='tai').messages.at(-1);
 assert.equal(m.kind,'voice');assert.equal(m.from,'tai');assert.equal(m.authored,true);
 assert.match(voicePanel(s),/tai-voice-chat/);
});
