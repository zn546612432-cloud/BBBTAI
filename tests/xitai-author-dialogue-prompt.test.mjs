import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {AUTHOR_XITAI_RECOGNIZED_EXAMPLES,authorXitaiDialogueExamples} from '../src/services/ai/author-dialogue-examples.js';
import {askTai,BYOK_SESSION} from '../src/services/ai/gateway.js';

const makeInput=(extra={})=>({
 day:37,channel:'noapp',recognized:true,outputMode:'text',
 messages:[{role:'user',content:'我想你了'}],memories:[],scene:''
 ,...extra
});

test('author supplied actual dialogue is visible in NoApp text, voice and connected-call second-stage prompts',()=>{
 assert.equal(AUTHOR_XITAI_RECOGNIZED_EXAMPLES.length,4);
 const excerpts=[
  '我想你了','有多想？','你是在想我的脸',
  '我就是想你了不行吗！','我也想你。','我以为这是你想听的',
  '给我打电话','行，我现在打。',
  '我的童年？','养父母？','精英教育？','高中谈了几次恋爱？',
  '又怎么了，公主殿下？','你叫我一声哥哥，我可以考虑帮你。',
  '这点小事也要让我出手？','代购费从你的mirage账号扣'
 ];
 for(const mode of ['text','voice','call']){
  const prompt=buildTaiPrompt(makeInput({outputMode:mode}));
  for(const phrase of excerpts)assert.ok(prompt.includes(phrase),mode+' missing user original phrase: '+phrase);
  assert.match(prompt,/不是历史消息/);
  assert.match(prompt,/禁止照抄/);
  assert.match(prompt,/健身房.*示例当时的语境/);
  assert.match(prompt,/熙泰是三胞胎最小的弟弟/);
  assert.match(prompt,/电话.*程序/);
 }
});

test('never expose recognized private-family examples to anonymous MIRAGE or to pre-recognition characters',()=>{
 for(const item of [
  {channel:'mirage',recognized:false,day:13},
  {channel:'mirage',recognized:true,day:39},
  {channel:'noapp',recognized:false,day:37},
  {channel:'chess',recognized:false,day:30}
 ]){
  const prompt=buildTaiPrompt(makeInput(item));
  assert.doesNotMatch(prompt,/作者本人提供的陈熙泰原始对白示例/);
  assert.doesNotMatch(prompt,/刚练完五十组飞鸟/);
  assert.doesNotMatch(prompt,/高中谈了几次恋爱/);
 }
 assert.equal(authorXitaiDialogueExamples({channel:'mirage',recognized:true}), '');
 assert.match(buildTaiPrompt(makeInput({channel:'chess',recognized:true})),/作者本人提供的陈熙泰原始对白示例/);
});

test('the actual askTai DeepSeek payload includes user examples (not merely docs, dev UI or static exports)',async()=>{
 const oldFetch=globalThis.fetch,oldSession=globalThis.sessionStorage,oldLocal=globalThis.localStorage;
 const requests=[];
 globalThis.sessionStorage={getItem:key=>key===BYOK_SESSION?JSON.stringify({deepseek:'test-key'}):null};
 globalThis.localStorage={getItem:()=>null};
 globalThis.fetch=async(url,init)=>{
  requests.push({url:String(url),body:JSON.parse(init.body)});
  return Response.json({choices:[{message:{content:'{"messages":[{"text":"知道了。","mode":"text"}]}'}}]});
 };
 try{
  for(const mode of ['text','voice','call']){
   const response=await askTai(makeInput({outputMode:mode}));
   assert.ok(response.text.includes('知道了'));
  }
  assert.equal(requests.length,3);
  for(const r of requests){
   assert.match(r.url,/deepseek\.com\/chat\/completions/);
   assert.match(r.body.messages[0].content,/我以为这是你想听的/);
   assert.match(r.body.messages[0].content,/我的童年？/);
   assert.match(r.body.messages[0].content,/代购费从你的mirage账号扣/);
   assert.equal(r.body.messages[0].role,'system');
   assert.equal(r.body.messages[1].role,'user');
  }
 }finally{
  if(oldFetch===undefined)delete globalThis.fetch;else globalThis.fetch=oldFetch;
  if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;
  if(oldLocal===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldLocal;
 }
});

test('example records are immutable authored references and never an event/real chat source',()=>{
 for(const record of AUTHOR_XITAI_RECOGNIZED_EXAMPLES){
  assert.ok(record.source.includes('作者'));
  assert.ok(record.whatToLearn.length>15);
  assert.ok(record.notFacts.length>10);
  assert.ok(record.turns.every(t=>t.length===2&&t[0]&&t[1]));
 }
});
