import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {voicePreview,saveApiConfig,clearApiConfig,XITAI_VOICE_ID} from '../src/services/ai/gateway.js';
import {replyToTaiMessage,synthesizeVoiceNotes} from '../src/services/ai/live-chat.js';
import {maybeSendProactive} from '../src/services/ai/proactive.js';
import {convertTaiTextToVoice} from '../src/apps/noapp/voice-call.js';
import {explainMinimaxFailure} from '../src/services/voice/minimax-diagnostics.js';
import {loadClip,saveClip,clipIsTemporary} from '../src/services/voice/audio-store.js';

// Exercise the real transport -> queue -> IndexedDB -> chat path. The provider
// and IndexedDB event source are the only substitutes; no real keys or charges.
let abortWrite=false;
const clips=new Map();
const db={onversionchange:null,close(){},transaction(){
 const tx={error:null,objectStore:()=>({put(blob,id){const req={error:null};queueMicrotask(()=>{
  if(abortWrite)tx.onabort?.();else {clips.set(id,blob);tx.oncomplete?.();}
 });return req;},get(id){const req={result:clips.get(id)||null};queueMicrotask(()=>req.onsuccess?.());return req;}})};
 return tx;
}};
async function environment(run,{decision='send_voice',enabled=true,provider=null}={}){
 const originals=Object.fromEntries(['fetch','sessionStorage','indexedDB'].map(k=>[k,globalThis[k]]));
 const session=new Map(),requests=[];
 globalThis.sessionStorage={getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
 globalThis.indexedDB={open(){const req={result:db};queueMicrotask(()=>req.onsuccess?.());return req;}};
 saveApiConfig({deepseek:'test-deepseek',minimax:'test-minimax',region:'cn'});
 globalThis.fetch=async(url,init)=>{
  const body=JSON.parse(init.body);requests.push({url:String(url),body});
  if(String(url).includes('t2a_v2'))return provider?provider(body):Response.json({base_resp:{status_code:'0',status_msg:'success'},data:{audio:'4944330102'}});
  const isDecision=body.messages[0].content.includes('【行为决策层】');
  const content=isDecision?(decision==='invalid'?'{}':JSON.stringify({schema_version:10,action:decision,strategy:'tease',intensity:'low',tone:'dry'})):
   JSON.stringify({messages:[{text:'这个思路还不错，那个边界问题你怎么处理的？',mode:'voice'}]});
  return Response.json({choices:[{message:{content}}]});
 };
 const state=initialState();state.day=34;state.clock='21:30';state.story55={version:1,completed:{recognition:{day:30}}};
 state.aiDraft.behavior={maxMessages:1,autonomousVoice:enabled};
 const chat=state.content.conversations.noapp.find(c=>c.id==='tai');chat.messages=[];
 const store={get:()=>state,update:fn=>fn(state)};
 try{await run({requests,state,chat,store});await synthesizeVoiceNotes(store,[]);}
 finally{abortWrite=false;clearApiConfig();for(const [k,v] of Object.entries(originals)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
}
const fast={wait:async()=>{},random:()=>.99,now:()=>1000000};
const incoming=(state,chat,text='我修好了那个工具')=>chat.messages.push({id:'input',from:'me',text,kind:'text',day:state.day,time:state.clock,actual:true});
test('D34 self-chosen voice produces one cached MP3 without a player voice request',async()=>{
 await environment(async({requests,state,chat,store})=>{
  incoming(state,chat);
  assert.equal((await replyToTaiMessage(store,'input',fast)).status,'replied');
  await synthesizeVoiceNotes(store,[]);
  const sent=chat.messages.find(m=>m.replySourceId==='input');
  assert.equal(sent.kind,'voice');assert.equal(sent.voiceFailed,undefined);
  assert.equal((await loadClip(sent.audioId)).size,5);
  const tts=requests.filter(r=>r.url.includes('t2a_v2'));assert.equal(tts.length,1);
  assert.equal(tts[0].body.voice_setting.voice_id,XITAI_VOICE_ID);
  assert.equal(tts[0].body.voice_setting.emotion,'calm');
  assert.match(requests[0].body.messages[0].content,/不必等待熙蒙要求/);
 });
});
test('autonomous outreach can choose a real voice note with no new player message',async()=>{
 await environment(async({requests,chat,store})=>{
  assert.equal(await maybeSendProactive(store,{...fast,force:'topic'}),true);
  await synthesizeVoiceNotes(store,[]);
  assert.equal(chat.messages.length,1);assert.equal(chat.messages[0].proactive,true);
  assert.equal(chat.messages[0].kind,'voice');
  assert.equal(requests.filter(r=>r.url.includes('t2a_v2')).length,1);
 });
});
test('if decision phase is unavailable, NoApp still honours model-selected voice',async()=>{
 await environment(async({state,chat,store})=>{
  incoming(state,chat);await replyToTaiMessage(store,'input',fast);await synthesizeVoiceNotes(store,[]);
  assert.equal(chat.messages.at(-1).kind,'voice');
 },{decision:'invalid'});
});
test('turning off autonomous voice retains text, but explicit requests still work',async()=>{
 for(const explicit of [false,true])await environment(async({requests,state,chat,store})=>{
  incoming(state,chat,explicit?'给我发语音':'我修好了那个工具');
  await replyToTaiMessage(store,'input',fast);await synthesizeVoiceNotes(store,[]);
  assert.equal(chat.messages.at(-1).kind,explicit?'voice':'text');
  assert.equal(requests.filter(r=>r.url.includes('t2a_v2')).length,explicit?1:0);
 },{enabled:false});
});
test('provider failure retains HTTP and MiniMax error code and removes credentials',async()=>{
 await environment(async()=>{
  await assert.rejects(voicePreview({text:'听见了吗'}),error=>{
   assert.match(error.message,/1004/);assert.match(error.message,/401/);assert.match(error.message,/鉴权/);
   assert.doesNotMatch(error.message,/sk-private123456789|eyJhbGciOiJIUzI1NiJ9\.payload\.signature/);return true;
  });
 },{provider:()=>new Response(JSON.stringify({base_resp:{status_code:1004,status_msg:'invalid token sk-private123456789 eyJhbGciOiJIUzI1NiJ9.payload.signature'}}),{status:401})});
});
test('aborted Safari write retains playable audio and retry makes one request',async()=>{
 await environment(async({requests,state,chat,store})=>{
  abortWrite=true;
  assert.equal(await saveClip('abort',new Blob(['audio'])),'abort');
  assert.equal(clipIsTemporary('abort'),true);
  assert.equal(await (await loadClip('abort')).text(),'audio');
  abortWrite=false;
  chat.messages.push({id:'failed',from:'tai',text:'我听着呢。',kind:'text',voiceFailed:true,day:state.day,time:state.clock,actual:true});
  const ctx={store};
  const one=convertTaiTextToVoice(ctx,'failed'),two=convertTaiTextToVoice(ctx,'failed');assert.equal(one,two);
  await Promise.all([one,two]);assert.equal(chat.messages.at(-1).kind,'voice');
  assert.equal(chat.messages.at(-1).voiceFailed,undefined);assert.equal(chat.messages.at(-1).voiceError,undefined);
  assert.equal(requests.filter(r=>r.url.includes('t2a_v2')).length,1);
 });
});
test('empty native error still yields its DOMException name',()=>{
 assert.match(explainMinimaxFailure({name:'AbortError',message:''}),/Safari/);
 assert.doesNotMatch(explainMinimaxFailure(null),/原因暂时未知|\[object Object\]/);
});
