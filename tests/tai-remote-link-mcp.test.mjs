import test from 'node:test';
import assert from 'node:assert/strict';
import {generatePipeNetwork,pipeSolved} from '../src/apps/ghost/games/pipe-network.js';
import {solveLinkPipe,rotatePipe} from '../src/system/remote-control/link-solver.js';
import {solveCipherTiles} from '../src/system/remote-control/cipher-solver.js';
import {createBoard,puzzleSolved} from '../src/apps/ghost/games/logic.js';
import {createTaiLivePhoneTools} from '../src/system/remote-control/mcp.js';
import {recoverTaiRemoteSession} from '../src/system/remote-control/controller.js';
import {dispatchTaiPhoneMcp} from '../src/services/ai/phone-mcp/protocol.js';
import {listTaiPhoneTools} from '../src/services/ai/phone-mcp/index.js';
import {dynamicIsland} from '../src/system/power/island.js';
import {handle as ghostHandle,tick as ghostTick} from '../src/apps/ghost/index.js';

test('LINK planner solves generated 5, 6 and 7 grids only through rotations, leaving endpoints fixed',()=>{
 for(const size of [5,6,7])for(let attempt=0;attempt<35;attempt++){
  const b=generatePipeNetwork({size});
  assert.equal(pipeSolved(b),false);
  const saved=[...b.masks],plan=solveLinkPipe(b);
  assert.ok(Array.isArray(plan),'a valid LINK route must have a plan');
  assert.ok(plan.length<=size*size*3);
  assert.deepEqual(b.masks,saved,'solver must not modify the actual game board');
  const copy={...b,masks:[...b.masks]};
  for(const {index,turns} of plan){
   assert.ok(index!==b.source&&index!==b.sink,'fixed terminals cannot rotate');
   assert.ok(Number.isInteger(turns)&&turns>=1&&turns<=3);
   for(let i=0;i<turns;i++)copy.masks[index]=rotatePipe(copy.masks[index]);
  }
  assert.equal(pipeSolved(copy),true);
 }
});

function session(){
 const board=generatePipeNetwork({size:5});
 const s={day:16,clock:'08:20',unlocked:true,poweredOff:false,
  nav:{current:{appId:'ghost',route:'/run',params:{orderId:'shared'}},stack:[]},
  story55:{version:1,ended:false,completed:{},ghostShare:{
   phase:'controlling',cardId:'card-1',
   source:{type:'ghost-order',orderId:'shared'},
   remote:{active:true,authorizedDay:16,orderId:'shared',warningShown:false}
  }},
  ghost:{orders:{shared:{id:'shared',type:'route',status:'running',deadline:null,
   settings:{},attempts:1,moves:0,errors:0,board}},history:[],balance:0,config:{}},
  content:{conversations:{mirage:[]}},events:[],notifications:[]
 };
 const store={get:()=>s,update:fn=>{fn(s);return s;}};
 const router={open:link=>{s.nav.current=link;}};
 const tasks={visible:false,show:()=>{tasks.visible=true;},hide:()=>{tasks.visible=false;},
  action:()=>{tasks.visible=false;return true;}};
 const ctx={store,router,toast:()=>{}};
 const doc={querySelector:selector=>{
  const match=selector.match(/\[data-index="(\d+)"\]/);
  if(match&&(selector.includes('gh-pipe')||selector.includes('gh-tile')))return {
   disabled:false,isConnected:true,
   click:()=>ghostHandle(selector.includes('gh-pipe')?'gh-pipe':'gh-tile',{dataset:{index:match[1]}},ctx,s.nav.current)
  };
  return null;
 }};
 return {s,store,router,tasks,doc};
}
const call=(state,name,args={},liveTools)=>dispatchTaiPhoneMcp(state,{
 jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}
},{liveTools}).result.structuredContent;

test('stdio MCP stays read-only; only an injected, granted same-page session can rotate GHOST',()=>{
 const {s,store,router,tasks,doc}=session();
 const tools=createTaiLivePhoneTools({store,router,tasks,document:doc});
 assert.equal(listTaiPhoneTools().length,6);
 assert.equal(dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:1,method:'tools/list'}).result.tools.length,6);
 assert.equal(dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:1,method:'tools/list'},{liveTools:tools}).result.tools.length,20);
 assert.equal(call(s,'remote_read_link',{},undefined).ok,false);
 const first=call(s,'remote_read_link',{},tools);
 assert.equal(first.ok,true);assert.equal(first.data.orderId,'shared');
 assert.deepEqual(first.data.board.masks,s.ghost.orders.shared.board.masks);
 assert.equal(first.data.board.solvedMasks,undefined,'do not disclose stored solution in live MCP tool');
 const plan=solveLinkPipe(s.ghost.orders.shared.board);
 assert.ok(plan.length>0);
 const index=plan[0].index,before=s.ghost.orders.shared.board.masks[index];
 const result=call(s,'remote_rotate_pipe',{index},tools);
 assert.equal(result.ok,true);
 assert.equal(s.ghost.orders.shared.board.masks[index],rotatePipe(before));
 assert.ok(s.ghost.orders.shared.moves>0,'the original Ghost handler must be invoked');
 assert.equal(call(s,'remote_rotate_pipe',{index:s.ghost.orders.shared.board.source},tools).ok,false);
 assert.equal(call(s,'remote_rotate_pipe',{index:81},tools).ok,false);
 assert.equal(call(s,'remote_rotate_pipe',{index,private:'diary'},tools).ok,false);
 assert.equal(call(s,'get_schedule',{},tools).ok,false);
});

test('full MCP LINK sequence changes only through Ghost.handle and original preview settlement',()=>{
 for(let repeat=0;repeat<12;repeat++){
  const {s,store,router,tasks,doc}=session();
  const live=createTaiLivePhoneTools({store,router,tasks,document:doc});
  const steps=solveLinkPipe(s.ghost.orders.shared.board);
  assert.ok(steps?.length>0);
  for(const {index,turns} of steps){
   for(let t=0;t<turns;t++){
    if(s.ghost.orders.shared.status!=='running')break;
    assert.equal(call(s,'remote_rotate_pipe',{index},live).ok,true);
   }
  }
  const o=s.ghost.orders.shared;
  assert.ok(['success','preview-win'].includes(o.status),'GHOST must accept the path');
  if(o.status==='preview-win'){
   o.previewUntil=Date.now()-1;
   ghostTick({store,router,toast:()=>{},refresh:()=>{}});
  }
  assert.equal(o.status,'success');
  assert.equal(s.ghost.history.filter(h=>h.orderId==='shared').length,1);
  assert.equal(call(s,'remote_release',{},live).ok,true);
  assert.equal(s.ghost.history.filter(h=>h.orderId==='shared').length,1);
 }
});

test('remote session permission is bound to the shared order, not global phone access',()=>{
 const {s,store,router,tasks,doc}=session();
 const tools=createTaiLivePhoneTools({store,router,tasks,document:doc});
 s.story55.ghostShare.remote.active=false;
 assert.equal(call(s,'remote_read_link',{},tools).error,'remote_control_locked');
 s.story55.ghostShare.remote.active=true;
 s.story55.ghostShare.remote.authorizedDay=14;
 assert.equal(call(s,'remote_read_link',{},tools).error,'remote_control_locked');
 s.story55.ghostShare.remote.authorizedDay=16;
 s.story55.ghostShare.source.orderId='another-order';
 assert.equal(call(s,'remote_read_link',{},tools).error,'link_order_not_ready');
 s.story55.ghostShare.source.orderId='shared';
 s.day=25;
 assert.equal(call(s,'remote_read_link',{},tools).ok,true,'started takeover may finish after a clock boundary');
});

test('remote release is idempotent, turns island red off and never completes Ghost by itself',()=>{
 const {s,store,router,tasks,doc}=session();
 const tools=createTaiLivePhoneTools({store,router,tasks,document:doc});
 assert.match(dynamicIsland(s),/island-remote/);
 const before=s.ghost.orders.shared.status;
 assert.equal(call(s,'remote_release',{},tools).ok,true);
 assert.equal(s.story55.ghostShare.phase,'complete');
 assert.equal(s.story55.ghostShare.remote.active,false);
 assert.equal(s.ghost.orders.shared.status,before);
 assert.doesNotMatch(dynamicIsland(s),/island-remote/);
 assert.equal(call(s,'remote_release',{},tools).ok,false);
});

test('refresh abandons a controlling session without replaying a reward or resetting story count',()=>{
 const {s,store}=session();
 s.story55.ghostShareTakeovers=2;
 assert.equal(recoverTaiRemoteSession(store),true);
 assert.equal(recoverTaiRemoteSession(store),false);
 assert.equal(s.story55.ghostShare.phase,'interrupted');
 assert.equal(s.story55.ghostShare.remote.active,false);
 assert.equal(s.story55.ghostShareTakeovers,2);
 assert.deepEqual(s.ghost.history,[]);
 assert.doesNotMatch(dynamicIsland(s),/island-remote/);
});

test('CIPHER pure planner produces only visible tile swaps; board remains untouched',()=>{
 for(let i=0;i<120;i++){
  const board=createBoard('cipher',{cipherSwaps:i%2?1:2}),before=[...board.tiles];
  const plan=solveCipherTiles(board);
  assert.ok(plan?.length>=1&&plan.length<=2);
  assert.deepEqual(board.tiles,before);
  const work=[...board.tiles];
  for(const {first,second} of plan){[work[first],work[second]]=[work[second],work[first]];}
  assert.equal(puzzleSolved(work),true);
 }
 assert.equal(solveCipherTiles({tiles:[0,1,1,3,4,5,6,7,8]}),null);
 assert.equal(solveCipherTiles({tiles:[0,1,2]}),null);
});

test('CIPHER live MCP clicks the original Ghost tile handler, settles exactly once',()=>{
 for(let n=0;n<24;n++){
  const {s,store,router,tasks,doc}=session();
  const run=s.ghost.orders.shared;
  run.type='cipher';run.board=createBoard('cipher',{cipherSwaps:n%2?1:2});
  const original=[...run.board.tiles],live=createTaiLivePhoneTools({store,router,tasks,document:doc});
  const state=call(s,'remote_read_cipher',{},live);
  assert.equal(state.ok,true);
  assert.deepEqual(state.data.board.tiles,original);
  assert.equal(call(s,'remote_read_link',{},live).ok,false,'LINK data must remain type-scoped');
  assert.equal(call(s,'remote_rotate_pipe',{index:0},live).ok,false);
  assert.equal(call(s,'remote_tap_cipher_tile',{index:9},live).ok,false);
  assert.equal(call(s,'remote_tap_cipher_tile',{index:0,unsafe:true},live).ok,false);
  const plan=solveCipherTiles(state.data.board);
  for(const {first,second} of plan){
   assert.equal(call(s,'remote_tap_cipher_tile',{index:first},live).ok,true);
   assert.equal(call(s,'remote_tap_cipher_tile',{index:second},live).ok,true);
  }
  assert.equal(run.status,'success','only original Ghost handler decides success');
  assert.equal(puzzleSolved(run.board.tiles),true);
  assert.equal(s.ghost.history.filter(h=>h.orderId==='shared').length,1,'exactly one settlement');
  assert.equal(run.moves,plan.length*2,'each native tile click counts as a game move');
  assert.equal(call(s,'remote_tap_cipher_tile',{index:0},live).ok,false,'cannot move after win');
  assert.equal(call(s,'remote_release',{},live).ok,true);
  assert.equal(s.ghost.history.filter(h=>h.orderId==='shared').length,1);
 }
});

test('CIPHER MCP cannot control unrelated order or read when takeover is inactive',()=>{
 const {s,store,router,tasks,doc}=session();
 s.ghost.orders.shared.type='cipher';
 s.ghost.orders.shared.board=createBoard('cipher',{cipherSwaps:2});
 const live=createTaiLivePhoneTools({store,router,tasks,document:doc});
 s.story55.ghostShare.source.orderId='other';
 assert.equal(call(s,'remote_read_cipher',{},live).ok,false);
 s.story55.ghostShare.source.orderId='shared';
 s.story55.ghostShare.remote.active=false;
 assert.equal(call(s,'remote_tap_cipher_tile',{index:0},live).error,'remote_control_locked');
 assert.equal(dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:9,method:'tools/list'}).result.tools.length,6);
});
