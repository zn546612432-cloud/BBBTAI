import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {chatView} from '../src/components/chat.js';
import {taiConversationMomentum,taiMomentumPrompt,needsTaiMomentumRepair} from '../src/services/ai/conversation-momentum-v11.js';
import {taiExplicitVoiceRequest,honorTaiVoiceRequest} from '../src/services/ai/voice-request-v11.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';

const deepTalk=[
 {role:'user',content:'给我讲讲你的童年'},
 {role:'assistant',content:'那没什么好听的。'},
 {role:'user',content:'我要听！'}
];
test('when Ximeng insists, shift from evasive questions to real substance',()=>{
 const m=taiConversationMomentum(deepTalk);
 assert.equal(m.topic,'personal');
 assert.equal(m.persistence,2);
 assert.equal(m.shouldElaborate,true);
 assert.equal(m.evasion,true);
 assert.match(taiMomentumPrompt(deepTalk,{mode:'call'}),/不要把问题再次抛回去/);
 assert.match(taiMomentumPrompt(deepTalk,{mode:'call'}),/完整表达/);
 assert.equal(needsTaiMomentumRepair({messages:deepTalk,entries:[{text:'你想听哪部分？'}],mode:'call'}),true);
 assert.equal(needsTaiMomentumRepair({messages:deepTalk,entries:[{text:'我不愿意谈具体的养父母往事，这是我自己的边界。'}]}),false);
 assert.equal(needsTaiMomentumRepair({messages:[{role:'user',content:'嗨'}],entries:[{text:'嗯？'}]}),false);
});
test('an opt-in personal disclosure does not become a compulsory life report',()=>{
 const prompt=buildTaiPrompt({day:37,channel:'noapp',recognized:true,messages:deepTalk,outputMode:'call'});
 assert.match(prompt,/熙蒙已经不止一次要求你谈自己的经历/);
 assert.match(prompt,/不主动报备/);
 assert.match(taiMomentumPrompt([{role:'user',content:'帮我代购一双鞋'}]),/Mirage 账户扣代购费/);
 assert.equal(taiConversationMomentum([{role:'user',content:'hi'}]).shouldElaborate,false);
});
test('explicit send a voice note is honored when text was chosen without refusal',()=>{
 const selected={action:'send_text',strategy:'tease',tone:'playful'};
 assert.equal(taiExplicitVoiceRequest('给我发语音'),true);
 assert.equal(taiExplicitVoiceRequest('你发一条语音给我'),true);
 assert.equal(taiExplicitVoiceRequest('我们语音通话吧'),false);
 assert.equal(taiExplicitVoiceRequest('先别给我发语音'),false);
 assert.equal(honorTaiVoiceRequest(selected,{text:'给我发语音',available:true}).action,'send_voice');
 assert.equal(honorTaiVoiceRequest(selected,{text:'给我发语音',available:false}).action,'send_text');
 assert.equal(honorTaiVoiceRequest({...selected,strategy:'set_boundary'},{text:'给我发语音',available:true}).action,'send_text');
});
test('NoApp keeps Ximeng text-only while Tai voice shows TTS pending and retry',()=>{
 const s=initialState();s.day=56;
 const c=s.content.conversations.noapp.find(x=>x.id==='tai');
 c.messages.push({id:'own-voice-test',day:56,time:'22:00',from:'me',actual:true,kind:'voice',audioId:'mic-test',duration:4,voiceCaption:'听得见吗',text:'语音消息'});
 c.messages.push({id:'pending-voice-test',day:56,time:'22:01',from:'tai',actual:true,kind:'text',voiceRequested:true,text:'马上录给你'});
 c.messages.push({id:'failed-voice-test',day:56,time:'22:02',from:'tai',actual:true,kind:'text',voiceFailed:true,voiceError:'provider unavailable',text:'试一下'});
 const html=chatView(s,'noapp','tai');
 assert.doesNotMatch(html,/data-action="tai-record"/);
 assert.doesNotMatch(html,/data-voice-id="mic-test"/);
 assert.match(html,/语音合成中/);
 assert.match(html,/data-action="tai-convert-voice" data-id="failed-voice-test"/);
});
