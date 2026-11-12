import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoard} from '../src/apps/ghost/games/logic.js';
import {verifyNextToken} from '../src/system/remote-control/verify-solver.js';
import {taiRemoteOrderAllowed,taiRemoteCanOperateOrder,TAI_REMOTE_GHOST_TYPES} from '../src/system/remote-control/policy.js';
import {createTaiLivePhoneTools} from '../src/system/remote-control/mcp.js';
import {dispatchTaiPhoneMcp} from '../src/services/ai/phone-mcp/protocol.js';
import {handle as ghostHandle} from '../src/apps/ghost/index.js';

function fixture({linked=true,id='tai-verify-1',board=createBoard('verify',{})}={}){
 const order={id,type:'verify',status:'running',attempts:1,moves:0,errors:0,
  settings:{seconds:null,rounds:1},deadline:null,board,
  ...(linked?{story55Project:'verify-demo'}:{})};
 const s={day:18,clock:'08:20',unlocked:true,poweredOff:false,
  nav:{current:{appId:'ghost',route:'/run',params:{orderId:id}},stack:[]},
  story55:{version:1,ended:false,completed:{},ghostShare:{
   phase:'controlling',cardId:'verify-card',
   source:{type:'ghost-order',orderId:id},
   remote:{active:true,authorizedDay:18,token:'verify-token',orderId:id,warningShown:false}
  }},
  ghost:{orders:{[id]:order},history:[],balance:0,config:{}},
  content:{conversations:{mirage:[]},mirage:{linkedMissions:{}}},events:[],notifications:[]
 };
 const store={get:()=>s,update:fn=>{fn(s);return s;}};
 const ctx={store,router:{open:()=>{}},toast:()=>{},refresh:()=>{}};
 const document={querySelector:selector=>{
  const x=selector.match(/gh-verify-token"\]\[data-index="(\d+)"/);
  if(!x)return null;
  return {disabled:false,isConnected:true,
   click:()=>ghostHandle('gh-verify-token',{dataset:{index:x[1]}},ctx,s.nav.current)
  };
 }};
 const tools=createTaiLivePhoneTools({store,router:ctx.router,tasks:{visible:false,show:()=>{},action:()=>{}},document});
 const call=(name,args={})=>dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:1,
  method:'tools/call',params:{name,arguments:args}},{liveTools:tools}).result.structuredContent;
 return {s,store,ctx,order,tools,call,id};
}

test('VERIFY pure planner reads only displayed target/tokens/input/used without changing board',()=>{
 for(let n=0;n<100;n++){
  const board=createBoard('verify',{},Math.random);
  const original=structuredClone(board);
  const plan=verifyNextToken(board);
  assert.equal(plan.done,false);
  assert.equal(board.tokens[plan.index],board.target[0]);
  assert.deepEqual(board,original);
  const copied=structuredClone(board);
  copied.input.push(copied.target[0]);copied.used.push(plan.index);
  const second=verifyNextToken(copied);
  assert.equal(second.progress,1);
  assert.equal(copied.tokens[second.index],copied.target[1]);
  assert.notEqual(plan.index,second.index);
  assert.deepEqual(board,original);
 }
});
test('VERIFY rejects corrupt or wrong-prefix saves, duplicates, and used-token replays',()=>{
 const original=createBoard('verify',{});
 assert.equal(verifyNextToken({...original,target:['CORE']}),null);
 assert.equal(verifyNextToken({...original,used:[2],input:[]}),null);
 assert.equal(verifyNextToken({...original,tokens:['CORE','CORE','DATA','AUTH']}),null);
 const bad={...original,input:[original.target[1]],used:[0]};
 assert.equal(verifyNextToken(bad),null);
 const index=original.tokens.indexOf(original.target[0]);
 assert.equal(verifyNextToken({...original,input:[original.target[0]],used:[(index+1)%4]}),null);
 const finished={...original,input:[...original.target],
  used:original.target.map(token=>original.tokens.indexOf(token))};
 assert.deepEqual(verifyNextToken(finished),{done:true,progress:4});
});
test('VERIFY MCP reads current screen order and presses the original Ghost token button exactly four times',()=>{
 for(let n=0;n<65;n++){
  const {s,order,call,id}=fixture();
  const initial=structuredClone(order.board);
  for(let i=0;i<4;i++){
   const view=call('remote_read_verify');
   assert.equal(view.ok,true);
   assert.equal(view.data.status,'running');
   assert.deepEqual(view.data.board.target,initial.target);
   assert.deepEqual(view.data.board.tokens,initial.tokens);
   assert.deepEqual(Object.keys(view.data.board).sort(),['target','tokens','input','used'].sort());
   const plan=verifyNextToken(view.data.board);
   assert.equal(plan.progress,i);
   const wrong=(plan.index+1)%4;
   assert.equal(call('remote_tap_verify_token',{index:wrong}).error,'verify_tap_not_permitted',
    'wrong token must not increase errors or reset saved progress');
   const before=order.moves;
   assert.equal(call('remote_tap_verify_token',{index:plan.index}).ok,true);
   assert.equal(order.moves,before+1,'Ghost original handle increments move count');
   assert.equal(order.errors,0);
   assert.deepEqual(order.board.input,initial.target.slice(0,i+1));
   assert.equal(order.board.used.length,i+1);
  }
  assert.equal(order.status,'success');
  assert.equal(s.ghost.history.filter(h=>h.orderId===id).length,1);
  assert.equal(call('remote_tap_verify_token',{index:0}).ok,false);
  assert.equal(call('remote_release').ok,true);
  assert.equal(s.ghost.history.filter(h=>h.orderId===id).length,1);
 }
});
test('VERIFY takeover resumes an existing half-complete run without restarting or losing its board',()=>{
 const {order,call,s,id}=fixture();
 const original=structuredClone(order.board),attempts=order.attempts;
 for(let i=0;i<2;i++){
  const next=verifyNextToken(call('remote_read_verify').data.board);
  assert.equal(call('remote_tap_verify_token',{index:next.index}).ok,true);
 }
 assert.equal(order.moves,2);
 const mid=structuredClone(order.board);
 assert.equal(verifyNextToken(call('remote_read_verify').data.board).progress,2);
 for(let i=2;i<4;i++){
  const plan=verifyNextToken(call('remote_read_verify').data.board);
  assert.equal(call('remote_tap_verify_token',{index:plan.index}).ok,true);
 }
 assert.deepEqual(order.board.tokens,original.tokens);
 assert.deepEqual(order.board.target,original.target);
 assert.deepEqual(order.board.used.slice(0,2),mid.used);
 assert.equal(order.attempts,attempts);
 assert.equal(order.status,'success');
 assert.equal(s.ghost.history.filter(h=>h.orderId===id).length,1);
});
test('VERIFY MCP blocks unauthorised, special, expired, tampered and wrong-screen taps',()=>{
 const {s,order,call,id}=fixture();
 assert.ok(TAI_REMOTE_GHOST_TYPES.includes('verify'));
 const plan=verifyNextToken(order.board);
 const wrong=(plan.index+1)%4;
 const moves=order.moves;
 assert.equal(call('remote_tap_verify_token',{index:wrong}).ok,false);
 assert.equal(call('remote_tap_verify_token',{index:plan.index,force:true}).ok,false);
 assert.equal(call('remote_tap_verify_token',{index:4}).ok,false);
 assert.equal(call('remote_read_cipher').ok,false);
 assert.equal(order.moves,moves);assert.equal(order.errors,0);
 order.deadline=Date.now()-1;
 assert.equal(call('remote_tap_verify_token',{index:plan.index}).ok,false);
 order.deadline=null;
 s.nav.current.route='/contract';
 assert.equal(call('remote_tap_verify_token',{index:plan.index}).ok,false);
 s.nav.current.route='/run';s.nav.current.params.orderId='not-shared';
 assert.equal(call('remote_tap_verify_token',{index:plan.index}).ok,false);
 s.nav.current.params.orderId=id;
 s.story55.ghostShare.source.orderId='other-order';
 assert.equal(call('remote_read_verify').ok,false);
 s.story55.ghostShare.source.orderId=id;
 delete order.story55Project;
 assert.equal(taiRemoteOrderAllowed(s,order),false);
 assert.equal(taiRemoteCanOperateOrder(s,order),false);
 assert.equal(call('remote_read_verify').ok,false);
 s.content.mirage.linkedMissions[id]={id,title:'approved'};
 assert.equal(call('remote_read_verify').ok,true);
 s.story55.ghostShare.remote.active=false;
 assert.equal(call('remote_tap_verify_token',{index:plan.index}).error,'remote_control_locked');
 assert.equal(dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:1,method:'tools/list'}).result.tools.length,6);
});
test('VERIFY special orders never inherit remote control permission',()=>{
 for(const id of ['mirage001','mirage-ouroboros-10btc-d05']){
  const {s,order,call}=fixture({id});
  assert.equal(taiRemoteOrderAllowed(s,order),false);
  assert.equal(call('remote_read_verify').ok,false);
  assert.equal(call('remote_tap_verify_token',{index:0}).ok,false);
 }
});
