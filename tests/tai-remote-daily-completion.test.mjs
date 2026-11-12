import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {seedD04Contracts,acceptD04Contract,markD04AttachmentOpened,armD04Ghost,submitD04Contract} from '../src/story/d04/contract.js';
import {handle as ghostHandle} from '../src/apps/ghost/index.js';
import {createTaiLivePhoneTools} from '../src/system/remote-control/mcp.js';
import {taiRemoteOrderAllowed} from '../src/system/remote-control/policy.js';
import {D01_REPAIR} from '../src/story/d01/runtime.js';
import {D06_ORDER_ID} from '../src/story/d06/commission.js';

test('real daily final stage remains readable after native win moves parent to READY, with manual settlement only',()=>{
 const s=activateStory55(initialState());s.day=16;s.clock='08:20';s.unlocked=true;
 seedD04Contracts(s);assert.equal(acceptD04Contract(s,'M-001'),true);
 assert.equal(markD04AttachmentOpened(s,'M-001'),true);
 const id=armD04Ghost(s,'M-001',0),parent=s.content.orders.find(o=>o.id==='M-001');
 s.nav.current={appId:'ghost',route:'/contract',params:{orderId:id}};
 s.story55.ghostShare={phase:'controlling',cardId:'daily-final-card',source:{type:'ghost-order',orderId:id},
  remote:{active:true,stage:'playing',authorizedDay:16,orderId:id}};
 const store={get:()=>s,update:fn=>fn(s)},router={open:entry=>{s.nav.current=entry;}},ctx={store,router,toast:assert.fail};
 const doc={querySelector:selector=>{
  const match=selector.match(/\[data-action="gh-tile"\]\[data-index="(\d+)"\]/);
  return match?{disabled:false,isConnected:true,click:()=>ghostHandle('gh-tile',{dataset:{index:match[1]}},ctx,s.nav.current)}:null;
 }};
 const tools=createTaiLivePhoneTools({store,router,tasks:{},document:doc});
 const call=(name,args={})=>tools.call(s,name,args);
 ghostHandle('gh-start',{dataset:{}},ctx,s.nav.current);
 assert.equal(s.ghost.orders[id].status,'running');
 const balance=s.bankData.balance,transactions=structuredClone(s.bankData.transactions);
 // Each swap is submitted through the original native GHOST click handler.
 for(let swaps=0;swaps<9&&s.ghost.orders[id].status==='running';swaps++){
  const view=call('remote_read_cipher');assert.equal(view.ok,true);
  const tiles=view.data.board.tiles,index=tiles.findIndex((value,i)=>value!==i);
  assert.ok(index>=0);
  for(const pos of [index,tiles.indexOf(index)])
   assert.equal(call('remote_tap_cipher_tile',{index:pos}).ok,true);
 }
 assert.equal(s.ghost.orders[id].status,'success');assert.equal(parent.status,'READY');
 assert.equal(taiRemoteOrderAllowed(s,s.ghost.orders[id]),false,'READY parent correctly prevents another run');
 assert.deepEqual(call('remote_read_cipher').data,{orderId:id,type:'cipher',status:'success',board:null});
 assert.equal(call('remote_tap_cipher_tile',{index:0}).ok,false,'completed-read exception must never permit mutation');
 assert.equal(s.bankData.balance,balance);assert.deepEqual(s.bankData.transactions,transactions);
 assert.equal(s.ghost.history.filter(h=>h.orderId===id).length,1);
 s.ghost.orders.unrelated={...s.ghost.orders[id],id:'unrelated'};
 s.story55.ghostShare.remote.orderId='unrelated';
 assert.equal(call('remote_read_cipher').ok,false,'completed reads are still scoped to the shared order');
 s.story55.ghostShare.remote.orderId=id;
 assert.equal(call('remote_release').ok,true);assert.equal(call('remote_release').ok,false);
 assert.equal(submitD04Contract(s,'M-001'),true);
 assert.equal(s.bankData.balance,balance+650);assert.equal(submitD04Contract(s,'M-001'),false);
 assert.equal(s.bankData.balance,balance+650);
});
test('terminal-read exception retains D01 and D06 exclusions',()=>{
 for(const id of [D01_REPAIR,D06_ORDER_ID,D06_ORDER_ID+'-stage-1'])
  assert.equal(taiRemoteOrderAllowed({day:16},{id,type:'cipher',status:'success'},{allowCompletedRead:true}),false);
});
