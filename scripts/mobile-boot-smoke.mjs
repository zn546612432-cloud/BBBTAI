// Real Pages-path boot regression: Safari/WebKit and Chromium, original save retained.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit,devices} from 'playwright';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';

const base=process.env.SMOKE_URL||'http://127.0.0.1:5173/BBBTAI/';
const key='ximeng-phone-story55-v1';
await mkdir('qa-results',{recursive:true});
const fixture=activateStory55(initialState());
fixture.day=13;fixture.clock='23:59';fixture.batteryPercent=20;fixture.unlocked=false;
fixture.story55.config.nodes.find(n=>n.id==='d13-wallet-mail').requires=['exhibition'];
fixture.story55.config.nodes.find(n=>n.id==='intrusion').requires=['d13-wallet-transfer'];
const results=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function verifyBoot(page,id){
 try{
  await page.locator('#xm-boot').waitFor({state:'hidden',timeout:75000});
  // The startup overlay fades out, then removes itself 450 ms later.
  // Hidden is already a successful boot; wait for detach before DOM-count check.
  await page.locator('#xm-boot').waitFor({state:'detached',timeout:5000});
  await page.locator('#phone').waitFor({state:'visible',timeout:15000});
  await page.locator('.lock-screen').first().waitFor({state:'visible',timeout:15000});
  assert.equal(await page.locator('#xm-boot-next').count(),0,'startup splash should be removed');
  await page.screenshot({path:'qa-results/boot-'+id+'-success.png'});
 }catch(error){
  await page.screenshot({path:'qa-results/boot-'+id+'-failure.png'}).catch(()=>{});
  const details=await page.evaluate(()=>({
    boot:document.querySelector('#xm-boot')?.outerHTML?.slice(0,2500),
    scripts:[...document.querySelectorAll('script[src]')].map(s=>s.src),
    phone:!!document.querySelector('#phone'),
    startup:window.__xmBootStarted?'watchdog installed':'watchdog missing'
  })).catch(()=>({}));
  await writeFile('qa-results/boot-'+id+'-error.json',JSON.stringify({error:String(error),details},null,2));
  throw error;
 }
}

for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true,...(name==='chromium'?{args:['--no-sandbox']}:{})});
 try{
  const context=await browser.newContext({...devices['iPhone 13']});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({fixture,key})=>{
   if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(fixture));
  },{fixture,key});
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
  await verifyBoot(page,name+'-old-d13-save');
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  let state=await saved();
  assert.equal(state.day,13,'must not reset D13 day');
  assert.equal(state.clock,'23:59','must not reset 23:59 saved clock');
  assert.equal(state.batteryPercent,20,'must not reset saved battery');
  assert.equal(state.story55.completed.exhibition,undefined,'unfinished scene must remain pending');
  assert.equal(state.content.mail.filter(m=>m.id==='s55-d13-wallet-mail').length,1,'late scheduled mail recovered once');
  await page.reload({waitUntil:'domcontentloaded',timeout:90000});
  await verifyBoot(page,name+'-reloaded');
  state=await saved();
  assert.equal(state.day,13);assert.equal(state.clock,'23:59');
  assert.equal(state.content.mail.filter(m=>m.id==='s55-d13-wallet-mail').length,1,'no duplicate email after reload');
  results.push({engine:name,boot:true,persistedD13:true,errors});

  if(name==='chromium'){
   const slow=await context.newPage();let slowed=0;
   await slow.route('**/src/main.js',async route=>{
    slowed++;await sleep(14000);await route.continue();
   });
   await slow.goto(base+'?boot-smoke=slow',{waitUntil:'domcontentloaded',timeout:90000});
   await sleep(12300);
   const bootMessage=await slow.locator('#xm-boot-message').textContent().catch(()=>'');
   assert.doesNotMatch(bootMessage,/启动超时/,'a slow 12s import must not be declared failed');
   assert.equal(await slow.locator('#xm-boot-next').isVisible(),false,'slow imports must not demand a retry');
   await verifyBoot(slow,'chromium-slow-14s');
   assert.ok(slowed>0,'the actual main.js was delayed');
   await slow.close();
   results.push({engine:name,slowModuleMilliseconds:14000,boot:true});

   const broken=await context.newPage();let blocked=0;
   await broken.route('**/src/main.js',route=>{blocked++;return route.abort('failed');});
   await broken.goto(base+'?boot-smoke=missing',{waitUntil:'domcontentloaded',timeout:90000});
   await broken.locator('#xm-boot-next').waitFor({state:'visible',timeout:35000});
   const message=await broken.locator('#xm-boot-message').textContent();
   assert.match(message,/未能启动|长时间未完成启动/);
   assert.ok(blocked>0);
   await broken.screenshot({path:'qa-results/boot-chromium-broken-module.png'});
   await broken.close();
   results.push({engine:name,missingModuleRecovery:true});
  }
  await context.close();
 }finally{await browser.close();}
}
await writeFile('qa-results/boot-result.json',JSON.stringify(results,null,2));
console.log('PASS_BOOT_SAFARI_CHROMIUM',JSON.stringify(results));
