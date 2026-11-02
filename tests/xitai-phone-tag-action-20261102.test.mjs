import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTaiPhoneDirective,mayStartTaggedCall} from '../src/services/ai/phone-directive.js';
import {unpackTaiReply} from '../src/services/ai/format.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {replyToTaiMessage} from '../src/services/ai/live-chat.js';
import {initialState} from '../src/services/storage.js';
import {callAction,callState} from '../src/apps/noapp/voice-call.js';

test('leading (phone) and fullwidth marker are removed before display and TTS',()=>{
 assert.deepEqual(parseTaiPhoneDirective('(phone)行，我现在打'),{phone:true,text:'行，我现在打'});
 assert.deepEqual(parseTaiPhoneDirective('（phone） + 现在打过来'),{phone:true,text:'现在打过来'});
 assert.deepEqual(parseTaiPhoneDirective('我说的是 (phone) 这个词'),{phone:false,text:'我说的是 (phone) 这个词'});
 const data={text:JSON.stringify({messages:[{text:'(phone)行，我现在打。',mode:'voice',tone:'dry'}]})};
 const [reply]=unpackTaiReply(data,'noapp');
 assert.equal(reply.text,'行，我现在打');
 assert.equal(reply.mode,'text');
 assert.equal(reply.phone,true);
 assert.ok(!reply.speechText,'phone is never a recorded voice bubble');
 const [otherChannel]=unpackTaiReply(data,'mirage');
 assert.equal(otherChannel.phone,undefined);
 assert.equal(otherChannel.text,'行，我现在打。');
});
test('a valid action is a model decision, not a quoted word or delayed promise',()=>{
 assert.equal(mayStartTaggedCall([{text:'行，我现在打',phone:true}]),true);
 assert.equal(mayStartTaggedCall([{text:'行，我现在打'}]),false);
 assert.equal(mayStartTaggedCall([{text:'等我几分钟洗完澡',phone:true}]),false);
 assert.equal(mayStartTaggedCall([{text:'(phone)只是解释这个标签'}]),false);
});
test('prompt permits exactly one machine call tag for NoApp text, never in current phone call or MIRAGE',()=>{
 const noapp=buildTaiPrompt({day:40,channel:'noapp',outputMode:'text',recognized:true});
 assert.match(noapp,/NoApp 来电动作指令/);
 assert.match(noapp,/\\\(phone\\\)|\(phone\)/);
 assert.match(noapp,/没有 \(phone\) 系统不会发起电话/);
 const call=buildTaiPrompt({day:40,channel:'noapp',outputMode:'call',recognized:true});
 assert.doesNotMatch(call,/NoApp 来电动作指令/);
 const mirage=buildTaiPrompt({day:40,channel:'mirage',outputMode:'text',recognized:false});
 assert.doesNotMatch(mirage,/NoApp 来电动作指令/);
});
async function simulatedReply({modelText='(phone)行，我现在打。',user='现在给我打电话',sourceId='phone-tag-test',mode='text'}={}){
 const s=initialState();s.day=56;s.clock='22:00';
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');
 chat.messages.push({id:sourceId,from:'me',text:user,kind:'text',actual:true,day:s.day,time:s.clock});
 const store={get:()=>s,update(fn){fn(s);}};
 const priorFetch=globalThis.fetch,priorSession=globalThis.sessionStorage;
 const session=new Map();
 globalThis.sessionStorage={getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
 globalThis.fetch=async url=>new Response(JSON.stringify(String(url).endsWith('/status')
  ?{mode:'test',deepseek:true,minimax:false}
  :{text:JSON.stringify({messages:[{text:modelText,mode,tone:'neutral'}]})}),{status:200,headers:{'Content-Type':'application/json'}});
 try{
  const result=await replyToTaiMessage(store,sourceId,{wait:async()=>{}});
  return {s,chat,store,result,ringing:callState().state==='ringing'};
 }finally{
  if(callState().state==='ringing')callAction('tai-decline',{store,refresh:()=>{},toast:()=>{},router:{open:()=>{}}});
  globalThis.fetch=priorFetch;
  if(priorSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=priorSession;
 }
}
test('typed request + AI marker starts one genuine ringing call with no visible marker',async()=>{
 const {s,chat,result,ringing}=await simulatedReply();
 assert.equal(result.status,'replied');
 assert.equal(ringing,true);
 assert.equal(chat.messages.at(-1).text,'行，我现在打');
 assert.equal(chat.messages.at(-1).kind,'text');
 assert.equal(s.events.filter(x=>x.type==='tai_text_call_trigger').length,1);
 assert.equal(s.notifications.some(x=>String(x.body).includes('(phone)')),false);
});
test('without marker, even an identical spoken promise no longer makes a phantom call',async()=>{
 const {s,ringing,chat}=await simulatedReply({modelText:'行，我现在打。'});
 assert.equal(ringing,false);
 assert.equal(s.events.filter(x=>x.type==='tai_text_call_trigger').length,0);
 assert.equal(chat.messages.at(-1).text,'行，我现在打');
});
test('AI may initiate a call with its marker when it decides to phone, no mandatory phrase matching',async()=>{
 const {s,ringing}=await simulatedReply({user:'今天想聊聊天吗',modelText:'（phone）好，我给你打过来',sourceId:'spontaneous-phone'});
 assert.equal(ringing,true);
 assert.equal(s.events.filter(x=>x.type==='tai_text_call_trigger').length,1);
});
test('deferred response with a malformed marker never rings',async()=>{
 const {s,ringing}=await simulatedReply({modelText:'(phone)等我几分钟，先冲个澡'});
 assert.equal(ringing,false);
 assert.equal(s.events.filter(x=>x.type==='tai_text_call_trigger').length,0);
});
