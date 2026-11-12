import test from 'node:test';
import assert from 'node:assert/strict';
import {createArcadeBoard,arcadeAction} from '../src/apps/ghost/games/arcade.js';
import {taiRemoteOrderAllowed,taiRemoteCanOperateOrder,taiRemoteUpcomingProjectStepAllowed,TAI_REMOTE_GHOST_TYPES} from '../src/system/remote-control/policy.js';
import {createTaiLivePhoneTools} from '../src/system/remote-control/mcp.js';
import {dispatchTaiPhoneMcp} from '../src/services/ai/phone-mcp/protocol.js';
import {handle as ghostHandle} from '../src/apps/ghost/index.js';
function fixture({legacy=false,running=true,linked=true}={}){
 const id='strike-simulation-1',now=Date.now();
 const board=legacy?{signature:'OLD-GHOST'}:{signature:'NEW-GHOST',arcade:createArcadeBoard('strike')};
 const o={id,type:'strike',status:running?'running':'authorized',key:'GH-STRIKE',
  settings:{arcadeV2:!legacy,seconds:60,rounds:1},attempts:running?1:0,moves:0,
  errors:0,startedAt:now-1000,deadline:now+50000,board,
  ...(linked?{story55Project:'strike-demo'}:{})};
 const s={day:18,clock:'08:30',unlocked:true,poweredOff:false,
  nav:{current:{appId:'ghost',route:'/run',params:{orderId:id}},stack:[]},
  story55:{version:1,ended:false,completed:{},ghostShare:{
   phase:'controlling',cardId:'strike-card',
   source:{type:'ghost-order',orderId:id},
   remote:{active:true,authorizedDay:18,token:'strike-tok',orderId:id,warningShown:false}
  }},
  ghost:{orders:{[id]:o},history:[],balance:0,config:{}},
  content:{conversations:{mirage:[]},mirage:{linkedMissions:{}}},events:[],notifications:[]
 };
 const store={get:()=>s,update:fn=>{fn(s);return s;}};
 const ctx={store,router:{open:()=>{}},toast:()=>{},refresh:()=>{}};
 const doc={querySelector:sel=>{
  const x=sel.match(/gh-arcade-tap"\]\[data-value="(\d+)"/);
  if(!x)return null;
  return {isConnected:true,disabled:false,click:()=>ghostHandle('gh-arcade-tap',{dataset:{value:x[1]}},ctx,s.nav.current)};
 }};
 const tools=createTaiLivePhoneTools({store,router:ctx.router,tasks:{visible:false,show:()=>{},action:()=>{}},document:doc});
 const call=(name,args={})=>dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}},{liveTools:tools}).result.structuredContent;
 return {s,store,o,id,tools,call};
}
test('STRIKE rules are cumulative six hits, third miss fails, target moves after nonterminal taps',()=>{
 const a=createArcadeBoard('strike',()=>.01);
 assert.equal(a.goal,6);assert.equal(a.maxMisses,3);
 const previous=a.target;
 arcadeAction(a,'tap',(previous+1)%16,Date.now(),()=>.3);
 assert.equal(a.misses,1);assert.equal(a.hits,0);assert.notEqual(a.target,previous);
 const afterMiss=a.target;
 arcadeAction(a,'tap',a.target,Date.now(),()=>.3);
 assert.equal(a.hits,1);assert.equal(a.misses,1);assert.notEqual(a.target,afterMiss);
 for(let i=1;i<6;i++){
  const result=arcadeAction(a,'tap',a.target,Date.now(),()=>.3);
  if(i<5)assert.equal(result.won,false);
  else assert.equal(result.won,true);
 }
 assert.equal(a.hits,6);assert.equal(a.misses,1);
 const b=createArcadeBoard('strike',()=>0);
 for(let i=0;i<3;i++){
  const result=arcadeAction(b,'tap',(b.target+1)%16,Date.now(),()=>0);
  assert.equal(result.lost,i===2);
 }
 assert.equal(b.hits,0);assert.equal(b.misses,3);
});
test('STRIKE MCP only exposes visible board and completes through six original Ghost.handle taps',()=>{
 for(let n=0;n<32;n++){
  const {s,o,id,call}=fixture();
  let last=null;
  for(let i=0;i<6;i++){
   const before=call('remote_read_strike');
   assert.equal(before.ok,true);
   assert.deepEqual(Object.keys(before.data.board).sort(),['goal','hits','kind','maxMisses','misses','target'].sort());
   const target=before.data.board.target;
   assert.equal(before.data.board.hits,i);
   assert.equal(call('remote_tap_strike',{index:(target+1)%16}).error,'strike_tap_not_permitted','cannot intentionally miss');
   assert.equal(call('remote_tap_strike',{index:target}).ok,true);
   const after=call('remote_read_strike');
   assert.equal(after.data.board.hits,i+1);
   assert.equal(after.data.board.misses,0);
   if(i<5){assert.equal(after.data.status,'running');assert.notEqual(after.data.board.target,target);}
   else assert.equal(after.data.status,'success');
   last=target;
  }
  assert.equal(o.moves,6);
  assert.equal(s.ghost.history.filter(h=>h.orderId===id).length,1);
  assert.equal(call('remote_tap_strike',{index:last}).ok,false,'cannot click after settlement');
  assert.equal(call('remote_release').ok,true);
  assert.equal(s.ghost.history.filter(h=>h.orderId===id).length,1);
 }
});
test('STRIKE resumes a mid-run cumulative tally without resetting attempts or previous misses',()=>{
 const {s,o,call}=fixture();
 const before=o.board.arcade;
 const wrong=(before.target+1)%16;
 const previous=before.target;
 arcadeAction(before,'tap',wrong,Date.now(),()=>.4);
 assert.equal(before.misses,1);
 assert.notEqual(before.target,previous);
 o.moves=1;
 for(let i=0;i<6;i++){
  const state=call('remote_read_strike');
  assert.equal(call('remote_tap_strike',{index:state.data.board.target}).ok,true);
 }
 assert.equal(o.status,'success');assert.equal(o.moves,7);
 assert.equal(o.attempts,1);assert.equal(before.misses,1);
 assert.equal(s.ghost.history.filter(h=>h.orderId===o.id).length,1);
});
test('legacy STRIKE is refused BEFORE native start, even if it is already running',()=>{
 const ready=fixture({legacy:true,running:false});
 assert.equal(taiRemoteCanOperateOrder(ready.s,ready.o),false);
 assert.equal(taiRemoteOrderAllowed(ready.s,ready.o),false);
 assert.equal(ready.call('remote_read_strike').ok,false);
 assert.equal(ready.call('remote_tap_strike',{index:0}).ok,false);
 assert.equal(ready.o.attempts,0);
 assert.equal(ready.o.status,'authorized');
 const running=fixture({legacy:true,running:true});
 assert.equal(taiRemoteCanOperateOrder(running.s,running.o),false);
 assert.equal(running.call('remote_read_strike').ok,false);
 assert.equal(running.o.attempts,1);
 assert.equal(running.o.status,'running');
 assert.equal(taiRemoteUpcomingProjectStepAllowed(ready.s,'strike','base'),true);
 ready.s.ghost.config.strike={arcadeV2:false};
 assert.equal(taiRemoteUpcomingProjectStepAllowed(ready.s,'strike','base'),false);
});
test('STRIKE permission and deadline checks prevent stale, unshared, expired and wrong-screen taps',()=>{
 const {s,o,id,call}=fixture();
 assert.ok(TAI_REMOTE_GHOST_TYPES.includes('strike'));
 let current=o.board.arcade.target;
 assert.equal(call('remote_tap_strike',{index:16}).ok,false);
 assert.equal(call('remote_tap_strike',{index:current,foo:1}).ok,false);
 o.deadline=Date.now()-1;
 assert.equal(call('remote_tap_strike',{index:current}).ok,false);
 o.deadline=Date.now()+50000;
 s.nav.current.route='/deployment';
 assert.equal(call('remote_tap_strike',{index:current}).ok,false);
 s.nav.current.route='/run';s.nav.current.params.orderId='other';
 assert.equal(call('remote_tap_strike',{index:current}).ok,false);
 s.nav.current.params.orderId=id;
 s.story55.ghostShare.source.orderId='other';
 assert.equal(call('remote_read_strike').ok,false);
 s.story55.ghostShare.source.orderId=id;
 delete o.story55Project;
 assert.equal(call('remote_read_strike').ok,false);
 s.content.mirage.linkedMissions[id]={id,title:'approved'};
 assert.equal(call('remote_read_strike').ok,true);
 s.story55.ghostShare.remote.active=false;
 assert.equal(call('remote_read_strike').error,'remote_control_locked');
 assert.equal(dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:4,method:'tools/list'}).result.tools.length,6,'existing stdio stays read-only');
});
