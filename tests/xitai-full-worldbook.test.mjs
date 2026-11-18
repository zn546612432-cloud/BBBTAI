import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultWorldbook,importWorldbook,exportWorldbook,normalizeEntry,normalizeSettings} from '../src/services/ai/worldbook/format.js';
import {evaluateWorldbook} from '../src/services/ai/worldbook/engine.js';
import {captureTaiWorldbook,assembleTaiMessages,splitWorldbook,resolveWorldbookOutlets} from '../src/services/ai/worldbook/index.js';
import {rememberTaiMood} from '../src/services/ai/worldbook/mood.js';
import {worldbookPanel} from '../src/apps/developer/features/worldbook/index.js';
import {validateTaiAction} from '../src/services/ai/action-protocol-v10.js';
import {maybeSendProactive} from '../src/services/ai/proactive.js';
import {initialState} from '../src/services/storage.js';
import {BYOK_SESSION} from '../src/services/ai/gateway.js';

const e=(id,fields)=>normalizeEntry({content:id,...fields},id);
const input=(content,index=1)=>({recognized:true,messages:[{role:'user',content}],messageIndex:index,turnId:'turn-'+index});
const ids=s=>s.entries.map(e=>e.id).sort();
test('native and embedded imports preserve positions, metadata and explicit BBBTAI visibility',()=>{
 const native={entries:{7:{uid:7,key:['電話'],content:'lore',position:4,depth:2,role:1,extensions:{custom:'keep',bbbtai:{recognized:null,channels:[]}}}}};
 const b=importWorldbook(native,{id:'one'}),r=importWorldbook(exportWorldbook(b),{id:'two'}).entries[0];
 assert.equal(r.position,4);assert.equal(r.depth,2);assert.equal(r.role,1);assert.equal(r.extensions.custom,'keep');assert.equal(r.recognized,null);assert.deepEqual(r.channels,[]);
 const embedded=importWorldbook({data:{character_book:{entries:[{keys:['abc'],content:'x',position:'after_char',extensions:{position:4,depth:3}}]}}},{id:'card'});
 assert.equal(embedded.entries[0].position,4);assert.equal(embedded.entries[0].depth,3);assert.equal(normalizeSettings({vectorThreshold:0}).vectorThreshold,0);
});
test('primary/secondary, regex, recursion, probability and group arbitration',()=>{
 const entries=[e('seed',{key:['/hello/i'],content:'trigger'}),e('linked',{key:['trigger']}),e('restricted',{key:['hello'],keysecondary:['absent'],selectiveLogic:3}),e('zero',{key:['hello'],probability:0}),e('winner',{key:['hello'],group:'one',groupOverride:true,order:500}),e('loser',{key:['hello'],group:'one'})];
 const s=evaluateWorldbook(entries,input('hello'));assert.deepEqual(ids(s),['linked','seed','winner']);assert.equal(s.trace.restricted,'no-match');assert.equal(s.trace.zero,'probability');assert.equal(s.trace.loser,'group-conflict');
});
test('sticky and cooldown only advance across new message indices',()=>{
 const entries=[e('a',{key:['hello'],sticky:2,cooldown:2})];let effects={};
 for(const [text,index,expected,reason] of [['hello',1,true,'key'],['other',2,true,'sticky'],['other',3,true,'sticky'],['hello',4,false,'cooldown'],['hello',5,false,'cooldown'],['hello',6,true,'key']]){
  const s=evaluateWorldbook(entries,input(text,index),{},effects);assert.equal(s.entries.length>0,expected);assert.equal(s.trace.a,reason);effects=s.effects;
 }
});
test('one saved source has one snapshot and mood survives later turns',()=>{
 const state={day:60,clock:'12:00',aiDraft:{worldbook:defaultWorldbook(),memories:[]}},store={get:()=>state,update:fn=>fn(state)};
 const context={...input('想聽聲音'),channel:'noapp',turnId:'unique'};
 const a=captureTaiWorldbook(store,context),cursor=state.aiDraft.worldbook.runtime.noapp.cursor;
 assert.equal(captureTaiWorldbook(store,{...context,messages:[{role:'user',content:'別的'}]}),a);
 assert.equal(state.aiDraft.worldbook.runtime.noapp.cursor,cursor);
 assert.ok(rememberTaiMood(store,{mood_after:'hurt',mood_reason:'話未說完'},'unique'));
 assert.equal(captureTaiWorldbook(store,{...context,turnId:'next'}).mood.mood,'hurt');
});
test('depth uses actual role and order; outlet is substituted only where referenced',()=>{
 const snapshot={entries:[e('one',{position:4,depth:1,role:0}),e('two',{position:4,depth:0,role:2}),e('out',{position:7,outletName:'fact',content:'秘密'})]};
 const msgs=assembleTaiMessages('root',[{role:'user',content:'first'},{role:'assistant',content:'second'},{role:'user',content:'last'}],snapshot);
 assert.deepEqual(msgs.map(m=>m.role),['system','user','assistant','system','user','assistant']);
 assert.match(msgs[3].content,/one/);assert.match(msgs[5].content,/two/);
 assert.equal(resolveWorldbookOutlets('before {{outlet::fact}} after',splitWorldbook(snapshot).outlets),'before 秘密 after');
});
test('vector result, events, recognition and budget are enforced',()=>{
 const entries=[e('v',{vectorized:true,recognized:true}),e('event',{events:['call_ringing'],recognized:true}),e('not-yet',{constant:true,recognized:false}),e('large',{constant:true,content:'x'.repeat(3000)})];
 const s=evaluateWorldbook(entries,{...input('電話'),vectorScores:{v:.9},worldbookEvents:['call_ringing'],budgetLimit:100});
 assert.deepEqual(ids(s),['event','v']);assert.equal(s.trace.large,'budget');assert.equal(s.trace['not-yet'],'filtered');
});
test('developer editor includes full author controls and no API diagnostic',()=>{
 const html=worldbookPanel({aiDraft:{worldbook:defaultWorldbook()}});
 for(const label of ['匯入世界書','匯出酒館 JSON','持續消息數','Outlet','互斥組','不消耗 API','作者備註','熙泰 · 專屬世界書'])assert.ok(html.includes(label),label);
});
test('ringing accepts only real pending call actions and postcall responsibility is separately validated',()=>{
 const payload={schema_version:10,action:'decline_call',mood_after:'irritated',mood_reason:'剛才有分歧'};
 assert.equal(validateTaiAction(payload,{mode:'ringing',recognized:true,callRinging:true}).decision.action,'decline_call');
 assert.equal(validateTaiAction(payload,{mode:'ringing',recognized:true,callRinging:false}).ok,false);
 assert.equal(validateTaiAction(payload,{mode:'text',recognized:true}).ok,false);
 const result=validateTaiAction({...payload,action:'end_session',call_responsibility:'self',call_reason:'自己說重了'},{postCall:true,recognized:true,hasIncoming:false});
 assert.equal(result.decision.call_responsibility,'self');
});
test('postcall sends real text only once and stores independent assessment',async()=>{
 const oldFetch=globalThis.fetch,oldSession=globalThis.sessionStorage;
 const state=initialState();state.day=60;state.clock='22:30';state.unlocked=true;
 const store={get:()=>state,update:fn=>fn(state)},chat=state.content.conversations.noapp.find(c=>c.id==='tai');
 const entry={id:'postcall-test',from:'me',day:60,time:'22:30',actual:true,kind:'call',callStatus:'ended',endedBy:'player',endReason:'manual',text:'語音通話',transcript:'熙蒙：先等等。'};
 chat.messages.push(entry);let requests=0;
 try{
  globalThis.sessionStorage={getItem:k=>k===BYOK_SESSION?JSON.stringify({deepseek:'test',minimax:'test'}):null};
  globalThis.fetch=async(url,init)=>{
   if(String(url).includes('chat/completions'))requests++;const body=JSON.parse(init.body);
   const decision=body.messages[0].content.includes('【行为决策层】');
   return Response.json({choices:[{message:{content:JSON.stringify(decision?{schema_version:10,action:'send_text',call_responsibility:'self',call_reason:'自己還沒說清楚',mood_after:'regretful',mood_reason:'說重了'}:{messages:[{text:'剛才我還沒說完。',mode:'text'}]})}}]});
  };
  assert.equal(await maybeSendProactive(store,{force:'postcall',postCall:entry,wait:async()=>{},random:()=>0.5}),true);
  assert.equal(chat.messages.at(-1).text,'剛才我還沒說完');
  assert.equal(chat.messages.at(-1).kind,'text');
  assert.equal(state.events.find(e=>e.type==='tai_postcall_handled').responsibility,'self');
  assert.equal(state.aiDraft.xitaiMood.mood,'regretful');
  assert.equal(await maybeSendProactive(store,{force:'postcall',postCall:entry}),false);
  assert.equal(requests,2);
 }finally{globalThis.fetch=oldFetch;if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;}
});
