// Isolated 390x844 touch-browser acceptance for Tai -> Mirage -> native GHOST LINK.
// Serves this branch's built dist/ at localhost; no production save or secrets.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {initialState} from '../../src/services/storage.js';
import {activateStory55} from '../../src/services/story55/runtime.js';
import {seedD04Contracts,acceptD04Contract,markD04AttachmentOpened,armD04Ghost} from '../../src/story/d04/contract.js';

const url=process.env.TAI_REMOTE_LOCAL_URL||'http://127.0.0.1:5173/';
const key='ximeng-phone-story55-v1'; // localhost: isolated browser origin
const path='tai-remote-mobile-results';
mkdirSync(path,{recursive:true});
const seed=initialState();
activateStory55(seed);
seed.day=16;
seed.clock='08:20';
seed.batteryPercent=90;
seed.story55.minutesPerSecond=0; // don't skip story windows during visual QA
seed.story55.activeScene=null;
seed.story55.d13={phase:'chat'};
for(const node of seed.story55.config.nodes){
 if(node.day<=16&&node.id!=='base'&&node.id!=='recognition')
  seed.story55.completed[node.id]={day:Math.min(16,node.day),clock:'12:00',test:true};
}
seed.story55.projects.base={authorized:true,batches:[],active:null};
seed.nav.current={appId:'ghost',route:'/deployment',params:{project:'base'}};
seed.nav.stack=[];
seed.unlocked=false;
seed.drafts={};
seed.content.conversations.mirage??=[];
if(!seed.content.conversations.mirage.some(c=>c.id==='s55-ouroboros')){
 seed.content.conversations.mirage.push({
  id:'s55-ouroboros',name:'Dr Ouroboros',online:false,unread:0,messages:[]
 });
}
const browser=await chromium.launch({headless:true,
 ...(process.env.TAI_REMOTE_CHROMIUM_PATH?{executablePath:process.env.TAI_REMOTE_CHROMIUM_PATH}:{}),
 args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({
 viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
 locale:'zh-TW',reducedMotion:'reduce'
});
let page=await context.newPage();
page.setDefaultTimeout(30000);
const errors=[];
page.on('pageerror',e=>errors.push('pageerror: '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());if(m.type()==='warning')console.warn('BROWSER WARNING: '+m.text());});
const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
const screenshot=name=>page.screenshot({path:path+'/'+name+'.png',fullPage:true});
async function unlock(){
 await page.locator('#screen-layer [data-action="unlock"]').waitFor({state:'visible',timeout:45000});
 await page.locator('#screen-layer [data-action="unlock"]').click();
 await page.locator('#screen-layer [data-action="passcode-key"][data-key="0"]').waitFor({state:'visible',timeout:45000});
 for(const digit of '0816')
  await page.locator('#screen-layer [data-action="passcode-key"][data-key="'+digit+'"]').click();
 await page.waitForFunction(()=>!document.querySelector('#phone')?.classList.contains('is-locked'),null,{timeout:30000});
}
// External fixture replacement is not the phone's import lifecycle. Close
// the old runtime before seeding another scenario so its pending persistence
// cannot overwrite the next test. Live PhoneStore.replace is tested below.
async function resetPage(nextSeed){
 await page.context().close();
 const clean=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,
  isMobile:true,hasTouch:true,locale:'zh-TW',reducedMotion:'reduce'});
 page=await clean.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push('pageerror: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
 await page.addInitScript(({key,seed})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,seed);
  Math.random=()=>.02;
 },{key,seed:JSON.stringify(nextSeed)});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#phone').waitFor({state:'attached',timeout:45000});
 await unlock();
}
const messageCount=s=>s.content.conversations.mirage
 .find(c=>c.id==='s55-ouroboros')?.messages||[];
try{
 // Authorize the deterministic 50% acceptance only inside this synthetic test tab.
 await page.addInitScript(({key,seed})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,seed);
  Math.random=()=>0.02;
 },{key,seed:JSON.stringify(seed)});
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 assert.ok(response?.ok(),'local built phone did not respond: '+response?.status());
 await page.locator('#phone').waitFor({state:'attached',timeout:45000});
 await unlock();
 const share=page.locator('#screen-layer [data-action="gh-share"][data-project="base"]');
 await share.waitFor({state:'visible',timeout:20000});
 await screenshot('01-ghost-project-share-button');
 console.log('PASS iPhone unlocked into native GHOST project with real share button');
 await share.click();
 await screenshot('01b-share-confirmation');
 const choices=await page.locator('.gh-share-actions button').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {y:r.y,height:r.height,width:r.width};}));
 assert.equal(choices.length,2);assert.equal(choices[0].y,choices[1].y);assert.equal(choices[0].height,choices[1].height);assert.equal(choices[0].width,choices[1].width);
 await page.locator('#screen-layer [data-action="gh-share-yes"]').click();
 await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k))?.story55?.ghostShare?.script==='first',key);
 assert.equal((await state()).story55.ghostShareTakeovers||0,0);
 console.log('PASS Ghost real project card sent, 50% roll selected the first authored dialogue');

 // Confirming a native Ghost share enters the existing chat directly.
 assert.equal(await page.locator('form[data-form="mc-login"]').count(),0,'confirmed share opens Tai directly');
 await page.locator('#screen-layer .mc-composer input[name="text"]').waitFor({state:'visible',timeout:25000});
 await page.locator('.mc-ghost-card').waitFor({state:'visible',timeout:25000});
 await screenshot('02-mirage-ghost-card');
 const lines=[
  '我想驗證一下你是不是azathoth',
  '嫌低級，那倒是做做看',
  '為了部署你給我的程序，我得努力賺錢才行，還是說你打算再給我一百萬？'
 ];
 // Observe the actual phone overlay, without modifying controller state.
 await page.evaluate(()=>{
  window.takeoverPulses=[];
  const phone=document.querySelector('#phone');
  new MutationObserver(records=>{
   for(const record of records){
    const el=record.target;
    if(record.type==='attributes'&&el.classList?.contains('tai-remote-alert')){
     window.takeoverPulses.push({lit:el.classList.contains('is-lit'),
      input:document.querySelector('.mc-composer input[name="text"]')?.value||''});
    }
   }
  }).observe(phone,{subtree:true,attributes:true,attributeFilter:['class']});
 });
 for(const [i,line] of lines.entries()){
  await page.waitForFunction(expected=>{
   const input=document.querySelector('#screen-layer form.mc-composer input[name="text"]');
   return input?.value===expected&&!input.disabled;
  },line,{timeout:45000});
  await page.locator('#screen-layer .mc-composer button[type="submit"]').click();
  await page.waitForFunction(count=>{
   const s=JSON.parse(localStorage.getItem('ximeng-phone-story55-v1'));
   return (s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros')?.messages||[])
    .some(m=>m.from==='me'&&m.text===count);
  },line,{timeout:18000});
  console.log('PASS native Xi Meng SEND for authored reply '+(i+1));
 }
 await page.locator('#status-layer .island-remote').waitFor({state:'attached',timeout:30000});
 await screenshot('03-remote-red-island');
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s?.story55?.ghostShare?.remote?.stage==='sent'&&
    s?.content?.conversations?.mirage?.find(c=>c.id==='s55-ouroboros')?.messages
      .some(m=>m.id===s.story55.ghostShare.cardId+'-remote-typing'&&m.from==='me');
 },key,{timeout:30000});
 const pulses=await page.evaluate(()=>window.takeoverPulses);
 assert.deepEqual(pulses.map(p=>p.lit),[true,false,true,false],'exactly two red pulses');
 assert.ok(pulses.every(p=>!p.input.startsWith('閉嘴')),'both pulses precede remote typing');
 assert.equal(await page.locator('.tai-remote-alert').count(),0,'flash overlay removed before native SEND');
 console.log('PASS two whole-phone red pulses complete before visible remote typing');
 console.log('PASS visible remote typing, native SEND, Xi Meng sender and red island');

 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s?.nav?.current?.appId==='ghost'&&s?.nav?.current?.route==='/run'&&
    !!s.story55?.ghostShare?.remote?.orderId;
 },key,{timeout:45000});
 const controlOrder=(await state()).story55.ghostShare.remote.orderId;
 assert.ok(controlOrder.startsWith('s55:base:'));
 await page.locator('#screen-layer [data-action="gh-pipe"]').first().waitFor({state:'attached',timeout:30000});
 await screenshot('04-ghost-live-link');
 console.log('PASS native app switcher, GHOST step/start buttons, active LINK board');



 // Real user taps during takeover must be blocked; one Tai warning per session.
 await page.touchscreen.tap(16,220);
 await page.touchscreen.tap(16,220);
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k)),p=s.story55?.ghostShare;
  return p?.remote?.warningShown===true;
 },key,{timeout:12000});
 assert.equal(messageCount(await state()).filter(m=>m.id.endsWith('-remote-warning')).length,1);
 console.log('PASS competing real touch blocked, only one Tai warning delivered');

 // Exercise the real app poll during a simulated visibility interval, with
 // the original three-second preview due while hidden. This is Chromium
 // integration coverage, not a claim of physical iOS lock-screen testing.
 await page.waitForFunction(({key,id})=>JSON.parse(localStorage.getItem(key))?.ghost?.orders?.[id]?.status==='preview-win',
  {key,id:controlOrder},{timeout:150000});
 await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
  document.dispatchEvent(new Event('visibilitychange'));
 });
 const paused=await state();
 await page.waitForTimeout(3700);
 const stillPaused=await state();
 assert.equal(stillPaused.ghost.orders[controlOrder].status,'preview-win');
 assert.equal(stillPaused.story55.ghostShare.remote.token,paused.story55.ghostShare.remote.token);
 assert.equal(stillPaused.ghost.history.filter(h=>h.orderId===controlOrder).length,0);
 await page.evaluate(()=>{
  delete document.hidden;
  document.dispatchEvent(new Event('visibilitychange'));
 });
 console.log('PASS original Ghost poll did not settle the LINK preview while visibility was paused');

 await page.waitForFunction(({key,orderId})=>{
  const s=JSON.parse(localStorage.getItem(key));
  return s?.ghost?.orders?.[orderId]?.status==='success'&&
   s.story55?.ghostShare?.phase==='complete'&&
   s.story55?.ghostShare?.remote?.active===false;
 },{key,orderId:controlOrder},{timeout:155000});
 await page.locator('#status-layer .island-remote').waitFor({state:'detached',timeout:15000});
 await page.locator('#screen-layer .mc-composer input[name="text"]').waitFor({state:'visible',timeout:15000});
 assert.equal(await page.locator('#screen-layer form[data-form="mc-login"]').count(),0,
  'remote return must restore the signed-in MIRAGE conversation, not the login screen');
 await screenshot('05-returned-to-mirage');
 const done=await state(),run=done.ghost.orders[controlOrder];
 assert.equal(run.status,'success');
 assert.equal(done.nav.current.appId,'mirage');
 assert.equal(done.story55.ghostShareTakeovers,1);
 assert.equal(done.ghost.history.filter(x=>x.orderId===controlOrder).length,1,'exactly one Ghost settlement');
 assert.equal(done.bankData.transactions.filter(x=>x.orderId===controlOrder).length,0,'no invented bank reward');
 assert.equal(messageCount(done).filter(m=>m.id.endsWith('-remote-typing')).length,1);
 console.log('PASS real LINK settlement once, no fake reward; island cleared and Mirage restored');

 await page.reload({waitUntil:'domcontentloaded',timeout:60000});
 const persisted=await state();
 assert.equal(persisted.story55.ghostShareTakeovers,1,'reload does not replay takeover');
 assert.equal(persisted.ghost.history.filter(x=>x.orderId===controlOrder).length,1);
 assert.equal(persisted.story55.ghostShare.remote.active,false);
 console.log('PASS reload keeps original checkpoint and settled Ghost history');
 // A second isolated synthetic scenario checks actual CIPHER tile clicks
 // through the same iPhone screen, not an in-memory mutation of the board.
 const cipherSeed=structuredClone(seed);
 cipherSeed.ghost.orders['tai-cipher-1']={
  id:'tai-cipher-1',type:'cipher',key:'GH-TEST',status:'authorized',
  attempts:0,settings:{seconds:null,retries:1000,rounds:1}
 };
 cipherSeed.nav.current={appId:'ghost',route:'/contract',params:{orderId:'tai-cipher-1'}};
 cipherSeed.nav.stack=[];cipherSeed.unlocked=false;
 await resetPage(cipherSeed);
 await page.locator('#screen-layer [data-action="gh-start"]').click();
 await page.locator('#screen-layer [data-action="gh-tile"][data-index="2"]').click();
 assert.equal((await state()).ghost.orders['tai-cipher-1'].board.selected,2);
 const cipherShare=page.locator('#screen-layer [data-action="gh-share"]');
 await cipherShare.waitFor({state:'visible',timeout:25000});
 await cipherShare.click();
  await page.locator('#screen-layer [data-action="gh-share-yes"]').click();
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.story55?.ghostShare?.script==='first'&&s.story55.ghostShare.source.orderId==='tai-cipher-1';
 },key,{timeout:15000});
 await page.locator('#screen-layer .mc-composer').waitFor({state:'visible'});
 assert.equal(await page.locator('form[data-form="mc-login"]').count(),0,'share must not require another sign-in');
 await page.locator('.mc-ghost-card').waitFor({state:'visible',timeout:25000});
 for(const line of lines){
  await page.waitForFunction(expected=>{
   const input=document.querySelector('#screen-layer form.mc-composer input[name="text"]');
   return input?.value===expected&&!input.disabled;
  },line,{timeout:45000});
  await page.locator('#screen-layer .mc-composer button[type="submit"]').click();
 }
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.nav?.current?.appId==='ghost'&&s.nav.current.route==='/run'&&
   s.ghost?.orders?.['tai-cipher-1']?.type==='cipher'&&
   s.ghost.orders['tai-cipher-1'].board?.tiles?.length===9;
 },key,{timeout:40000});
 await screenshot('06-cipher-remote-tiles');
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s?.ghost?.orders?.['tai-cipher-1']?.status==='success'&&
   s.story55?.ghostShare?.phase==='complete'&&s.story55?.ghostShare?.remote?.active===false&&
   s.nav?.current?.appId==='mirage';
 },key,{timeout:60000});
 const cipherDone=await state(),order=cipherDone.ghost.orders['tai-cipher-1'];
 assert.deepEqual(order.board.tiles,[0,1,2,3,4,5,6,7,8]);
 assert.ok(order.moves>=4&&order.moves<=6,'original Ghost receives user selection, native deselection, and 1-2 swap pairs');
 assert.equal(cipherDone.ghost.history.filter(h=>h.orderId==='tai-cipher-1').length,1);
 assert.equal(cipherDone.story55.ghostShareTakeovers,1);
 await page.locator('#screen-layer .mc-composer input[name="text"]').waitFor({state:'visible',timeout:15000});
 await screenshot('07-cipher-returned-to-mirage');
 console.log('PASS second iPhone run: native CIPHER 3x3 tile swaps, original settlement once, Mirage restored');
 // Third isolated run: a real VEIL arcade order, not a synthetic success
 // result. The operator must use each native direction control.
 const veilSeed=structuredClone(seed);
 veilSeed.ghost.orders['tai-veil-1']={
  id:'tai-veil-1',type:'veil',key:'GH-VEIL',story55Project:'veil-demo',
  status:'authorized',attempts:0,
  settings:{seconds:120,retries:1000,rounds:1,arcadeV2:true}
 };
 veilSeed.nav.current={appId:'ghost',route:'/contract',params:{orderId:'tai-veil-1'}};
 veilSeed.nav.stack=[];veilSeed.unlocked=false;
 await resetPage(veilSeed);
 await page.locator('#screen-layer [data-action="gh-share"]').waitFor({state:'visible',timeout:25000});
 await page.locator('#screen-layer [data-action="gh-share"]').click();
   await page.locator('#screen-layer [data-action="gh-share-yes"]').click();
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.story55?.ghostShare?.script==='first'&&s.story55.ghostShare.source.orderId==='tai-veil-1';
 },key,{timeout:15000});
 await page.locator('#screen-layer .mc-composer').waitFor({state:'visible'});
 assert.equal(await page.locator('form[data-form="mc-login"]').count(),0,'share must not require another sign-in');
 await page.locator('.mc-ghost-card').waitFor({state:'visible',timeout:25000});
 for(const line of lines){
  await page.waitForFunction(expected=>{
   const input=document.querySelector('#screen-layer form.mc-composer input[name="text"]');
   return input?.value===expected&&!input.disabled;
  },line,{timeout:45000});
  await page.locator('#screen-layer .mc-composer button[type="submit"]').click();
 }
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  const o=s.ghost?.orders?.['tai-veil-1'];
  return s.nav?.current?.appId==='ghost'&&s.nav.current.route==='/run'&&
   o?.type==='veil'&&o.status==='running'&&o.board?.arcade?.kind==='veil';
 },key,{timeout:40000});
 await page.locator('#screen-layer [data-action="gh-arcade-step"][data-value="wait"]').waitFor({state:'attached',timeout:15000});
 await screenshot('08-veil-active-scan');
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k)),o=s?.ghost?.orders?.['tai-veil-1'];
  return o?.status==='success'&&s.story55?.ghostShare?.phase==='complete'&&
    s.story55.ghostShare.remote?.active===false&&s.nav?.current?.appId==='mirage';
 },key,{timeout:110000});
 const veilDone=await state(),veilOrder=veilDone.ghost.orders['tai-veil-1'];
 assert.equal(veilOrder.board.arcade.kind,'veil');
 assert.equal(veilOrder.board.arcade.player,veilOrder.board.arcade.exit);
 assert.equal(veilOrder.board.arcade.heat,0,'planned scans must not catch Tai');
 assert.ok(veilOrder.moves>=8&&veilOrder.moves<=75);
 assert.equal(veilOrder.moves,veilOrder.board.arcade.steps);
 assert.equal(veilDone.ghost.history.filter(h=>h.orderId==='tai-veil-1').length,1);
 assert.equal(veilDone.story55.ghostShareTakeovers,1);
 await page.locator('#screen-layer .mc-composer input[name="text"]').waitFor({state:'visible',timeout:15000});
 await screenshot('09-veil-returned-to-mirage');
 console.log('PASS third iPhone run: native VEIL path, moving scanners, zero catches, one Ghost settlement and Mirage return');
 
 // Fourth isolated run: EXTRACT is a genuine face-down ten-card memory board.
 // The model has no tool to read hidden faces. Only native taps reveal them.
 for(const upstream of [false,true]){
 const extractKind=upstream?'extract-memory':'extract';
 const extractSeed=structuredClone(seed);
 extractSeed.ghost.orders['tai-extract-1']={
  id:'tai-extract-1',type:'extract',key:'GH-EXTRACT',
  story55Project:'extract-demo',status:'authorized',attempts:0,
  settings:{seconds:110,retries:1000,rounds:1,arcadeV2:true,...(upstream?{arcadeV3:true,grade:'C'}:{})}
 };
 extractSeed.nav.current={appId:'ghost',route:'/contract',params:{orderId:'tai-extract-1'}};
 extractSeed.nav.stack=[];extractSeed.unlocked=false;
 await resetPage(extractSeed);
 await page.locator('#screen-layer [data-action="gh-share"]').waitFor({state:'visible',timeout:25000});
 await page.locator('#screen-layer [data-action="gh-share"]').click();
   await page.locator('#screen-layer [data-action="gh-share-yes"]').click();
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.story55?.ghostShare?.script==='first'&&
   s.story55.ghostShare.source.orderId==='tai-extract-1';
 },key,{timeout:15000});
 await page.locator('#screen-layer .mc-composer').waitFor({state:'visible'});
 assert.equal(await page.locator('form[data-form="mc-login"]').count(),0,'share must not require another sign-in');
 await page.locator('.mc-ghost-card').waitFor({state:'visible',timeout:25000});
 for(const line of lines){
  await page.waitForFunction(expected=>{
   const input=document.querySelector('#screen-layer form.mc-composer input[name="text"]');
   return input?.value===expected&&!input.disabled;
  },line,{timeout:45000});
  await page.locator('#screen-layer .mc-composer button[type="submit"]').click();
 }
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k)),o=s.ghost?.orders?.['tai-extract-1'];
  return s.nav?.current?.appId==='ghost'&&s.nav.current.route==='/run'&&
   o?.status==='running'&&['extract','extract-memory'].includes(o.board?.arcade?.kind)&&
   o.board.arcade.cards.length===10;
 },key,{timeout:40000});
 await page.locator('#screen-layer [data-action="gh-arcade-tap"]').first()
  .waitFor({state:'attached',timeout:15000});
 assert.equal((await state()).ghost.orders['tai-extract-1'].board.arcade.kind,extractKind);
 await screenshot('10-'+extractKind+'-cards');
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k)),o=s.ghost?.orders?.['tai-extract-1'];
  return o?.status==='success'&&s.story55?.ghostShare?.phase==='complete'&&
   s.story55.ghostShare.remote?.active===false&&s.nav?.current?.appId==='mirage';
 },key,{timeout:115000});
 const extractDone=await state(),extractOrder=extractDone.ghost.orders['tai-extract-1'];
 assert.equal(extractOrder.board.arcade.kind,extractKind);
 assert.equal(extractDone.story55.ghostShare.remote.outcome,'success');
 assert.equal(extractDone.story55.ghostShare.remote.errorCode,null);
 assert.equal(extractOrder.board.arcade.matched.length,10);
 assert.ok(extractOrder.moves>=10&&extractOrder.moves<50,'native card flip count must be realistic');
 assert.equal(extractDone.ghost.history.filter(h=>h.orderId==='tai-extract-1').length,1);
 assert.equal(extractDone.story55.ghostShareTakeovers,1);
 await page.locator('#screen-layer .mc-composer input[name="text"]').waitFor({state:'visible',timeout:15000});
 await screenshot('11-'+extractKind+'-returned-to-mirage');
 console.log('PASS iPhone '+extractKind+': real controller entry, native taps, successful release, single settlement and Mirage return');
 }

 // Fifth isolated browser run: live moving-target STRIKE.
 // The original GHOST handler, not the operator, counts six cumulative hits.
 const strikeSeed=structuredClone(seed);
 strikeSeed.ghost.orders['tai-strike-1']={
  id:'tai-strike-1',type:'strike',key:'GH-STRIKE',
  story55Project:'strike-demo',status:'authorized',attempts:0,
  settings:{seconds:45,retries:1000,rounds:1,arcadeV2:true}
 };
 strikeSeed.nav.current={appId:'ghost',route:'/contract',params:{orderId:'tai-strike-1'}};
 strikeSeed.nav.stack=[];strikeSeed.unlocked=false;
 await resetPage(strikeSeed);
 await page.locator('#screen-layer [data-action="gh-share"]').waitFor({state:'visible',timeout:25000});
 await page.locator('#screen-layer [data-action="gh-share"]').click();
   await page.locator('#screen-layer [data-action="gh-share-yes"]').click();
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.story55?.ghostShare?.script==='first'&&
   s.story55.ghostShare.source.orderId==='tai-strike-1';
 },key,{timeout:15000});
 await page.locator('#screen-layer .mc-composer').waitFor({state:'visible'});
 assert.equal(await page.locator('form[data-form="mc-login"]').count(),0,'share must not require another sign-in');
 await page.locator('.mc-ghost-card').waitFor({state:'visible',timeout:25000});
 for(const line of lines){
  await page.waitForFunction(expected=>{
   const input=document.querySelector('#screen-layer form.mc-composer input[name="text"]');
   return input?.value===expected&&!input.disabled;
  },line,{timeout:45000});
  await page.locator('#screen-layer .mc-composer button[type="submit"]').click();
 }
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k)),o=s.ghost?.orders?.['tai-strike-1'];
  return s.nav?.current?.appId==='ghost'&&s.nav.current.route==='/run'&&
   o?.status==='running'&&o.board?.arcade?.kind==='strike';
 },key,{timeout:40000});
 await page.locator('#screen-layer [data-action="gh-arcade-tap"]').first()
  .waitFor({state:'attached',timeout:15000});
 await screenshot('12-strike-moving-target');


 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k)),o=s.ghost?.orders?.['tai-strike-1'];
  return o?.status==='success'&&s.story55?.ghostShare?.phase==='complete'&&
   s.story55.ghostShare.remote?.active===false&&s.nav?.current?.appId==='mirage';
 },key,{timeout:80000});
 const strikeDone=await state(),strikeOrder=strikeDone.ghost.orders['tai-strike-1'];
 assert.equal(strikeOrder.board.arcade.kind,'strike');
 assert.equal(strikeOrder.board.arcade.hits,6,'six cumulative hits');
 assert.equal(strikeOrder.board.arcade.misses,0,'remote control must not miss');
 assert.equal(strikeOrder.moves,6,'only six real Ghost target taps');
 assert.equal(strikeOrder.attempts,1,'no restarting the original board');
 assert.equal(strikeDone.ghost.history.filter(h=>h.orderId==='tai-strike-1').length,1);
 assert.equal(strikeDone.story55.ghostShareTakeovers,1);
 await page.locator('#screen-layer .mc-composer input[name="text"]').waitFor({state:'visible',timeout:15000});
 await screenshot('13-strike-returned-to-mirage');
 console.log('PASS fifth iPhone run: six true STRIKE target clicks, zero misses, one native settlement, Mirage restored');

 // Sixth isolated legacy STRIKE: no takeover, and crucially no automated
 // start/time-based win. The shared allowlist now blocks the entry itself.
 const oldStrike=structuredClone(seed);
 oldStrike.ghost.orders['tai-strike-legacy']={
  id:'tai-strike-legacy',type:'strike',key:'GH-OLD',
  story55Project:'strike-demo',status:'authorized',attempts:0,
  settings:{seconds:45,retries:1000,rounds:1,arcadeV2:false}
 };
 oldStrike.nav.current={appId:'ghost',route:'/contract',params:{orderId:'tai-strike-legacy'}};
 oldStrike.nav.stack=[];oldStrike.unlocked=false;
 await resetPage(oldStrike);
 await page.locator('#screen-layer [data-action="gh-start"]').waitFor({state:'visible',timeout:20000});
 assert.equal(await page.locator('#screen-layer [data-action="gh-share"]').count(),0,
  'unsupported legacy STRIKE must be rejected by the share entry as well as the executor');
 const legacyDone=await state();
 assert.equal(legacyDone.ghost.orders['tai-strike-legacy'].attempts,0);
 assert.equal(legacyDone.story55.ghostShareTakeovers||0,0);
 console.log('PASS old STRIKE: no fake clicks, no start, no automatic win, no consumed takeover');




 // Sixth playable Ghost type: an existing four-token VERIFY order. Inspect
 // its visible target order and press the ORIGINAL gh-verify-token buttons.
 const verifySeed=structuredClone(seed);
 verifySeed.ghost.orders['tai-verify-1']={
  id:'tai-verify-1',type:'verify',key:'GH-VERIFY',
  story55Project:'verify-demo',status:'authorized',attempts:0,
  settings:{seconds:60,retries:1000,rounds:1}
 };
 verifySeed.nav.current={appId:'ghost',route:'/contract',params:{orderId:'tai-verify-1'}};
 verifySeed.nav.stack=[];verifySeed.unlocked=false;
 // Give VERIFY its own isolated browser context and saved state, rather
 // than mixing asynchronous work from preceding scenarios into its save.
 await page.close();
 const verifyContext=await browser.newContext({
  viewport:{width:390,height:844},deviceScaleFactor:2,
  isMobile:true,hasTouch:true,locale:'zh-TW',reducedMotion:'reduce'
 });
 page=await verifyContext.newPage();
 page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push('pageerror: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
 await page.addInitScript(({key,seed})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,seed);
  Math.random=()=>0.02;
 },{key,seed:JSON.stringify(verifySeed)});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('#phone').waitFor({state:'attached',timeout:45000});
 await unlock();
 await page.locator('#screen-layer [data-action="gh-share"]').waitFor({state:'visible',timeout:25000});
 await page.locator('#screen-layer [data-action="gh-share"]').click();
   await page.locator('#screen-layer [data-action="gh-share-yes"]').click();
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.story55?.ghostShare?.script==='first'&&
   s.story55.ghostShare.source.orderId==='tai-verify-1';
 },key,{timeout:15000});
 await page.locator('#screen-layer .mc-composer').waitFor({state:'visible'});
 assert.equal(await page.locator('form[data-form="mc-login"]').count(),0,'share must not require another sign-in');
 await page.locator('.mc-ghost-card').waitFor({state:'visible',timeout:25000});
 for(const line of lines){
  await page.waitForFunction(expected=>{
   const input=document.querySelector('#screen-layer form.mc-composer input[name="text"]');
   return input?.value===expected&&!input.disabled;
  },line,{timeout:45000});
  await page.locator('#screen-layer .mc-composer button[type="submit"]').click();
 }
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k)),o=s.ghost?.orders?.['tai-verify-1'];
  return s.nav?.current?.appId==='ghost'&&s.nav.current.route==='/run'&&
   o?.status==='running'&&o.board?.target?.length===4&&
   o.board?.tokens?.length===4;
 },key,{timeout:40000});
 await page.locator('#screen-layer [data-action="gh-verify-token"]').first()
  .waitFor({state:'attached',timeout:15000});
 await screenshot('14-verify-real-modules');
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k)),o=s.ghost?.orders?.['tai-verify-1'];
  return o?.status==='success'&&s.story55?.ghostShare?.phase==='complete'&&
   s.story55.ghostShare.remote?.active===false&&s.nav?.current?.appId==='mirage';
 },key,{timeout:80000});
 const verifyDone=await state(),verifyOrder=verifyDone.ghost.orders['tai-verify-1'];
 assert.equal(verifyOrder.status,'success');
 assert.equal(verifyOrder.board.input.length,4);
 assert.deepEqual(verifyOrder.board.input,verifyOrder.board.target);
 assert.equal(verifyOrder.board.used.length,4);
 assert.equal(verifyOrder.moves,4,'only four original Ghost native token taps');
 assert.equal(verifyOrder.errors,0,'Tai must never click the wrong module');
 assert.equal(verifyOrder.attempts,1,'existing board never restarts');
 assert.equal(verifyDone.ghost.history.filter(h=>h.orderId==='tai-verify-1').length,1);
 assert.equal(verifyDone.story55.ghostShareTakeovers,1);
 await page.locator('#screen-layer .mc-composer input[name="text"]').waitFor({state:'visible',timeout:15000});
 await screenshot('15-verify-returned-to-mirage');
 console.log('PASS sixth playable GHOST type: four real VERIFY module taps, zero mistakes, one settlement, Mirage restored');
 // Regression: a genuine daily commission's final native win changes its
 // parent from ACCEPTED to READY. The controller must read that terminal state
 // successfully and release, without paying or replaying the order.
 const dailySeed=structuredClone(seed);
 seedD04Contracts(dailySeed);
 assert.equal(acceptD04Contract(dailySeed,'M-001'),true);
 assert.equal(markD04AttachmentOpened(dailySeed,'M-001'),true);
 const dailyId=armD04Ghost(dailySeed,'M-001',0);
 dailySeed.story55.ghostShareTakeovers=2; // existing later-share authored branch
 dailySeed.nav.current={appId:'ghost',route:'/contract',params:{orderId:dailyId}};
 const dailyBalance=dailySeed.bankData.balance;
 await resetPage(dailySeed);
 await page.locator('#screen-layer [data-action="gh-share"]').click();
 await page.locator('#screen-layer [data-action="gh-share-yes"]').click();
 assert.equal(await page.locator('form[data-form="mc-login"]').count(),0);
 await page.waitForFunction(()=>{
  const input=document.querySelector('.mc-composer input[name="text"]');
  return input?.value==='謝囉'&&!input.disabled;
 },null,{timeout:45000});
 await page.locator('.mc-composer button[type="submit"]').click();
 await page.waitForFunction(({key,id})=>{
  const s=JSON.parse(localStorage.getItem(key));
  return s?.ghost?.orders?.[id]?.status==='success'&&s.story55?.ghostShare?.remote?.active===false&&s.nav?.current?.appId==='mirage';
 },{key,id:dailyId},{timeout:90000});
 const dailyDone=await state(),dailyRemote=dailyDone.story55.ghostShare.remote;
 assert.equal(dailyRemote.outcome,'success','final READY read must not be reported as an interruption');
 assert.equal(dailyRemote.errorCode,null);
 assert.equal(dailyDone.content.orders.find(o=>o.id==='M-001').status,'READY');
 assert.equal(dailyDone.bankData.balance,dailyBalance,'settlement still requires manual submit');
 assert.equal(dailyDone.ghost.history.filter(h=>h.orderId===dailyId).length,1);
 assert.equal(dailyDone.content.missionFiles.filter(f=>f.orderId==='M-001').length,1);
 assert.equal(await page.locator('.tai-remote-alert').count(),0);
 await screenshot('15b-real-daily-commission-complete');
 console.log('PASS real M-001 final native win: READY, successful release, one artifact, no automatic payment');
 // Current default LINK, then replacement of a live paused controller. Each
 // case gets its own browser context, with the same original phone handlers.
 for(const mode of ['link-3x3','live-restore']){
  await page.close();
  const edgeContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,
   isMobile:true,hasTouch:true,locale:'zh-TW',reducedMotion:'reduce'});
  page=await edgeContext.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  const edgeSeed=structuredClone(seed),id='tai-'+mode;
  edgeSeed.ghost.orders[id]={id,type:'route',key:'GH-EDGE',status:'authorized',attempts:0,
   settings:{seconds:null,...(mode==='live-restore'?{pipeNetwork:true,pipeSize:7}:{})}};
  edgeSeed.nav.current={appId:'ghost',route:'/contract',params:{orderId:id}};
  await page.addInitScript(({key,seed})=>{
   if(!localStorage.getItem(key))localStorage.setItem(key,seed);
   Math.random=()=>.02;
  },{key,seed:JSON.stringify(edgeSeed)});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  if(mode==='live-restore')await page.evaluate(async()=>{
   const {PhoneStore}=await import('/src/services/storage.js');
   const get=PhoneStore.prototype.get;
   PhoneStore.prototype.get=function(){globalThis.__taiQAStore=this;return get.call(this);};
  });
  await unlock();
  await page.locator('#screen-layer [data-action="gh-share"]').click();
   await page.locator('#screen-layer [data-action="gh-share-yes"]').click();
  await page.locator('#screen-layer .mc-composer').waitFor({state:'visible'});
  assert.equal(await page.locator('form[data-form="mc-login"]').count(),0,'share must not require another sign-in');
  for(const line of lines){
   await page.waitForFunction(expected=>{
    const input=document.querySelector('#screen-layer form.mc-composer input[name="text"]');
    return input?.value===expected&&!input.disabled;
   },line,{timeout:45000});
   await page.locator('#screen-layer .mc-composer button[type="submit"]').click();
  }
  await page.waitForFunction(({key,id})=>{
   const s=JSON.parse(localStorage.getItem(key));
   return s?.ghost?.orders?.[id]?.status==='running'&&s.story55?.ghostShare?.remote?.orderId===id;
  },{key,id},{timeout:45000});
  if(mode==='link-3x3'){
   assert.equal((await state()).ghost.orders[id].board.size,undefined);
   await page.locator('#screen-layer [data-action="gh-pipe"]').first().waitFor({state:'visible'});
   assert.equal(await page.locator('#screen-layer [data-action="gh-pipe"]').count(),9);
   await screenshot('16-current-default-3x3-link');
   await page.waitForFunction(({key,id})=>{
    const s=JSON.parse(localStorage.getItem(key));
    return s?.ghost?.orders?.[id]?.status==='success'&&s.story55?.ghostShare?.phase==='complete';
   },{key,id},{timeout:90000});
   const edgeDone=await state();
   assert.equal(edgeDone.ghost.orders[id].attempts,1);
   assert.equal(edgeDone.ghost.history.filter(h=>h.orderId===id).length,1);
   await page.locator('#screen-layer .mc-composer input[name="text"]').waitFor({state:'visible'});
   await page.locator('#status-layer .island-remote').waitFor({state:'detached'});
   await screenshot('16b-current-default-3x3-returned');
   console.log('PASS current default 3x3 LINK finishes through original buttons, without converting its board');
  }else{
   const restoredOrder=await page.evaluate(id=>{
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
    document.dispatchEvent(new Event('visibilitychange'));
    const backup=structuredClone(globalThis.__taiQAStore.get());
    globalThis.__taiQAStore.replace(backup);
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
    return {order:backup.ghost.orders[id],
     elapsedLimit:Date.now()-backup.story55.ghostShare.remote.pausedAt};
   },id);
   await page.waitForTimeout(1100);
   const replaced=await state();
   assert.equal(replaced.story55.ghostShare.phase,'interrupted');
   assert.equal(replaced.story55.ghostShare.remote.active,false);
   assert.equal(replaced.story55.ghostShareTakeovers,1);
   const expected=restoredOrder.order,actual=replaced.ghost.orders[id];
   const shifted=actual.startedAt-expected.startedAt;
   assert.ok(shifted>=0&&shifted<=restoredOrder.elapsedLimit,'only the observed paused interval may be compensated');
   for(const timestamp of ['startedAt','deadline','previewUntil'])
    if(Number.isFinite(expected[timestamp])&&expected[timestamp]>0)expected[timestamp]+=shifted;
   if(Number.isFinite(expected.board?.arcade?.lockUntil)&&expected.board.arcade.lockUntil>0)
    expected.board.arcade.lockUntil+=shifted;
   assert.deepEqual(actual,expected,'only paused timestamps may change; the old controller must not click after restore');
   assert.equal(await page.locator('.tai-remote-finger').count(),0);
   assert.equal(await page.locator('#status-layer .island-remote').count(),0);
   await page.locator('#screen-layer [data-action="gh-exit"]').click();
   await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k))?.nav?.current?.route!=='/run',key);
   await screenshot('17-live-restore-input-released');
   console.log('PASS restoring an active paused backup cancels old clicks and unlocks real phone navigation');
  }
 }
 assert.deepEqual(errors,[],'browser console errors: '+errors.join(' | '));
 console.log('ALL TAI REMOTE MOBILE BROWSER TESTS PASSED');
}catch(error){
 console.error('TAI REMOTE MOBILE BROWSER FAILED:',error.stack||error);
 try{
  await screenshot('FAILED-browser-state');
  const ui=await page.evaluate(()=>{
   const input=document.querySelector('#screen-layer form.mc-composer input[name="text"]');
   return {inputValue:input?.value,inputReadonly:input?.readOnly,storyStage:input?.dataset.storyStage,
    formDataset:input?.form?.dataset?{...input.form.dataset}:null,
    sendDisabled:input?.form?.querySelector('button[type="submit"]')?.disabled};
  }).catch(()=>null);
  console.error('MIRAGE UI:',JSON.stringify(ui));
  const s=await state();console.error('STORY STATE:',JSON.stringify({
   day:s?.day,clock:s?.clock,nav:s?.nav?.current,
   ghostShare:s?.story55?.ghostShare,
   base:s?.story55?.projects?.base,
   ghostOrders:Object.fromEntries(Object.entries(s?.ghost?.orders||{}).map(([id,o])=>[id,{type:o.type,status:o.status,moves:o.moves}])),
   errors
  },null,2));
 }catch{}
 process.exitCode=1;
}finally{await browser.close();}
