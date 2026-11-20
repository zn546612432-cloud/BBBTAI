// Cold browser cache, real Pages output and deliberately delayed image responses.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
const out='qa/startup-images',root=path.resolve('dist');
await mkdir(out,{recursive:true});
const release=JSON.parse(await readFile(root+'/release.json','utf8'));
const current='/BBBTAI/apps/wechat/media/macau-morning.webp';
const requests=[];
let releaseCurrent,releaseFuture,currentSeen,futureSeen;
const currentGate=new Promise(resolve=>releaseCurrent=resolve),futureGate=new Promise(resolve=>releaseFuture=resolve);
const currentRequest=new Promise(resolve=>currentSeen=resolve),futureRequest=new Promise(resolve=>futureSeen=resolve);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpeg':'image/jpeg','.jpg':'image/jpeg','.mp4':'video/mp4','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');requests.push(url.pathname);
 if(url.pathname===current){currentSeen();await currentGate;}
 if(url.pathname.includes('/assets/story55/personal-files/')){futureSeen();await futureGate;}
 let route=decodeURIComponent(url.pathname).replace(/^\/BBBTAI(?=\/)/,'');if(route.endsWith('/'))route+='index.html';
 const file=path.resolve(root,'.'+route);if(!file.startsWith(root+path.sep))throw Error('path');
 const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':body.length,'Cache-Control':'public, max-age=3600'}).end(body);
}catch{res.writeHead(404).end('not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const state=activateStory55(initialState());state.clock='08:17';state.story55.minutesPerSecond=0;state.content.alarms=[];
state.nav.current={appId:'wechat',route:'/moments',params:{}};
await context.addInitScript(state=>localStorage.setItem('ximeng-phone-story55-v1',JSON.stringify(state)),state);
const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
const pngRequests=[],badResponses=[];
page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)badResponses.push(response.url());});
page.on('request',request=>{if(/\/icons\/glass-(?:atlas|utilities)\.png/.test(request.url()))pngRequests.push(request.url());});
try{
 await page.goto(base+'/BBBTAI/',{waitUntil:'domcontentloaded'});
 await Promise.race([currentRequest,new Promise((_,reject)=>setTimeout(()=>reject(Error('current photo was not preloaded')),15000))]);
 assert.equal(await page.locator('#xm-boot-next').isVisible(),false,'do not enter while a visible photo is still pending');
 assert.notEqual(await page.locator('#xm-boot-percent').textContent(),'100%');
 const start=performance.now();releaseCurrent();
 await page.locator('#xm-boot-next').waitFor({state:'visible',timeout:10000});
 const foregroundReadyMs=Math.round(performance.now()-start);
 await Promise.race([futureRequest,new Promise((_,reject)=>setTimeout(()=>reject(Error('background queue did not start')),10000))]);
 assert.equal(await page.locator('#xm-boot-next').isVisible(),true,'a delayed future-day image must not block entry');
 const countBefore=requests.filter(url=>url===current).length;
 await page.locator('#xm-boot-next').click();
 await page.locator('#xm-boot').waitFor({state:'detached'});
 await page.locator('[data-action=unlock]').click();
 for(const digit of '0816')await page.locator(`[data-action=passcode-key][data-key="${digit}"]`).click();
 await page.locator('.wx-moments-screen').waitFor();
 await page.waitForFunction(()=>[...document.querySelectorAll('.wx-moments-screen img')].every(img=>img.complete&&img.naturalWidth>0));
 assert.equal(requests.filter(url=>url===current).length,countBefore,'opening Moments reuses the image fetched during boot');
 const imageSources=await page.locator('.wx-moments-screen img').evaluateAll(images=>images.map(img=>img.src));
 assert.ok(imageSources.every(url=>!url.includes('/releases/')||!url.includes('/apps/wechat/media/')));
 assert.deepEqual(pngRequests,[],'preload and icons must both request the optimized WebP atlas');
 assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);
 await page.locator('.wx-moments-screen img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const visiblePhoto=await page.locator('.wx-moments-photo img').first().evaluate(img=>{
  const rect=img.getBoundingClientRect(),style=getComputedStyle(img);
  return {width:rect.width,height:rect.height,visibility:style.visibility,opacity:style.opacity,display:style.display,src:img.src};
 });
 assert.ok(visiblePhoto.width>100&&visiblePhoto.height>100,JSON.stringify(visiblePhoto));
 assert.equal(visiblePhoto.visibility,'visible');assert.equal(visiblePhoto.opacity,'1');
 await page.screenshot({path:out+'/390-moments-ready.png'});
 await writeFile(out+'/results.json',JSON.stringify({release:release.version,foregroundReadyMs,currentPhotoRequests:countBefore,images:imageSources.length,visiblePhoto,delayedFutureImage:'did not block entry',optimizedAtlases:'no original PNG requests'},null,2));
 console.log('PASS cold-cache readiness, decoded images, shared image URLs and background priority',foregroundReadyMs+'ms');
}catch(error){await page.screenshot({path:out+'/failure.png'});throw error;}
finally{releaseCurrent();releaseFuture();await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
