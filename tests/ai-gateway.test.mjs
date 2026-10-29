import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {handleAIGateway} from '../server/ai-gateway.mjs';

async function withGateway(run){
  const server=createServer((req,res)=>handleAIGateway(req,res,new URL(req.url,'http://localhost').pathname));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  try{await run(base);}finally{await new Promise(resolve=>server.close(resolve));}
}
const post=(base,path,obj)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(obj)});
test('gateway status never exposes API keys',async()=>{
  await withGateway(async base=>{
    const response=await fetch(base+'/api/ai/status'),status=await response.json();
    assert.equal(response.status,200);
    assert.equal(status.mode,'local-only');
    assert.equal(JSON.stringify(status).includes('API_KEY'),'false'==='true');
  });
});
test('missing key is a safe 503 and no fake model reply',async()=>{
  const old=process.env.DEEPSEEK_API_KEY;delete process.env.DEEPSEEK_API_KEY;
  try{await withGateway(async base=>{
    const r=await post(base,'/api/ai/chat',{day:56,channel:'noapp',messages:[{role:'user',content:'你好'}]});
    assert.equal(r.status,503);
    assert.match((await r.json()).error,/DEEPSEEK_API_KEY/);
  });}finally{if(old!==undefined)process.env.DEEPSEEK_API_KEY=old;}
});
test('forbidden NoApp before D56 and invalid voice ID rejected before provider request',async()=>{
  const oldDeep=process.env.DEEPSEEK_API_KEY,oldMini=process.env.MINIMAX_API_KEY;
  process.env.DEEPSEEK_API_KEY='fake';process.env.MINIMAX_API_KEY='fake';
  try{await withGateway(async base=>{
    let r=await post(base,'/api/ai/chat',{day:25,channel:'noapp',messages:[{role:'user',content:'hi'}]});
    assert.equal(r.status,400);
    r=await post(base,'/api/voice/tts',{text:'你好',voiceId:'../../secret'});
    assert.equal(r.status,400);
  });}finally{
    if(oldDeep===undefined)delete process.env.DEEPSEEK_API_KEY;else process.env.DEEPSEEK_API_KEY=oldDeep;
    if(oldMini===undefined)delete process.env.MINIMAX_API_KEY;else process.env.MINIMAX_API_KEY=oldMini;
  }
});
test('pre-D56 MIRAGE prompt preserves secret identity; provider keys remain server-side',async()=>{
  const old=process.env.DEEPSEEK_API_KEY,originalFetch=globalThis.fetch;
  process.env.DEEPSEEK_API_KEY='test-secret';
  let seen;
  globalThis.fetch=(url,init)=>String(url).startsWith('https://api.deepseek.com')
    ?(seen=init,Promise.resolve(new Response(JSON.stringify({choices:[{message:{content:'检查日志。'}}]}),{status:200,headers:{'content-type':'application/json'}})))
    :originalFetch(url,init);
  try{await withGateway(async base=>{
    const r=await post(base,'/api/ai/chat',{day:20,channel:'mirage',messages:[{role:'user',content:'怎么样'}]});
    assert.deepEqual(await r.json(),{text:'检查日志。',day:20,channel:'mirage'});
    const message=JSON.parse(seen.body).messages[0].content;
    assert.match(message,/D56 前不可揭露身份/);
    assert.equal(seen.headers.Authorization,'Bearer test-secret');
  });}finally{globalThis.fetch=originalFetch;if(old===undefined)delete process.env.DEEPSEEK_API_KEY;else process.env.DEEPSEEK_API_KEY=old;}
});
test('MiniMax returns hex MP3 as binary audio',async()=>{
  const old=process.env.MINIMAX_API_KEY,originalFetch=globalThis.fetch;
  process.env.MINIMAX_API_KEY='test-secret';
  globalThis.fetch=(url,init)=>String(url).startsWith('https://api.minimax.io')
    ?Promise.resolve(new Response(JSON.stringify({base_resp:{status_code:0},data:{audio:'494433'}}),{status:200,headers:{'content-type':'application/json'}}))
    :originalFetch(url,init);
  try{await withGateway(async base=>{
    const r=await post(base,'/api/voice/tts',{text:'你好',voiceId:'demo_voice'});
    assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'audio/mpeg');
    assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],[73,68,51]);
  });}finally{globalThis.fetch=originalFetch;if(old===undefined)delete process.env.MINIMAX_API_KEY;else process.env.MINIMAX_API_KEY=old;}
});
