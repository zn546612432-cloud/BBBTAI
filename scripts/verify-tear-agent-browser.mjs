// Run after npm run build:pages. Uses the genuine phone shell and existing task system.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {story55Config,projectById} from '../src/services/story55/state.js';
import {beginTearChatSession,startAgentJob} from '../src/apps/ghost/deployment/tear-agent/state.js';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('dist'),out='qa/tear-agent';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpeg':'image/jpeg','.jpg':'image/jpeg','.mp4':'video/mp4','.mp3':'audio/mpeg','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{try{
 let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/BBBTAI(?=\/)/,'');
 if(route.endsWith('/'))route+='index.html';
 const target=path.resolve(root,'.'+route);if(!target.startsWith(root+path.sep))throw Error('path');
 res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'}).end(await readFile(target));
}catch{res.writeHead(404).end('not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const engine=process.env.TEAR_BROWSER==='webkit'?webkit:chromium;
const browser=await engine.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
await mkdir(out,{recursive:true});const results=[];let currentPage;
async function unlock(page){
 await page.locator('[data-action=unlock]').click();
 for(const digit of '0816')await page.locator(`[data-action=passcode-key][data-key="${digit}"]`).click();
 await page.locator('.gh-agent-screen').waitFor();
}
async function reopenTearFromHome(live){
 await live.locator('[data-action=gh-tear-home]').click();
 await live.locator('.home-screen').waitFor();
 await live.locator('[data-action=page][data-page="1"]').click();
 await live.locator('[data-action=open-app][data-app=ghost]').click();
 await live.locator('[data-action=gh-flow-projects]').click();
 await live.locator('[data-action=gh-flow-base-project]').click();
 await live.locator('[data-action=gh-tear-open]').click();
 await live.locator('.gh-agent-screen').waitFor();
}
function seed(){
 const s=activateStory55(initialState());s.day=28;s.clock='10:00';s.unlocked=true;s.content.alarms=[];
 for(const n of story55Config(s).nodes)if(n.day<=28)s.story55.completed[n.id]={day:n.day,clock:'09:00'};
 s.story55.projects.base={authorized:true,batches:Array.from({length:projectById(s,'base').batches},()=>({complete:true})),active:null};
 s.story55.baseUpgradeRevision=2;s.story55.minutesPerSecond=0;s.story55.activeScene=null;
 s.story55.d01={bankClaimed:true,rewardPaid:true};
 s.nav.current={appId:'ghost',route:'/tear',params:{}};beginTearChatSession(s);
 startAgentJob(s,'staff');startAgentJob(s,'program');
 return s;
}
try{
 for(const width of [390,375]){
 const s=seed(),context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(state=>{if(!localStorage.getItem('ximeng-phone-story55-v1'))localStorage.setItem('ximeng-phone-story55-v1',JSON.stringify(state));},s);
 const page=await context.newPage(),errors=[];currentPage=page;page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/BBBTAI/`,{waitUntil:'domcontentloaded'});
 await page.locator('#xm-boot-next').click({timeout:45000});await page.locator('#xm-boot').waitFor({state:'detached',timeout:45000});await unlock(page);
 const live=page.locator('#screen-layer');
 await live.locator('.gh-agent-screen').waitFor();
 await reopenTearFromHome(live);
 await live.locator('xm-tear-orbit').evaluate(el=>customElements.whenDefined(el.localName));
 await page.clock.install();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
 assert.match(await live.locator('.gh-agent-messages').innerText(),/你好，我是小TAI/);
 assert.equal(await live.locator('.gh-agent-task-dot').count(),2);
 const canvas=live.locator('xm-tear-orbit');
 const readingSize=await canvas.boundingBox();
 const surface=canvas.locator('canvas');
 const backing=await surface.evaluate(c=>({width:c.width,height:c.height}));
 assert.equal(await canvas.getAttribute('progress'),'0');
 await page.clock.runFor(1200);await page.screenshot({path:`${out}/${width}-silver.png`});
 await live.locator('#tear-agent-input').fill('TAI？');await live.locator('button[type=submit]').click();
 assert.match(await live.locator('.gh-agent-messages').innerText(),/主人賜予/);
 await page.clock.runFor(7100);await page.waitForTimeout(900);
 assert.equal(await live.locator('.gh-agent-screen').getAttribute('data-visual-mode'),'expanded');
 const expandedSize=await canvas.boundingBox();
 assert.ok(expandedSize.width>readingSize.width*1.1,'idle serpent must regain the large reference size');
 assert.equal(await live.locator('xm-tear-stage').getAttribute('expanded'),'1');
 assert.deepEqual(await surface.evaluate(c=>({width:c.width,height:c.height})),backing,'zoom must not resize or clear the canvas');
 console.log(JSON.stringify({width,readingWidth:readingSize.width,expandedWidth:expandedSize.width}));
 await page.screenshot({path:`${out}/${width}-expanded.png`});
 // Sample the actual compositor zoom, including a mid-flight reversal.
 await live.locator('#tear-agent-input').fill('你好');
 await page.clock.runFor(34);
 const frames=[];
 for(let i=0;i<11;i++){
  await page.waitForTimeout(70);frames.push(await canvas.boundingBox());
  assert.deepEqual(await surface.evaluate(c=>({width:c.width,height:c.height})),backing);
 }
 assert.equal(await live.locator('.gh-agent-screen').getAttribute('data-visual-mode'),'conversation');
 assert.ok(frames.filter(f=>f.width>readingSize.width+2&&f.width<expandedSize.width-2).length>=2,'zoom needs continuous intermediate frames');
 assert.ok(Math.abs(frames[0].width-expandedSize.width)<(expandedSize.width-readingSize.width)*.9,'first frame must not snap to the target');
 assert.ok(frames.at(-1).width<expandedSize.width*.95);
 await live.locator('#tear-agent-input').fill('');await page.clock.runFor(34);await page.waitForTimeout(170);
 const midway=await canvas.boundingBox();
 await live.locator('#tear-agent-input').fill('你好');await page.clock.runFor(34);
 const reversed=await canvas.boundingBox();
 assert.ok(Math.abs(midway.width-reversed.width)<20,'interrupted zoom must resume from its visible size');
 assert.ok(Math.hypot(midway.x-reversed.x,midway.y-reversed.y)<25,'interrupted zoom must preserve its visible position');
 await page.waitForTimeout(850);
 console.log(JSON.stringify({width,stableBacking:backing,motionFrames:frames.map(f=>Math.round(f.width))}));
 await live.locator('button[type=submit]').click();
 await page.clock.runFor(7100);await page.waitForTimeout(900);
 assert.doesNotMatch(await live.locator('.gh-agent-messages').innerText(),/主人賜予|你好，我是小TAI/);
 await live.locator('[data-action=gh-tear-history]').click();
 assert.match(await live.locator('.gh-agent-history').innerText(),/主人賜予/);
 await page.screenshot({path:`${out}/${width}-history.png`});
 await live.locator('[data-action=gh-tear-history-close]').click();
 await live.locator('[data-action=gh-tear-task][data-id=staff]').click();
 assert.match(await live.locator('.gh-agent-task-detail').innerText(),/STAFF_RECORDS|運行時間|完成進度/);
 const glass=await live.locator('.gh-agent-task-detail').evaluate(el=>({blur:getComputedStyle(el).backdropFilter,radius:getComputedStyle(el).borderRadius}));
 assert.match(glass.blur,/blur/);assert.equal(glass.radius,'24px');
 await page.screenshot({path:`${out}/${width}-detail.png`});
 await live.locator('[data-action=gh-tear-task-close]').last().click();
 // Geometry: every 44px task target lies on the exact drawn 44% outer radius.
 const geometry=await live.locator('.gh-agent-visual').evaluate(stage=>{
  const r=stage.shadowRoot.querySelector('[part=visual]').getBoundingClientRect();return [...stage.querySelectorAll('.gh-agent-task-dot')].map(dot=>{
   const p=dot.getBoundingClientRect();return Math.hypot(p.x+p.width/2-r.x-r.width/2,p.y+p.height/2-r.y-r.height/2)/r.width;
  });
 });geometry.forEach(r=>assert.ok(Math.abs(r-.44)<.002));
 // Background passage is verified after a reload with the canonical speed enabled.
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')));
 saved.story55.minutesPerSecond=5;
 // Apply the saved speed at document startup, before the live store can persist.
 await context.addInitScript(()=>{const key='ximeng-phone-story55-v1',state=JSON.parse(localStorage.getItem(key));if(state){state.story55.minutesPerSecond=5;localStorage.setItem(key,JSON.stringify(state));}});
 await page.evaluate(state=>localStorage.setItem('ximeng-phone-story55-v1',JSON.stringify(state)),saved);
 await page.reload({waitUntil:'domcontentloaded'});await page.clock.resume();
 await page.locator('#xm-boot-next').click({timeout:45000});await page.locator('#xm-boot').waitFor({state:'detached',timeout:45000});await unlock(page);
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')));
 await page.evaluate(()=>{window.__qaHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__qaHidden});document.dispatchEvent(new Event('visibilitychange'));});
 await page.clock.runFor(36000);
 await page.evaluate(()=>{window.__qaHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
 await page.clock.runFor(500);
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')));
 console.log(JSON.stringify({beforeClock:before.clock,afterClock:after.clock,speed:before.story55.minutesPerSecond,activeScene:before.story55.activeScene,phoneCall:before.phoneCall?.state,staff:after.story55.tearAgent.jobs.staff,program:after.story55.tearAgent.jobs.program}));
 assert.equal(after.story55.tearAgent.jobs.staff.done,true);assert.equal(after.story55.tearAgent.jobs.program.done,true);
 assert.equal(after.story55.tearAgent.visualProgress,1);
 assert.equal(after.story55.tearAgent.jobs.staff.start,before.story55.tearAgent.jobs.staff.start);
 assert.equal(await live.locator('.gh-agent-task-dot.is-complete').count(),2);
 await page.clock.runFor(2500);await page.screenshot({path:`${out}/${width}-gold.png`});
 const receipts=live.locator('.gh-agent-file-receipt');assert.equal(await receipts.count(),0);
 await live.locator('[data-action=gh-tear-task][data-id=staff]').click();
 await live.locator('.gh-agent-task-dot.is-accepted[data-id=staff]').waitFor();
 assert.equal(await receipts.count(),1);
 assert.match(await receipts.first().evaluate(el=>getComputedStyle(el).backdropFilter),/blur/);
 await page.screenshot({path:`${out}/${width}-completed-glass.png`});
 const files=JSON.stringify(after.content.localFiles);
 await reopenTearFromHome(live);
 assert.equal(await live.locator('xm-tear-orbit').getAttribute('progress'),'0');
 const reopened=await page.evaluate(()=>JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')));
 assert.deepEqual(reopened.story55.tearAgent.jobs,after.story55.tearAgent.jobs);
 assert.equal(JSON.stringify(reopened.content.localFiles),files);
 await page.setViewportSize({width,height:500});await page.clock.runFor(500);await page.waitForTimeout(900);await page.clock.runFor(50);
 const input=await live.locator('.gh-agent-composer').boundingBox();assert.ok(input.y+input.height<=500);
 await page.screenshot({path:`${out}/${width}-short-viewport.png`});
 assert.deepEqual(errors,[]);results.push({width,chatExpiry:'pass',idleExpansion:'pass',continuousZoom:'pass',interruptedZoom:'pass',fixedCanvasBacking:'pass',glassCompletion:'pass',newMessageCompaction:'pass',history:'pass',taskRing:'pass',details:'pass',parallelBackgroundCompletion:'pass',reentry:'pass',shortViewport:'pass',pageErrors:errors});
 await context.close();
 }
 await writeFile(`${out}/results.json`,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
}catch(error){
 if(currentPage&&!currentPage.isClosed()){await currentPage.screenshot({path:`${out}/failure.png`});await writeFile(`${out}/failure.html`,await currentPage.content());}
 throw error;
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
