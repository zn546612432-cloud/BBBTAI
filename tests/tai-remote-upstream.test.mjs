import test from 'node:test';
import assert from 'node:assert/strict';
import {createArcadeBoard,arcadeAction,arcadeTick} from '../src/apps/ghost/games/arcade.js';
import {solveCipherSlideTiles} from '../src/system/remote-control/cipher-solver.js';
import {puzzleNeighbors} from '../src/apps/ghost/games/vendor/puzzle-slide.js';
import {veilPlan} from '../src/system/remote-control/veil-solver.js';
import {extractNextTap} from '../src/system/remote-control/extract-solver.js';
import {createTaiLivePhoneTools} from '../src/system/remote-control/mcp.js';
import {dispatchTaiPhoneMcp} from '../src/services/ai/phone-mcp/protocol.js';
import {handle as ghostHandle} from '../src/apps/ghost/index.js';

const rng=x=>()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};
function fixture(type,grade='A'){
 const id='shared-upstream-'+type,now=Date.now();
 const arcade=createArcadeBoard(type,rng(22),{upstream:true,grade,now});
 const o={id,type,status:'running',attempts:1,moves:0,errors:0,
  startedAt:now,deadline:now+60000,settings:{seconds:60,arcadeV3:true,grade},
  board:{tiles:[0,1,2,3,4,5,6,7,8],arcade},
  story55Project:'upstream-project'};
 const s={day:18,clock:'08:30',unlocked:true,poweredOff:false,
  nav:{current:{appId:'ghost',route:'/run',params:{orderId:id}},stack:[]},
  story55:{version:1,ended:false,completed:{},ghostShare:{
   phase:'controlling',cardId:'upstream-card',
   source:{type:'ghost-order',orderId:id},
   remote:{active:true,authorizedDay:18,token:'session-new',orderId:id,warningShown:false}
  }},
  ghost:{orders:{[id]:o},history:[],balance:0,config:{}},
  content:{conversations:{mirage:[]},mirage:{linkedMissions:{}}},events:[],notifications:[],
  bankData:{balance:0,transactions:[]}};
 const store={get:()=>s,update:fn=>{fn(s);return s;}};
 const ctx={store,router:{open:()=>{}},toast:()=>{},refresh:()=>{}};
 const doc={querySelector:selector=>{
  const match=selector.match(/\[data-action="(gh-arcade-tap|gh-arcade-step)"\]\[data-value="([^"]+)"\]/);
  if(!match)return null;
  return {disabled:false,isConnected:true,
   click:()=>ghostHandle(match[1],{dataset:{value:match[2]}},ctx,s.nav.current)};
 }};
 const live=createTaiLivePhoneTools({store,router:ctx.router,tasks:{visible:false,show(){},action(){}},document:doc});
 const call=(name,args={})=>dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:1,method:'tools/call',
  params:{name,arguments:args}},{liveTools:live}).result.structuredContent;
 return {s,o,id,call};
}
test('Xi Tai sliding CIPHER uses real permutation planner, never direct board mutation',()=>{
 for(let seed=1;seed<=12;seed++){
  const b=createArcadeBoard('cipher',rng(seed),{upstream:true,grade:'B'});
  const initial=structuredClone(b),plan=solveCipherSlideTiles(b);
  assert.ok(plan?.length>1,'must find nontrivial legal path');
  assert.deepEqual(b,initial,'planner is read-only');
  let last;
  for(const index of plan)last=arcadeAction(b,'tap',index);
  assert.equal(last.won,true);
 }
 const {o,call}=fixture('cipher');
 const view=call('remote_read_cipher');
 assert.equal(view.ok,true);
 assert.equal(view.data.board.kind,'cipher-slide');
 assert.equal(view.data.board.empty,o.board.arcade.empty);
 const plan=solveCipherSlideTiles(view.data.board);
 const old=[...o.board.arcade.tiles],bad=Array.from({length:9},(_,i)=>i).find(i=>!puzzleNeighbors(o.board.arcade.empty).includes(i));
 assert.equal(call('remote_tap_cipher_tile',{index:bad}).ok,false);
 assert.equal(call('remote_tap_cipher_tile',{index:plan[0]}).ok,true);
 assert.notDeepEqual(o.board.arcade.tiles,old);
 assert.equal(o.moves,1);
});
test('Xi Tai solves new maze via actual on-screen STEPs, not raw Ghost finish()',()=>{
 for(let seed=1;seed<=16;seed++){
  const b=createArcadeBoard('veil',rng(seed),{upstream:true,grade:seed%2?'A':'B'});
  const saved=structuredClone(b),plan=veilPlan(b);
  assert.ok(Array.isArray(plan)&&plan.length>0);
  assert.deepEqual(b,saved);
  let last;
  for(const step of plan){last=arcadeAction(b,'step',step);assert.notEqual(last.caught,true);}
  assert.equal(last.won,true);
 }
 const {o,call}=fixture('veil');
 const first=call('remote_read_veil');
 assert.equal(first.ok,true);
 assert.equal(first.data.board.kind,'veil-maze');
 const path=veilPlan(first.data.board);
 assert.ok(path?.length);
 assert.equal(call('remote_step_veil',{direction:path[0]}).ok,true);
 assert.equal(o.board.arcade.steps,1);
 assert.equal(o.board.arcade.heat,0);
});
test('Xi Tai sees only flipped cards in variable-size EXTRACT, not hidden symbol list',()=>{
 const {o,call}=fixture('extract','S');
 const before=call('remote_read_extract');
 assert.equal(before.ok,true);
 assert.equal(before.data.board.kind,'extract-memory');
 assert.equal(before.data.board.cardCount,20);
 assert.deepEqual(before.data.board.visible,[]);
 assert.equal(before.data.board.cards,undefined);
 const next=extractNextTap(before.data.board);
 assert.equal(next.index,0);
 assert.equal(call('remote_tap_extract',{index:0}).ok,true);
 const after=call('remote_read_extract');
 assert.equal(after.data.board.visible.length,1);
 assert.equal(after.data.board.visible[0].symbol,o.board.arcade.cards[0]);
 assert.equal(after.data.board.visible[1],undefined);
 assert.equal(after.data.board.cards,undefined);
 const plan=extractNextTap(after.data.board,next.known);
 assert.ok(Number.isInteger(plan.index));
});
test('Xi Tai STRIKE only taps the latest moving target; a stale target cannot be clicked',()=>{
 const {o,call}=fixture('strike','B');
 const first=call('remote_read_strike');
 assert.equal(first.ok,true);
 assert.equal(first.data.board.kind,'strike');
 const old=first.data.board.target;
 assert.equal(call('remote_tap_strike',{index:(old+1)%16}).ok,false);
 o.board.arcade.nextSwitchAt=Date.now()-1;
 assert.equal(arcadeTick(o.board.arcade,Date.now(),rng(54)),true);
 assert.notEqual(o.board.arcade.target,old);
 assert.equal(call('remote_tap_strike',{index:old}).ok,false);
 const current=o.board.arcade.target;
 assert.equal(call('remote_tap_strike',{index:current}).ok,true);
 assert.equal(o.board.arcade.hits,1);
 assert.equal(o.board.arcade.misses,0);
});
