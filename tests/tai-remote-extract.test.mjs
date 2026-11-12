import test from 'node:test';
import assert from 'node:assert/strict';
import {createArcadeBoard} from '../src/apps/ghost/games/arcade.js';
import {createBoard} from '../src/apps/ghost/games/logic.js';
import {extractNextTap,extractLegacyChoice} from '../src/system/remote-control/extract-solver.js';
import {createTaiLivePhoneTools} from '../src/system/remote-control/mcp.js';
import {dispatchTaiPhoneMcp} from '../src/services/ai/phone-mcp/protocol.js';
import {handle as ghostHandle,tick as ghostTick} from '../src/apps/ghost/index.js';

function fixture({legacy=false,linked=true}={}){
 const id='tai-extract-test';
 const board=legacy?createBoard('extract',{rounds:2}):
  {...createBoard('extract',{rounds:1}),arcade:createArcadeBoard('extract')};
 const s={day:18,clock:'08:30',unlocked:true,poweredOff:false,
  nav:{current:{appId:'ghost',route:'/run',params:{orderId:id}},stack:[]},
  story55:{version:1,ended:false,completed:{},ghostShare:{
   phase:'controlling',cardId:'s55-extract-1',
   source:{type:'ghost-order',orderId:id},
   remote:{active:true,authorizedDay:18,token:'extract-session',orderId:id,warningShown:false}
  }},
  ghost:{orders:{[id]:{id,type:'extract',status:'running',attempts:1,moves:0,
   errors:0,board,settings:{rounds:legacy?2:1,seconds:null},
   deadline:null,...(linked?{story55Project:'extract-demo'}:{})}},
   history:[],balance:0,config:{}},
  content:{conversations:{mirage:[]},mirage:{linkedMissions:{}}},events:[],notifications:[]
 };
 const store={get:()=>s,update:fn=>{fn(s);return s;}};
 const ctx={store,router:{open:()=>{}},refresh:()=>{},toast:()=>{}};
 const document={querySelector:selector=>{
  const hit=selector.match(/\[data-(value|index)="(\d+)"\]/);
  if(!hit)return null;
  const action=selector.includes('gh-arcade-tap')?'gh-arcade-tap':
   selector.includes('gh-match')?'gh-match':null;
  if(!action)return null;
  return {disabled:false,isConnected:true,
   click:()=>ghostHandle(action,{dataset:{
    ...(hit[1]==='value'?{value:hit[2]}:{index:hit[2]})
   }},ctx,s.nav.current)};
 }};
 const tasks={visible:false,show:()=>{},action:()=>{}};
 const live=createTaiLivePhoneTools({store,router:ctx.router,tasks,document});
 return {s,store,ctx,live,id};
}
const call=(s,live,name,args={})=>dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:1,
 method:'tools/call',params:{name,arguments:args}},{liveTools:live}).result.structuredContent;

test('EXTRACT planner only knows symbols exposed by the GHOST UI, not hidden cards',()=>{
 const a=createArcadeBoard('extract');
 const board={kind:'extract',cardCount:10,revealed:[],matched:[],visible:[],lockUntil:0};
 const p=extractNextTap(board);
 assert.equal(p.index,0);
 assert.deepEqual(p.known,{});
 const first={...board,revealed:[0],visible:[{index:0,symbol:a.cards[0]}]};
 const next=extractNextTap(first,p.known);
 assert.equal(next.index,1);
 assert.equal(next.known[0],a.cards[0]);
 assert.equal(next.known[1],undefined);
 assert.equal(extractNextTap({...first,visible:[{index:2,symbol:'SECRET'}]}),null);
 assert.equal(extractNextTap({...board,cardCount:20}),null);
 assert.equal(extractNextTap({...board,revealed:[1,1]}),null);
});
test('EXTRACT can resume after a previous mismatch, honor face-up lock and reuse remembered pairs',()=>{
 const a=createArcadeBoard('extract');
 const board={kind:'extract',cardCount:10,revealed:[0,1],matched:[],
  visible:[{index:0,symbol:a.cards[0]},{index:1,symbol:a.cards[1]}],
  lockUntil:Date.now()+700};
 const plan=extractNextTap(board,{});
 assert.ok(plan.waitUntil>Date.now());
 assert.ok(Object.keys(plan.known).length===2);
 const released={...board,revealed:[],visible:[],lockUntil:0};
 const next=extractNextTap(released,plan.known);
 assert.ok(Number.isInteger(next.index));
 const partner=a.cards.indexOf(a.cards[0],1);
 const known={0:a.cards[0],[partner]:a.cards[0]};
 assert.equal(extractNextTap(released,known).index,0);
});
test('EXTRACT native MCP memory runs through original Ghost buttons and settles once',()=>{
 for(let n=0;n<30;n++){
  const {s,store,ctx,live,id}=fixture(),o=s.ghost.orders[id];
  let known={},steps=0,mismatches=0;
  const original=[...o.board.arcade.cards];
  const first=call(s,live,'remote_read_extract');
  assert.equal(first.ok,true);
  assert.equal(first.data.board.kind,'extract');
  assert.equal(first.data.board.visible.length,0);
  assert.equal(Object.hasOwn(first.data.board,'cards'),false,'no hidden data in live MCP');
  while(o.status==='running'&&steps++<80){
   const info=call(s,live,'remote_read_extract');
   assert.equal(info.ok,true);
   const plan=extractNextTap(info.data.board,known);
   assert.ok(plan);
   known=plan.known;
   if(plan.waitUntil){
    assert.ok(o.board.arcade.revealed.length<=2);
    o.board.arcade.lockUntil=Date.now()-1; // only simulate the ordinary 720 ms timer
    ghostTick(ctx);
    mismatches++;
    continue;
   }
   const before=o.moves;
   assert.equal(call(s,live,'remote_tap_extract',{index:plan.index}).ok,true);
   assert.equal(o.moves,before+1,'each flip must go through Ghost.handle');
   const face=call(s,live,'remote_read_extract');
   if(face.data.board?.kind==='extract'){
    const after=extractNextTap(face.data.board,known);
    assert.ok(after);
    known=after.known;
   }
  }
  assert.equal(o.status,'success');
  assert.equal(o.board.arcade.matched.length,10);
  assert.deepEqual(o.board.arcade.cards,original);
  assert.equal(o.board.arcade.errors,mismatches);
  assert.equal(s.ghost.history.filter(h=>h.orderId===id).length,1);
  assert.equal(call(s,live,'remote_tap_extract',{index:0}).ok,false);
  assert.equal(call(s,live,'remote_release').ok,true);
  assert.equal(s.ghost.history.filter(h=>h.orderId===id).length,1);
 }
});
test('EXTRACT old fingerprint save uses native gh-match and original two-round logic',()=>{
 const {s,live,id}=fixture({legacy:true}),o=s.ghost.orders[id];
 assert.equal(o.board.arcade,undefined);
 for(let round=0;round<2;round++){
  const info=call(s,live,'remote_read_extract');
  assert.equal(info.ok,true);
  assert.equal(info.data.board.kind,'legacy-fingerprint');
  const index=extractLegacyChoice(info.data.board);
  assert.ok(index>=0);
  assert.equal(call(s,live,'remote_choose_extract_legacy',{index}).ok,true);
 }
 assert.equal(o.status,'success');
 assert.equal(o.moves,2);
 assert.equal(o.board.arcade,undefined,'do not replace legacy board');
 assert.equal(s.ghost.history.filter(h=>h.orderId===id).length,1);
});
test('EXTRACT permissions prevent hidden reads, non-shared orders, timeouts and other APP operations',()=>{
 const {s,live,id}=fixture(),o=s.ghost.orders[id];
 assert.equal(call(s,live,'remote_read_veil').ok,false);
 assert.equal(call(s,live,'remote_tap_extract',{index:10}).ok,false);
 assert.equal(call(s,live,'remote_tap_extract',{index:1,hidden:true}).ok,false);
 s.story55.ghostShare.source.orderId='wrong';
 assert.equal(call(s,live,'remote_read_extract').ok,false);
 s.story55.ghostShare.source.orderId=id;
 o.deadline=Date.now()-1;
 assert.equal(call(s,live,'remote_tap_extract',{index:0}).ok,false);
 o.deadline=null;
 o.board.arcade.lockUntil=Date.now()+720;
 assert.equal(call(s,live,'remote_tap_extract',{index:0}).ok,false);
 o.board.arcade.lockUntil=0;
 delete o.story55Project;
 assert.equal(call(s,live,'remote_read_extract').ok,false,'unlinked order denied');
 s.content.mirage.linkedMissions[id]={id,title:'linked'};
 assert.equal(call(s,live,'remote_read_extract').ok,true);
 s.story55.ghostShare.remote.active=false;
 assert.equal(call(s,live,'remote_read_extract').error,'remote_control_locked');
 assert.equal(dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:1,method:'tools/list'}).result.tools.length,6);
});
