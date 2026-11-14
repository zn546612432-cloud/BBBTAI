// Run after build:pages. PLAYWRIGHT_MODULE / CHROMIUM_PATH can select installed tooling.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {story55Config} from '../src/services/story55/state.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{
 try{
  let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/BBBTAI(?=\/)/,'');
  if(route.endsWith('/'))route+='index.html';
  const target=path.resolve(root,'.'+route);if(!target.startsWith(root+path.sep))throw Error('path');
  const data=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'}).end(data);
 }catch{res.writeHead(404).end('not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
await mkdir('qa/background-clock',{recursive:true});
const results=[];
try{
 for(const scenario of [{name:'normal',day:2,clock:'08:00',target:'08:50'},
  {name:'d13-mail',day:13,clock:'22:00',target:'22:10'},
  {name:'d23-chess',day:23,clock:'22:10',target:'22:16'},
  {name:'short-charge',day:2,clock:'08:00',target:'08:50',short:true}]){
  console.log('Checking '+scenario.name);
  const s=activateStory55(initialState());s.day=scenario.day;s.clock=scenario.clock;s.unlocked=false;
  s.nav.current={appId:'home',route:'/',params:{}};s.content.alarms=[];
  for(const n of story55Config(s).nodes)if(n.day<s.day)s.story55.completed[n.id]={day:n.day,clock:'12:00'};
  s.story55.d01={bankClaimed:true,rewardPaid:true};
  if(scenario.short){s.batteryPercent=50;s.powerMode='short-charging';s.shortCharge={startPercent:50,elapsedMs:0,credited:0,lastAccruedAt:Date.now()};}
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await context.addInitScript(state=>localStorage.setItem('ximeng-phone-story55-v1',JSON.stringify(state)),s);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Install before app startup so its intervals belong to the controlled clock.
  await page.clock.install();
  await page.goto('http://127.0.0.1:'+server.address().port+'/BBBTAI/',{waitUntil:'domcontentloaded'});
  await page.locator('#xm-boot').waitFor({state:'detached',timeout:45000});
  await page.locator('.lock-screen').waitFor({timeout:10000});
  await page.clock.pauseAt(new Date(Date.now()+1000));
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')));
  const before=await saved();
  // iOS can suspend timers; explicitly dispatch the browser's visibility /
  // page lifecycle events and advance wall time deterministically.
  await page.evaluate(()=>{
   window.__qaHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__qaHidden});
   document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
  });
  await page.clock.runFor(10000);assert.equal((await saved()).clock,before.clock);
  await page.evaluate(()=>{window.__qaHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  const after=await saved();assert.equal(after.clock,scenario.target,scenario.name);
  await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));document.dispatchEvent(new Event('visibilitychange'));});
  const repeated=await saved();assert.equal(repeated.clock,after.clock);assert.equal(repeated.batteryPercent,after.batteryPercent);
  if(scenario.name==='d13-mail'){
   assert.equal(after.content.mail.filter(m=>m.id==='s55-d13-wallet-mail').length,1);
   assert.equal(after.notifications.filter(m=>m.id==='s55-mail-s55-d13-wallet-mail').length,1);
   assert.equal(after.story55.completed['d13-wallet-transfer'],undefined);
  }
  if(scenario.short)assert.equal(repeated.shortCharge.elapsedMs,after.shortCharge.elapsedMs);
  console.log(scenario.name+' background and duplicate resume verified at '+after.clock);
  await page.screenshot({path:`qa/background-clock/${scenario.name}.png`});
  if(scenario.name==='normal'){
   await page.locator('.unlock-hint').click({force:true});
   await page.locator('.passcode-grid').waitFor();
   for(const digit of '0816')await page.locator(`[data-action="passcode-key"][data-key="${digit}"]`).click({force:true});
   await page.clock.runFor(300); // Complete the existing 260ms unlock transition.
   await page.locator('.home-screen').waitFor();
   await page.locator('[data-action="open-app"][data-app="wechat"]').click({force:true});
   const readingStart=await saved();
   await page.clock.runFor(60000);
   const reading=await saved();
   const minute=clock=>Number(clock.slice(0,2))*60+Number(clock.slice(3));
   assert.equal(minute(reading.clock)-minute(readingStart.clock),5,'foreground WeChat stays slow');
  }
  assert.deepEqual(errors,[]);await page.screenshot({path:`qa/background-clock/${scenario.name}.png`});
  results.push({scenario:scenario.name,before:before.clock,after:after.clock,battery:after.batteryPercent,duplicateResume:'no change',pageErrors:errors});
  await context.close();
 }
 console.log(JSON.stringify(results,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
