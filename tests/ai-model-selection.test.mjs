import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {deepseekModelOptions,normalizeDeepSeekModel,DEEPSEEK_MODELS} from '../src/services/ai/model-config.js';
import {apiConfig,saveApiConfig,askTai,BYOK_SESSION} from '../src/services/ai/gateway.js';
import {handleAIGateway} from '../server/ai-gateway.mjs';

test('only two allowlisted models; V4 Pro is explicitly non-thinking at temperature 1.3',()=>{
 assert.equal(DEEPSEEK_MODELS.length,2);
 assert.deepEqual(deepseekModelOptions('deepseek-v4-pro'),{
  model:'deepseek-v4-pro',thinking:{type:'disabled'},temperature:1.3
 });
 assert.deepEqual(deepseekModelOptions('deepseek-flash'),{
  model:'deepseek-flash',thinking:{type:'disabled'}
 });
 assert.equal(normalizeDeepSeekModel('strange-or-untrusted'),'deepseek-flash');
 assert.deepEqual(deepseekModelOptions(undefined),deepseekModelOptions('deepseek-flash'));
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
   assert.equal(req.temperature,1.3);
  }
  saveApiConfig({deepseek:'mocked-not-real',model:'untrusted'});
  assert.equal(apiConfig().model,'deepseek-flash');
 }finally{globalThis.fetch=originalFetch;globalThis.sessionStorage=originalSession;}
});

test('local API gateway honors selected V4 Pro model without changing default Flash',async()=>{
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
  assert.equal(seen.length,2);
  assert.equal(seen[0].model,'deepseek-v4-pro');
  assert.deepEqual(seen[0].thinking,{type:'disabled'});
  assert.equal(seen[0].temperature,1.3);
  assert.equal(seen[1].model,'deepseek-flash');
  assert.deepEqual(seen[1].thinking,{type:'disabled'});
  assert.equal(Object.hasOwn(seen[1],'temperature'),false);
 }finally{
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  globalThis.fetch=originalFetch;
  if(oldKey===undefined)delete process.env.DEEPSEEK_API_KEY;else process.env.DEEPSEEK_API_KEY=oldKey;
 }
});
