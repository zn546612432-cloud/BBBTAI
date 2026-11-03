import test from 'node:test';
import assert from 'node:assert/strict';
import {taiShouldHangUpCall} from '../src/apps/noapp/call-hangup-intent.js';
import {callBridgeNote} from '../src/services/ai/humanize.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {DEFAULT_TAI_BEHAVIOR,normalizeTaiBehavior} from '../src/services/ai/behavior.js';
import {behaviorSettings} from '../src/apps/noapp/settings/behavior.js';
import {initialState} from '../src/services/storage.js';
import {BYOK_SESSION} from '../src/services/ai/gateway.js';
import {startIncoming,callAction,submitCall,callView,callState} from '../src/apps/noapp/voice-call.js';

test('explicit commands delegate an actual phone hangup to Tai without confusing discussions or negations',()=>{
 const yes=['你挂电话吧','你先挂','你挂吧','你来挂','熙泰挂电话吧','帮我挂了','挂了88','挂了，拜拜','挂电话吧','晚安','88','拜拜','那就挂了吧','结束通话吧'];
 const no=['你别挂电话','不要挂','我不想挂电话','等一下再挂','刚才是谁挂的电话','你是不是刚才挂了','我们刚才挂断了','挂电话和打字有什么不可以','我挂断电话还能打字','谁让你挂电话了','刚挂了怎么又找我','我讨厌你','如果你挂了怎么办'];
 for(const text of yes)assert.equal(taiShouldHangUpCall(text),true,'positive '+text);
 for(const text of no)assert.equal(taiShouldHangUpCall(text),false,'negative '+text);
});

test('call->text bridge preserves which human really hung up and does not invent unheard dialogue',()=>{
 const current={day:60,clock:'22:32'};
 const base={kind:'call',callStatus:'ended',day:60,time:'22:30',text:'语音通话 · 02:10'};
 const afterPlayer=callBridgeNote({...base,endedBy:'player',transcript:'熙蒙：嗯。'},current);
 assert.match(afterPlayer,/熙蒙主动按下挂断键/);
 assert.match(afterPlayer,/已经真正断开/);
 assert.match(afterPlayer,/文字聊天框打字/);
 assert.doesNotMatch(afterPlayer,/陈熙泰主动按下挂断键/);
 const afterTai=callBridgeNote({...base,endedBy:'tai',endReason:'player_request'},current);
 assert.match(afterTai,/陈熙泰主动按下挂断键/);
 assert.match(afterTai,/熙蒙明确要求/);
 assert.match(afterTai,/没有已确认播放完毕/);
 assert.equal(callBridgeNote({kind:'voice',transcript:'你好'},current),'');
});

test('DeepSeek prompt receives mutually exclusive phone, voice note, and message context',()=>{
 const base={channel:'noapp',recognized:true,day:37,messages:[{role:'user',content:'我还想听你多说一点'}]};
 const phone=buildTaiPrompt({...base,outputMode:'call',behavior:DEFAULT_TAI_BEHAVIOR});
 const text=buildTaiPrompt({...base,outputMode:'text',behavior:DEFAULT_TAI_BEHAVIOR});
 const voice=buildTaiPrompt({...base,outputMode:'voice',behavior:DEFAULT_TAI_BEHAVIOR});
 assert.match(phone,/双方正在 NoApp 实时语音通话/);
 assert.match(phone,/可自然连续输出2～5个完整口语意群/);
 assert.match(text,/现在双方在 NoApp 私聊窗口用文字发消息/);
 assert.match(voice,/现在双方没有进行实时电话/);
 assert.match(text,/作者本人提供的陈熙泰原始对白示例/,'author examples remain wired');
 assert.match(phone,/作者本人提供的陈熙泰原始对白示例/);
 assert.equal(DEFAULT_TAI_BEHAVIOR.callMaxSegments,5);
 assert.equal(DEFAULT_TAI_BEHAVIOR.callDetail,'detailed');
 assert.equal(normalizeTaiBehavior({callDetail:'garbage'}).callDetail,'detailed');
 assert.match(behaviorSettings(normalizeTaiBehavior(),{},[]),/name="behavior_callDetail"/);
});

async function withMockCall(replyEntries,run){
 const old=Object.fromEntries(['Audio','fetch','sessionStorage','FormData'].map(k=>[k,globalThis[k]]));
 const players=[],requests=[];
 let playerInput='';
 class FakeAudio {
  constructor(){this.src='';this.paused=true;this.listeners=new Map();players.push(this);}
  addEventListener(name,cb){const handlers=this.listeners.get(name)||new Set();handlers.add(cb);this.listeners.set(name,handlers);}
  removeEventListener(name,cb){this.listeners.get(name)?.delete(cb);}
  play(){this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
  finish(){this.paused=true;for(const cb of [...(this.listeners.get('ended')||[])])cb();}
 }
 const state=initialState();state.day=60;state.clock='22:30';state.unlocked=true;
 state.aiDraft.behavior={...state.aiDraft.behavior,callPause:0.3,callMaxSegments:5,callDetail:'detailed'};
 const store={get:()=>state,update:fn=>fn(state)};
 const ctx={store,refresh(){},router:{open(){}},toast(){}};
 const waitFor=async(testFn,description='condition')=>{
  for(let i=0;i<180;i++){if(testFn())return;await new Promise(resolve=>setTimeout(resolve,10));}
  throw Error('waiting for '+description);
 };
 try{
  globalThis.Audio=FakeAudio;
  globalThis.FormData=class{get(name){return name==='text'?playerInput:'';}};
  globalThis.sessionStorage={getItem:key=>key===BYOK_SESSION?JSON.stringify({deepseek:'test-deepseek',minimax:'test-minimax',region:'cn'}):null};
  globalThis.fetch=async(url,init)=>{
   const body=JSON.parse(init.body);
   requests.push({url:String(url),body});
   if(String(url).includes('t2a_v2'))return Response.json({base_resp:{status_code:0},data:{audio:'494433'}});
   const isDecision=body.messages[0].content.includes('【行为决策层】');
   return Response.json({choices:[{message:{content:isDecision?
    JSON.stringify({schema_version:10,action:'speak',tone:'dry',strategy:'answer_directly'}):
    JSON.stringify({messages:replyEntries.map(text=>({text,mode:'voice',tone:'dry'}))})}}]});
  };
  assert.equal(startIncoming(ctx,'熙泰找你',{openingText:'喂。'}),true);
  assert.equal(callAction('tai-accept',ctx),true);
  await waitFor(()=>players[0]?.src?.startsWith('blob:'),'greeting audio');
  players[0].finish();
  await waitFor(()=>callState().turnCount===1,'completed greeting');
  await run({
   state,store,ctx,players,requests,waitFor,
   send(text){playerInput=text;return submitCall({dataset:{form:'tai-call-turn'}},ctx);}
  });
 }finally{
  callAction('tai-hangup',ctx);
  for(const [key,value] of Object.entries(old)){
   if(value===undefined)delete globalThis[key];else globalThis[key]=value;
  }
 }
}

test('player requests Tai to hang up: spoken farewell executes actual hangup after audio completes',async()=>{
 await withMockCall(['好，先挂了。明天再说，别熬得太晚。'],async({state,ctx,players,requests,waitFor,send})=>{
  assert.equal(send('你挂电话吧'),true);
  await waitFor(()=>callView(state).includes('好，先挂了'),'farewell caption');
  assert.equal(callState().state,'connected','should not disconnect before goodbye is heard');
  assert.equal(state.content.conversations.noapp.find(c=>c.id==='tai').messages.filter(m=>m.kind==='call').length,0);
  players[0].finish();
  await waitFor(()=>callState().state==='ended','Tai hangup');
  assert.equal(callState().endedBy,'tai');
  const entry=state.content.conversations.noapp.find(c=>c.id==='tai').messages.filter(m=>m.kind==='call').at(-1);
  assert.equal(entry.endedBy,'tai');
  assert.equal(entry.endReason,'player_request');
  assert.match(entry.transcript,/好，先挂了/);
  assert.match(callBridgeNote(entry,{day:60,clock:'22:31'}),/陈熙泰主动按下挂断键/);
  const modelRequests=requests.filter(x=>x.url.includes('chat/completions'));
  assert.equal(modelRequests.length,1,'player command skips decision-model call and uses one farewell generation');
 });
});

test('substantive call can speak four distinct paragraphs in one generation without overlapping playback',async()=>{
 const lines=[
  '你说的那件事我听明白了。先别急着怪自己，我想知道你实际遇到了什么。',
  '如果是那台机器又突然掉线，那也许不是你写错了代码。上回的问题就没有完全排查清楚。',
  '不过你总是想独自把所有事扛下来，这点我真的不太赞同。你可以试着让我也看一眼。',
  '好了，具体说说你第一次发现它不对劲是什么时候。我现在听着。'
 ];
 await withMockCall(lines,async({state,players,requests,waitFor,send})=>{
  send('我想跟你仔细聊聊今天出了什么问题，你多说几段。');
  for(let i=0;i<lines.length;i++){
   await waitFor(()=>callView(state).includes(lines[i]),'segment '+i);
   assert.equal(callState().turnCount,i+2,'only completed previous segments should be stored');
   players[0].finish();
  }
  await waitFor(()=>callState().turnCount===1+1+lines.length,'all completed voice thoughts');
  assert.equal(callState().state,'connected','speaking 4 segments must not end the call');
  const calls=requests.filter(x=>x.url.includes('chat/completions'));
  assert.equal(calls.length,2,'one action selection and one natural speech generation');
  const tts=requests.filter(x=>x.url.includes('t2a_v2'));
  assert.equal(tts.length,1+lines.length,'greeting plus four segments');
 });
});

test('player silently hangs up: the next text prompt knows the phone is disconnected',async()=>{
 await withMockCall(['这次我听明白了。'],async({state,ctx,waitFor,send,requests})=>{
  assert.equal(callAction('tai-hangup',ctx),true);
  assert.equal(callState().endedBy,'player');
  const chat=state.content.conversations.noapp.find(c=>c.id==='tai');
  const entry=chat.messages.filter(m=>m.kind==='call').at(-1);
  assert.equal(entry.endedBy,'player');
  assert.match(entry.transcript,/喂/);
  chat.messages.push({id:'after-call-player-text',from:'me',kind:'text',text:'挂电话以后我当然还可以打字啊。',actual:true,day:state.day,time:state.clock});
  const {replyToTaiMessage}=await import('../src/services/ai/live-chat.js');
  const result=await replyToTaiMessage({get:()=>state,update:fn=>fn(state)},'after-call-player-text',{
   wait:async()=>{},random:()=>.99,now:Date.now,refresh:()=>{}
  });
  assert.equal(result.status,'replied');
  const modelRequests=requests.filter(x=>x.url.includes('chat/completions'));
  assert.ok(modelRequests.some(r=>r.body.messages[0].content.includes('现在双方在 NoApp 私聊窗口用文字发消息')));
  assert.ok(modelRequests.some(r=>r.body.messages[0].content.includes('熙蒙自己按了挂断键')));
  assert.ok(modelRequests.some(r=>r.body.messages.some(m=>m.content?.includes('熙蒙主动按下挂断键'))));
  assert.equal(callState().state,'ended','text replies must not reopen a call');
 });
});
