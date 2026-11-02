import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {replyToTaiMessage,maybeResumeTaiDeferred} from '../src/services/ai/live-chat.js';
import {callState,callAction} from '../src/apps/noapp/voice-call.js';
import {chatView} from '../src/components/chat.js';
import {saveApiConfig,clearApiConfig} from '../src/services/ai/gateway.js';

function setup(input='在吗？'){
 const state=initialState();
 state.day=56;state.clock='21:30';
 const chat=state.content.conversations.noapp.find(c=>c.id==='tai');
 chat.messages.push({id:'u-v10',kind:'text',from:'me',text:input,day:56,time:'21:30',actual:true});
 return {state,chat,store:{get:()=>state,update:fn=>fn(state)}};
}
async function withMockDirect(action,run,{minimax=false,body='我听到了'}={}){
 const oldFetch=globalThis.fetch,oldSession=globalThis.sessionStorage;
 const storage=new Map();
 globalThis.sessionStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 const calls=[];
 saveApiConfig({deepseek:'fake-private-key',minimax:minimax?'fake-minimax-key':'',model:'deepseek-flash'});
 globalThis.fetch=async (url,init)=>{
  const request=JSON.parse(init.body);
  calls.push({url:String(url),system:request.messages[0].content});
  const decision=request.messages[0].content.includes('【行为决策层】');
  const content=decision?JSON.stringify({schema_version:10,source_message_id:'u-v10',action,
   strategy:'tease',intensity:'low',tone:'dry',vocal_cue:'small_laugh',intent:'关心熙蒙'}):
   JSON.stringify({messages:[{text:body,mode:'text',tone:'neutral'}]});
  return new Response(JSON.stringify({choices:[{message:{content}}]}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{await run(calls);}
 finally{clearApiConfig();globalThis.fetch=oldFetch;if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;}
}
const quick={wait:async()=>{},random:()=>0,now:()=>1000000};
const close=store=>callAction('tai-decline',{store,refresh:()=>{},toast:()=>{},router:{open:()=>{}}});

test('real read_no_reply marks receipt but sends zero bubbles and skips expression phase',async()=>{
 const {state,chat,store}=setup('我刚修好了代码');
 await withMockDirect('read_no_reply',async calls=>{
  const result=await replyToTaiMessage(store,'u-v10',quick);
  assert.equal(result.status,'read_no_reply');assert.equal(result.count,0);
  assert.equal(calls.length,1,'no expression request when intentionally silent');
  assert.equal(chat.messages.filter(m=>m.from==='tai'&&m.replySourceId==='u-v10').length,0);
  assert.equal(chat.messages.at(-1).taiReadAt,1000000);
  assert.match(chatView(state,'noapp','tai'),/tai-read-receipt/);
  assert.equal((await replyToTaiMessage(store,'u-v10',quick)).status,'scripted');
 });
});

test('defer_reply creates a real future retry time without claiming to read',async()=>{
 const {chat,store}=setup();
 await withMockDirect('defer_reply',async calls=>{
  const result=await replyToTaiMessage(store,'u-v10',quick);
  assert.equal(result.status,'deferred');assert.equal(result.retryAfterMs,90000);
  assert.equal(chat.messages.at(-1).taiDeferredUntil,1090000);
  assert.equal(chat.messages.at(-1).taiReadAt,undefined);
  assert.equal(chat.messages.filter(m=>m.from==='tai'&&m.replySourceId==='u-v10').length,0);
  assert.equal(calls.length,1);
 });
});

test('v10 start_call rings instead of writing a false phone promise',async()=>{
 const {state,chat,store}=setup('现在打电话');
 await withMockDirect('start_call',async calls=>{
  const result=await replyToTaiMessage(store,'u-v10',quick);
  assert.equal(result.status,'called');
  assert.equal(calls.length,1);
  assert.equal(callState().state,'ringing');
  assert.equal(chat.messages.filter(m=>m.from==='tai'&&m.replySourceId==='u-v10').length,0);
  assert.equal(state.events.filter(e=>e.type==='tai_text_call_trigger'&&e.protocol==='v10').length,1);
  close(store);
 },{minimax:true});
});

test('v10 text decision supplies expression prompt and controls tone without changing action',async()=>{
 const {chat,store}=setup('今天修复了一个 bug');
 await withMockDirect('send_text',async calls=>{
  const result=await replyToTaiMessage(store,'u-v10',quick);
  assert.equal(result.status,'replied');assert.equal(result.count,1);
  assert.equal(calls.length,2);
  assert.match(calls[1].system,/v10已批准行为/);
  assert.match(calls[1].system,/action=send_text/);
  assert.equal(chat.messages.at(-1).text,'我听到了');
  assert.equal(chat.messages.at(-1).aiTone,'dry');
  assert.equal(chat.messages.at(-1).vocalCue,'small_laugh');
 });
});

test('missing MiniMax downgrades send_voice to text instead of fake playable audio',async()=>{
 const {chat,store}=setup('给我发语音');
 await withMockDirect('send_voice',async calls=>{
  const result=await replyToTaiMessage(store,'u-v10',quick);
  assert.equal(result.status,'replied');
  assert.equal(chat.messages.at(-1).kind,'text');
  assert.equal(chat.messages.at(-1).voiceRequested,false);
  assert.equal(calls.length,2);
 },{minimax:false});
});

test('end_session marks actual read and ends silently without claiming offline',async()=>{
 const {state,chat,store}=setup('我不想聊了');
 await withMockDirect('end_session',async calls=>{
  const result=await replyToTaiMessage(store,'u-v10',quick);
  assert.equal(result.status,'end_session');assert.equal(calls.length,1);
  assert.equal(chat.messages.at(-1).taiReadAt,1000000);
  assert.ok(state.events.some(e=>e.type==='tai_action_end_session'));
  assert.equal(chat.messages.filter(m=>m.from==='tai'&&m.replySourceId==='u-v10').length,0);
 });
});

test('stored deferred action can resume after reload-style poll but cannot defer repeatedly',async()=>{
 const {chat,store}=setup('昨天的工具我修好了');
 const original=chat.messages.at(-1);
 original.taiDeferredUntil=900000;
 original.taiDeferredCount=1;
 await withMockDirect('defer_reply',async calls=>{
  const task=maybeResumeTaiDeferred(store,{now:()=>1000000,wait:async()=>{}});
  assert.ok(task&&typeof task.then==='function');
  await task;
  assert.equal(chat.messages.filter(m=>m.replySourceId==='u-v10').length,1);
  assert.equal(chat.messages.at(-1).text,'我听到了');
  assert.equal(calls.length,2);
  assert.equal(maybeResumeTaiDeferred(store,{now:()=>1000000}),false);
 });
});
