import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,PhoneStore} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {worldbookPanel} from '../src/apps/developer/features/worldbook/index.js';
import {rememberTaiConversation,rememberTaiDelivered,rememberTaiCall,applyTaiMemoryUpdate,selectTaiLongMemories,taiLongMemoryPrompt,migrateTaiMemories} from '../src/services/ai/memory.js';
import {rememberTaiMood,readTaiMood} from '../src/services/ai/worldbook/mood.js';
import {captureTaiWorldbook,taiWorldbookPrompt} from '../src/services/ai/worldbook/index.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {replyToTaiMessage} from '../src/services/ai/live-chat.js';
import {BYOK_SESSION} from '../src/services/ai/gateway.js';
import {validateTaiAction} from '../src/services/ai/action-protocol-v10.js';

const make=()=>{let s=initialState();s.day=60;s.clock='22:00';s.aiDraft.memories=[];return {get:()=>s,update(fn){const n=structuredClone(s);fn(n);s=n;}};};
const conflict={op:'open',category:'conflict',evidence:'你剛才根本沒聽我說',reason:'覺得自己的好意被誤解'};
const user=content=>({role:'user',content});
test('only verified actual quotes can create subjective episodes; retries do not duplicate them',()=>{
 const store=make();
 assert.equal(rememberTaiMood(store,{memory_update:conflict},'s0',{evidence:'完全不同的話'}),false);
 assert.ok(rememberTaiMood(store,{mood_after:'hurt',mood_reason:'被誤解',mood_intensity:'high',memory_update:conflict},'s1',{evidence:conflict.evidence}));
 assert.equal(rememberTaiMood(store,{memory_update:conflict},'s1',{evidence:conflict.evidence}),false);
 const [m]=store.get().aiDraft.memories;assert.equal(m.kind,'episode');assert.equal(m.text,conflict.evidence);assert.equal(m.reason,conflict.reason);assert.equal(m.status,'open');
 assert.equal(readTaiMood(store.get()).intensity,'high');
});
test('game clock crosses midnight and 03:00, mood fades but the episode remains open',()=>{
 const store=make();store.update(s=>s.clock='23:00');
 rememberTaiMood(store,{mood_after:'hurt',mood_reason:'被誤解',mood_intensity:'medium',memory_update:conflict},'s1',{evidence:conflict.evidence});
 store.update(s=>s.clock='02:00');assert.equal(readTaiMood(store.get()).elapsedMinutes,180);assert.equal(readTaiMood(store.get()).intensity,'medium');
 store.update(s=>{s.day++;s.clock='03:01';});assert.equal(readTaiMood(store.get()).intensity,'low');
 store.update(s=>s.clock='11:00');assert.equal(readTaiMood(store.get()).intensity,'settled');
 assert.equal(store.get().aiDraft.memories[0].status,'open');
 const snapshot=captureTaiWorldbook(store,{channel:'noapp',recognized:true,day:61,messages:[user('早上好')],turnId:'new'});
 assert.match(taiWorldbookPrompt({worldbookSnapshot:snapshot,phase:'decision'}),/尚未釐清/);
 assert.match(buildTaiPrompt({day:61,channel:'noapp',recognized:true,worldbookSnapshot:snapshot}),/尚未釐清/);
 assert.match(taiWorldbookPrompt({worldbookSnapshot:snapshot}),/現已自然平復/);
});
test('memory resolution requires a new exact and related utterance, not just a change of topic',()=>{
 const store=make();rememberTaiMood(store,{memory_update:conflict},'s1',{evidence:conflict.evidence});const id=store.get().aiDraft.memories[0].id;
 const resolve={op:'resolve',id,evidence:'今天吃甚麼',reason:'已和好'};
 assert.equal(rememberTaiMood(store,{memory_update:resolve},'s2',{evidence:resolve.evidence}),false);
 const repair={op:'resolve',id,evidence:'剛才我說重了，對不起',reason:'他主動澄清了'};
 assert.ok(rememberTaiMood(store,{memory_update:repair},'s3',{evidence:repair.evidence}));
 assert.equal(store.get().aiDraft.memories[0].status,'resolved');
 assert.equal(store.get().aiDraft.memories[0].resolution.evidence,repair.evidence);
});
test('traditional Chinese direct preferences and actual Tai promises are retained; call pruning preserves author memories',()=>{
 const s=make().get();s.aiDraft.memories.push({id:'author',day:60,visibility:'noapp',source:'作者',text:'已確認的資料'});
 assert.ok(rememberTaiConversation(s,'我喜歡聖誕驚魂夜',{sourceId:'p1'}));
 assert.ok(rememberTaiDelivered(s,'我答應你，下次再聊這件事',{sourceId:'t1'}));
 assert.equal(rememberTaiDelivered(s,'如果我答應你呢？',{sourceId:'t2'}),false);
 for(let i=0;i<50;i++)rememberTaiCall(s,{id:'call'+i,transcript:'熙蒙：這個話題'+i});
 assert.equal(s.aiDraft.memories.filter(m=>m.kind==='call').length,30);
 for(const id of ['author','p1','t1'])assert.ok(s.aiDraft.memories.some(m=>m.id===id||m.sourceId===id));
});
test('retrieval prioritizes a relevant old preference and open episodes; locks future and private channels',()=>{
 const store=make();store.update(s=>{rememberTaiConversation(s,'我喜歡聖誕驚魂夜',{sourceId:'p1'});for(let i=0;i<40;i++)rememberTaiConversation(s,'我最近去了地方'+i,{sourceId:'p'+(i+2)});s.day=64;s.aiDraft.memories.push({kind:'quote',text:'future',day:70,visibility:'noapp'},{kind:'quote',text:'private',day:62,visibility:'mirage'});});
 const entries=selectTaiLongMemories(store.get().aiDraft.memories,{day:64,channel:'noapp',recognized:true,messages:[user('聖誕驚魂夜')]});
 assert.ok(entries.some(m=>m.sourceId==='p1'));assert.ok(!entries.some(m=>['future','private'].includes(m.text)));
 assert.deepEqual(selectTaiLongMemories(store.get().aiDraft.memories,{day:64,channel:'noapp',recognized:false}),[]);
 const s=store.get();const snap=captureTaiWorldbook(store,{day:s.day,channel:'chess',recognized:true,messages:[user('聖誕驚魂夜')],turnId:'chess1'});
 assert.deepEqual(snap.longMemory,[]);assert.equal(snap.mood,null);
});
test('migrates previous exact quote and call records without overwriting manual facts',()=>{
 const old=[{day:60,visibility:'noapp',source:'NoApp · 熙蒙亲口所说',text:'我喜欢咖啡'},{day:60,visibility:'noapp',source:'NoApp已发生通话',text:'熙蒙：你好'},{id:'author',day:60,visibility:'shared',source:'作者',text:'真實設定'}];
 assert.equal(migrateTaiMemories(old),true);assert.equal(old[0].kind,'quote');assert.equal(old[1].kind,'call');assert.equal(old[2].id,'author');assert.equal(migrateTaiMemories(old),false);
});
test('Story55 saved episodes survive reload and remain hidden before recognition',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const store=new PhoneStore(storage),s=activateStory55(initialState());s.day=35;s.clock='22:00';
 store.replace(s);assert.equal(rememberTaiMood(store,{memory_update:conflict},'locked',{evidence:conflict.evidence}),false);
 store.update(s=>{s.story55.completed.recognition={day:35,clock:'21:00'};});
 assert.ok(rememberTaiMood(store,{mood_after:'hurt',mood_reason:'被誤解',memory_update:conflict},'real',{evidence:conflict.evidence}));
 const reloaded=new PhoneStore(storage),record=reloaded.get().aiDraft.memories.find(m=>m.kind==='episode');assert.equal(record.status,'open');
 assert.equal(readTaiMood(reloaded.get()).mood,'hurt');assert.match(worldbookPanel(reloaded.get()),/尚未釐清 1 件/);
});
test('protocol excludes unsent/deferred/unrecognized observations',()=>{
 const raw={schema_version:10,action:'send_text',memory_update:conflict};
 assert.ok(validateTaiAction(raw,{recognized:true}).decision.memory_update);
 assert.equal(validateTaiAction(raw,{recognized:false}).decision.memory_update,undefined);
 assert.equal(validateTaiAction({...raw,action:'defer_reply'},{recognized:true}).decision.memory_update,undefined);
});
test('actual NoApp two-stage requests recover old evidence next day and can resolve it',async()=>{
 const store=make(),previous={fetch:globalThis.fetch,sessionStorage:globalThis.sessionStorage,localStorage:globalThis.localStorage},requests=[];
 let phase=0;
 const send=(id,text)=>store.update(s=>s.content.conversations.noapp.find(c=>c.id==='tai').messages.push({id,from:'me',text,kind:'text',actual:true,day:s.day,time:s.clock}));
 try{
  globalThis.sessionStorage={getItem:k=>k===BYOK_SESSION?JSON.stringify({deepseek:'mock'}):null};
  globalThis.localStorage={getItem:()=>null};
  globalThis.fetch=async(url,init)=>{
   if(String(url).includes('tai-v8-persona'))return Response.json({},{status:404});
   if(!String(url).includes('chat/completions'))return Response.json({deepseek:true,minimax:false});
   const body=JSON.parse(init.body),system=body.messages[0].content,isDecision=system.includes('【行为决策层】');requests.push({phase,isDecision,system});
   const id=store.get().aiDraft.memories.find(m=>m.kind==='episode')?.id;
   const payload=isDecision?{schema_version:10,action:'send_text',mood_after:phase?'calm':'hurt',mood_reason:phase?'他承認說重了':'不滿被誤解',memory_update:phase?{op:'resolve',id,evidence:'剛才我說重了，對不起',reason:'對方已澄清'}:conflict}:{messages:[{text:phase?'行，我知道了。':'你先把話說完。',mode:'text'}]};
   return Response.json({choices:[{message:{content:JSON.stringify(payload)}}]});
  };
  send('first',conflict.evidence);assert.equal((await replyToTaiMessage(store,'first',{wait:async()=>{},random:()=>.99})).status,'replied');
  assert.equal(store.get().aiDraft.memories.find(m=>m.kind==='episode').status,'open');
  store.update(s=>{s.day++;s.clock='22:00';});phase=1;send('second','剛才我說重了，對不起');
  assert.equal((await replyToTaiMessage(store,'second',{wait:async()=>{},random:()=>.99})).status,'replied');
  assert.equal(store.get().aiDraft.memories.find(m=>m.kind==='episode').status,'resolved');
  const next=requests.filter(r=>r.phase===1);assert.equal(next.some(r=>r.isDecision),true);assert.equal(next.some(r=>!r.isDecision),true);
  for(const r of next)assert.match(r.system,/尚未釐清/);
 }finally{for(const [k,v] of Object.entries(previous))if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
});
