import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {initialState} from '../../src/services/storage.js';
import {activateStory55} from '../../src/services/story55/runtime.js';
import {seedD04Contracts,acceptD04Contract,tickD04Contracts} from '../../src/story/d04/contract.js';

const base=process.env.MIRAGE_QA_URL||'http://127.0.0.1:5173/';
const storeKey='ximeng-phone-story55-v1';
const output='mirage-70-browser-results';
mkdirSync(output,{recursive:true});
const newGame=()=>{
 const s=initialState();activateStory55(s);s.story55.minutesPerSecond=0;
 s.day=21;s.clock='19:00';s.unlocked=true;
 seedD04Contracts(s);
 return s;
};
function scenario(kind){
 const s=newGame();
 if(kind==='empty'){
  s.nav.current={appId:'mirage',route:'/',params:{}};
  return s;
 }
 if(kind==='error'){
  s.nav.current={appId:'mirage',route:'/chat/unknown-identity',params:{}};
  return s;
 }
 assert.equal(acceptD04Contract(s,'M-016'),true);
 assert.equal(acceptD04Contract(s,'M-017'),true);
 if(kind==='failed'){
  s.day=27;s.clock='12:00';
  tickD04Contracts(s);
  assert.equal(s.content.orders.find(x=>x.id==='M-016').status,'EXPIRED');
 }
 s.nav.current={appId:'mirage',route:kind==='desktop'?'/':'/chat/mc-employer-rancor',params:{}};
 return s;
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
async function open(state,{width,height}){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<=430,hasTouch:width<=430});
 await context.addInitScript(({key,value})=>{localStorage.setItem(key,value);},{key:storeKey,value:JSON.stringify(state)});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('[data-action="unlock"]').click();
 for(const digit of '0816')await page.locator('[data-action="passcode-key"][data-key="'+digit+'"]').click();
 await page.waitForFunction(()=>!document.querySelector('#phone')?.classList.contains('show-passcode'));
 await page.locator('form[data-form="mc-login"] button[type="submit"]').click();
 await page.waitForTimeout(1200);
 const banner=page.locator('#toast.visible');
 if(await banner.count())await banner.waitFor({state:'hidden',timeout:8000});
 return {page,context};
}
try{
 const mobile=await open(scenario('mobile'),{width:390,height:844});
 await mobile.page.locator('.mc-channel').waitFor();
 await mobile.page.locator('[data-action="mc-decrypt"]').click();
 await mobile.page.locator('.mc-clear-messages').waitFor();
 const dividers=await mobile.page.locator('.mc-clear-messages .mc-session-divider').allTextContents();
 assert.equal(dividers.filter(x=>x.includes('NEW CONTACT')).length,1);
 assert.ok((await mobile.page.locator('.mc-clear-messages').innerText()).includes('NYARLATHOTEP'));
 await mobile.page.screenshot({path:output+'/mobile-new-contact.png',fullPage:true});
 await mobile.context.close();

 const desktop=await open(scenario('desktop'),{width:1280,height:900});
 await desktop.page.locator('.mc-online-list').waitFor();
 assert.equal(await desktop.page.locator('.mc-contact').count()>0,true);
 assert.equal(await desktop.page.locator('#screen-layer .mc-contact [data-action="mc-chat"][data-id="mc-employer-rancor"]').count(),1);
 assert.equal(await desktop.page.locator('#screen-layer .mc-contact [data-action="mc-chat"][data-id="mc-employer-ledger_8"]').count(),1);
 await desktop.page.screenshot({path:output+'/desktop-contacts.png',fullPage:true});
 await desktop.context.close();

 const empty=await open(scenario('empty'),{width:390,height:844});
 await empty.page.locator('.mc-online-list').waitFor();
 assert.equal(await empty.page.locator('#screen-layer .mc-contact [data-id="mc-employer-rancor"]').count(),0,'employer not yet contacted');
 await empty.page.screenshot({path:output+'/mobile-before-first-order.png',fullPage:true});
 await empty.context.close();

 const failed=await open(scenario('failed'),{width:390,height:844});
 await failed.page.locator('.mc-channel').waitFor();
 await failed.page.locator('[data-action="mc-decrypt"]').click();
 assert.ok((await failed.page.locator('.mc-clear-messages').innerText()).includes('時間到了'));
 assert.equal(await failed.page.locator('.mc-clear-messages .mc-session-divider').filter({hasText:'NEW CONTACT'}).count(),1);
 await failed.page.screenshot({path:output+'/mobile-expired-order.png',fullPage:true});
 await failed.context.close();

 const error=await open(scenario('error'),{width:390,height:844});
 await error.page.getByText('CHANNEL NOT FOUND',{exact:true}).waitFor();
 await error.page.screenshot({path:output+'/mobile-invalid-contact.png',fullPage:true});
 await error.context.close();

 assert.deepEqual(errors,[],'uncaught browser exceptions');
 console.log('PASS MIRAGE 70 owners: mobile contact, desktop directory, before-acceptance, expired, invalid contact UI');
}finally{await browser.close();}
