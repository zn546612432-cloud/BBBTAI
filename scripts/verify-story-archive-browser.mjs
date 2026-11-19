// Run after build:pages; exercise the native Files → TAI route and reload.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {story55Config,projectById} from '../src/services/story55/state.js';
import {syncGhostCarProgress} from '../src/services/story55/ghost-car.js';
import {syncTearReminders} from '../src/apps/ghost/deployment/reminders.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('dist'),out='qa/story-archives';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpeg':'image/jpeg','.jpg':'image/jpeg','.mp4':'video/mp4','.mp3':'audio/mpeg','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{try{
 let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/BBBTAI(?=\/)/,'');if(route.endsWith('/'))route+='index.html';
 const target=path.resolve(root,'.'+route);if(!target.startsWith(root+path.sep))throw Error('path');
 res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'}).end(await readFile(target));
}catch{res.writeHead(404).end('not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
await mkdir(out,{recursive:true});
function seed(personal){
 const s=activateStory55(initialState());s.day=35;s.clock='14:00';s.unlocked=true;s.content.alarms=[];
 for(const n of story55Config(s).nodes)if(n.day<=28)s.story55.completed[n.id]={day:n.day,clock:'09:00'};
 s.story55.projects.base={authorized:true,batches:Array.from({length:projectById(s,'base').batches},()=>({complete:true})),active:null};
 s.story55.baseUpgradeRevision=2;s.story55.minutesPerSecond=0;s.story55.activeScene=null;s.story55.d01={bankClaimed:true,rewardPaid:true};
 if(personal){s.story55.completed.questions={day:33,clock:'09:00'};s.story55.completed['photo-decrypt']={day:33,clock:'09:30'};s.story55.completed.photo={day:33,clock:'10:00'};s.content.localFiles=[{id:'personal-files',name:'Personal Files',kind:'personal-folder',folder:'downloads',unlocked:true}];}
 s.nav.current={appId:'files',route:personal?'/item/personal-files/tai':'/folder/documents',params:{}};return s;
}
async function unlock(page){
 const boot=page.locator('#xm-boot-next');if(await boot.count()){await boot.click({timeout:45000});await page.locator('#xm-boot').waitFor({state:'detached',timeout:45000});}
 await page.locator('[data-action=unlock]').click({timeout:45000});for(const digit of '0816')await page.locator(`[data-action=passcode-key][data-key="${digit}"]`).click();
 await page.locator('#phone:not(.is-locked) .app-view').waitFor({timeout:10000});
}
try{
 for(const [width,personal,id,expected] of (process.env.GHOST_CAR_ONLY?[]:[[390,false,'story-archive-ghost-car-plan','行動目標'],[375,true,'story-archive-intake','陳熙泰']])){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});await context.addInitScript(state=>{if(!localStorage.getItem('ximeng-phone-story55-v1'))localStorage.setItem('ximeng-phone-story55-v1',JSON.stringify(state));},seed(personal));
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/BBBTAI/`,{waitUntil:'domcontentloaded'});await unlock(page);
  const live=page.locator('#screen-layer');await live.locator(`[data-action=files-local-item][data-id="${id}"]`).click();
  assert.match(await live.innerText(),/無法預覽此檔案/);assert.ok(!(await live.innerText()).includes(expected));await page.screenshot({path:`${out}/${width}-file.png`});
  await live.locator('[data-action=files-local-share-archive]').click();await live.locator('.gh-agent-screen').waitFor();await live.locator('[data-action=gh-tear-document-read]').waitFor({timeout:15000});
  await live.locator('[data-action=gh-tear-document-read]').click();await live.locator('.gh-agent-document-body').waitFor();assert.ok((await live.locator('.gh-agent-document-body').innerText()).includes(expected));
  await page.screenshot({path:`${out}/${width}-result.png`});
  const reader=live.locator('.gh-agent-document-body');if(!personal){const scroll=await reader.evaluate(el=>{el.scrollTop=500;return {top:el.scrollTop,overflow:el.scrollHeight>el.clientHeight};});assert.ok(scroll.overflow&&scroll.top>0);await page.waitForTimeout(700);assert.equal(await reader.evaluate(el=>el.scrollTop),scroll.top);}
  await live.locator('.gh-agent-document [data-action=gh-tear-task-close]').click();await live.locator(`[data-action=gh-tear-task][data-id="${id}"]`).click();await live.locator('.gh-agent-task-detail [data-action=gh-tear-document-read]').click();assert.ok((await live.locator('.gh-agent-document-body').innerText()).includes(expected));
  assert.deepEqual(errors,[]);console.log('PASS archive browser',width,id);await context.close();
 }
 {
  const s=seed(false);s.day=40;s.homePage=1;s.story55.noappInstalled=true;
  for(const id of ['plan','recognition'])s.story55.completed[id]={day:id==='plan'?29:38,clock:'20:00'};
  s.nav.current={appId:'noapp',route:'/chat/tai',params:{}};
  syncGhostCarProgress(s);syncTearReminders(s);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(state=>{if(!localStorage.getItem('ximeng-phone-story55-v1'))localStorage.setItem('ximeng-phone-story55-v1',JSON.stringify(state));},s);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/BBBTAI/`,{waitUntil:'domcontentloaded'});await unlock(page);
  const live=page.locator('#screen-layer');
  await live.locator('[data-action=tai-story-archive]').first().waitFor();
  const goHome=async()=>{await page.locator('#homebar').click();await live.locator('.home-screen').waitFor();};
  await goHome();
  await live.locator('[data-app=schedule]').click();
  await live.locator('.diary-empty').waitFor();
  await live.locator('[data-action=diary-archive]').first().click();
  for(let day=35;day<=39;day++)await live.locator(`[data-action=diary-open-day][data-day="${day}"]`).waitFor();
  assert.equal(await live.locator('[data-action=diary-open-day][data-day="40"]').count(),0);
  await live.locator('[data-action=diary-open-day][data-day="39"]').click();
  assert.match(await live.locator('.diary-prose').innerText(),/收到陳熙泰交付的資產了。/);
  await page.screenshot({path:`${out}/390-journal-d39.png`});
  await goHome();
  await live.locator('[data-action=page][data-page="2"]').click();
  await live.locator('[data-app=noapp]').click();
  const incoming=live.locator('[data-action=tai-story-archive][data-id=story-archive-digital-human]');
  if(!await incoming.count())await live.locator('[data-action=chat-open][data-id=tai], [data-action=open-chat][data-id=tai]').first().click();
  await incoming.click();
  const share=async()=>{await live.locator('[data-action=files-local-share-archive]').click();await live.locator('[data-action=gh-tear-document-read]').waitFor({timeout:15000});await goHome();};
  await share();
  await live.locator('[data-action=page][data-page="1"]').click();
  await live.locator('[data-action=home-reminder-project]').click();
  await live.locator('[aria-valuenow="80"]').waitFor();await page.screenshot({path:`${out}/390-project-80.png`});
  await live.locator('[data-action=reminder-project-file][data-id=story-archive-digital-vehicle]').click();
  await share();
  await live.locator('.reminder-widget-title').click();
  await live.locator('[data-action=reminder-project-open]').click();
  await live.locator('[aria-valuenow="100"]').waitFor();await page.screenshot({path:`${out}/390-project-100.png`});
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')));
  assert.ok(saved.story55.completed.prep);assert.ok(saved.content.reminders.find(r=>r.id==='ghost-car-plan').done);assert.deepEqual(errors,[]);
  await goHome();
  await live.locator('[data-app=schedule]').click();
  await live.locator('.diary-prose').waitFor();assert.match(await live.locator('.diary-prose').innerText(),/所有的準備工作都已經完成了。/);
  await page.screenshot({path:`${out}/390-journal-d40.png`});
  console.log('PASS ghost car model delivery and reminder progress 390');await context.close();
 }
}finally{await browser.close();server.close();}
