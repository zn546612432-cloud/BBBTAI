import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {replyToTaiMessage} from '../src/services/ai/live-chat.js';

const makeStore=()=>{
 let state=initialState();state.day=56;state.clock='22:00';
 return {get:()=>state,update(fn){const next=structuredClone(state);fn(next);state=next;}};
};
test('NoApp Tai replies use the local gateway and stay separate from fixed story facts',async()=>{
 const store=makeStore(),chat=store.get().content.conversations.noapp.find(c=>c.id==='tai');
 chat.messages.push({id:'player-test',from:'me',text:'今天怎么样？',kind:'text',actual:true,day:56,time:'22:00'});
 const original=globalThis.fetch,seen=[];
 globalThis.fetch=async(url,init)=>{
  seen.push({url,body:init?.body&&JSON.parse(init.body)});
  return new Response(JSON.stringify(url.endsWith('/status')?{mode:'local-only',deepseek:true,minimax:false}:{text:'我还在看那份文件。'}),{status:200,headers:{'content-type':'application/json'}});
 };
 try{
  const result=await replyToTaiMessage(store,'player-test');
  assert.equal(result.status,'replied');
  assert.equal(seen[1].url,'/api/ai/chat');
  assert.equal(seen[1].body.messages.at(-1).content,'今天怎么样？');
  const reply=store.get().content.conversations.noapp.find(c=>c.id==='tai').messages.at(-1);
  assert.equal(reply.text,'我还在看那份文件。');
  assert.equal(reply.aiGenerated,true);
  assert.equal(reply.actual,false);
  assert.equal(reply.testOnly,true);
 }finally{globalThis.fetch=original;}
});
test('a fixed reply after the player message prevents an extra AI reply',async()=>{
 const store=makeStore(),chat=store.get().content.conversations.noapp.find(c=>c.id==='tai');
 chat.messages.push({id:'player-test',from:'me',text:'在吗？',kind:'text',actual:true,day:56});
 chat.messages.push({id:'scripted-test',from:'tai',text:'在。',kind:'text',actual:true,day:56});
 const result=await replyToTaiMessage(store,'player-test');
 assert.equal(result.status,'scripted');
 assert.equal(chat.messages.at(-1).id,'scripted-test');
});
