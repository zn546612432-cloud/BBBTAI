import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {chatView} from '../src/components/chat.js';
import {explainMinimaxFailure,minimaxUnavailableOnGithubPages} from '../src/services/voice/minimax-diagnostics.js';
import {voicePreview} from '../src/services/ai/gateway.js';

test('MiniMax failures distinguish network, bad keys, provider voice ID and Safari storage',()=>{
 const cors=explainMinimaxFailure(Error('供应商请求被网络或浏览器跨域策略拦截；请使用同源安全网关'));
 assert.match(cors,/跨域 CORS/);
 assert.match(cors,/服务端代理/);
 assert.match(explainMinimaxFailure(Error('HTTP 401 Unauthorized'),{region:'intl'}),/国际站/);
 assert.match(explainMinimaxFailure(Error('voice_id not found')),/固定音色/);
 assert.match(explainMinimaxFailure(Error('Insufficient balance')),/余额/);
 assert.match(explainMinimaxFailure(Error('QuotaExceededError')),/Safari/);
 assert.match(explainMinimaxFailure(Error('too many requests 429')),/过于频繁/);
});
test('MiniMax provider string never exposes known key formats to UI',()=>{
 const s=explainMinimaxFailure(Error('MiniMax Bearer test-sample-password-123 and sk-example-password-123 denied'));
 assert.doesNotMatch(s,/sk-example-password-123/);
 assert.doesNotMatch(s,/Bearer test-sample-password-123/);
});
test('only github.io hosts identify public static Pages without a voice endpoint',()=>{
 assert.equal(minimaxUnavailableOnGithubPages('zn546612432-cloud.github.io'),true);
 assert.equal(minimaxUnavailableOnGithubPages('my-server.example.com'),false);
 assert.equal(minimaxUnavailableOnGithubPages('fakegithub.io.evil.com'),false);
});
test('NoApp failed voice displays real explanation as visible text rather than a title tooltip',()=>{
 const s=initialState(),c=s.content.conversations.noapp.find(x=>x.id==='tai');
 c.messages=[{id:'failed',from:'tai',text:'我说两句',kind:'text',voiceFailed:true,voiceError:'当前 iPhone 浏览器无法直连 MiniMax',day:s.day,time:s.clock,actual:true}];
 const html=chatView(s,'noapp','tai');
 assert.match(html,/<strong>语音生成失败<\/strong>/);
 assert.match(html,/<p class="noapp-voice-error">当前 iPhone 浏览器无法直连 MiniMax<\/p>/);
 assert.match(html,/data-action="tai-convert-voice" data-id="failed"/);
 assert.doesNotMatch(html,/title="当前 iPhone 浏览器无法直连 MiniMax"/);
});
test('GitHub Pages missing MiniMax Key fails before a non-existent /api/voice/tts fetch',async()=>{
 const oldSession=globalThis.sessionStorage,oldLocation=globalThis.location,oldFetch=globalThis.fetch;
 let fetched=0;
 try{
  globalThis.sessionStorage={getItem(){return '{}';},setItem(){},removeItem(){}};
  globalThis.location={hostname:'zn546612432-cloud.github.io'};
  globalThis.fetch=()=>{fetched++;throw Error('should not fetch')};
  await assert.rejects(voicePreview({text:'嗯。'}),/没有可用的 MiniMax API Key/);
  assert.equal(fetched,0);
 }finally{
  if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;
  if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation;
  if(oldFetch===undefined)delete globalThis.fetch;else globalThis.fetch=oldFetch;
 }
});
