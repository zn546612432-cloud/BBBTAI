// Isolated phone saves; the camera uses Chromium's synthetic media device.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';

const root=path.resolve('dist'),out='qa/mobile-app-polish',key='ximeng-phone-story55-v1';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp4':'video/mp4','.webm':'video/webm','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{try{
 let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/BBBTAI(?=\/)/,'');
 if(route.endsWith('/'))route+='index.html';
 const file=path.resolve(root,'.'+route);if(!file.startsWith(root+path.sep))throw Error('path');
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(await readFile(file));
}catch{res.writeHead(404).end('not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
await mkdir(out,{recursive:true});
const results=[];
let page;
async function open(width,appId){
 const state=activateStory55(initialState());
 state.day=1;state.clock='08:17';state.batteryPercent=85;state.unlocked=true;state.content.alarms=[];state.story55.minutesPerSecond=0;
 state.nav.current={appId,route:'/',params:{}};state.nav.stack=[];
 const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 await context.addInitScript(({state,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{state,key});
 page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/BBBTAI/',{waitUntil:'domcontentloaded'});
 await page.locator('#xm-boot-next').click({timeout:45000});
 await page.locator('#xm-boot').waitFor({state:'detached'});
 await page.locator('[data-action=unlock]').click();
 for(const digit of '0816')await page.locator(`[data-action=passcode-key][data-key="${digit}"]`).click();
 await page.locator('.app-'+appId).waitFor();
 return {context,errors};
}
try{
 for(const width of [320,390,430]){
  const {context,errors}=await open(width,'camera');
  const camera=page.locator('xm-native-camera');
  await camera.locator('#enable').waitFor();
  await page.screenshot({path:`${out}/${width}-camera-permission.png`});
  // Permission failure is tested before starting the synthetic video stream.
  await page.evaluate(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);window.restoreCamera=()=>navigator.mediaDevices.getUserMedia=original;navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('denied','NotAllowedError'));});
  await camera.locator('#enable').click();
  await camera.getByText('請在瀏覽器設定允許相機權限',{exact:true}).waitFor();
  assert.equal(await camera.locator('#capture').isDisabled(),true);
  await page.evaluate(()=>window.restoreCamera());
  await camera.locator('#enable').click();
  await camera.locator('.preview.live').waitFor();
  await page.waitForFunction(()=>document.querySelector('xm-native-camera')?.video?.videoWidth>0);
  const before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).content.photos.length,key);
  await camera.locator('[data-zoom="2"]').click();
  await camera.locator('#capture').click();
  await page.waitForFunction(({key,before})=>JSON.parse(localStorage.getItem(key)).content.photos.length===before+1,{key,before});
  const photo=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).content.photos[0],key);
  assert.match(photo.src,/^data:image\/jpeg;base64,/);
  await page.waitForFunction(()=>document.querySelector('xm-native-camera')?.shadowRoot.querySelector('#gallery img')?.naturalWidth>0);
  // The actual shell redraw must preserve the element and the running stream.
  await camera.evaluate(el=>{window.cameraElement=el;window.cameraStream=el.stream;window.cameraTrack=el.stream.getVideoTracks()[0];});
  await page.waitForTimeout(1600);
  assert.equal(await camera.evaluate(el=>el===window.cameraElement&&el.stream===window.cameraStream&&el.stream.active),true);
  await page.screenshot({path:`${out}/${width}-camera-live.png`});
  await camera.locator('#flip').click();
  await camera.locator('.preview.live').waitFor();
  assert.equal(await camera.evaluate(el=>el.facing),'user');
  await camera.locator('#gallery').click();
  await page.locator('.app-photos').waitFor();
  assert.equal(await page.evaluate(()=>window.cameraTrack.readyState),'ended');
  // Captured image survives reload in the same phone save.
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).content.photos[0].src,key),photo.src);
  assert.deepEqual(errors,[]);results.push({width,camera:'permission refusal, capture, zoom, flip, stream cleanup, persistence passed'});
  await context.close();

  const files=await open(width,'files');
  await page.getByRole('heading',{name:'瀏覽',exact:true}).waitFor();
  await page.screenshot({path:`${out}/${width}-files-browse.png`});
  await page.locator('[data-action=files-local-nav][data-route="/iphone"]').click();
  await page.locator('[data-action=files-local-nav][data-route="/folder/downloads"]').click();
  await page.locator('.fl-nav strong').filter({hasText:'已下載'}).waitFor();
  await page.locator('.fl-tabs [data-route="/recent"]').click();
  await page.getByRole('heading',{name:'最近使用',exact:true}).waitFor();
  await page.screenshot({path:`${out}/${width}-files-recent.png`});
  assert.equal(await page.locator('.fl-browser').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
  assert.deepEqual(files.errors,[]);results.push({width,files:'browse, downloads, recent navigation passed'});
  await files.context.close();
 }
 const mirage=await open(390,'mirage');
 await page.locator('form[data-form="mc-login"] button[type=submit]').click();
 await page.locator('[data-action=mc-tab][data-route="/bounties"]').click();
 await page.locator('[data-action=mc-contract-board]').waitFor();
 assert.equal(await page.locator('[data-action=mc-open-bounty]').count(),0);
 await page.screenshot({path:`${out}/390-mirage-orders.png`});
 await page.locator('[data-action=mc-contract-board]').click();
 await page.locator('[data-action=mc-open-bounty]').first().waitFor();
 await page.screenshot({path:`${out}/390-mirage-hall.png`});
 await page.locator('[data-action=mc-open-bounty]').first().click();
 await page.locator('[data-action=mc-accept-bounty], [data-action=mc-open-d01-mail]').first().waitFor();
 assert.deepEqual(mirage.errors,[]);results.push({mirage:'new hall, contract list and detail navigation passed'});
 await mirage.context.close();
 await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:`${out}/failure.png`});throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
