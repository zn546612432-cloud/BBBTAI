import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {saveApiConfig,clearApiConfig} from '../src/services/ai/gateway.js';
import {replyToTaiMessage} from '../src/services/ai/live-chat.js';
import {chatView} from '../src/components/chat.js';

const makeStore=()=>{
 const s=initialState();s.day=56;s.clock='21:20';
 const conversation=s.content.conversations.noapp.find(c=>c.id==='tai');
 conversation.messages.push({id:'u-v12',from:'me',text:'我终于把你上次给我的那段代码改完了',day:56,time:'21:20',actual:true,kind:'text'});
 return {s,conversation,store:{get:()=>s,update:fn=>fn(s)}};
};
async function withDeepSeekMock(generator,fn){
 const oldFetch=globalThis.fetch,oldStorage=globalThis.sessionStorage,storage=new Map();
 globalThis.sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 saveApiConfig({deepseek:'testing-token-only',minimax:'',model:'deepseek-flash'});
 const calls=[];
 globalThis.fetch=async (_url,init)=>{
  const body=JSON.parse(init.body),system=body.messages[0].content;
  calls.push({system,body});
  const content=system.includes('【行为决策层】')
   ?JSON.stringify({schema_version:10,source_message_id:'u-v12',action:'send_text',strategy:'tease',tone:'dry',vocal_cue:'small_laugh',intent:'对哥哥的源码改造感兴趣'})
   :JSON.stringify({messages:generator({system,calls})});
  return new Response(JSON.stringify({choices:[{message:{content}}]}),{status:200,headers:{'content-type':'application/json'}});
 };
 try{await fn(calls);}finally{clearApiConfig();globalThis.fetch=oldFetch;if(oldStorage===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldStorage;}
}
const quick={random:()=>0,wait:async()=>{},now:()=>1234567};
test('actual NoApp runtime sends 3 distinct bubbles when sampled and saves exact debug audit',async()=>{
 const {s,conversation,store}=makeStore();let expressions=0;
 await withDeepSeekMock(({system})=>{
  expressions++;
  if(expressions===1)return [{text:'居然改完了？',tone:'dry'}];
  return [{text:'拿来让我看看。'},{text:'你动的是加密层还是运行层？'}];
 },async calls=>{
  const result=await replyToTaiMessage(store,'u-v12',quick);
  assert.equal(result.status,'replied');
  assert.equal(result.count,3);
  assert.deepEqual(conversation.messages.filter(m=>m.replySourceId==='u-v12').map(m=>m.text),
   ['居然改完了？','拿来让我看看','你动的是加密层还是运行层？']);
  assert.equal(calls.length,3);
  assert.match(calls[1].system,/本轮要表达3条独立聊天气泡/);
  assert.match(calls[1].system,/30%引导型人格已经触发/);
  const event=s.events.filter(e=>e.type==='tai_v12_turn_plan').at(-1);
  assert.equal(event.target,3);assert.equal(event.emitted,3);assert.equal(event.guided,true);
  const html=chatView(s,'noapp','tai');
  assert.match(html,/你动的是加密层还是运行层/);
 });
});
test('a sampled single-line guide can still ask a real question without fake extra bubbles',async()=>{
 const {s,conversation,store}=makeStore();
 let expression=0;
 const rolls=[0.70,0.1,0.9];const rand=()=>rolls.shift()??0.6; // one bubble, guided, but no optional semicolon burst
 await withDeepSeekMock(({system})=>{
  if(system.includes('【本轮引导确实触发'))return [{text:'你把原来哪一部分重写了？'}];
  return [{text:'哦，真让你做成了。'}];
 },async calls=>{
  const result=await replyToTaiMessage(store,'u-v12',{...quick,random:rand});
  assert.equal(result.count,1);
  const sent=conversation.messages.filter(m=>m.replySourceId==='u-v12');
  assert.equal(sent.length,1);
  assert.match(sent[0].text,/真让你做成了/);
  assert.match(sent[0].text,/你把原来哪一部分重写了？/);
  assert.equal(calls.length,3);
  assert.equal(s.events.filter(e=>e.type==='tai_v12_turn_plan').at(-1).target,1);
 });
});
