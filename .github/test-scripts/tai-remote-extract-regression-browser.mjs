// Focused native-controller regression; no direct solution/state writes in browser.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {initialState} from '../../src/services/storage.js';
import {activateStory55} from '../../src/services/story55/runtime.js';
import {seedD04Contracts,acceptD04Contract,markD04AttachmentOpened,armD04Ghost} from '../../src/story/d04/contract.js';
import {begin} from '../../src/apps/ghost/state.js';

const url=process.env.TAI_REMOTE_LOCAL_URL||'http://127.0.0.1:5173/';
const key='ximeng-phone-story55-v1',out='tai-remote-extract-results';
mkdirSync(out,{recursive:true});
function seedFor({daily=false,grade='C',empty=false}={}){
 const s=activateStory55(initialState());s.day=17;s.clock='08:39';s.batteryPercent=90;
 s.story55.minutesPerSecond=0;s.story55.activeScene=null;
 for(const n of s.story55.config.nodes)if(n.day<=17&&n.id!=='base'&&n.id!=='recognition')
  s.story55.completed[n.id]={day:n.day,clock:'12:00',test:true};
 s.story55.config={...s.story55.config,nodes:[]};
 delete s.story55.d13; // Critical: real return must work without phase==='chat'.
 s.unlocked=false;s.drafts={};s.nav.stack=[];
 if(!s.content.conversations.mirage.some(c=>c.id==='s55-ouroboros'))
  s.content.conversations.mirage.push({id:'s55-ouroboros',name:'Dr Ouroboros',messages:[],unread:0});
 let id;
 if(daily){
  seedD04Contracts(s);assert.equal(acceptD04Contract(s,'M-008'),true);
  assert.equal(markD04AttachmentOpened(s,'M-008'),true);
  id=armD04Ghost(s,'M-008',0);
 }else{
  id='extract-browser-'+grade;
  s.story55.ghostShareTakeovers=2;
  s.ghost={orders:{[id]:{id,type:'extract',status:'authorized',attempts:0,key:'GH-REGRESSION',
   story55Project:'extract-browser',settings:{seconds:null,retries:99,rounds:1,arcadeV3:true,grade}}},history:[],balance:0,config:{}};
  if(empty){assert.equal(begin(s,id),true);s.ghost.orders[id].board.arcade.cards=[];}
 }
 s.nav.current={appId:'ghost',route:empty?'/run':'/contract',params:{orderId:id}};
 return {s,id};
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
async function openFixture(f,viewport){
 const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:viewport.width<600,hasTouch:true,locale:'zh-TW',reducedMotion:'reduce'});
 const page=await context.newPage();page.setDefaultTimeout(30000);
 const errors=[],warnings=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());});
 await page.addInitScript(({key,s})=>{localStorage.setItem(key,s);Math.random=()=>.02;},{key,s:JSON.stringify(f.s)});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('[data-action="unlock"]').click();
 for(const digit of '0816')await page.locator('[data-action="passcode-key"][data-key="'+digit+'"]').click();
 await page.waitForFunction(()=>!document.querySelector('#phone').classList.contains('is-locked'));
 const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 const waitState=(fn,arg)=>page.waitForFunction(fn,{key,...arg},{timeout:90000});
 return {context,page,state,waitState,errors,warnings};
}
async function shareAndSend(page,first){
 await page.locator('#screen-layer [data-action="gh-share"]').click();
 await page.locator('#screen-layer [data-action="gh-share-yes"]').click();
 assert.equal(await page.locator('form[data-form="mc-login"]').count(),0);
 const lines=first?['我想驗證一下你是不是azathoth','嫌低級，那倒是做做看','為了部署你給我的程序，我得努力賺錢才行，還是說你打算再給我一百萬？']:['謝囉'];
 for(const line of lines){
  await page.waitForFunction(expected=>{const el=document.querySelector('.mc-composer input[name="text"]');return el?.value===expected&&!el.disabled;},line,{timeout:45000});
  await page.locator('.mc-composer button[type="submit"]').click();
 }
}
try{
 for(const c of [
  {name:'mobile-real-M008',daily:true,grade:'C',viewport:{width:390,height:844}},
  {name:'mobile-S20',grade:'S',viewport:{width:390,height:844}},
  {name:'desktop-C8',grade:'C',viewport:{width:1440,height:1000}},
  {name:'mobile-empty-error',grade:'C',empty:true,viewport:{width:390,height:844}}
 ]){
  const f=seedFor(c),{context,page,state,waitState,errors,warnings}=await openFixture(f,c.viewport);
  let id=f.id;
  if(c.daily){
   // Complete the preceding real CIPHER with native tile clicks, no finish().
   await page.locator('[data-action="gh-start"]').click();
   await waitState(({key,id})=>JSON.parse(localStorage.getItem(key)).ghost.orders[id].status==='running',{id});
   for(let count=0;count<9;count++){
    const s=await state(),o=s.ghost.orders[id];
    if(o.status==='success')break;
    const tiles=o.board.tiles,first=tiles.findIndex((x,i)=>x!==i);
    assert.ok(first>=0);const second=tiles.indexOf(first);
    await page.locator('[data-action="gh-tile"][data-index="'+first+'"]').click();
    await waitState(({key,id,first})=>JSON.parse(localStorage.getItem(key)).ghost.orders[id].board.selected===first,{id,first});
    await page.locator('[data-action="gh-tile"][data-index="'+second+'"]').click();
    await waitState(({key,id})=>JSON.parse(localStorage.getItem(key)).ghost.orders[id].board.selected===null,{id});
   }
   assert.equal((await state()).ghost.orders[id].status,'success');
   await page.locator('[data-action="gh-d04-next"]').click();
   id='M-008-stage-2';
  }
  if(!c.empty)await page.locator('[data-action="gh-start"]').click();
  await waitState(({key,id})=>JSON.parse(localStorage.getItem(key)).ghost.orders[id].status==='running',{id});
  const before=await state(),order=before.ghost.orders[id];
  assert.equal(order.board.arcade.kind,'extract-memory');
  assert.equal(order.board.arcade.cards.length,c.empty?0:c.grade==='S'?20:8);
  await page.screenshot({path:out+'/'+c.name+'-board.png',fullPage:true});
  await shareAndSend(page,!!c.daily);
  await waitState(({key})=>{
   const p=JSON.parse(localStorage.getItem(key)).story55.ghostShare;
   return p?.remote?.active===false&&['success','interrupted'].includes(p.remote.outcome);
  },{});
  await page.locator('#screen-layer .mc-decoded').waitFor({state:'visible'});
  assert.equal(await page.locator('form[data-form="mc-login"]').count(),0);
  const done=await state(),remote=done.story55.ghostShare.remote,run=done.ghost.orders[id];
  if(c.empty){
   assert.equal(remote.outcome,'interrupted');assert.equal(remote.errorCode,'invalid_extract_board');
   assert.equal(run.status,'running');assert.equal(run.moves,0);
   assert.equal(done.ghost.history.filter(h=>h.orderId===id).length,0);
  }else{
   assert.equal(remote.outcome,'success');assert.equal(remote.errorCode,null);
   assert.equal(run.status,'success');assert.ok(run.moves>=order.board.arcade.cards.length);
   assert.equal(done.ghost.history.filter(h=>h.orderId===id).length,1);
   assert.equal(done.bankData.balance,before.bankData.balance);
   assert.equal(warnings.filter(w=>w.includes('[TAI remote session]')).length,0);
   if(c.daily)assert.equal(done.content.orders.find(o=>o.id==='M-008').status,'READY');
  }
  assert.deepEqual(errors,[],'no browser page errors');
  assert.equal(await page.locator('.tai-remote-alert').count(),0);
  await page.screenshot({path:out+'/'+c.name+'-returned.png',fullPage:true});
  results.push({name:c.name,orderId:id,status:run.status,moves:run.moves,outcome:remote.outcome,errorCode:remote.errorCode,
   decrypted:true,viewport:c.viewport,warnings});
  console.log('PASS '+c.name+' '+JSON.stringify(results.at(-1)));
  await context.close();
 }
 writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
 console.log('ALL FOCUSED EXTRACT CONTROLLER BROWSER CASES PASSED');
}finally{await browser.close();}
