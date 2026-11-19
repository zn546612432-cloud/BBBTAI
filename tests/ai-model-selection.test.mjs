import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {deepseekModelOptions,normalizeDeepSeekModel,DEEPSEEK_MODELS} from '../src/services/ai/model-config.js';
import {apiConfig,saveApiConfig,askTai,BYOK_SESSION,AI_PREFERENCES} from '../src/services/ai/gateway.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {XITAI_EXPRESSION_STYLE,XITAI_DECISION_STYLE,hasBannedTaiConstruction} from '../src/services/ai/expression-style.js';
import {taiActionDecisionPrompt} from '../src/services/ai/action-protocol-v10.js';
import {handleAIGateway} from '../server/ai-gateway.mjs';

test('only two allowlisted models; V4 Pro defaults to non-thinking at temperature and top_p 0.6',()=>{
 assert.equal(DEEPSEEK_MODELS.length,2);
 assert.deepEqual(deepseekModelOptions('deepseek-v4-pro'),{
  model:'deepseek-v4-pro',thinking:{type:'disabled'},temperature:0.6,top_p:0.6
 });
 assert.deepEqual(deepseekModelOptions('deepseek-flash'),{
  model:'deepseek-flash',thinking:{type:'disabled'}
 });
 assert.equal(normalizeDeepSeekModel('strange-or-untrusted'),'deepseek-v4-pro');
 assert.deepEqual(deepseekModelOptions(undefined),deepseekModelOptions('deepseek-v4-pro'));
});

test('legacy saved settings migrate without changing credentials or voice; later manual choices persist',()=>{
 const oldSession=globalThis.sessionStorage,oldLocal=globalThis.localStorage;
 const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
 globalThis.sessionStorage=memory();globalThis.localStorage=memory();
 try{
  const old={model:'deepseek-flash',temperature:1.3,topP:1,pitch:-2,maxTokens:1536};
  localStorage.setItem(AI_PREFERENCES,JSON.stringify(old));
  sessionStorage.setItem(BYOK_SESSION,JSON.stringify({...old,deepseek:'test-only'}));
  const c=apiConfig();assert.equal(c.model,'deepseek-v4-pro');assert.equal(c.temperature,.6);assert.equal(c.topP,.6);
  assert.equal(c.deepseek,'test-only');assert.equal(c.pitch,-2);assert.equal(c.maxTokens,1536);
  saveApiConfig({...c,temperature:.8,topP:.9,model:'deepseek-flash'});
  sessionStorage.removeItem(BYOK_SESSION);
  assert.equal(apiConfig().temperature,.8);assert.equal(apiConfig().topP,.9);assert.equal(apiConfig().model,'deepseek-flash');
 }finally{globalThis.sessionStorage=oldSession;globalThis.localStorage=oldLocal;}
});

test('natural expression preferences are final even after approved cloud examples, in text, voice and call',()=>{
 for(const outputMode of ['text','voice','call']){
  const prompt=buildTaiPrompt({channel:'noapp',day:40,recognized:true,outputMode,approvedPersona:'approved cloud dialogue examples'});
  assert.ok(prompt.endsWith(XITAI_EXPRESSION_STYLE));
  assert.ok(prompt.indexOf('approved cloud dialogue examples')<prompt.indexOf(XITAI_EXPRESSION_STYLE));
  assert.match(prompt,/主語在語境清楚時可以省略/);
  assert.match(prompt,/陳述句為主/);
  for(const pattern of ['不是……而是……','別……才……','把……那叫……','不……不……'])assert.ok(prompt.includes(pattern));
  assert.doesNotMatch(prompt,/每個有完整語意的陳述句.*必須有明確的主語/);
 }
 const decision=taiActionDecisionPrompt({channel:'noapp',day:40,recognized:true});
 assert.ok(decision.includes(XITAI_DECISION_STYLE));
 assert.match(decision,/不要傲嬌、毒舌、故意挖苦/);
 assert.doesNotMatch(decision,/strategy 仅可选：[^。]*\btease\b/);
});

test('banned constructions trigger only a bounded corrective generation',async()=>{
 for(const line of ['不是你的錯，而是我的錯。','別急，這才開始。','把這個放下，那叫尊重。','我不習慣主動說，不是故意只問你。'])assert.ok(hasBannedTaiConstruction([line]));
 assert.ok(hasBannedTaiConstruction(['不是我想的','而是你決定的']));
 assert.ok(hasBannedTaiConstruction(['不是故意瞞你。','只是我本來就不習慣主動說這些。']));
 assert.ok(hasBannedTaiConstruction(['我爱你，熙蒙。不是勉强承认，是因为你这个人。']));
 assert.ok(hasBannedTaiConstruction(['不是勉強承認。','是因為你這個人。']));
 assert.ok(hasBannedTaiConstruction(['並非一時衝動','是我早就想說的話。']));
 assert.equal(hasBannedTaiConstruction(['我沒想過會在這裡遇見你。','你還記得那件事嗎？']),false);
 assert.equal(hasBannedTaiConstruction(['我不想出門。','那家店不遠。','還有點事。']),false);
 assert.equal(hasBannedTaiConstruction(['不過早就不上課了。']),false);
 const oldSession=globalThis.sessionStorage,oldFetch=globalThis.fetch,db=new Map(),requests=[];
 globalThis.sessionStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,v),removeItem:k=>db.delete(k)};
 globalThis.fetch=async(url,init)=>{requests.push(JSON.parse(init.body));return Response.json({choices:[{message:{content:JSON.stringify({messages:[{text:requests.length===1?'我不習慣主動講，不是故意的。':'我習慣把私事留給自己。',mode:'text'}]})}}]});};
 try{
  saveApiConfig({deepseek:'test-only',model:'deepseek-v4-pro'});
  const reply=await askTai({channel:'noapp',day:40,recognized:true,messages:[{role:'user',content:'你怎麼總是問我？'}]});
  assert.match(reply.text,/我習慣把私事留給自己/);
  assert.equal(requests.length,2);
  assert.match(requests[1].messages[0].content,/上一稿語法修正/);
  assert.equal(requests[1].temperature,.6);assert.equal(requests[1].top_p,.6);
 }finally{globalThis.sessionStorage=oldSession;globalThis.fetch=oldFetch;}
});

test('browser session saves model choice; direct API and retry both use V4 Pro settings',async()=>{
 const originalFetch=globalThis.fetch,originalSession=globalThis.sessionStorage;
 const db=new Map();const requests=[];
 globalThis.sessionStorage={
  getItem:k=>db.get(k)??null,
  setItem:(k,v)=>db.set(k,v),
  removeItem:k=>db.delete(k)
 };
 globalThis.fetch=async(url,init)=>{
  assert.equal(String(url),'https://api.deepseek.com/chat/completions');
  const payload=JSON.parse(init.body);requests.push(payload);
  assert.equal(init.headers.Authorization,'Bearer mocked-not-real');
  return new Response(JSON.stringify({choices:[{message:{content:requests.length===1?'   ':'{"messages":[{"text":"刚从健身房回来。","mode":"text","tone":"dry"}]}'}}]}),{status:200,headers:{'content-type':'application/json'}});
 };
 try{
  const c=saveApiConfig({deepseek:'mocked-not-real',model:'deepseek-v4-pro',minimax:'',region:'cn'});
  assert.equal(c.model,'deepseek-v4-pro');
  assert.equal(apiConfig().model,'deepseek-v4-pro');
  assert.equal(JSON.parse(db.get(BYOK_SESSION)).model,'deepseek-v4-pro');
  const res=await askTai({channel:'noapp',day:60,messages:[{role:'user',content:'今天怎么样？'}]});
  assert.match(res.text,/健身房/);
  assert.equal(requests.length,2,'Fallback request must use same model config');
  for(const req of requests){
   assert.equal(req.model,'deepseek-v4-pro');
   assert.deepEqual(req.thinking,{type:'disabled'});
   assert.equal(req.temperature,.6);
   assert.equal(req.top_p,.6);
  }
  saveApiConfig({deepseek:'mocked-not-real',model:'untrusted'});
  assert.equal(apiConfig().model,'deepseek-v4-pro');
 }finally{globalThis.fetch=originalFetch;globalThis.sessionStorage=originalSession;}
});

test('local API gateway honors selected model and keeps Tear on Flash',async()=>{
 const oldKey=process.env.DEEPSEEK_API_KEY,originalFetch=globalThis.fetch;
 const seen=[];
 process.env.DEEPSEEK_API_KEY='mock-local-key';
 const nativeFetch=originalFetch;
 globalThis.fetch=(url,init)=>{
  if(String(url).startsWith('https://api.deepseek.com')){
   seen.push(JSON.parse(init.body));
   return Promise.resolve(new Response(JSON.stringify({choices:[{message:{content:'{"messages":[{"text":"晚上好。","mode":"text"}]}'}}]}),{status:200,headers:{'content-type':'application/json'}}));
  }
  return nativeFetch(url,init);
 };
 const server=createServer((req,res)=>handleAIGateway(req,res,new URL(req.url,'http://localhost').pathname));
 try{
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  for(const model of ['deepseek-v4-pro','deepseek-flash']){
   const r=await nativeFetch(base+'/api/ai/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
    channel:'noapp',day:60,model,messages:[{role:'user',content:'今晚有空吗？'}]
   })});
   assert.equal(r.status,200);
  }
  const tear=await nativeFetch(base+'/api/ai/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
   channel:'tear',day:28,model:'deepseek-v4-pro',messages:[{role:'user',content:'目前進度如何？'}]
  })});
  assert.equal(tear.status,200);
  assert.equal(seen.length,3);
  assert.equal(seen[0].model,'deepseek-v4-pro');
  assert.deepEqual(seen[0].thinking,{type:'disabled'});
  assert.equal(seen[0].temperature,.6);
  assert.equal(seen[0].top_p,.6);
  assert.equal(seen[1].model,'deepseek-flash');
  assert.deepEqual(seen[1].thinking,{type:'disabled'});
  assert.equal(Object.hasOwn(seen[1],'temperature'),false);
  assert.equal(seen[2].model,'deepseek-flash');
  assert.deepEqual(seen[2].thinking,{type:'disabled'});
 }finally{
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  globalThis.fetch=originalFetch;
  if(oldKey===undefined)delete process.env.DEEPSEEK_API_KEY;else process.env.DEEPSEEK_API_KEY=oldKey;
 }
});
