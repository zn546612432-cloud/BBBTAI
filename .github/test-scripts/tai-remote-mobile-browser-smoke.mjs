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
