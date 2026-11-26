import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {initialState} from './src/services/storage.js';
import {activateStory55} from './src/services/story55/runtime.js';
const key='ximeng-phone-story55-v1',s=activateStory55(initialState());
s.day=2;s.clock='08:00';s.story55.minutesPerSecond=0;s.story55.completed.intro={day:1,clock:'12:00'};s.story55.activeScene=null;s.unlocked=true;
s.nav.current={appId:'wechat',route:'/chat/group',params:{}};s.nav.stack=[{appId:'wechat',route:'/',params:{}}];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key,value:JSON.stringify(s)});
 const page=await context.newPage();page.setDefaultTimeout(20000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 const next=page.locator('#xm-boot-next');await next.waitFor({state:'visible',timeout:45000});await next.click();await page.locator('#xm-boot').waitFor({state:'hidden',timeout:10000});
 await page.locator('[data-action="unlock"]').click();
 for(const digit of '0816')await page.locator('[data-action="passcode-key"][data-key="'+digit+'"]').click();
 await page.locator('.wx-conversation').waitFor();await page.addStyleTag({content:'#toast{visibility:hidden!important;pointer-events:none!important}'});
 const bar=page.locator('#homebar'),span=bar.locator('span');
 assert.equal(await bar.evaluate(el=>getComputedStyle(el).pointerEvents),'auto');
 const input=await page.locator('.wx-composer input').boundingBox(),hit=await bar.boundingBox();
 assert.ok(input.y+input.height<=hit.y,'home target must not overlap chat input');
 await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#homebar span')).opacity)<.01,null,{timeout:6000});
 assert.equal(await bar.evaluate(el=>getComputedStyle(el).pointerEvents),'auto');
 await bar.tap();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')).nav.current.appId==='home');
 await page.locator('[data-action="open-app"][data-app="wechat"]:visible').first().tap();
 await page.locator('.wx-tab[data-tab="discover"]').tap();
 await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#homebar span')).opacity)<.01,null,{timeout:6000});
 const bb=await bar.boundingBox();
 // Actual mobile touch stream at the invisible navigation target.
 const cdp=await context.newCDPSession(page),x=bb.x+bb.width/2,y=bb.y+bb.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*25}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')).nav.current.appId==='home');
 assert.deepEqual(errors,[]);
 console.log('PASS invisible home indicator: composer unobstructed, fade, tap and touch swipe return home');
}finally{await browser.close();}
