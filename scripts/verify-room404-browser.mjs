import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {prepareStory55NodeAtDay} from '../src/services/story55/rebuild.js';
const out='qa/room404';await mkdir(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4','.wasm':'application/wasm'};
const root=path.resolve('dist');
const server=createServer(async(req,res)=>{try{let route=new URL(req.url,'http://localhost').pathname.replace(/^\/BBBTAI(?=\/)/,'');if(route.endsWith('/'))route+='index.html';const file=path.resolve(root,'.'+route);if(!file.startsWith(root+path.sep))throw Error('path');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end('not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});const results=[];
// This visual check serves repository assets locally and makes no external
// requests: abort all network destinations except its own local HTTP server.
const newContext=async options=>{const c=await browser.newContext(options);await c.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());return c;};
try{
 for(const width of [320,390,430]){
  const context=await newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/BBBTAI/apps/browser/room404/index.html');await page.locator('.r404-grid img').first().waitFor();await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await page.screenshot({path:`${out}/preview-${width}.png`,fullPage:true});
  assert.equal(await page.locator('.r404-grid>button').count(),7);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('[data-action=browser-ig-post][data-post=afterparty]').click();assert.match(await page.locator('.r404-post-copy').innerText(),/Afterparty. The undisputed champion./);
  await page.screenshot({path:`${out}/post-${width}.png`,fullPage:true});
  await page.locator('[data-action=browser-ig-zoom]').click();await page.locator('.r404-lightbox img').evaluate(i=>i.decode());assert.equal(await page.locator('.r404-lightbox').count(),1);await page.screenshot({path:`${out}/zoom-${width}.png`});
  await page.locator('[data-action=browser-ig-close]').click();await page.locator('[data-action=browser-ig-comments]').first().click();assert.match(await page.locator('.r404-sheet').innerText(),/尚無留言/);await page.screenshot({path:`${out}/comments-${width}.png`});
  await page.locator('.r404-sheet [data-action=browser-ig-close]').click();await page.locator('.r404-postnav [data-action=browser-ig-profile]').click();
  await page.locator('[data-action=browser-ig-tagged]').click();await page.reload();assert.match(await page.locator('.r404-empty').innerText(),/尚無標註/);await page.locator('[data-action=browser-ig-grid]').click();
  assert.deepEqual(errors,[]);results.push({width,preview:'pass',images:'8 decoded',post:'pass',zoom:'pass',comments:'pass',taggedReload:'pass',overflow:false});await context.close();
 }
 const s=activateStory55(initialState());prepareStory55NodeAtDay(s,'ig');s.unlocked=true;s.clock='10:00';s.story55.minutesPerSecond=0;s.story55.activeScene=null;s.content.alarms=[];s.nav.current={appId:'browser',route:'/story55',params:{page:'ig'}};
 const context=await newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.addInitScript(state=>{if(!localStorage.getItem('ximeng-phone-story55-v1'))localStorage.setItem('ximeng-phone-story55-v1',JSON.stringify(state));},s);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/BBBTAI/');await page.locator('#xm-boot-next').click({timeout:45000});await page.locator('#xm-boot').waitFor({state:'detached',timeout:45000});
 await page.locator('[data-action=unlock]').click();for(const digit of '0816')await page.locator(`[data-action=passcode-key][data-key="${digit}"]`).click();
 const live=page.locator('#screen-layer');await live.locator('.r404-grid').waitFor();await page.waitForTimeout(450);await page.screenshot({path:`${out}/phone-profile.png`});
 assert.equal(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')).story55.completed.ig),false);
 await live.locator('[data-action=browser-ig-post][data-post=selfie]').click();await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')).story55.completed.ig),true);await page.screenshot({path:`${out}/phone-selfie.png`});
 await live.locator('[data-action=browser-ig-zoom]').click();await page.waitForTimeout(400);await page.screenshot({path:`${out}/phone-zoom.png`});await live.locator('[data-action=browser-ig-close]').click();
 await live.locator('.r404-postnav [data-action=browser-ig-profile]').click();await page.waitForTimeout(350);
 await live.locator('.saf-content').evaluate(el=>el.scrollTop=280);const before=await live.locator('.saf-content').evaluate(el=>el.scrollTop);await page.waitForTimeout(1600);const after=await live.locator('.saf-content').evaluate(el=>el.scrollTop);assert.equal(after,before,'clock refresh retains nested scroll');
 await live.locator('[data-action=browser-ig-post][data-post=autumn]').click();await page.waitForTimeout(350);await live.locator('.r404-postnav [data-action=browser-ig-profile]').click();await page.waitForTimeout(350);const returned=await live.locator('.saf-content').evaluate(el=>el.scrollTop);assert.equal(returned,before,'returning to grid retains scroll');
 await page.screenshot({path:`${out}/phone-return.png`});results.push({phone:'pass',legacyEntry:'pass',photoEvidence:'pass',refreshScroll:{before,after,returned},errors});
 assert.deepEqual(errors,[]);await context.close();await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
