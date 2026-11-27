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
 assert.equal(AUTHOR_XITAI_RECOGNIZED_EXAMPLES.length,1);
 const excerpts=[
  '怎么，想听我小时候的事？','等到我们见面的时候，说不定我会跟你说。','…真是怕了你了。收养我的夫妇是葡萄牙人，我自然是在葡萄牙长大。'
 ];
 for(const mode of ['text','voice','call']){
  const prompt=buildTaiPrompt(makeInput({outputMode:mode}));
  for(const phrase of excerpts)assert.ok(prompt.includes(phrase),mode+' missing user original phrase: '+phrase);
  assert.doesNotMatch(prompt,/公主殿下|代购费从你的mirage账号扣|我以为这是你想听的/);
  assert.match(prompt,/不是历史消息/);
  assert.match(prompt,/禁止照抄/);
  assert.match(prompt,/作者最终纠正：不要无关添加自我报备/);
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
 assert.doesNotMatch(prompt,/等到我们见面的时候，说不定我会跟你说/);
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
  if(String(url).includes('/tai-v8-persona'))return Response.json({
   ok:true,character_key:'chen_xitai',version:'v8-b-2026-11-05',
   content:{personality:{central_conflict:'有独立的情绪'},speech:{primary_attention:'更好奇熙蒙'}}
  });
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
   assert.doesNotMatch(r.body.messages[0].content,/我以为这是你想听的/);
   assert.match(r.body.messages[0].content,/怎么，想听我小时候的事？/);
   assert.doesNotMatch(r.body.messages[0].content,/代购费从你的mirage账号扣/);
   assert.match(r.body.messages[0].content,/最高优先级：作者已批准的Supabase陈熙泰 V8-B/);
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

import {AUTHOR_XITAI_DAILY_EXAMPLES,authorXitaiDailyExamples} from '../src/services/ai/author-dialogue-examples.js';
import {hasTaiServiceFormula} from '../src/services/ai/expression-style.js';
import {taiTimeContradiction} from '../src/services/ai/life-context.js';
test('approved daily references match the latest topic, not old turns',()=>{
 assert.equal(AUTHOR_XITAI_DAILY_EXAMPLES.length,3);
 for(const [topic,line] of [['想和你視頻','在開會'],['給我發語音','怎麼了 想聽我的聲音？'],['奔現','你來找我？']]){
  const messages=[{role:'user',content:topic}];
  for(const mode of ['text','voice','call'])assert.ok(buildTaiPrompt(makeInput({messages,outputMode:mode})).includes(line));
  assert.equal(authorXitaiDailyExamples(messages).length,1);
  assert.ok(!buildTaiPrompt(makeInput({messages,recognized:false})).includes(line));
 }
 assert.equal(authorXitaiDailyExamples([{role:'user',content:'給我發語音'},{role:'user',content:'今天下雨了'}]).length,0);
});
test('reported service formulas are rejected; natural short replies are valid',()=>{
 for(const t of ['剛才確實在忙，沒故意晾著你','不是故意冷著你，手頭的事還沒處理完','見面的事我沒想敷衍你','等我這邊的事處理完，我們再好好說','行，給你發一條。'])assert.ok(hasTaiServiceFormula([t]),t);
 for(const t of ['在開會','還在生氣？','怎麼了 想聽我的聲音？','你來找我？','今天不方便'])assert.ok(!hasTaiServiceFormula([t]),t);
});
test('meal checks use Macau for Ximeng and allow explicit past meals',()=>{
 const clocks={macauClock:'18:59',londonClock:'11:59'};
 assert.ok(taiTimeContradiction(['你那邊早上，吃早飯了沒'],clocks));
 assert.ok(taiTimeContradiction(['吃早飯了沒'],clocks));
 assert.ok(!taiTimeContradiction(['吃晚飯了沒'],clocks));
 assert.ok(!taiTimeContradiction(['你今天早上吃早飯了沒'],clocks));
 assert.ok(!taiTimeContradiction(['我這邊快中午了'],clocks));
});
