import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {taiLife} from '../src/services/ai/life-context.js';
import {BYOK_SESSION} from '../src/services/ai/gateway.js';
import {taiNaturalCallLine,taiCallDepartureWindow,nextNaturalCallIdleEvent} from '../src/apps/noapp/call-engine-v2.js';
import {startIncoming,callAction,callState,maybeAdvanceCall,callView} from '../src/apps/noapp/voice-call.js';

const until=async(fn)=>{
 for(let i=0;i<230;i++){
  if(fn())return;
  await new Promise(resolve=>setTimeout(resolve,10));
 }
 assert.ok(fn(),'timed out while waiting for native NoApp speech');
};

function stateAt(day=35,clock='08:10'){
 const s=activateStory55(initialState());s.day=day;s.clock=clock;
 s.story55.completed.recognition={day:33,clock:'09:00'};
 s.story55.noappInstalled=true;s.unlocked=true;
 return s;
}

async function withCall(fn,{day=35,clock='08:10'}={}){
 const previous=Object.fromEntries(['Audio','sessionStorage','fetch'].map(key=>[key,globalThis[key]]));
 const sound=[],requests=[];
 class FakeAudio extends EventTarget {
  constructor(){super();this.src='';this.paused=true;sound.push(this);}
  pause(){this.paused=true;}
  play(){this.paused=false;return Promise.resolve();}
  finish(){this.paused=true;this.dispatchEvent(new Event('ended'));}
 }
 const s=stateAt(day,clock),store={get:()=>s,update:mutate=>mutate(s)};
 const ctx={store,refresh(){},toast(){},router:{open(){}}};
 let failTts=false;
 try{
  globalThis.Audio=FakeAudio;
  globalThis.sessionStorage={getItem:key=>key===BYOK_SESSION?JSON.stringify({deepseek:'noapp-test-ds',minimax:'noapp-test-mm',region:'cn'}):null};
  globalThis.fetch=async(url,opts)=>{
   requests.push(String(url));
   if(!String(url).includes('t2a_v2'))throw Error('native call event unexpectedly called an AI text endpoint: '+url);
   if(failTts)throw Error('MiniMax unavailable');
   return Response.json({base_resp:{status_code:0},data:{audio:'494433'}});
  };
  assert.equal(startIncoming(ctx,'熙泰來電',{openingText:'喂，聽得到嗎？'}),true);
  assert.equal(callAction('tai-accept',ctx),true);
  await until(()=>sound[0]?.src?.startsWith('blob:'));
  sound[0].finish();
  await until(()=>callState().state==='connected'&&!callState().busy);
  await fn({s,ctx,sound,requests,fail:()=>{failTts=true;}});
 }finally{
  callAction('tai-hangup',ctx,{endedBy:'tai',endReason:'test_cleanup'});
  for(const [name,value] of Object.entries(previous)){
   if(value===undefined)delete globalThis[name];else globalThis[name]=value;
  }
 }
}

test('sleep deadline uses actual London life (D54 promise and forced story calls untouched)',()=>{
 const s=stateAt(35,'08:20'),near=taiLife(s);
 assert.equal(near.local,'01:20');
 assert.equal(taiCallDepartureWindow(near),'upcoming');
 s.clock='08:32';
 assert.equal(taiCallDepartureWindow(taiLife(s)),'overdue');
 s.day=54;s.clock='08:25';
 assert.equal(taiCallDepartureWindow(taiLife(s)),'','D54 all-day promise overrides ordinary sleep');
 for(const kind of ['departure','nudge','closing']){
  for(let i=0;i<3;i++){
   const text=taiNaturalCallLine(kind,{hadPlayerTurn:true,variant:i});
   assert.ok(text.length>4,kind);
   assert.doesNotMatch(text,/抱歉|對不起|我回來了|下線|上線/);
  }
 }
});

test('imminent London sleep: system speaks and plays farewell BEFORE hanging up',async()=>{
 await withCall(async({s,ctx,sound,requests})=>{
  const first=sound[0].src;
  s.clock='08:23';
  assert.equal(maybeAdvanceCall(ctx),true);
  assert.equal(callState().state,'connected','never drop the call immediately');
  await until(()=>sound[0].src!==first&&sound[0].src.startsWith('blob:'));
  assert.equal(callState().state,'connected','farewell is not counted before playback');
  assert.equal(callState().turnCount,1,'only greeting has actually played');
  sound[0].finish();
  await until(()=>callState().state==='ended');
  const calls=s.content.conversations.noapp.find(c=>c.id==='tai').messages.filter(m=>m.kind==='call');
  const record=calls.at(-1);
  assert.equal(record.callStatus,'ended');
  assert.equal(record.endedBy,'tai');
  assert.equal(record.endReason,'resting');
  assert.match(record.transcript,/我這邊時間不早|有點事要處理|我得去睡了/);
  assert.equal(requests.filter(x=>x.includes('t2a_v2')).length,2,'one greeting and one farewell');
  assert.ok(requests.every(x=>x.includes('t2a_v2')),'sleep farewell never invokes DeepSeek');
 });
});

test('game clock jumps past sleep boundary mid-call: gives a farewell rather than instantly disconnecting',async()=>{
 await withCall(async({s,ctx,sound})=>{
  const first=sound[0].src;
  s.clock='08:35';
  assert.equal(maybeAdvanceCall(ctx),true);
  assert.equal(callState().state,'connected');
  await until(()=>sound[0].src!==first&&sound[0].src.startsWith('blob:'));
  sound[0].finish();
  await until(()=>callState().state==='ended');
  assert.equal(s.events.filter(e=>e.type==='tai_call_ended').at(-1)?.endReason,'resting');
 });
});

test('unanswered NoApp call: spoken follow-up, then spoken goodbye and real hang-up',async()=>{
 await withCall(async({s,ctx,sound,requests})=>{
  const first=sound[0].src;
  assert.equal(maybeAdvanceCall(ctx,{now:Date.now()+13000}),true);
  assert.equal(callState().state,'connected');
  await until(()=>sound[0].src!==first&&sound[0].src.startsWith('blob:'));
  assert.match(callView(s),/你還在|不說話|怎麼突然安靜|聽得到/);
  sound[0].finish();
  await until(()=>callState().state==='connected'&&!callState().busy);
  const second=sound[0].src;
  assert.equal(maybeAdvanceCall(ctx,{now:Date.now()+65000}),true);
  assert.equal(callState().state,'connected');
  await until(()=>sound[0].src!==second&&sound[0].src.startsWith('blob:'));
  sound[0].finish();
  await until(()=>callState().state==='ended');
  const record=s.content.conversations.noapp.find(c=>c.id==='tai').messages.filter(m=>m.kind==='call').at(-1);
  assert.equal(record.endReason,'idle');
  assert.equal(record.endedBy,'tai');
  assert.match(record.transcript,/你還在|不說話|安靜|聽得到/);
  assert.match(record.transcript,/先掛了|晚點聊|先這樣|下次再聊/);
  assert.equal(requests.length,3,'one greeting, one follow-up, one farewell, zero DeepSeek calls');
 });
});

test('unavailable MiniMax system farewell leaves one truthful text after the hangup',async()=>{
 await withCall(async({s,ctx,fail})=>{
  s.clock='08:24';fail();
  assert.equal(maybeAdvanceCall(ctx),true);
  await until(()=>callState().state==='ended');
  const chat=s.content.conversations.noapp.find(c=>c.id==='tai');
  assert.equal(s.events.filter(e=>e.type==='tai_call_ended').at(-1)?.endReason,'resting');
  assert.ok(chat.messages.some(m=>m.from==='tai'&&m.kind==='text'&&/先掛了|下次再聊/.test(m.text)));
 });
});

test('quiet-companionship and active playback still suppress silence beats',()=>{
 const snapshot={state:'connected',lastTaiEndAt:1000,nudgeCount:0,busy:false};
 assert.equal(nextNaturalCallIdleEvent({...snapshot,quietUntil:180000},50000),'');
 assert.equal(nextNaturalCallIdleEvent({...snapshot,busy:true},50000),'');
 assert.equal(nextNaturalCallIdleEvent({...snapshot,listening:true},50000),'');
 assert.equal(nextNaturalCallIdleEvent({...snapshot,audioReady:true},50000),'');
});
