import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {prepareStory55NodeAtDay} from '../src/services/story55/rebuild.js';
import {savePersonalFiles} from '../src/apps/files/features/local-library/index.js';
import {ensureAgent} from '../src/apps/ghost/deployment/tear-agent/state.js';
const out='qa/room404';await mkdir(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4','.wasm':'application/wasm'};
const root=path.resolve('dist');
const server=createServer(async(req,res)=>{try{let route=new URL(req.url,'http://localhost').pathname.replace(/^\/BBBTAI(?=\/)/,'');if(route.endsWith('/'))route+='index.html';const file=path.resolve(root,'.'+route);if(!file.startsWith(root+path.sep))throw Error('path');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end('not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});const results=[];
const decode=page=>page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
const stableMedia=locator=>locator.evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0&&!new URL(i.src).pathname.includes('/releases/')));
const checkProfileTypography=async page=>{
 const layout=await page.locator('.r404-profile').evaluate(profile=>{
  const get=selector=>profile.querySelector(selector),rect=selector=>get(selector).getBoundingClientRect();
  const title=get('h1'),heading=rect('h1'),avatar=rect('.r404-avatar-large'),name=rect('.r404-display-name'),stats=rect('.r404-stats'),controls=rect('.r404-controls'),frame=profile.getBoundingClientRect();
  return {handle:title.textContent,weight:Number(getComputedStyle(title).fontWeight),size:parseFloat(getComputedStyle(title).fontSize),centered:Math.abs((heading.left+heading.right-frame.left-frame.right)/2)<2,summaryAligned:name.left>=avatar.right&&Math.abs(name.left-stats.left)<2&&stats.top>=name.bottom,controlsBelow:controls.top>=Math.max(avatar.bottom,stats.bottom),labelsFit:[...get('.r404-stats').children].every(el=>el.scrollWidth<=el.clientWidth),nameFits:title.scrollWidth<=title.clientWidth};
 });
 assert.equal(layout.handle,'room.404');assert.equal(layout.size,18);assert.ok(layout.weight>=700,JSON.stringify(layout));for(const key of ['centered','summaryAligned','controlsBelow','labelsFit','nameFits'])assert.equal(layout[key],true,key+': '+JSON.stringify(layout));
 assert.equal(await page.locator('.r404').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(14, 17, 22)');
 assert.equal(await page.locator('.r404-wordmark').evaluate(el=>el.complete&&el.naturalWidth>0),true,'existing Instagram logo is retained');
};
// This visual check serves repository assets locally and makes no external
// requests: abort all network destinations except its own local HTTP server.
const newContext=async options=>{const c=await browser.newContext(options);await c.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());return c;};
try{
 for(const width of [320,390,430]){
  const context=await newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/BBBTAI/apps/browser/room404/index.html');await page.locator('.r404-grid img').first().waitFor();await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await decode(page);await page.screenshot({path:`${out}/preview-${width}.png`,fullPage:true});
  assert.equal(await page.locator('.r404-grid>button').count(),7);
  await checkProfileTypography(page);
  assert.equal(await stableMedia(page.locator('.r404 img')),true,'IG image URLs must survive release rotation');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('[data-action=browser-ig-post][data-post=afterparty]').click();assert.match(await page.locator('.r404-post-copy').innerText(),/Afterparty. The undisputed champion./);
  assert.equal(await page.locator('.r404-postnav small').textContent(),'room.404');
  await decode(page);await page.screenshot({path:`${out}/post-${width}.png`,fullPage:true});
  await page.locator('[data-action=browser-ig-zoom]').click();await page.locator('.r404-lightbox img').evaluate(i=>i.decode());assert.equal(await page.locator('.r404-lightbox').count(),1);await decode(page);await page.screenshot({path:`${out}/zoom-${width}.png`});
  await page.locator('[data-action=browser-ig-close]').click();await page.locator('[data-action=browser-ig-comments]').first().click();assert.match(await page.locator('.r404-sheet').innerText(),/尚無留言/);await decode(page);await page.screenshot({path:`${out}/comments-${width}.png`});
  await page.locator('.r404-sheet [data-action=browser-ig-close]').click();await page.locator('.r404-postnav [data-action=browser-ig-profile]').click();
  await page.locator('[data-action=browser-ig-tagged]').click();await page.reload();assert.match(await page.locator('.r404-empty').innerText(),/尚無標註/);await page.locator('[data-action=browser-ig-grid]').click();
  assert.deepEqual(errors,[]);results.push({width,preview:'pass',images:'8 decoded',post:'pass',zoom:'pass',comments:'pass',taggedReload:'pass',overflow:false});await context.close();
 }
 const s=activateStory55(initialState());prepareStory55NodeAtDay(s,'ig');s.unlocked=true;s.clock='10:00';s.story55.minutesPerSecond=0;s.story55.activeScene=null;s.content.alarms=[];s.nav.current={appId:'browser',route:'/story55',params:{page:'ig'}};
 const context=await newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.addInitScript(state=>{if(!localStorage.getItem('ximeng-phone-story55-v1'))localStorage.setItem('ximeng-phone-story55-v1',JSON.stringify(state));},s);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/BBBTAI/');await page.locator('#xm-boot-next').click({timeout:45000});await page.locator('#xm-boot').waitFor({state:'detached',timeout:45000});
 await page.locator('[data-action=unlock]').click();for(const digit of '0816')await page.locator(`[data-action=passcode-key][data-key="${digit}"]`).click();
 const live=page.locator('#screen-layer');await live.locator('.r404-grid').waitFor();await page.waitForTimeout(450);await decode(page);await page.screenshot({path:`${out}/phone-profile.png`});
 await checkProfileTypography(page);
 assert.equal(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')).story55.completed.ig),false);
 await live.locator('[data-action=browser-ig-post][data-post=selfie]').click();await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')).story55.completed.ig),true);await decode(page);await page.screenshot({path:`${out}/phone-selfie.png`});
 await live.locator('[data-action=browser-ig-zoom]').click();await page.waitForTimeout(400);await decode(page);await page.screenshot({path:`${out}/phone-zoom.png`});await live.locator('[data-action=browser-ig-close]').click();
 await live.locator('.r404-postnav [data-action=browser-ig-profile]').click();await page.waitForTimeout(350);
 await live.locator('.saf-content').evaluate(el=>el.scrollTop=280);const before=await live.locator('.saf-content').evaluate(el=>el.scrollTop);await page.waitForTimeout(1600);const after=await live.locator('.saf-content').evaluate(el=>el.scrollTop);assert.equal(after,before,'clock refresh retains nested scroll');
 await live.locator('[data-action=browser-ig-post][data-post=autumn]').click();await page.waitForTimeout(350);await live.locator('.r404-postnav [data-action=browser-ig-profile]').click();await page.waitForTimeout(350);const returned=await live.locator('.saf-content').evaluate(el=>el.scrollTop);assert.equal(returned,before,'returning to grid retains scroll');
 await decode(page);await page.screenshot({path:`${out}/phone-return.png`});results.push({phone:'pass',legacyEntry:'pass',photoEvidence:'pass',refreshScroll:{before,after,returned},errors});
 assert.deepEqual(errors,[]);await context.close();
 // Open the actual Files app on a D33 archive-save fixture and click through
 // each photo; screenshots and decode prove that the published paths work.
 ensureAgent(s).archiveRun={startedAt:Date.now()-3200,done:true};assert.ok(savePersonalFiles(s));
 s.nav.current={appId:'files',route:'/item/personal-files',params:{}};
 const filesContext=await newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await filesContext.addInitScript(state=>{if(!localStorage.getItem('ximeng-phone-story55-v1'))localStorage.setItem('ximeng-phone-story55-v1',JSON.stringify(state));},s);
 const filesPage=await filesContext.newPage();await filesPage.goto(base+'/BBBTAI/');
 await filesPage.locator('#xm-boot-next').click({timeout:45000});await filesPage.locator('#xm-boot').waitFor({state:'detached',timeout:45000});
 await filesPage.locator('[data-action=unlock]').click();for(const digit of '0816')await filesPage.locator(`[data-action=passcode-key][data-key="${digit}"]`).click();
 await filesPage.locator('[data-route="/item/personal-files/photos"]').click();await filesPage.locator('.fl-personal-thumb').first().waitFor();
 await filesPage.locator('.fl-personal-thumb').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 assert.equal(await filesPage.locator('.fl-personal-thumb').count(),5);
 assert.equal(await stableMedia(filesPage.locator('.fl-personal-thumb')),true);
 await filesPage.screenshot({path:`${out}/files-photos.png`});
 for(const filename of ['IMG_4982.jpg','IMG_4985.jpg','IMG_4986.jpg','IMG_4989.jpg','Student_ID.jpg']){
  await filesPage.locator(`[data-route="/item/personal-files/photos/${filename}"]`).click();
  await filesPage.locator('.fl-personal-photo').evaluate(i=>i.decode());
  assert.equal(await stableMedia(filesPage.locator('.fl-personal-photo')),true,filename);
  if(filename==='IMG_4982.jpg')await filesPage.screenshot({path:`${out}/files-photo.png`});
  await filesPage.locator('.fl-nav [data-action=files-local-nav]').click();
 }
 await filesContext.close();results.push({files:'pass',thumbnails:5,fullPhotos:5,stableUrls:true});
 await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
