import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareXitaiSpeech,XITAI_SUPPORTED_TAGS} from '../src/services/voice/voice-regex.js';
import {buildTaiPrompt,ensureTaiDraft,defaultTaiDraft} from '../src/services/ai/tai-profile.js';
import {voicePreview,saveApiConfig,clearApiConfig} from '../src/services/ai/gateway.js';
import {composeCallSpeech} from '../src/services/voice/call-speech.js';
import {unpackTaiReply} from '../src/services/ai/format.js';

test('MiniMax 2.8 supports the exact official 19 event labels',()=>{
 assert.equal(XITAI_SUPPORTED_TAGS.length,19);
 for(const tag of ['breath','chuckle','emm','gasps','clear-throat','lip-smacking'])
  assert.ok(XITAI_SUPPORTED_TAGS.includes(tag),tag);
});
test('worldbook sentence-breath rule follows Chinese full stops, not commas or questions',()=>{
 const r=prepareXitaiSpeech('你好，你在忙吗？我刚回来。其实……我有件事想问。',{tone:'neutral'});
 assert.equal((r.text.match(/\(breath\)/g)||[]).length,2);
 assert.match(r.text,/^\(breath\)你好/);
 assert.match(r.text,/。\(breath\)其实/);
 assert.equal(r.emotion,null);
 assert.equal(r.speed,1);
});
test('staged cues are sanitized without reading them aloud and repeated sounds are deduped',()=>{
 const r=prepareXitaiSpeech('（皱眉）(sigh)唉，真没办法。',{tone:'sad'});
 assert.doesNotMatch(r.text,/皱眉|sigh\)|\(whisper\)|唉/);
 assert.match(r.text,/\(breath\)\(sighs\)/);
 assert.equal(prepareXitaiSpeech('木啊',{tone:'soft'}).text,'(lip-smacking)');
});
test('call speech preserves one long thought and pauses only between different messages',()=>{
 const speech=composeCallSpeech([{text:'我回来了。还在忙吗？'},{text:'不用急着回，我要洗澡。'}],{callPause:1.7});
 assert.equal((speech.match(/<#1.7#>/g)||[]).length,1);
 assert.equal((speech.match(/<#0.77#>/g)||[]).length,0);
});
test('all character channels allow normal short sentences but prohibit poetic monologues',()=>{
 for(const channel of ['mirage','chess','noapp']){
  const prompt=buildTaiPrompt({day:40,channel,outputMode:channel==='noapp'?'call':'text'});
  assert.match(prompt,/允许真实的短句/);
  assert.match(prompt,/禁止过于文艺/);
  assert.doesNotMatch(prompt,/禁止短句与碎片化表达|每一句话都必须具有完整语法结构/);
 }
});
test('old default speech instruction migrates without rewriting author-customized text',()=>{
 const old='纯文字台词，禁止动作、神态、心理旁白与舞台说明。每句话有完整语法结构，以连贯长句、复合句和有依据的反问表达，不用网络用语、缩字、碎片或三个字以内独立句。语音也只写可直接朗读台词，声音控制交给发声层。';
 const s={aiDraft:defaultTaiDraft()};
 s.aiDraft.profile.speech=old;
 assert.equal(ensureTaiDraft(s),true);
 assert.match(s.aiDraft.profile.speech,/自然短句/);
 const s2={aiDraft:defaultTaiDraft()};s2.aiDraft.profile.speech='我是用户写的自定义规则。';
 assert.equal(ensureTaiDraft(s2),false);
 assert.equal(s2.aiDraft.profile.speech,'我是用户写的自定义规则。');
});
test('emotional DeepSeek tone survives reply normalization into voice synthesis',()=>{
 const results=unpackTaiReply({text:JSON.stringify({messages:[
  {text:'你开什么玩笑？',mode:'voice',tone:'angry'},
  {text:'这事情有意思。',mode:'voice',tone:'playful'}
 ]})},'noapp');
 assert.deepEqual(results.map(x=>x.tone),['angry','playful']);
 assert.equal(prepareXitaiSpeech(results[0].text,{tone:results[0].tone}).emotion,'angry');
});
test('direct MiniMax request sends HD tags to speech only, without hard-coded calm and with multilingual auto',async()=>{
 const oldFetch=globalThis.fetch,oldSession=globalThis.sessionStorage;
 const session=new Map();globalThis.sessionStorage={getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
 saveApiConfig({minimax:'not-a-real-key',region:'cn',ttsModel:'speech-2.8-hd'});
 let sent;
 globalThis.fetch=async(url,opts)=>{
  assert.match(String(url),/t2a_v2/);
  sent=JSON.parse(opts.body);
  return new Response(JSON.stringify({base_resp:{status_code:0},data:{audio:'fffb'}}),{status:200,headers:{'content-type':'application/json'}});
 };
 try{
  const blob=await voicePreview({text:'Claro，我知道了。'});
  assert.equal(blob.type,'audio/mpeg');
  assert.equal(sent.model,'speech-2.8-hd');
  assert.equal(sent.text,'Claro，我知道了。','stable default does not force a breath for a short utterance');
  assert.equal(sent.language_boost,'auto');
  assert.equal(sent.voice_setting.speed,1);
  assert.equal('emotion' in sent.voice_setting,false);
  await voicePreview({text:'Não, estás a brincar?'});
  assert.equal(sent.language_boost,'Portuguese','pure Portuguese asks MiniMax to pronounce in Portuguese');
 }finally{clearApiConfig();globalThis.fetch=oldFetch;if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;}
});
