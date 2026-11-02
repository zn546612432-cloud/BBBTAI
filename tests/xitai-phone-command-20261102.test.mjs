import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {unpackTaiReply} from '../src/services/ai/format.js';
import {replyToTaiMessage} from '../src/services/ai/live-chat.js';
import {callState,callAction} from '../src/apps/noapp/voice-call.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';

function fixture(message='现在给我打电话'){
 const s=initialState();s.day=56;s.clock='22:00';
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');
 chat.messages.push({id:'phone-user',from:'me',kind:'text',text:message,actual:true,day:56,time:'22:00'});
 return {s,chat,store:{get:()=>s,update:fn=>fn(s)},ctx:null};
}
const close=store=>callAction('tai-decline',{store,refresh:()=>{},toast:()=>{},router:{open:()=>{}}});
function mockResponse(reply,func){
 const old=globalThis.fetch,ss=globalThis.sessionStorage;
 const map=new Map();
 globalThis.sessionStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 globalThis.fetch=async url=>new Response(JSON.stringify(String(url).endsWith('/status')?{mode:'test',deepseek:true,minimax:false}:{text:JSON.stringify(reply)}),{status:200,headers:{'Content-Type':'application/json'}});
 return Promise.resolve().then(func).finally(()=>{globalThis.fetch=old;if(ss===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=ss;});
}
test('(phone) plus opening line is an action, never a message bubble or a spoken tag',()=>{
 const a=unpackTaiReply({text:JSON.stringify({messages:[{text:'(phone)喂，怎么催得这么急？',mode:'text'}]})});
 assert.deepEqual(a.map(x=>({action:x.action,text:x.text,mode:x.mode})),[{action:'phone',text:'喂，怎么催得这么急？',mode:'text'}]);
 assert.doesNotMatch(a[0].text,/phone/);
 assert.equal(unpackTaiReply({text:'{"messages":[{"text":"（phone）+听得到吗？"}]}'})[0].text,'听得到吗？');
 const empty=unpackTaiReply({text:'{"messages":[{"text":"(phone)"}]}'})[0];
 assert.equal(empty.action,'phone');assert.equal(empty.text,'');
 const mirage=unpackTaiReply({text:'{"messages":[{"text":"(phone)你好"}]}'},'mirage')[0];
 assert.equal(mirage.action,undefined);assert.equal(mirage.text,'你好');
 const middle=unpackTaiReply({text:'{"messages":[{"text":"我说的 (phone) 是控制码"}]}'})[0];
 assert.equal(middle.action,undefined);assert.doesNotMatch(middle.text,/phone/);
});
test('NoApp AI prompt explicitly instructs the machine code, and the voice call prompt does not',()=>{
 const text=buildTaiPrompt({channel:'noapp',day:56,recognized:true,outputMode:'text'});
 assert.match(text,/必须返回一项 JSON 消息/);
 assert.match(text,/\(phone\)你想说什么/);
 const call=buildTaiPrompt({channel:'noapp',day:56,recognized:true,outputMode:'call'});
 assert.doesNotMatch(call,/必须返回一项 JSON 消息/);
 const mirage=buildTaiPrompt({channel:'mirage',day:56,recognized:false});
 assert.doesNotMatch(mirage,/必须返回一项 JSON 消息/);
});
test('phone-only command immediately rings without chat bubble and without second AI response',async()=>{
 const {s,store,chat}=fixture();
 await mockResponse({messages:[{text:'(phone)这么着急？',mode:'text'}]},async()=>{
  const res=await replyToTaiMessage(store,'phone-user',{wait:async()=>{}});
  assert.equal(res.status,'called');assert.equal(res.count,0);
  assert.equal(chat.messages.length,1,'command does not become chat bubble');
  assert.equal(callState().state,'ringing');assert.equal(callState().direction,'incoming');
  assert.equal(s.events.filter(e=>e.type==='tai_text_call_trigger').length,1);
  assert.equal(s.events.find(e=>e.type==='tai_text_call_trigger').protocol,'phone');
  assert.equal(s.notifications.filter(n=>n.type==='tai-incoming-call').length,1);
  const second=await replyToTaiMessage(store,'phone-user',{wait:async()=>{}});
  assert.equal(second.status,'scripted','same source cannot dial twice');
  close(store);
 });
});
test('ordinary chat before (phone) is shown, but the command stays invisible',async()=>{
 const {s,store,chat}=fixture('现在就打，想听你声音');
 await mockResponse({messages:[
  {text:'行',mode:'text'},{text:'(phone)喂，想听我说什么？',mode:'text'}
 ]},async()=>{
  const res=await replyToTaiMessage(store,'phone-user',{wait:async()=>{}});
  assert.equal(res.status,'called');assert.equal(res.count,1);
  assert.deepEqual(chat.messages.map(x=>x.text),['现在就打，想听你声音','行']);
  assert.equal(s.events.filter(e=>e.type==='tai_text_call_trigger').length,1);
  close(store);
 });
});
test('refusing a call / changing the player turn prevents a phone instruction from dialing',async()=>{
 const denied=fixture('不要打电话');
 await mockResponse({messages:[{text:'(phone)喂',mode:'text'}]},async()=>{
  const result=await replyToTaiMessage(denied.store,'phone-user',{wait:async()=>{}});
  assert.equal(result.status,'replied');
  assert.equal(callState().state,'ended');
  assert.equal(denied.s.events.filter(e=>e.type==='tai_text_call_trigger').length,0);
 });
 const stale=fixture('给我打电话');
 await mockResponse({messages:[{text:'(phone)接到了吗',mode:'text'}]},async()=>{
  const result=await replyToTaiMessage(stale.store,'phone-user',{wait:async()=>{stale.chat.messages.push({id:'next',from:'me',text:'先等一下',kind:'text',day:56,actual:true});}});
  assert.equal(result.status,'replied');assert.equal(callState().state,'ended');
  assert.equal(stale.s.events.filter(e=>e.type==='tai_text_call_trigger').length,0);
 });
});
