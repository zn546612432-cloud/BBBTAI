// Real phone shell, original project state and original GHOST runner.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {startDeploymentStep,completeDeploymentRun} from '../src/services/story55/projects.js';
const root=path.resolve('dist'),out='qa/ghost-deploy-motion';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpeg':'image/jpeg','.jpg':'image/jpeg','.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{try{
 let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/BBBTAI(?=\/)/,'');if(route.endsWith('/'))route+='index.html';
 const target=path.resolve(root,'.'+route);if(!target.startsWith(root+path.sep))throw Error('path');
 const body=await readFile(target),range=String(req.headers.range||'').match(/^bytes=(\d+)-(\d*)$/),type=types[path.extname(target)]||'application/octet-stream';
 if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),body.length-1):body.length-1;res.writeHead(206,{'Content-Type':type,'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${body.length}`,'Content-Length':end-start+1}).end(body.subarray(start,end+1));}
 else res.writeHead(200,{'Content-Type':type,'Accept-Ranges':'bytes','Content-Length':body.length}).end(body);
 }catch{res.writeHead(404).end('not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true}),results=[];
await mkdir(out,{recursive:true});
function seed(count){
 const s=activateStory55(initialState());s.day=30;s.clock='12:00';s.unlocked=true;s.content.alarms=[];s.story55.minutesPerSecond=0;s.story55.activeScene=null;s.story55.hardware=2;
 for(const n of s.story55.config.nodes)if(n.day<=30&&n.id!=='identity')s.story55.completed[n.id]={day:n.day,clock:'09:00'};
 s.story55.projects.identity={authorized:true,batches:[],active:null};
 for(let i=0;i<count;i++){const run=s.ghost.orders[startDeploymentStep(s,'identity')];run.status='success';assert.equal(completeDeploymentRun(s,run),true);}
 s.nav.current={appId:'ghost',route:'/deployment',params:{project:'identity'}};return s;
}
let page;
try{
 for(const width of [320,390,430]){
  const count=width===390?4:2,context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
  await context.addInitScript(state=>{if(!localStorage.getItem('ximeng-phone-story55-v1'))localStorage.setItem('ximeng-phone-story55-v1',JSON.stringify(state));},seed(count));
  page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/BBBTAI/',{waitUntil:'domcontentloaded'});await page.locator('#xm-boot-next').click({timeout:45000});await page.locator('#xm-boot').waitFor({state:'detached',timeout:45000});
  await page.locator('[data-action=unlock]').click();for(const digit of '0816')await page.locator(`[data-action=passcode-key][data-key="${digit}"]`).click();
  const live=page.locator('#screen-layer'),field=live.locator('xm-ghost-deploy-motion');
  await field.waitFor();try{await page.waitForFunction(()=>{const v=document.querySelector('xm-ghost-deploy-motion')?.shadowRoot?.querySelector('video.idle');return v?.readyState>=2&&v.currentTime>.1&&!v.paused;});}catch(error){console.error('Video diagnostic',await field.evaluate(el=>{const v=el.shadowRoot?.querySelector('video.idle');return {defined:!!el.shadowRoot,currentSrc:v?.currentSrc,error:v?.error?.message,ready:v?.readyState,network:v?.networkState,paused:v?.paused,time:v?.currentTime,webm:v?.canPlayType('video/webm; codecs="vp9"'),mp4:v?.canPlayType('video/mp4; codecs="avc1.64001f"')};}),errors);throw error;}
  assert.match(await live.locator('.gh-deploy-progress').innerText(),new RegExp(count+' / 5 已完成'));
  assert.equal(await live.locator('.gh-deploy-steps li.done').count(),count);
  assert.equal(await live.locator('.gh-deploy-screen').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  assert.equal(await live.locator('.gh-deploy-screen').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)');
  assert.equal(await live.locator('.gh-deploy-hero').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)');
  await page.waitForTimeout(350);await page.screenshot({path:`${out}/${width}-idle.png`});
  const t=await field.locator('video.idle').evaluate(v=>v.currentTime);await page.waitForTimeout(250);assert.notEqual(await field.locator('video.idle').evaluate(v=>v.currentTime),t);
  await live.locator('[data-action=s55-run-step]').click();await live.locator('[data-action=gh-start]').click();
  if(count===4){
   const goal=(await live.locator('.gh-target strong').innerText()).split(' · ');
   for(const name of goal)await live.locator('[data-action=gh-verify-token]').filter({hasText:name}).click();
   await live.locator('.gh-report').waitFor();await live.locator('.gh-report [data-action=gh-close]').click();
   await live.locator('.gh-deploy-progress').getByText('5 / 5 已完成').waitFor();
   await page.waitForFunction(()=>document.querySelector('xm-ghost-deploy-motion')?.shadowRoot?.querySelector('video.pulse')?.classList.contains('is-pulsing'));
   await page.waitForTimeout(1500);await page.screenshot({path:`${out}/390-success-pulse.png`});
   await page.waitForFunction(()=>!document.querySelector('xm-ghost-deploy-motion')?.shadowRoot?.querySelector('video.pulse')?.classList.contains('is-pulsing'),{},{timeout:10000});
   await page.screenshot({path:`${out}/390-finished.png`});
   const idle=field.locator('video.idle');
   await page.waitForFunction(()=>{const v=document.querySelector('xm-ghost-deploy-motion')?.shadowRoot?.querySelector('video.idle');return v?.loop&&!v.paused;});
   await idle.evaluate(v=>{v.currentTime=v.duration-.12;});
   await page.waitForFunction(()=>{const v=document.querySelector('xm-ghost-deploy-motion')?.shadowRoot?.querySelector('video.idle');return v?.loop&&!v.paused&&v.currentTime<1.2;});
   await live.locator('[data-action=s55-projects]').click();
   await live.locator('.gh-workspace-flow').waitFor();
   assert.equal(await live.locator('.gh-workspace-flow').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)');
   assert.equal(await live.locator('.gh-workspace-hero').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)');
   await page.screenshot({path:`${out}/390-projects.png`});
   await live.locator('[data-action=gh-flow-home]').click();
   await live.locator('.gh-workspace-home').waitFor();
   await page.waitForFunction(()=>{const v=document.querySelector('xm-ghost-deploy-motion')?.shadowRoot?.querySelector('video.idle');return v?.loop&&!v.paused&&v.currentTime>.1;});
   await page.screenshot({path:`${out}/390-home.png`});
   await live.locator('[data-action=gh-tool][data-tool=verify]').click();
   await live.locator('.gh-workspace-flow').waitFor();
   await page.waitForFunction(()=>{const v=document.querySelector('xm-ghost-deploy-motion')?.shadowRoot?.querySelector('video.idle');return v?.loop&&!v.paused&&v.currentTime>.1;});
   await page.screenshot({path:`${out}/390-deploy-menu.png`});
  }
  assert.deepEqual(errors,[]);results.push({width,idle:'playing',rows:count,run:'clicked',pulse:count===4?'passed':'not applicable'});await context.close();
 }
 await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:`${out}/failure.png`});throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
