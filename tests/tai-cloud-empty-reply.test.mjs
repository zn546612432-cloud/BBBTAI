import test from 'node:test';
import assert from 'node:assert/strict';
import {deepseekReply} from '../supabase/functions/tai-provider-gateway/deepseek-reply.js';
import {unpackTaiReply} from '../src/services/ai/format.js';
const request={model:'deepseek-flash',thinking:{type:'disabled'},max_tokens:2800,response_format:{type:'json_object'},messages:[{role:'system',content:'existing persona and story permissions'},{role:'user',content:'hi'},{role:'user',content:'你在干嘛'}]};
const response=content=>({choices:[{message:{content},finish_reason:'stop'}]});
for(const empty of ['',null,'   \n ','{}','{"messages":[]}','{"messages":[{"text":" "}]}']){
 test('blank JSON output recovers once into real visible speech: '+JSON.stringify(empty),async()=>{
  const calls=[];const before=structuredClone(request);
  const text=await deepseekReply(request,{send:async body=>{calls.push(body);return response(calls.length===1?empty:'在看你又給我發了什麼。');}});
  assert.equal(calls.length,2);assert.equal(calls[1].response_format.type,'text');
  assert.equal(calls[1].model,request.model);assert.deepEqual(calls[1].thinking,request.thinking);
  assert.deepEqual(calls[1].messages.slice(1),request.messages.slice(1));
  assert.ok(calls[1].messages[0].content.startsWith(request.messages[0].content));
  assert.deepEqual(request,before);assert.equal(unpackTaiReply({text},'mirage')[0].text,'在看你又給我發了什麼。');
 });
}
test('valid first response never makes a second provider call',async()=>{
 let count=0;const text=await deepseekReply(request,{send:async()=>{count++;return response('{"messages":[{"text":"怎麼？"}]}');}});
 assert.equal(count,1);assert.equal(unpackTaiReply({text},'mirage')[0].text,'怎麼？');
});
test('two empty results stop without exposing reasoning or fabricating a bubble',async()=>{
 let count=0;
 await assert.rejects(()=>deepseekReply(request,{send:async()=>{count++;return {choices:[{message:{content:' ',reasoning_content:'private reasoning'}}]};}}),e=>e.code===502&&e.message==='empty_model_reply');
 assert.equal(count,2);
});
test('provider errors are not retried; decisions remain structured',async()=>{
 let count=0;await assert.rejects(()=>deepseekReply(request,{send:async()=>{count++;throw Error('provider_rejected_429');}}),/provider_rejected_429/);assert.equal(count,1);
 const calls=[];assert.equal(await deepseekReply(request,{operation:'decision',send:async body=>{calls.push(body);return response(calls.length===1?' ':'{"action":"reply"}');}}),'{"action":"reply"}');
 assert.equal(calls[1].response_format.type,'json_object');
});
