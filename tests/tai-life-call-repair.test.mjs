import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {taiLifeContext} from '../src/services/ai/life-context.js';
import {xitaiRelationshipContext} from '../src/services/ai/relationship-context.js';
import {replyToTaiMessage} from '../src/services/ai/live-chat.js';
import {startIncoming,callAction,callState,callView,callScene,maybeAdvanceCall} from '../src/apps/noapp/voice-call.js';
const fixture=()=>{const s=initialState();s.day=64;s.clock='21:00';s.powerMode='idle';s.content.conversations.noapp.find(c=>c.id==='tai').messages=[];return {s,store:{get:()=>s,update:f=>f(s)}};};
const until=async predicate=>{for(let n=0;n<60;n++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}assert.ok(predicate(),'timed out');};

test('canon overrides wrong old drafts and overseas life follows the game day, not the Macau hour',()=>{
 const p=buildTaiPrompt({day:64,channel:'noapp',profile:{relationship:'不认识熙旺'}});
 assert.match(p,/陈熙旺、陈熙蒙、陈熙泰是三胞胎/);
 assert.match(p,/旧存档草稿与错误AI聊天/);
 assert.doesNotMatch(p,/高频：AI 编程|多于汇报自己生活/);
 const {s}=fixture();s.clock='01:00';
 assert.match(taiLifeContext(s),/巴黎酒店，当地 19:00/);
 assert.equal(taiLifeContext(s),taiLifeContext(s));
 const c=s.content.conversations.noapp.find(c=>c.id==='tai');
 c.messages.push({from:'tai',text:'刚从展览回来，准备睡了',day:64,actual:true});
 assert.match(xitaiRelationshipContext(s),/刚从展览回来/);
});
test('failed voice produces one in-character repair without calling an unavailable AI or inventing a transcript',async()=>{
 const {s,store}=fixture(),c=s.content.conversations.noapp.find(c=>c.id==='tai');
 c.messages.push({id:'unheard-1',from:'me',kind:'voice',text:'[语音消息 4秒]',voiceCaption:null,recognitionFailed:true,day:64,time:'21:00'});
 const old=globalThis.fetch;globalThis.fetch=()=>{throw Error('AI must not be called');};
 try{const r=await replyToTaiMessage(store,'unheard-1',{wait:async()=>{}});assert.equal(r.count,1);assert.match(c.messages.at(-1).text,/没听清|听不清|断了/);}
 finally{globalThis.fetch=old;}
});
test('caller direction and silence scenes have separate intentions',()=>{
 assert.match(callScene({opening:true,direction:'incoming',reason:'分享刚看完展览的事'}),/是你陈熙泰主动拨给熙蒙/);
 assert.match(callScene({opening:true,direction:'incoming'}),/不要反问他为什么给你打电话/);
 assert.match(callScene({opening:true,direction:'outgoing'}),/是熙蒙拨给你/);
 assert.match(callScene({event:'nudge'}),/怎么了|怎么不肯说/);
});
test('a blocked call track holds its own caption and cannot release the next sentence or silence timer',async()=>{
 const {s,store}=fixture();s.aiDraft.behavior={callPause:.3,callNudgeSeconds:10};
 const oldAudio=globalThis.Audio,oldFetch=globalThis.fetch,oldSession=globalThis.sessionStorage;
 class FakeAudio extends EventTarget{
  constructor(){super();this.src='';this.paused=true;this.block=true;FakeAudio.current=this;}
  pause(){this.paused=true;}
  async play(){if(this.src.startsWith('data:'))return;this.paused=false;if(this.block){this.paused=true;throw Error('NotAllowedError');}}
  end(){this.paused=true;this.dispatchEvent(new Event('ended'));}
 }
 globalThis.Audio=FakeAudio;globalThis.sessionStorage={getItem:()=>null};
 let tts=0;
 globalThis.fetch=async url=>{
  if(String(url).includes('/tts')){tts++;return new Response(new Blob(['fake mp3'],{type:'audio/mpeg'}),{headers:{'content-type':'audio/mpeg'}});}
  return new Response(JSON.stringify({text:JSON.stringify({messages:[{text:'刚看完展览。',mode:'voice'},{text:'有件衣服你会喜欢。',mode:'voice'},{text:'回头讲给你听。',mode:'voice'}]})}));
 };
 const ctx={store,refresh(){},toast(){},router:{open(){}}};
 try{
  assert.equal(startIncoming(ctx,'刚看完展览，想说给哥哥听'),true);callAction('tai-accept',ctx);
  await until(()=>callView(s).includes('继续收听'));
  assert.equal(tts,1);assert.match(callView(s),/刚看完展览/);assert.doesNotMatch(callView(s),/有件衣服/);
  assert.equal(maybeAdvanceCall(ctx,{now:Date.now()+500000}),false);
  FakeAudio.current.block=false;callAction('tai-play-audio',ctx);await new Promise(r=>setImmediate(r));FakeAudio.current.end();
  await until(()=>tts===2);
  assert.match(callView(s),/有件衣服/);assert.doesNotMatch(callView(s),/<p class="theirs">刚看完展览/);
  FakeAudio.current.end();await until(()=>tts===3);FakeAudio.current.end();
  await until(()=>!callView(s).includes('<p class="theirs">'));
  callAction('tai-hangup',ctx);assert.equal(callState().state,'ended');
 }finally{callAction('tai-hangup',ctx);globalThis.Audio=oldAudio;globalThis.fetch=oldFetch;globalThis.sessionStorage=oldSession;}
});
