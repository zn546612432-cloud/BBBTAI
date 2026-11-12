import test from 'node:test';
import assert from 'node:assert/strict';
import {createArcadeBoard,arcadeAction,veilNextCell,veilScanners} from '../src/apps/ghost/games/arcade.js';
import {veilPlan} from '../src/system/remote-control/veil-solver.js';
import {createTaiLivePhoneTools} from '../src/system/remote-control/mcp.js';
import {dispatchTaiPhoneMcp} from '../src/services/ai/phone-mcp/protocol.js';
import {handle as ghostHandle} from '../src/apps/ghost/index.js';

function executePlan(b,plan){
 for(const direction of plan){
  const before=b.steps;
  const result=arcadeAction(b,'step',direction);
  assert.equal(result.changed,true,direction);
  assert.notEqual(result.caught,true,'a planned step must never be caught');
  assert.equal(b.steps,before+1);
 }
 assert.equal(b.player,b.exit);
}
test('VEIL planner handles all 3 scanner phases and random generated mazes without mutation',()=>{
 for(let n=0;n<300;n++){
  const board=createArcadeBoard('veil');
  const original=structuredClone(board);
  const path=veilPlan(board);
  assert.ok(Array.isArray(path),'generated VEIL board must have a route');
  assert.ok(path.length<=74,'BFS of 25×3 states must not repeat a state');
  assert.deepEqual(board,original,'planner must be read-only');
  executePlan(board,path);
 }
});
test('VEIL planner replans from current player, current phase, and nonstandard exit',()=>{
 for(let n=0;n<200;n++){
  const board=createArcadeBoard('veil');
  const initial=veilPlan(board);
  const halfway=Math.max(1,Math.floor(initial.length/2));
  for(let i=0;i<halfway;i++)arcadeAction(board,'step',initial[i]);
  assert.notEqual(board.player,0,'maze should resume from current position when shared');
  const rest=veilPlan(board);
  assert.ok(rest?.length>=1);
  executePlan(board,rest);
 }
 const custom={kind:'veil',player:0,phase:0,exit:4,walls:[],steps:0,heat:0};
 assert.ok(Array.isArray(veilPlan(custom)));
 executePlan(custom,veilPlan(custom));
 assert.deepEqual(veilPlan({...custom,player:4}),[]);
});
test('VEIL wait advances scanners; stepping into next scanner or wall is forbidden',()=>{
 const board={kind:'veil',player:6,phase:2,exit:24,walls:[],steps:0,heat:0};
 assert.ok(veilScanners((board.phase+1)%3).includes(6));
 const path=veilPlan(board);
 assert.ok(Array.isArray(path));
 assert.notEqual(path[0],'wait','wait would be caught after scanner moves');
 assert.equal(veilNextCell(0,'left',[]),null);
 assert.equal(veilNextCell(0,'up',[]),null);
 assert.equal(veilPlan({...board,walls:Array.from({length:23},(_,i)=>i+1)}),null);
 assert.equal(veilPlan({...board,player:25}),null);
 assert.equal(veilPlan({...board,phase:0.5}),null);
 assert.equal(veilPlan({...board,walls:[6]}),null);
});
function fixture({legacy=false,allowlisted=true}={}){
 const id='veil-qa', b=legacy?
  {code:'1034',input:'',round:0,arcade:undefined}:
  {code:'1034',input:'',round:0,arcade:createArcadeBoard('veil')};
 const s={day:18,clock:'08:30',unlocked:true,poweredOff:false,
  nav:{current:{appId:'ghost',route:'/run',params:{orderId:id}},stack:[]},
  story55:{version:1,ended:false,completed:{},ghostShare:{
   phase:'controlling',cardId:'s55-ghost-share-18-1',
   source:{type:'ghost-order',orderId:id},
   remote:{active:true,authorizedDay:18,token:'session-1',orderId:id,warningShown:false}
  }},
  ghost:{orders:{[id]:{id,type:'veil',status:'running',attempts:1,moves:0,errors:0,
   settings:{rounds:1,codeLength:4,seconds:null},deadline:null,
   ...(allowlisted?{story55Project:'veil-qa-project'}:{}),
   board:b}},history:[],balance:0,config:{}},
  content:{conversations:{mirage:[]},mirage:{linkedMissions:{}}},events:[],notifications:[]
 };
 const store={get:()=>s,update:fn=>{fn(s);return s;}};
 const ctx={store,router:{open:()=>{}},toast:()=>{},refresh:()=>{}};
 const doc={querySelector:selector=>{
  const match=selector.match(/data-value="(up|down|left|right|wait)"/);
  if(match&&selector.includes('gh-arcade-step'))return {
   disabled:false,isConnected:true,
   click:()=>ghostHandle('gh-arcade-step',{dataset:{value:match[1]}},ctx,s.nav.current)
  };
  const key=selector.match(/data-key="([0-9])"/);
  if(key&&selector.includes('gh-key'))return {
   disabled:false,isConnected:true,
   click:()=>ghostHandle('gh-key',{dataset:{key:key[1]}},ctx,s.nav.current)
  };
  return null;
 }};
 const tasks={visible:false,show:()=>{},action:()=>{}};
 const live=createTaiLivePhoneTools({store,router:ctx.router,tasks,document:doc});
 return {s,store,live,id};
}
function call(s,live,name,args={}){
 return dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:1,method:'tools/call',
  params:{name,arguments:args}},{liveTools:live}).result.structuredContent;
}
test('VEIL native MCP steps use Ghost.handle, recompute from midrun, and settle once',()=>{
 for(let n=0;n<45;n++){
  const {s,live,id}=fixture();
  let moves=0;
  while(s.ghost.orders[id].status==='running'&&moves<75){
   const view=call(s,live,'remote_read_veil');
   assert.equal(view.ok,true);
   assert.equal(view.data.board.kind,'veil');
   const {player,phase,steps}=view.data.board;
   const plan=veilPlan(view.data.board);
   assert.ok(plan?.length>0);
   const out=call(s,live,'remote_step_veil',{direction:plan[0]});
   assert.equal(out.ok,true);
   const updated=s.ghost.orders[id].board.arcade;
   assert.equal(updated.steps,steps+1);
   assert.equal(updated.heat,0);
   if(s.ghost.orders[id].status==='running')assert.ok(updated.phase!==phase||updated.player!==player);
   moves++;
  }
  const order=s.ghost.orders[id];
  assert.equal(order.status,'success');
  assert.equal(order.moves,order.board.arcade.steps);
  assert.equal(s.ghost.history.filter(x=>x.orderId===id).length,1);
  assert.equal(call(s,live,'remote_step_veil',{direction:'wait'}).ok,false);
  assert.equal(call(s,live,'remote_release').ok,true);
 }
});
test('VEIL scoped MCP denies D01, wallet, unlinked or expired orders and unsafe steps',()=>{
 const {s,live,id}=fixture();
 assert.equal(call(s,live,'remote_step_veil',{direction:'bad'}).ok,false);
 assert.equal(call(s,live,'remote_step_veil',{direction:'left',extra:true}).ok,false);
 s.ghost.orders[id].board.arcade.player=6;
 s.ghost.orders[id].board.arcade.phase=2;
 assert.equal(call(s,live,'remote_step_veil',{direction:'wait'}).error,'unsafe_veil_step');
 s.ghost.orders[id].board.arcade.player=0;
 assert.equal(call(s,live,'remote_step_veil',{direction:'left'}).error,'invalid_veil_step');
 s.ghost.orders[id].deadline=Date.now()-1;
 assert.equal(call(s,live,'remote_step_veil',{direction:'right'}).error,'veil_step_not_permitted');
 s.ghost.orders[id].deadline=null;
 s.story55.ghostShare.source.orderId='mirage001';
 assert.equal(call(s,live,'remote_read_veil').ok,false);
 s.story55.ghostShare.source.orderId=id;
 delete s.ghost.orders[id].story55Project;
 assert.equal(call(s,live,'remote_read_veil').ok,false);
 s.content.mirage.linkedMissions[id]={id,title:'linked mission'};
 assert.equal(call(s,live,'remote_read_veil').ok,true);
 s.story55.ghostShare.remote.active=false;
 assert.equal(call(s,live,'remote_step_veil',{direction:'right'}).error,'remote_control_locked');
 assert.equal(dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:1,method:'tools/list'}).result.tools.length,6);
});
test('old VEIL keypad save still uses original Ghost key buttons, no arcade conversion',()=>{
 const {s,live,id}=fixture({legacy:true});
 const o=s.ghost.orders[id],initial=structuredClone(o.board);
 assert.equal(o.board.arcade,undefined);
 const view=call(s,live,'remote_read_veil');
 assert.equal(view.data.board.kind,'legacy-keypad');
 assert.equal(view.data.board.code,initial.code);
 assert.equal(call(s,live,'remote_step_veil',{direction:'right'}).ok,false);
 for(const key of initial.code){
  assert.equal(call(s,live,'remote_press_veil_key',{key}).ok,true);
 }
 assert.equal(o.status,'success');
 assert.equal(o.board.arcade,undefined);
 assert.equal(o.moves,initial.code.length);
 assert.equal(s.ghost.history.filter(x=>x.orderId===id).length,1);
});
