import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const output='qa/control-center';await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['server/dev.mjs'],{env:{...process.env,PORT:'5173'},stdio:'inherit'});
let browser;
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5173')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173');await page.waitForSelector('.status-control-trigger');
 // The intro can be skipped by its real "continue" button once ready, or ends itself.
 await page.locator('#xm-boot-next').waitFor({state:'visible',timeout:45000});await page.locator('#xm-boot-next').click();await page.locator('#xm-boot').waitFor({state:'detached'});
 const cdp=await context.newCDPSession(page);
 const swipe=async(x,y,endX,endY)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(endX-x)*i/12,y:y+(endY-y)*i/12}]});}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(550);};
 await swipe(370,32,360,260);assert.equal(await page.locator('#phone').evaluate(el=>el.classList.contains('control-center-open')),true);
 await page.getByRole('button',{name:'一鍵靜音',exact:true}).first().tap();assert.equal(await page.locator('.cc-mute').getAttribute('aria-pressed'),'true');
 const result=await page.evaluate(async()=>{const {registerAudio,audioDestination}=await import('/src/system/audio/index.js');const a=registerAudio(new Audio('/assets/night.wav'));const c=new AudioContext();window.ccTest={a,c,g:audioDestination(c)};return {volume:a.volume,gain:window.ccTest.g.gain.value};});assert.deepEqual(result,{volume:0,gain:0});
 for(const width of [320,390,430]){await page.setViewportSize({width,height:width===320?640:width===390?844:932});await page.waitForTimeout(300);const box=await page.locator('.cc-grid').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y+box.height<(width===320?640:width===390?844:932));await page.screenshot({path:`${output}/control-center-${width}.png`});}
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'取消靜音',exact:true}).first().tap();assert.equal(await page.evaluate(()=>window.ccTest.a.volume),.7);assert.ok(Math.abs(await page.evaluate(()=>window.ccTest.g.gain.value)-.7)<.00001);
 await page.locator('[data-cc-slider="volume"]').evaluate(el=>{el.value='35';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.evaluate(()=>window.ccTest.a.volume),.35);
 await page.getByRole('button',{name:'一鍵靜音',exact:true}).first().tap();
 await page.reload();await page.waitForSelector('.status-control-trigger');await page.locator('#xm-boot-next').waitFor({state:'visible',timeout:45000});await page.locator('#xm-boot-next').click();await page.locator('#xm-boot').waitFor({state:'detached'});
 await page.locator('.status-control-trigger').tap();assert.equal(await page.locator('.cc-mute').getAttribute('aria-pressed'),'true');
 await page.locator('.cc-dismiss').tap();assert.equal(await page.locator('#phone').evaluate(el=>el.classList.contains('control-center-open')),false);await page.locator('.status-control-trigger').tap();
 await swipe(190,700,190,530);assert.equal(await page.locator('#phone').evaluate(el=>el.classList.contains('control-center-open')),false);
 await swipe(35,30,35,240);assert.equal(await page.locator('#shade-layer').evaluate(el=>el.classList.contains('is-present')),true);
 assert.deepEqual(errors,[]);await writeFile(`${output}/result.json`,JSON.stringify({passed:true,viewports:[320,390,430],checks:['touch swipe open','one tap mute','active and new media/WebAudio','restore volume','slider','refresh persistence','upward close','left notifications'],errors},null,2));
 console.log('Control center mobile checks passed');
}finally{await browser?.close();server.kill();}
