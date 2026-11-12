// Isolated 390x844 touch-browser acceptance for Tai -> Mirage -> native GHOST LINK.
// Serves this branch's built dist/ at localhost; no production save or secrets.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {initialState} from '../../src/services/storage.js';
import {activateStory55} from '../../src/services/story55/runtime.js';

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
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({
 viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
 locale:'zh-TW',reducedMotion:'reduce'
});
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
 await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k))?.story55?.ghostShare?.script==='first',key);
 assert.equal((await state()).story55.ghostShareTakeovers||0,0);
 console.log('PASS Ghost real project card sent, 50% roll selected the first authored dialogue');

 // The Mirage session login must be done by the tester, never bypassed by Tai.
 const login=page.locator('form[data-form="mc-login"] button[type="submit"]');
 await login.waitFor({state:'visible',timeout:22000});
 await login.click();
 await page.locator('#screen-layer .mc-composer input[name="text"]').waitFor({state:'visible',timeout:25000});
 await page.locator('.mc-ghost-card').waitFor({state:'visible',timeout:25000});
 await screenshot('02-mirage-ghost-card');
 const lines=[
  '我想驗證一下你是不是azathoth',
  '嫌低級，那倒是做做看',
  '為了部署你給我的程序，我得努力賺錢才行，還是說你打算再給我一百萬？'
 ];
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
 const backgroundTab=await page.context().newPage();
 await backgroundTab.bringToFront();
 assert.equal(await page.evaluate(()=>document.hidden),true,'real browser should background the phone');
 const linkPaused=await state();
 assert.ok(Number.isFinite(linkPaused.story55.ghostShare.remote.pausedAt));
 await page.waitForTimeout(1600);
 const linkHidden=await state();
 assert.equal(linkHidden.ghost.orders[controlOrder].moves,linkPaused.ghost.orders[controlOrder].moves);
 assert.equal(linkHidden.story55.ghostShare.phase,'controlling');
 await page.bringToFront();
 await backgroundTab.close();
 await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).story55.ghostShare.remote.pausedAt===null,key);
 assert.equal((await state()).story55.ghostShareTakeovers,1);
 console.log('PASS B: switching browser tabs pauses and resumes same GHOST LINK session');


 // Real user taps during takeover must be blocked; one Tai warning per session.
 await page.touchscreen.tap(16,220);
 await page.touchscreen.tap(16,220);
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k)),p=s.story55?.ghostShare;
  return p?.remote?.warningShown===true;
 },key,{timeout:12000});
 assert.equal(messageCount(await state()).filter(m=>m.id.endsWith('-remote-warning')).length,1);
 console.log('PASS competing real touch blocked, only one Tai warning delivered');

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
 await page.evaluate(({key,json})=>localStorage.setItem(key,json),{
  key,json:JSON.stringify(cipherSeed)
 });
 await page.reload({waitUntil:'domcontentloaded',timeout:60000});
 await unlock();
 const cipherShare=page.locator('#screen-layer [data-action="gh-share"]');
 await cipherShare.waitFor({state:'visible',timeout:25000});
 await cipherShare.click();
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.story55?.ghostShare?.script==='first'&&s.story55.ghostShare.source.orderId==='tai-cipher-1';
 },key,{timeout:15000});
 await page.locator('form[data-form="mc-login"] button[type="submit"]').waitFor({state:'visible',timeout:25000});
 await page.locator('form[data-form="mc-login"] button[type="submit"]').click();
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
 assert.ok(order.moves>=2&&order.moves<=4,'original Ghost must receive 1-2 tile-swap pairs');
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
 await page.evaluate(({key,json})=>localStorage.setItem(key,json),{
  key,json:JSON.stringify(veilSeed)
 });
 await page.reload({waitUntil:'domcontentloaded',timeout:60000});
 await unlock();
 await page.locator('#screen-layer [data-action="gh-share"]').waitFor({state:'visible',timeout:25000});
 await page.locator('#screen-layer [data-action="gh-share"]').click();
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.story55?.ghostShare?.script==='first'&&s.story55.ghostShare.source.orderId==='tai-veil-1';
 },key,{timeout:15000});
 await page.locator('form[data-form="mc-login"] button[type="submit"]').waitFor({state:'visible',timeout:25000});
 await page.locator('form[data-form="mc-login"] button[type="submit"]').click();
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
 const extractSeed=structuredClone(seed);
 extractSeed.ghost.orders['tai-extract-1']={
  id:'tai-extract-1',type:'extract',key:'GH-EXTRACT',
  story55Project:'extract-demo',status:'authorized',attempts:0,
  settings:{seconds:110,retries:1000,rounds:1,arcadeV2:true}
 };
 extractSeed.nav.current={appId:'ghost',route:'/contract',params:{orderId:'tai-extract-1'}};
 extractSeed.nav.stack=[];extractSeed.unlocked=false;
 await page.evaluate(({key,json})=>localStorage.setItem(key,json),{
  key,json:JSON.stringify(extractSeed)
 });
 await page.reload({waitUntil:'domcontentloaded',timeout:60000});
 await unlock();
 await page.locator('#screen-layer [data-action="gh-share"]').waitFor({state:'visible',timeout:25000});
 await page.locator('#screen-layer [data-action="gh-share"]').click();
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.story55?.ghostShare?.script==='first'&&
   s.story55.ghostShare.source.orderId==='tai-extract-1';
 },key,{timeout:15000});
 await page.locator('form[data-form="mc-login"] button[type="submit"]').waitFor({state:'visible',timeout:25000});
 await page.locator('form[data-form="mc-login"] button[type="submit"]').click();
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
   o?.status==='running'&&o.board?.arcade?.kind==='extract'&&
   o.board.arcade.cards.length===10;
 },key,{timeout:40000});
 await page.locator('#screen-layer [data-action="gh-arcade-tap"]').first()
  .waitFor({state:'attached',timeout:15000});
 await screenshot('10-extract-memory-cards');
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k)),o=s.ghost?.orders?.['tai-extract-1'];
  return o?.status==='success'&&s.story55?.ghostShare?.phase==='complete'&&
   s.story55.ghostShare.remote?.active===false&&s.nav?.current?.appId==='mirage';
 },key,{timeout:115000});
 const extractDone=await state(),extractOrder=extractDone.ghost.orders['tai-extract-1'];
 assert.equal(extractOrder.board.arcade.kind,'extract');
 assert.equal(extractOrder.board.arcade.matched.length,10);
 assert.ok(extractOrder.moves>=10&&extractOrder.moves<50,'native card flip count must be realistic');
 assert.equal(extractDone.ghost.history.filter(h=>h.orderId==='tai-extract-1').length,1);
 assert.equal(extractDone.story55.ghostShareTakeovers,1);
 await page.locator('#screen-layer .mc-composer input[name="text"]').waitFor({state:'visible',timeout:15000});
 await screenshot('11-extract-returned-to-mirage');
 console.log('PASS fourth iPhone run: EXTRACT face-up card memory, original Ghost matching and single settlement');

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
 await page.evaluate(({key,json})=>localStorage.setItem(key,json),{
  key,json:JSON.stringify(strikeSeed)
 });
 await page.reload({waitUntil:'domcontentloaded',timeout:60000});
 await unlock();
 await page.locator('#screen-layer [data-action="gh-share"]').waitFor({state:'visible',timeout:25000});
 await page.locator('#screen-layer [data-action="gh-share"]').click();
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.story55?.ghostShare?.script==='first'&&
   s.story55.ghostShare.source.orderId==='tai-strike-1';
 },key,{timeout:15000});
 await page.locator('form[data-form="mc-login"] button[type="submit"]').waitFor({state:'visible',timeout:25000});
 await page.locator('form[data-form="mc-login"] button[type="submit"]').click();
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
 const phoneBackgroundTab=await page.context().newPage();
 await phoneBackgroundTab.bringToFront();
 assert.equal(await page.evaluate(()=>document.hidden),true);
 const strikePaused=await state(),strikeBefore=strikePaused.ghost.orders['tai-strike-1'];
 assert.ok(Number.isFinite(strikePaused.story55.ghostShare.remote.pausedAt));
 const oldDeadline=strikeBefore.deadline,oldHits=strikeBefore.board.arcade.hits;
 await page.waitForTimeout(2200);
 const strikeStillHidden=await state();
 assert.equal(strikeStillHidden.ghost.orders['tai-strike-1'].board.arcade.hits,oldHits);
 assert.equal(strikeStillHidden.ghost.orders['tai-strike-1'].status,'running');
 await page.bringToFront();
 await phoneBackgroundTab.close();
 await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).story55.ghostShare.remote.pausedAt===null,key);
 const strikeResumed=await state();
 assert.ok(strikeResumed.ghost.orders['tai-strike-1'].deadline-oldDeadline>=2000,
  'only the running STRIKE order should regain the exact hidden interval');
 assert.equal(strikeResumed.story55.ghostShareTakeovers,1);
 console.log('PASS B: real browser switch freezes STRIKE hit count and compensates its deadline');

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
 // start/time-based win. Share card may send; remote operator must refuse.
 const oldStrike=structuredClone(seed);
 oldStrike.ghost.orders['tai-strike-legacy']={
  id:'tai-strike-legacy',type:'strike',key:'GH-OLD',
  story55Project:'strike-demo',status:'authorized',attempts:0,
  settings:{seconds:45,retries:1000,rounds:1,arcadeV2:false}
 };
 oldStrike.nav.current={appId:'ghost',route:'/contract',params:{orderId:'tai-strike-legacy'}};
 oldStrike.nav.stack=[];oldStrike.unlocked=false;
 await page.evaluate(({key,json})=>localStorage.setItem(key,json),{key,json:JSON.stringify(oldStrike)});
 await page.reload({waitUntil:'domcontentloaded',timeout:60000});
 await unlock();
 await page.locator('#screen-layer [data-action="gh-share"]').waitFor({state:'visible',timeout:20000});
 await page.locator('#screen-layer [data-action="gh-share"]').click();
 // The old share can still be messaged, but an actual control attempt must
 // never press GHOST start or complete the legacy automatic countdown.
 await page.locator('form[data-form="mc-login"] button[type="submit"]').waitFor({state:'visible',timeout:20000});
 await page.locator('form[data-form="mc-login"] button[type="submit"]').click();
 await page.locator('.mc-ghost-card').waitFor({state:'visible',timeout:20000});
 for(const line of lines){
  await page.waitForFunction(expected=>{
   const input=document.querySelector('#screen-layer form.mc-composer input[name="text"]');
   return input?.value===expected&&!input.disabled;
  },line,{timeout:45000});
  await page.locator('#screen-layer .mc-composer button[type="submit"]').click();
 }
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.story55?.ghostShare?.phase==='unavailable'&&
   s.ghost.orders['tai-strike-legacy']?.status==='authorized';
 },key,{timeout:18000});
 const legacyDone=await state();
 assert.equal(legacyDone.ghost.orders['tai-strike-legacy'].attempts,0);
 assert.equal(legacyDone.story55.ghostShareTakeovers||0,0);
 console.log('PASS old STRIKE: no fake clicks, no start, no automatic win, no consumed takeover');



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
