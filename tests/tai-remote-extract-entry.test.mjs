import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {createTaiRemoteController} from '../src/system/remote-control/controller.js';
import {handle as ghostHandle} from '../src/apps/ghost/index.js';
import {arcadeTick} from '../src/apps/ghost/games/arcade.js';
import {onEnter as enterMirage,render as renderMirage} from '../src/apps/mirage/index.js';
import {prepareMirageGhostShareEntry} from '../src/apps/mirage/session.js';

// Lightweight DOM adapter, with all game actions delegated to native GHOST.
// No test helper sets success, payment, the solution, or controller outcomes.
function fixture({grade='C',upstream=true,malformed=false}={}){
 const s=activateStory55(initialState());s.day=17;s.clock='08:39';s.unlocked=true;
 s.story55.config={...s.story55.config,nodes:[]};s.story55.activeScene=null;
 s.story55.completed.wallet={day:6,clock:'15:00'};
 delete s.story55.d13;
 const id='extract-entry-regression';
 s.ghost={orders:{[id]:{id,type:'extract',status:'authorized',key:'GH-REGRESSION',attempts:0,
  story55Project:'extract-entry',settings:{seconds:null,rounds:1,retries:99,arcadeV3:upstream,grade}}},history:[],balance:0,config:{}};
 const store={get:()=>s,update:fn=>fn(s)},toasts=[];
 const router={open:loc=>{s.nav.current=loc;if(loc.appId==='mirage')enterMirage();}};
 const ctx={store,router,refresh(){},toast:message=>toasts.push(message)};
 s.nav.current={appId:'ghost',route:'/contract',params:{orderId:id}};
 ghostHandle('gh-start',{dataset:{}},ctx,s.nav.current);
 if(malformed)s.ghost.orders[id].board.arcade.cards=null;
 s.nav.current={appId:'mirage',route:'/chat/s55-ouroboros',params:{}};
 if(!s.content.conversations.mirage.some(c=>c.id==='s55-ouroboros'))
  s.content.conversations.mirage.push({id:'s55-ouroboros',name:'Dr Ouroboros',messages:[]});
 prepareMirageGhostShareEntry();enterMirage();
 s.story55.ghostShare={phase:'ready-control',script:'dailyYes',index:3,pendingIds:[],cardId:'extract-entry-card',
  source:{type:'ghost-order',orderId:id}};
 const element=()=>({style:{},isConnected:true,disabled:false,
  classList:{add(){},remove(){}},setAttribute(){},remove(){this.isConnected=false;},
  getBoundingClientRect:()=>({left:0,top:0,width:200,height:200})});
 const phone={...element(),append(el){el.isConnected=true;}};
 const doc=new EventTarget();doc.hidden=false;doc.defaultView=new EventTarget();doc.createElement=element;
 doc.querySelector=selector=>{
  if(selector==='#phone')return phone;
  if(selector.includes('.mc-composer input'))return s.nav.current.appId==='mirage'?element():null;
  const match=selector.match(/\[data-action="gh-arcade-tap"\]\[data-value="(\d+)"\]/);
  if(match&&s.nav.current.appId==='ghost')return {...element(),click:()=>ghostHandle('gh-arcade-tap',{dataset:{value:match[1]}},ctx,s.nav.current)};
  return null;
 };
 const tasks={visible:false,show(){this.visible=true;},hide(){this.visible=false;},action(){this.visible=false;}};
 const controller=createTaiRemoteController({...ctx,document:doc,tasks});
 return {s,id,controller,toasts,html:()=>renderMirage(ctx,s.nav.current)};
}
async function runController(t,f){
 f.controller.sync();
 for(let ticks=0;ticks<900;ticks++){
  await new Promise(resolve=>setImmediate(resolve));
  t.mock.timers.tick(100);
  const board=f.s.ghost.orders[f.id].board.arcade;
  if(Array.isArray(board?.cards))arcadeTick(board,Date.now());
  if(f.s.story55.ghostShare.remote&&!f.controller.busy)return;
 }
 assert.fail('native phone operator did not release within virtual timeout');
}
for(const [name,options,count] of [
 ['new C memory board',{grade:'C'},8],
 ['new S memory board',{grade:'S'},20],
 ['existing memory board',{upstream:false},10]
])test('full native controller accepts '+name+' and preserves decrypted Mirage return',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:18000000});
 const f=fixture(options),order=f.s.ghost.orders[f.id];assert.equal(order.board.arcade.cards.length,count);
 const balance=f.s.bankData.balance;
 await runController(t,f);
 assert.equal(f.s.story55.ghostShare.remote.errorCode,null);
 assert.equal(f.s.story55.ghostShare.remote.outcome,'success');
 assert.equal(order.status,'success');assert.ok(order.moves>=count);
 assert.equal(f.s.ghost.history.filter(h=>h.orderId===f.id).length,1);
 assert.equal(f.s.bankData.balance,balance);
 assert.equal(f.html().includes('class="mc-decoded"'),true,'return must not clear the conversation decryption');
 assert.deepEqual(f.toasts,[]);
});
test('malformed EXTRACT fails closed, releases control and returns to readable Mirage',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:18000000});
 const f=fixture({malformed:true});await runController(t,f);
 assert.equal(f.s.story55.ghostShare.remote.outcome,'interrupted');
 assert.equal(f.s.story55.ghostShare.remote.active,false);
 assert.equal(f.s.ghost.orders[f.id].status,'running');
 assert.equal(f.s.ghost.orders[f.id].moves,0);assert.equal(f.s.ghost.history.length,0);
 assert.equal(f.html().includes('class="mc-decoded"'),true,'error return must stay decrypted');
 assert.equal(f.toasts.length,1);
});
