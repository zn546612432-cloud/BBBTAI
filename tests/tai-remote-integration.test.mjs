import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,PhoneStore} from '../src/services/storage.js';
import {activateStory55,tickStory55} from '../src/services/story55/runtime.js';
import {pauseTaiRemoteOnHide,resumeTaiRemoteOnShow,createTaiForegroundDelay} from '../src/system/remote-control/visibility.js';
import {taiRemoteOrderAllowed} from '../src/system/remote-control/policy.js';
import {createTaiRemoteController} from '../src/system/remote-control/controller.js';
import {createTaiLivePhoneTools} from '../src/system/remote-control/mcp.js';
import {solveLinkPipe} from '../src/system/remote-control/link-solver.js';
import {solveCipherTiles} from '../src/system/remote-control/cipher-solver.js';
import {authorize,begin,advanceGhost} from '../src/apps/ghost/state.js';
import {handle,tick} from '../src/apps/ghost/index.js';
import {connected} from '../src/apps/ghost/games/logic.js';
import {D06_CONTRACT,D06_ORDER_ID} from '../src/story/d06/commission.js';
import {D04_STEP} from '../src/story/d04/contract.js';
import {ghostShareSource,shareGhostToTai,ghostShareReadyForControl,beginGhostShareControl,ghostShareScriptLine,sendGhostShareDraft} from '../src/services/story55/ghost-share.js';
import {readChatSources,saveChatSource} from '../src/apps/developer/features/conversations/source-model.js';
import {makeChatBundle,parseChatBundle,applyChatImport} from '../src/apps/developer/features/conversations/transfer.js';

function fixture(){
 const s=activateStory55(initialState());
 s.day=16;s.clock='08:20';s.unlocked=true;s.poweredOff=false;
 s.story55.config={...s.story55.config,nodes:[]};s.story55.activeScene=null;
 s.story55.projects.base={authorized:true,batches:[],active:null};
 const chat=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
 if(!chat)s.content.conversations.mirage.push({id:'s55-ouroboros',name:'Dr Ouroboros',messages:[],unread:0});
 s.nav={current:{appId:'ghost',route:'/run',params:{orderId:'shared'}},stack:[]};
 s.story55.ghostShareTakeovers=1;
 s.story55.ghostShare={phase:'controlling',cardId:'card',source:{type:'ghost-order',orderId:'shared'},
  remote:{active:true,token:'same-token',stage:'running',orderId:'shared',authorizedDay:16,pausedAt:null}};
 s.ghost={orders:{shared:{id:'shared',type:'cipher',status:'running',attempts:1,moves:0,errors:0,
  startedAt:10000,deadline:21000,board:{tiles:[1,0,2,3,4,5,6,7,8],selected:null}}},history:[],balance:0,config:{}};
 const store={get:()=>s,update:fn=>{fn(s);return s;}};
 const router={open:link=>s.nav.current=link},tasks={visible:false,show(){},hide(){},action(){}};
 const ctx={store,router,refresh(){},toast(){}};
 const doc={querySelector:selector=>{
  const m=selector.match(/\[data-index="(\d+)"\]/);
  if(!m)return null;
  return {isConnected:true,disabled:false,click:()=>handle(selector.includes('gh-pipe')?'gh-pipe':'gh-tile',{dataset:{index:m[1]}},ctx,s.nav.current)};
 }};
 const live=createTaiLivePhoneTools({store,router,tasks,document:doc});
 return {s,store,ctx,live,call:(name,args={})=>live.call(s,name,args)};
}
const withNow=(now,fn)=>{const saved=Date.now;Date.now=()=>now;try{return fn();}finally{Date.now=saved;}};

test('hidden takeover survives original Ghost poll and world tick while unrelated orders still expire',()=>{
 const {s,ctx}=fixture(),run=s.ghost.orders.shared;
 pauseTaiRemoteOnHide(s,20000);
 withNow(60000,()=>{tick(ctx);advanceGhost(s,60000);});
 assert.equal(run.status,'running');assert.deepEqual(s.ghost.history,[]);
 s.ghost.orders.other={...structuredClone(run),id:'other'};
 s.nav.current.params.orderId='other';
 withNow(60000,()=>tick(ctx));
 assert.equal(s.ghost.orders.other.status,'failed');
 assert.equal(run.status,'running');
 resumeTaiRemoteOnShow(s,60000);
 assert.equal(run.deadline,61000);
 s.nav.current.params.orderId='shared';
 withNow(60500,()=>tick(ctx));assert.equal(run.status,'running');
 withNow(61001,()=>tick(ctx));assert.equal(run.status,'failed');
 assert.equal(s.ghost.history.filter(x=>x.orderId==='shared').length,1);
});

test('original Ghost preview settlement and EXTRACT card locks stay paused until foreground',()=>{
 for(const kind of ['preview','extract']){
  const {s,ctx}=fixture(),run=s.ghost.orders.shared;
  run.deadline=null;
  if(kind==='preview'){run.status='preview-win';run.previewUntil=21000;}
  else{run.type='extract';run.board={arcade:{kind:'extract',cards:[0,1,0,1,2,2,3,3,4,4],matched:[],revealed:[0,1],lockUntil:21000}};}
  pauseTaiRemoteOnHide(s,20000);
  withNow(60000,()=>{tick(ctx);advanceGhost(s,60000);});
  assert.equal(run.status,kind==='preview'?'preview-win':'running');
  if(kind==='extract')assert.deepEqual(run.board.arcade.revealed,[0,1]);
  resumeTaiRemoteOnShow(s,60000);
  withNow(60500,()=>tick(ctx));
  assert.equal(run.status,kind==='preview'?'preview-win':'running');
  withNow(61001,()=>tick(ctx));
  if(kind==='preview'){assert.equal(run.status,'success');assert.equal(s.ghost.history.length,1);}
  else{assert.deepEqual(run.board.arcade.revealed,[]);assert.deepEqual(s.ghost.history,[]);}
 }
});

test('real D01 and D06 parent/child orders are consistently excluded for their actual game types',()=>{
 const {s}=fixture();
 const special=[{id:'mirage001',type:'route'},{id:D06_ORDER_ID,type:'cipher'},
  {id:'mirage-ouroboros-10btc-d05',type:'cipher'},
  ...D06_CONTRACT.stages.map((type,i)=>({id:D04_STEP(D06_ORDER_ID,i),type}))];
 for(const order of special){
  const o={...order,status:'authorized',story55Project:'base'};
  s.ghost.orders[o.id]=o;
  assert.equal(taiRemoteOrderAllowed(s,o),false,o.id);
  assert.equal(ghostShareSource(s,{orderId:o.id}),null,o.id);
 }
 assert.ok(ghostShareSource(s,{orderId:'shared'}));
 for(const day of [1,6,14,25]){s.day=day;assert.equal(ghostShareSource(s,{orderId:'shared'}),null);}
});

test('current default 3x3 LINKs are read and solved by native rotations, including both endpoints',()=>{
 for(let i=0;i<32;i++){
  const {s,call}=fixture();
  delete s.ghost.orders.shared;
  authorize(s,{orderId:'shared',type:'route'});
  assert.equal(begin(s,'shared'),true);
  const run=s.ghost.orders.shared,before=structuredClone(run.board);
  assert.equal(run.board.size,undefined,'test the actual current default generator');
  const visible=call('remote_read_link').data.board;
  assert.equal(visible.legacy,true);assert.equal(visible.solvedMasks,undefined);
  const plan=solveLinkPipe(visible);
  assert.ok(plan?.length);assert.deepEqual(run.board,before);
  for(const {index,turns} of plan)for(let t=0;t<turns&&run.status==='running';t++)
   assert.equal(call('remote_rotate_pipe',{index}).ok,true);
  assert.equal(connected(run.board.masks).has(8),true);
  assert.equal(run.status,'success');assert.equal(run.attempts,1);
  assert.equal(s.ghost.history.length,1);
 }
});

test('CIPHER exposes and releases any half selection through the original tile handler before swaps',()=>{
 for(let selected=0;selected<9;selected++){
  const {s,call}=fixture(),run=s.ghost.orders.shared;
  run.deadline=null;run.board.selected=selected;
  const first=call('remote_read_cipher').data.board;
  assert.equal(first.selected,selected);
  assert.equal(call('remote_tap_cipher_tile',{index:first.selected}).ok,true);
  assert.equal(run.board.selected,null);assert.deepEqual(run.board.tiles,first.tiles);
  const plan=solveCipherTiles(call('remote_read_cipher').data.board);
  for(const pair of plan)for(const index of [pair.first,pair.second])assert.equal(call('remote_tap_cipher_tile',{index}).ok,true);
  assert.equal(run.status,'success');assert.equal(run.attempts,1);assert.equal(s.ghost.history.length,1);
 }
});

test('D24 pending dialogue and ready handoff expire at D25 without spending a takeover or blocking the composer',()=>{
 for(const ready of [false,true]){
  const {s}=fixture();delete s.story55.ghostShare;s.story55.ghostShareTakeovers=0;
  s.day=24;
  assert.equal(shareGhostToTai(s,{projectId:'base'},{random:()=>0}).accepted,true);
  if(ready){
   for(let n=0;n<3;n++){
    for(const m of s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages)if(m.schedule)m.delivery={day:24,clock:s.clock};
    const line=ghostShareScriptLine(s);assert.equal(line.kind,'me');sendGhostShareDraft(s,line.text);
   }
   assert.equal(ghostShareReadyForControl(s),true);
  }
  s.day=25;
  assert.equal(ghostShareReadyForControl(s),false);assert.equal(beginGhostShareControl(s),false);
  assert.equal(ghostShareScriptLine(s),null);
  tickStory55(s);
  assert.equal(s.story55.ghostShare.phase,'expired');assert.equal(s.story55.ghostShareTakeovers,0);
 }
});

test('live PhoneStore.replace clears the imported input lock without replaying or altering the current order',()=>{
 const {s}=fixture(),memory=new Map();
 const store=new PhoneStore({getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)});
 const listeners=new Map(),doc={hidden:false,querySelector(){return null;},addEventListener:(name,fn)=>listeners.set(name,fn)};
 createTaiRemoteController({store,document:doc,router:{open(){}},tasks:{visible:false,hide(){}}});
 s.story55.ghostShare.remote.pausedAt=20000;
 s.ghost.orders.shared.deadline=null;
 tickStory55(s);
 const before=structuredClone(s.ghost),ledger=structuredClone(s.bankData);
 store.replace(s);
 const restored=store.get();
 assert.equal(restored.story55.ghostShare.phase,'interrupted');
 assert.equal(restored.story55.ghostShare.remote.active,false);
 assert.equal(restored.story55.ghostShare.remote.pausedAt,null);
 assert.equal(restored.story55.ghostShareTakeovers,1);
 assert.deepEqual(restored.ghost,before);assert.deepEqual(restored.bankData,ledger);
 let blocked=false;
 listeners.get('click')({isTrusted:true,target:{closest:()=>({})},cancelable:true,preventDefault(){blocked=true;},stopImmediatePropagation(){blocked=true;}});
 assert.equal(blocked,false);
 assert.equal(s.story55.ghostShare.phase,'controlling','replace must not mutate the source backup');
});

test('replacing a hidden session can cancel its foreground wait and remove temporary listeners immediately',async()=>{
 const listeners=new Map(),doc={hidden:true,
  addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 const abort=new AbortController(),delay=createTaiForegroundDelay(doc);
 const pending=delay(5000,abort.signal);
 abort.abort();
 await assert.rejects(pending,{name:'AbortError'});
 assert.equal(listeners.size,0);
});

test('share dialogue source edits and portable export use the same runtime text and protect already-started scenes',()=>{
 const s=activateStory55(initialState()),key='ghost-share:first';
 const source=readChatSources(s,15).find(x=>x.key===key);
 assert.ok(source);assert.equal(readChatSources(s,14).some(x=>x.key===key),false);
 const text=source.lines.map(x=>x.text);text[0]='原稿編輯驗證';text[1]='預設回覆驗證';
 saveChatSource(s,key,{lines:text});
 const bundle=parseChatBundle(JSON.stringify(makeChatBundle(s,{scope:'story'})));
 const restored=activateStory55(initialState());
 applyChatImport(restored,bundle,{mode:'merge'});
 assert.equal(readChatSources(restored,15).find(x=>x.key===key).lines[0].text,text[0]);
 restored.day=16;restored.clock='08:20';restored.story55.activeScene=null;
 restored.story55.projects.base={authorized:true,batches:[]};
 restored.content.conversations.mirage.push({id:'s55-ouroboros',name:'Dr Ouroboros',messages:[],unread:0});
 assert.equal(shareGhostToTai(restored,{projectId:'base'},{random:()=>0}).accepted,true);
 const chat=restored.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
 assert.equal(chat.messages.at(-1).text,text[0]);
 chat.messages.at(-1).delivery={day:16,clock:'08:20'};
 assert.equal(ghostShareScriptLine(restored).text,text[1]);
 assert.throws(()=>saveChatSource(restored,key,{lines:text}),/受保護/);
 assert.throws(()=>saveChatSource(s,key,{lines:text,at:'10:00'}),/不能指定固定時間/);
});
