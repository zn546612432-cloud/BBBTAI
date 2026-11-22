import test from 'node:test';
import assert from 'node:assert/strict';
import {taiSocialEnergy,withTaiSocialVoice,canTaiCall,markTaiCallRest,socialEnergyPrompt} from '../src/services/ai/social-energy.js';
import {taiCallFarewellIntent} from '../src/apps/noapp/call-hangup-intent.js';
import {nextNaturalCallIdleEvent,finalizeCallSegments} from '../src/apps/noapp/call-engine-v2.js';
test('private stages are separate, failed synthesis is free, next game day starts fresh',async()=>{
 const s={day:35,aiDraft:{taiSocialEnergy:{day:35,call:19,message:13}}},store={get:()=>s,update:fn=>fn(s)};
 assert.equal(taiSocialEnergy(s,'call').stage,'normal');assert.equal(taiSocialEnergy(s,'message').stage,'closing');
 await withTaiSocialVoice(store,'call',async()=>1);assert.equal(taiSocialEnergy(s,'call').stage,'fatigue');
 await assert.rejects(withTaiSocialVoice(store,'message',async()=>{throw Error('offline');}));assert.equal(taiSocialEnergy(s,'message').used,13);
 await withTaiSocialVoice(store,'message',async()=>1);await withTaiSocialVoice(store,'message',async()=>1);
 await assert.rejects(withTaiSocialVoice(store,'message',async()=>1),{code:'TAI_SOCIAL_REST'});
 assert.equal(taiSocialEnergy(s,'call').used,20);assert.match(socialEnergyPrompt(s,'message'),/文字仍可/);
 markTaiCallRest(s,1000);assert.equal(canTaiCall(s,2000),false);assert.equal(canTaiCall(s,91001),true);
 s.day++;assert.equal(taiSocialEnergy(s,'message').used,0);assert.equal(canTaiCall(s,2000),true);
});
test('conditional silence warning is not goodbye; actual silence leads to closure',()=>{
 assert.equal(taiCallFarewellIntent('你再不說話，我可要掛了。'),'warn');
 assert.equal(taiCallFarewellIntent('我還有事，先掛了。'),'end');
 assert.equal(taiCallFarewellIntent('時間不早了，我困了。晚安。'),'end');
 assert.equal(taiCallFarewellIntent('你不要掛電話。'),'');
 const snapshot={state:'connected',lastTaiEndAt:1000,nudgeCount:1,warnedAt:1000};
 assert.equal(nextNaturalCallIdleEvent(snapshot,15999),'');assert.equal(nextNaturalCallIdleEvent(snapshot,16000),'closing');
 assert.equal(nextNaturalCallIdleEvent({...snapshot,warnedAt:0,nudgeCount:0,lastTaiEndAt:15500},16000),'');
 assert.equal(finalizeCallSegments([{text:'你再不說話，我可要掛了。'}],{close:true,maxSegments:1}).segments[0].text,'好了，先聊到這裡吧。');
});
