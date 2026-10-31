import test from 'node:test';
import assert from 'node:assert/strict';
import {needsTaiResponseRepair,taiResponseRepairScene} from '../src/services/ai/turn-quality.js';
import {prepareXitaiSpeech} from '../src/services/voice/voice-regex.js';
import {taiBehaviorPrompt,DEFAULT_TAI_BEHAVIOR} from '../src/services/ai/behavior.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {composeCallSpeech} from '../src/services/voice/call-speech.js';

test('ordinary one-line reply is eligible for a single high-quality rewrite',()=>{
 const input={entries:[{text:'在酒店。'}],lastUser:'今天都忙什么了',behavior:DEFAULT_TAI_BEHAVIOR,outputMode:'text'};
 assert.equal(needsTaiResponseRepair(input),true);
 assert.equal(needsTaiResponseRepair({...input,entries:[{text:'在酒店。'},{text:'下午出去看了展。'}]}),false);
 assert.equal(needsTaiResponseRepair({...input,lastUser:'晚安'}),false);
 assert.equal(needsTaiResponseRepair({...input,outputMode:'voice'}),false);
 assert.equal(needsTaiResponseRepair({...input,entries:[{text:'我先忙，晚点说。'}]}),false);
 assert.match(taiResponseRepairScene('在酒店。'),/2至5条/);
});
test('v5 text mode uses complete long sentences without a minimum bubble quota',()=>{
 const prompt=buildTaiPrompt({channel:'noapp',day:62,outputMode:'text',messages:[{role:'user',content:'今天过得怎么样'}]});
 assert.match(prompt,/不设最低数量/);
 assert.match(prompt,/酒店/);
 assert.doesNotMatch(prompt,/自然的短回复就停|文字可极短|聊天自然、简短、碎片化/);
 assert.match(prompt,/完整长句/);
 assert.match(taiBehaviorPrompt(DEFAULT_TAI_BEHAVIOR),/不强制连发/);
});
test('every speaking mood stays unhurried and restrained',()=>{
 for(const tone of ['neutral','dry','playful','soft','serious','danger','happy','sad','angry','fearful','surprised','disgusted']){
  const prepared=prepareXitaiSpeech('刚从外面回来，去看了一场秀。酒店楼下太吵了，等下再下楼。',{tone});
  assert.ok(['calm','fluent','sad','angry','fearful','surprised'].includes(prepared.emotion),tone);
  assert.ok(prepared.speed<=.92&&prepared.speed>=.78,tone+' speed '+prepared.speed);
  if(tone!=='playful')assert.doesNotMatch(prepared.text,/\(chuckle\)/,tone+' should not force a chuckle on neutral speech');
 }
});
test('speech composer keeps audible pauses between sentences and message groups',()=>{
 const prepared=composeCallSpeech([{text:'回来了。你睡了吗？'},{text:'我刚在酒店。'}],{callPause:1.7});
 assert.match(prepared,/<#1.7#>/);
 assert.match(prepared,/<#0.77#>/);
});
