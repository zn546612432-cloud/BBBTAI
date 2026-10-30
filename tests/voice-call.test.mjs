import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {unpackTaiReply} from '../src/services/ai/format.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {callView,startIncoming,callAction} from '../src/apps/noapp/voice-call.js';
import {apiConfig,saveApiConfig,clearApiConfig,voicePreview} from '../src/services/ai/gateway.js';

test('DeepSeek can send multiple messages or one long reply without forcing tiny answers',()=>{
 const long='AI编程'.repeat(200);
 const json=JSON.stringify({messages:[{text:'你这效率。',mode:'voice',tone:'dry'},{text:long,mode:'text',tone:'serious'}]});
 const noapp=unpackTaiReply({text:json},'noapp');
 assert.equal(noapp.length,2);
 assert.equal(noapp[0].mode,'voice');
 assert.equal(noapp[1].text,long);
 assert.equal(unpackTaiReply({text:json},'chess')[0].mode,'text');
 assert.equal(unpackTaiReply({text:json},'mirage')[0].mode,'text');
});

test('canonical Tai lore includes user-confirmed facts and safe before-recognition boundary',()=>{
 const prompt=buildTaiPrompt({day:35,channel:'mirage'});
 for(const term of ['Dr Ouroboros','D05','JSON'])assert.ok(prompt.includes(term),term);
 assert.match(prompt,/D05/);
});

test('incoming NoApp call creates native-style banner notification and a real accept/reject UI',()=>{
 let state=initialState(),opened=null;
 const store={get:()=>state,update(fn){state=structuredClone(state);fn(state);}};
 const ctx={store,refresh:()=>{},router:{open(x){opened=x;}},toast:()=>{}};
 startIncoming(ctx);
 assert.equal(state.notifications[0].link.route,'/call');
 const html=callView(state);
 assert.match(html,/tai-accept/);assert.match(html,/tai-decline/);assert.match(html,/tai-portrait.svg/);
 assert.equal(callAction('tai-accept',ctx),true);
 assert.match(callView(state),/tai-call-bottom/);
 assert.equal(callAction('tai-expand',ctx),true);
 assert.match(callView(state),/tai-call-transcript/);
 assert.equal(callAction('tai-hangup',ctx),true);
 assert.equal(opened.route,'/chat/tai');
});

test('BYOK MiniMax builds numeric channel, sample rate and bitrate; keys are kept in session storage only',async()=>{
 const m=new Map();
 const oldSession=globalThis.sessionStorage,oldFetch=globalThis.fetch;
 globalThis.sessionStorage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
 let body;
 globalThis.fetch=async(url,opts)=>{body=JSON.parse(opts.body);return {ok:true,text:async()=>JSON.stringify({base_resp:{status_code:0},data:{audio:'494433'}})};};
 try{
  saveApiConfig({deepseek:'fake-test-ds',minimax:'fake-test-mm',region:'cn',ttsModel:'speech-2.8-hd',voiceId:'male-qn-qingse'});
  assert.equal(apiConfig().minimax,'fake-test-mm');
  const blob=await voicePreview({text:'阿蒙，你还没睡？'});
  assert.equal(blob.size,3);assert.equal(body.voice_setting.voice_id,'moss_audio_708f60ef-d45e-11f1-ac36-1658c5812fe4');assert.equal(body.audio_setting.channel,1);
  assert.equal(typeof body.audio_setting.channel,'number');
  assert.equal(typeof body.audio_setting.sample_rate,'number');
  assert.equal(typeof body.audio_setting.bitrate,'number');
  assert.equal(body.model,'speech-2.8-hd');
 }finally{
  clearApiConfig();if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;
  if(oldFetch===undefined)delete globalThis.fetch;else globalThis.fetch=oldFetch;
 }
});
