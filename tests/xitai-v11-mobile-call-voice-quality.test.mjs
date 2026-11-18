import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {chatView} from '../src/components/chat.js';
import {taiConversationMomentum,taiMomentumPrompt,taiPrivateDisclosurePrompt,needsTaiMomentumRepair,applyTaiPrivacyDecision,hasPrematureTaiDisclosure} from '../src/services/ai/conversation-momentum-v11.js';
import {taiExplicitVoiceRequest,honorTaiVoiceRequest} from '../src/services/ai/voice-request-v11.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {taiActionDecisionPrompt} from '../src/services/ai/action-protocol-v10.js';
import {sampleTaiTurnPlan,taiTurnShapePrompt} from '../src/services/ai/conversation-shape-v12.js';
import {askTai,saveApiConfig} from '../src/services/ai/gateway.js';

test('author childhood exchange waits for multiple real turns before disclosure',()=>{
 const messages=[{role:'user',content:'你小時候在澳門長大嗎？'}];
 const check=(stage,count,marker)=>{
  const result=taiConversationMomentum(messages);assert.equal(result.stage,stage);assert.equal(result.persistence,count);
  const args={day:40,channel:'noapp',recognized:true,messages};
  assert.match(buildTaiPrompt(args),marker);assert.match(taiActionDecisionPrompt(args),marker);
  const turnPlan=sampleTaiTurnPlan({messages,random:()=>0});assert.equal(turnPlan.target,1);assert.equal(turnPlan.guide,false);assert.equal(turnPlan.semicolonBurst,false);assert.match(taiTurnShapePrompt(turnPlan),/私事對話節奏/);
 };
 check('first',1,/首次問私事/);
 messages.push({role:'assistant',content:'怎麼，想聽我小時候的事？'},{role:'user',content:'對'});
 check('hold',2,/仍在追問/);
 messages.push({role:'assistant',content:'等到見面的時候，我再慢慢告訴你。'},{role:'user',content:'說嘛。'});
 check('hold',3,/仍在追問/);
 messages.push({role:'assistant',content:'先留到那天。'},{role:'user',content:'拜託，講一點嘛。'});
 check('limited',4,/連續多次追問，才可以有限鬆口/);
 assert.equal(needsTaiMomentumRepair({messages,entries:[{text:'我在葡萄牙長大。'}]}),false);
 messages.push({role:'assistant',content:'我在葡萄牙長大。'},{role:'user',content:'我的程式跑起來了！'});
 assert.equal(taiConversationMomentum(messages).stage,'none');
 messages.push({role:'assistant',content:'挺好。'},{role:'user',content:'你大學在哪裡讀書？'});
 check('first',1,/首次問私事/);
 assert.equal(taiPrivateDisclosurePrompt(messages,{recognized:false}),'');
});

test('an overeager director cannot force early disclosures; repeated leaks get a bounded author-approved boundary',async()=>{
 const args={channel:'noapp',day:40,recognized:true,messages:[{role:'user',content:'你小時候在澳門長大嗎？'}]};
 const action={action:'send_text',strategy:'tease',tone:'neutral',intent:'承认在澳门出生，很小就被领养。'};
 const resolved=applyTaiPrivacyDecision(action,args);
 assert.equal(resolved.action,'send_text');assert.equal(resolved.tone,'neutral');assert.doesNotMatch(resolved.intent,/澳门|领养/);
 assert.ok(hasPrematureTaiDisclosure(['在澳门出生，但很小就被领养走了。'],args));
 assert.equal(hasPrematureTaiDisclosure(['等到見面再說。'],args),false);
 assert.equal(hasPrematureTaiDisclosure(['我在葡萄牙長大。'],{...args,messages:[{role:'assistant',content:'我在葡萄牙長大。'},...args.messages]}),false);
 const oldFetch=globalThis.fetch,oldSession=globalThis.sessionStorage,storage=new Map(),requests=[];
 globalThis.sessionStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 globalThis.fetch=async(url,init)=>{requests.push(JSON.parse(init.body));return Response.json({choices:[{message:{content:'{"messages":[{"text":"我在葡萄牙长大。","mode":"text"}]}'}}]});};
 try{
  saveApiConfig({deepseek:'test-only'});
  const result=await askTai({...args,approvedDecision:action});
  assert.equal(requests.length,2);assert.match(requests[1].messages[0].content,/私事披露修正/);
  assert.equal(JSON.parse(result.text).messages[0].text,'等到我們見面的時候，說不定我會跟你說。');
 }finally{globalThis.fetch=oldFetch;globalThis.sessionStorage=oldSession;}
});

const deepTalk=[
 {role:'user',content:'给我讲讲你的童年'},
 {role:'assistant',content:'那没什么好听的。'},
 {role:'user',content:'我要听！'},
 {role:'assistant',content:'等到見面再說。'},
 {role:'user',content:'說嘛。'},
 {role:'assistant',content:'有些事，見面再聊。'},
 {role:'user',content:'拜託你，講一點就好。'}
];
test('when Ximeng insists, shift from evasive questions to real substance',()=>{
 const m=taiConversationMomentum(deepTalk);
 assert.equal(m.topic,'personal');
 assert.equal(m.persistence,4);
 assert.equal(m.shouldElaborate,true);
 assert.equal(m.evasion,false,'a genuine wish to wait until meeting is not empty evasion');
 assert.match(taiPrivateDisclosurePrompt(deepTalk),/不要把問題再次拋回去/);
 assert.match(taiMomentumPrompt(deepTalk,{mode:'call'}),/完整表达/);
 assert.equal(needsTaiMomentumRepair({messages:deepTalk,entries:[{text:'你想听哪部分？'}],mode:'call'}),true);
 assert.equal(needsTaiMomentumRepair({messages:deepTalk,entries:[{text:'我不愿意谈具体的养父母往事，这是我自己的边界。'}]}),false);
 assert.equal(needsTaiMomentumRepair({messages:[{role:'user',content:'嗨'}],entries:[{text:'嗯？'}]}),false);
});
test('an opt-in personal disclosure does not become a compulsory life report',()=>{
 const prompt=buildTaiPrompt({day:37,channel:'noapp',recognized:true,messages:deepTalk,outputMode:'call'});
 assert.match(prompt,/連續多次追問，才可以有限鬆口/);
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
test('NoApp keeps Ximeng text-only and never exposes TTS pending or retry',()=>{
 const s=initialState();s.day=56;s.clock='22:05';
 const c=s.content.conversations.noapp.find(x=>x.id==='tai');
 c.messages.push({id:'own-voice-test',day:56,time:'22:00',from:'me',actual:true,kind:'voice',audioId:'mic-test',duration:4,voiceCaption:'听得见吗',text:'语音消息'});
 c.messages.push({id:'pending-voice-test',day:56,time:'22:01',from:'tai',actual:true,kind:'text',voiceRequested:true,text:'马上录给你'});
 c.messages.push({id:'failed-voice-test',day:56,time:'22:02',from:'tai',actual:true,kind:'text',voiceFailed:true,voiceError:'provider unavailable',text:'试一下'});
 const html=chatView(s,'noapp','tai');
 assert.doesNotMatch(html,/data-action="tai-record"/);
 assert.doesNotMatch(html,/data-voice-id="mic-test"/);
 assert.doesNotMatch(html,/语音合成中|马上录给你|provider unavailable|tai-convert-voice/);
 assert.match(html,/語音發不出去|發不了語音|網不太好|打字說/);
});
