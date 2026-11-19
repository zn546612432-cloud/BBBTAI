import test from 'node:test';
import assert from 'node:assert/strict';
import {sameCallMeaning,isQuietCallRequest,selectCallSegments,nextNaturalCallIdleEvent,wantsMoreCallSpeech,expandCallSegments,incomingCallOpening} from '../src/apps/noapp/call-engine-v2.js';
import {DEFAULT_TAI_BEHAVIOR,normalizeTaiBehavior} from '../src/services/ai/behavior.js';
import {behaviorSettings} from '../src/apps/noapp/settings/behavior.js';

test('requested callbacks ignore AI opening copy and use only a short pickup; actual autonomous openings remain intact',()=>{
 const openingText='熙蒙。电话我打了。现在能听到我说话吗？';
 assert.deepEqual(incomingCallOpening({requestedByPlayer:true,sessionId:1,openingText}),['怎么了？']);
 assert.deepEqual(incomingCallOpening({requestedByPlayer:true,sessionId:2,openingText}),['喂？']);
 assert.equal(incomingCallOpening({openingText:'有件事想问你。'}),'有件事想问你。');
 assert.equal(incomingCallOpening({}),'');
 const {segments}=selectCallSegments([{text:'陈熙蒙，你听我说。',speechText:'陳熙蒙，<#0.2#>你听我说。'}]);
 assert.equal(segments[0].text,'nya，你听我说。');
 assert.equal(segments[0].speechText,'nya，<#0.2#>你听我说。');
});

test('V2 rejects same-meaning comfort, repeat promises and unfinished clips without limiting genuine new thoughts',()=>{
 const entries=[
  {text:'累了就先别说话，把电话放着，我听你喘气都行。'},
  {text:'那就先别费劲说话。我陪着你，等你缓过来。'},
  {text:'想你抱抱我。'},
  {text:'等这件事结束，我会去找你。'},
  {text:'等这件事结束，'}
 ];
 const {segments,blocked}=selectCallSegments(entries,{maxSegments:5});
 assert.deepEqual(segments.map(x=>x.text),[entries[0].text,entries[2].text,entries[3].text]);
 assert.deepEqual(blocked.map(x=>x.reason),['duplicate','unfinished']);
 assert.equal(sameCallMeaning('别急，等我回来。','你今天吃什么？'),false);
 assert.equal(selectCallSegments(entries,{maxSegments:2}).segments.length,2);
 assert.equal(selectCallSegments(entries.slice(0,2),{dedupe:false}).segments.length,2);
});

test('V2 honors explicit quiet companionship and applies natural silence cooldowns',()=>{
 assert.equal(isQuietCallRequest('我不想讲话，你陪我待会儿。'),true);
 assert.equal(isQuietCallRequest('你想我了吗？'),false);
 const state={state:'connected',busy:false,listening:false,requestingMic:false,
  audioReady:false,lastTaiEndAt:1000,nudgeCount:0,quietUntil:241000};
 assert.equal(nextNaturalCallIdleEvent(state,50000,DEFAULT_TAI_BEHAVIOR),'');
 assert.equal(nextNaturalCallIdleEvent({...state,quietUntil:0},50000,DEFAULT_TAI_BEHAVIOR),'nudge');
 assert.equal(nextNaturalCallIdleEvent({...state,quietUntil:0,nudgeCount:1},140000,DEFAULT_TAI_BEHAVIOR),'closing');
 assert.equal(nextNaturalCallIdleEvent({...state,quietUntil:0,busy:true},140000,DEFAULT_TAI_BEHAVIOR),'');
 assert.equal(nextNaturalCallIdleEvent({...state,quietUntil:0},16000,{...DEFAULT_TAI_BEHAVIOR,callIdleMode:'quiet'}),'');
 assert.equal(nextNaturalCallIdleEvent({...state,quietUntil:0},50000,{...DEFAULT_TAI_BEHAVIOR,callIdleMode:'active'}),'nudge');
});
test('more speech is requested explicitly and grouped along natural sentence boundaries',()=>{
 for(const text of ['能不能多说几句','多說幾句吧','多说一点','别只说一句','繼續說','講詳細一點'])assert.equal(wantsMoreCallSpeech(text),true,text);
 for(const text of ['不用多说了','別多說','我想你','挂了吧'])assert.equal(wantsMoreCallSpeech(text),false,text);
 const entry={text:'第一句。第二句？第三句。',speechText:'第一句。第二句？第三句。',tone:'neutral'};
 const parts=expandCallSegments([entry]);assert.deepEqual(parts.map(e=>e.text),['第一句。','第二句？','第三句。']);assert.ok(parts.every(e=>!e.speechText));
 assert.equal(expandCallSegments([{...entry,speechText:'第一句。<#0.3#>第二句？第三句。'}]).length,1);
});

test('V2 developer controls are persisted and normalized with safe bounds',()=>{
 const config=normalizeTaiBehavior({callDedupe:false,callInterrupt:false,callMaxSegments:100,callQuietSeconds:0,callIdleMode:'quiet'});
 assert.equal(config.callDedupe,false);
 assert.equal(config.callInterrupt,false);
 assert.equal(config.callMaxSegments,5);
 assert.equal(config.callQuietSeconds,30);
 assert.equal(config.callIdleMode,'quiet');
 const html=behaviorSettings(config,{},{length:0});
 for(const key of ['callDedupe','callInterrupt','callMaxSegments','callQuietSeconds','callIdleMode'])
  assert.match(html,new RegExp('behavior_'+key));
 assert.match(html,/NoApp V2/);
});

test('V2 call captions are not presented as delivered transcript until actual playback',async()=>{
 const {initialState}=await import('../src/services/storage.js');
 const {BYOK_SESSION}=await import('../src/services/ai/gateway.js');
 const {startIncoming,callAction,submitCall,callView,callState}=await import('../src/apps/noapp/voice-call.js');
 const old=Object.fromEntries(['Audio','fetch','sessionStorage','FormData'].map(k=>[k,globalThis[k]]));
 const players=[],requests=[];
 class FakeAudio {
  constructor(){this.src='';this.paused=true;this.listeners=new Map();players.push(this);}
  addEventListener(name,cb){const handlers=this.listeners.get(name)||new Set();handlers.add(cb);this.listeners.set(name,handlers);}
  removeEventListener(name,cb){this.listeners.get(name)?.delete(cb);}
  play(){this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
  finish(){this.paused=true;for(const cb of [...(this.listeners.get('ended')||[])])cb();}
 }
 const state=initialState();state.day=60;state.unlocked=true;
 state.aiDraft.behavior={...state.aiDraft.behavior,callPause:0.3,callMaxSegments:4};
 const store={get:()=>state,update:fn=>fn(state)};
 const ctx={store,refresh(){},router:{open(){}},toast(){}};
 const waitFor=async(check)=>{for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}throw Error('test timed out waiting for audio');};
 try{
  globalThis.Audio=FakeAudio;
  globalThis.sessionStorage={getItem:key=>key===BYOK_SESSION?JSON.stringify({deepseek:'test-deepseek',minimax:'test-minimax',region:'cn'}):null};
  globalThis.fetch=async(url,init)=>{
   const body=JSON.parse(init.body);requests.push({url:String(url),body});
   if(String(url).includes('t2a_v2'))return Response.json({base_resp:{status_code:0},data:{audio:'494433'}});
   const decision=body.messages[0].content.includes('【行为决策层】');
   return Response.json({choices:[{message:{content:decision?
    JSON.stringify({schema_version:10,action:'speak',strategy:'comfort',tone:'soft'}):
    JSON.stringify({messages:[
     {text:'累了就先休息，我陪着你。'},
     {text:'累了别费劲说话，我陪着你缓过来。'},
     {text:'等这件事结束，我会去找你。'},
     {text:'等这件事结束，'}
    ]})}}]});
  };
  assert.equal(startIncoming(ctx,'来电',{openingText:'喂，听得到吗？'}),true);
  assert.equal(callAction('tai-accept',ctx),true);
  await waitFor(()=>players[0]?.src?.startsWith('blob:'));
  assert.equal(callState().turnCount,0,'the unplayed greeting must not be committed');
  globalThis.FormData=class{get(key){return key==='text'?'我今天好累，想要你陪我说话。':null;}};
  assert.equal(submitCall({dataset:{form:'tai-call-turn'}},ctx),true);
  await waitFor(()=>requests.filter(x=>x.url.includes('chat/completions')).length>=1);
  await waitFor(()=>players[0]?.src?.startsWith('blob:')&&callView(state).includes('累了就先休息'));
  assert.equal(callState().turnCount,1,'only the new player message is committed before playback');
  players[0].finish();
  await waitFor(()=>callState().turnCount===2);
  callAction('tai-expand',ctx);
  const transcript=callView(state);
  assert.match(transcript,/累了就先休息/);
  assert.doesNotMatch(transcript,/累了别费劲说话/);
  assert.equal(requests.filter(x=>x.url.includes('chat/completions')&&x.body.messages[0].content.includes('【行为决策层】')).length,0);
  assert.equal(requests.filter(x=>x.url.includes('chat/completions')&&!x.body.messages[0].content.includes('【行为决策层】')).length,1,'only one text generation is allowed for a spoken turn');
  assert.equal(state.events.filter(e=>e.type==='tai_call_v2_interrupt').length,1);
  assert.ok(state.events.filter(e=>e.type==='tai_call_v2_turn').at(-1).blocked>=1,'upstream and V2 filters together must reject redundant/unfinished speech');
 }finally{
  callAction('tai-hangup',ctx);
  for(const [key,value] of Object.entries(old)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
 }
});
