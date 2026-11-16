import test from 'node:test';
import assert from 'node:assert/strict';
import {askTear,apiConfig,saveApiConfig} from '../src/services/ai/gateway.js';

test('small TAI always uses V4.1 Flash non-thinking in its direct, local and production cloud paths',async()=>{
 const old={fetch:globalThis.fetch,sessionStorage:globalThis.sessionStorage,localStorage:globalThis.localStorage,location:globalThis.location};
 const map=new Map(),local=new Map(),calls=[];
 const storage=m=>({getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)});
 globalThis.sessionStorage=storage(map);globalThis.localStorage=storage(local);globalThis.location={hostname:'localhost'};
 globalThis.fetch=async(url,init)=>{
  const body=JSON.parse(init.body);calls.push({url:String(url),body});
  const text=JSON.stringify({reply:'我在。'});
  return new Response(JSON.stringify(String(url).startsWith('https://api.deepseek.com')?{choices:[{message:{content:text}}]}:{text}),{status:200});
 };
 const request={day:28,messages:[{role:'user',content:'你好'}]};
 try{
  saveApiConfig({model:'deepseek-v4-pro',deepseek:'not-a-real-key'});
  await askTear(request);
  assert.equal(calls[0].body.model,'deepseek-flash');
  assert.deepEqual(calls[0].body.thinking,{type:'disabled'});
  saveApiConfig({model:'deepseek-v4-pro',deepseek:''});
  await askTear(request);
  assert.equal(calls[1].url,'/api/ai/chat');assert.equal(calls[1].body.model,'deepseek-flash');
  globalThis.location={hostname:'zn546612432-cloud.github.io'};
  local.set('ximeng-tai-gateway-auth-v1',JSON.stringify({access_token:'mock-auth',expires_at:Date.now()/1000+3600}));
  await askTear(request);
  assert.equal(calls[2].body.op,'chat');assert.equal(calls[2].body.payload.model,'deepseek-flash');
  assert.deepEqual(calls[2].body.payload.thinking,{type:'disabled'});
  assert.equal(apiConfig().model,'deepseek-v4-pro');
 }finally{for(const [name,value] of Object.entries(old))globalThis[name]=value;}
});
