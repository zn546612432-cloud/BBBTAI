// Isolated, realistic mobile-viewport smoke test against the published D06 review.
// Only a synthetic phone save is used. The real player's storage is never touched.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {initialState} from '../../src/services/storage.js';
import {activateStory55} from '../../src/services/story55/runtime.js';
import {completeNode} from '../../src/services/story55/state.js';
import {settleStory55Wallet} from '../../src/services/story55/projects.js';

const url=process.env.D06_PREVIEW_URL||
 'https://zn546612432-cloud.github.io/BBBTAI/review/d06-wishes-20261107/';
const key='ximeng-phone-story55-review-d06-wishes-20261107';
const path='d06-mobile-results';
mkdirSync(path,{recursive:true});
const seed=initialState();
activateStory55(seed);
seed.day=6;seed.clock='16:00';seed.batteryPercent=85;
completeNode(seed,'wallet',{test:true});
assert.equal(settleStory55Wallet(seed,{test:true}),true);
assert.equal(seed.content.mirage.digitalBalance,10);
seed.nav.current={appId:'bank',route:'/exchange',params:{}};
seed.nav.stack=[];
seed.unlocked=false;

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({
 viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
 locale:'zh-CN',reducedMotion:'reduce'
});
page.setDefaultTimeout(30000);
const errors=[],failedUrls=[];
page.on('response',res=>{if(res.status()>=400)failedUrls.push(res.status()+' '+res.url())});
page.on('pageerror',e=>errors.push('pageerror: '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
const photo=(name)=>page.screenshot({path:path+'/'+name+'.png',fullPage:true});
async function unlock(p=page){
 await p.locator('#screen-layer [data-action="unlock"]').waitFor({state:'visible',timeout:60000});
 await p.locator('#screen-layer [data-action="unlock"]').click();
 await p.locator('#screen-layer [data-action="passcode-key"][data-key="0"]').waitFor({state:'visible',timeout:45000});
 for(const d of '0816')await p.locator('#screen-layer [data-action="passcode-key"][data-key="'+d+'"]').click();
 await p.waitForFunction(()=>document.querySelector('#phone')?.classList.contains('is-locked')===false,null,{timeout:30000});
}
async function changeScreen(appId,route,day=null,clock=null){
 await page.evaluate(({key,appId,route,day,clock})=>{
  const s=JSON.parse(localStorage.getItem(key));
  s.nav.current={appId,route,params:{}};s.nav.stack=[];s.unlocked=false;
  if(day!==null)s.day=day;
  if(clock!==null)s.clock=clock;
  localStorage.setItem(key,JSON.stringify(s));
 },{key,appId,route,day,clock});
 await page.reload({waitUntil:'domcontentloaded',timeout:60000});
 await unlock();
}
try{
 await page.addInitScript(({key,json})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,json);
 },{key,json:JSON.stringify(seed)});
 let previewReady=false;
 for(let attempt=1;attempt<=4;attempt++){
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
  const status=response?.status()||0;
  try{
   if(status>=200&&status<400){
    await page.locator('#phone').waitFor({state:'attached',timeout:18000});
    previewReady=true;break;
   }
  }catch(e){console.warn('Phone shell not mounted on attempt '+attempt+': '+String(e).slice(0,120));}
  console.warn('Preview entry not ready: HTTP '+status+' (attempt '+attempt+'/4)');
  await page.waitForTimeout(Math.min(9000,2500*attempt));
 }
 assert.ok(previewReady,'Live review did not render after 4 attempts; responses: '+failedUrls.join(' | '));
 await unlock();
 console.log('PASS iPhone viewport unlock, existing phone shell and passcode');
 await page.locator('form[data-form="bank-exchange"] input[name="amount"]').waitFor();
 const fxText=await page.locator('.bank-page').innerText();
 assert.match(fxText,/107,791\.16/);
 assert.match(fxText,/10\.00000000 BTC/);
 await page.locator('form[data-form="bank-exchange"] input[name="amount"]').fill('0.02');
 await page.locator('form[data-form="bank-exchange"] button[type="submit"]').click();
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return Number(s?.bankData?.balance)===2155.82;
 },key,{timeout:30000});
 const afterFX=await state();
 assert.equal(afterFX.content.mirage.digitalBalance,9.98);
 assert.equal(afterFX.bankData.transactions.filter(t=>t.asset==='BTC').length,1);
 await photo('01-btc-to-usd-receipt');
 console.log('PASS real bank form: 0.02 BTC -> 2155.82 USD, matching wallet debit');

 await changeScreen('wechat','/chat/group',6,'16:30');
 const input=page.locator('form[data-form="send-chat"] input[name="text"]');
 await input.waitFor();
 assert.match(await input.inputValue(),/10 BTC/);
 await page.locator('form[data-form="send-chat"] button[type="submit"]').click();
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.story55?.wishes?.story?.started===true&&
    s.content.conversations.wechat.find(c=>c.id==='group')?.messages?.some(m=>m.id==='d06-celebration-player');
 },key,{timeout:30000});
 console.log('PASS native WeChat composer: the player pressed Send exactly once');
 await page.locator('[data-action="wx-wish-open"][data-wish-id="d06-keyboard"]')
  .waitFor({state:'visible',timeout:80000});
 await page.locator('[data-action="wx-wish-open"][data-wish-id="d06-keyboard"]').click();
 await page.locator('[data-action="wx-wish-confirm"]').waitFor();
 await photo('02-tappable-blue-wish');
 await page.locator('[data-action="wx-wish-confirm"]').click();
 assert.equal((await state()).story55.wishes.records['d06-keyboard'].status,'saved');
 console.log('PASS tappable blue message text -> native Reminders record');

 await changeScreen('reminders','/all',6,'17:00');
 await page.locator('[data-action="reminder-wish-open"][data-id="d06-keyboard"]').waitFor();
 await page.locator('[data-action="reminder-wish-open"][data-id="d06-keyboard"]').click();
 await page.locator('[data-action="reminder-wish-buy"]').waitFor();
 await photo('03-reminder-purchase-confirmation');
 await page.locator('[data-action="reminder-wish-buy"]').click();
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.story55?.wishes?.records?.['d06-keyboard']?.status==='ordered';
 },key,{timeout:15000});
 const bought=await state();
 assert.equal(bought.bankData.balance,1256.82);
 assert.equal(bought.bankData.transactions.filter(t=>t.wishId==='d06-keyboard').length,1);
 console.log('PASS native Reminders -> bank debit exactly once; outstanding physical delivery');

 await changeScreen('wechat','/chat/xiaoxin',8,'17:00');
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.content.conversations.wechat.find(c=>c.id==='xiaoxin')?.messages?.some(m=>m.id==='wish-keyboard-photo');
 },key,{timeout:110000});
 const photoBubble=page.locator('.wx-message-row[data-key="message-wish-keyboard-photo"] img.wx-bubble-picture');
 await photoBubble.waitFor({state:'visible',timeout:30000});
 await photoBubble.evaluate(img=>img.complete&&img.naturalWidth>0?true:new Promise((resolve,reject)=>{
  img.addEventListener('load',()=>resolve(true),{once:true});
  img.addEventListener('error',()=>reject(Error('Supabase image did not load')),{once:true});
 }));
 await photoBubble.scrollIntoViewIfNeeded();
 await photo('04-recipient-photo-loaded');
 const delivered=await state();
 assert.equal(delivered.content.conversations.wechat.find(c=>c.id==='xiaoxin')
  .messages.filter(m=>m.id==='wish-keyboard-photo').length,1);
 assert.equal(delivered.bankData.balance,1256.82);
 console.log('PASS D08 post-delivery private WeChat photo loaded and is not duplicated');

 // A separate synthetic save reproduces the reported issue: a D06 dinner wish
 // was checked off by the home widget without ever paying for it.
 const secondSeed=initialState();
 activateStory55(secondSeed);
 secondSeed.day=6;secondSeed.clock='10:25';secondSeed.homePage=1;
 secondSeed.unlocked=false;
 secondSeed.nav.current={appId:'home',route:'/',params:{}};
 secondSeed.bankData.balance=1000;
 secondSeed.story55.wishes={
  records:{'d06-dinner':{id:'d06-dinner',status:'saved',foundDay:6,foundClock:'10:20'}},
  story:{started:true,lines:[],nextAt:0,d07Started:false}
 };
 secondSeed.content.reminders.push({
  id:'wish-d06-dinner',wishId:'d06-dinner',title:'今晚和大家吃饭',
  done:true,wishStatus:'saved',createdDay:6
 });
 const widgetPage=await browser.newPage({
  viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
  locale:'zh-CN',reducedMotion:'reduce'
 });
 widgetPage.setDefaultTimeout(30000);
 widgetPage.on('pageerror',e=>errors.push('widget pageerror: '+e.message));
 await widgetPage.addInitScript(({key,json})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,json);
 },{key,json:JSON.stringify(secondSeed)});
 let widgetReady=false;
 for(let attempt=1;attempt<=4;attempt++){
  const response=await widgetPage.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
  if(response?.ok()){
   try{await widgetPage.locator('#phone').waitFor({timeout:20000});widgetReady=true;break;}
   catch{}
  }
  await widgetPage.waitForTimeout(2500*attempt);
 }
 assert.ok(widgetReady,'Widget preview did not load');
 await unlock(widgetPage);
 await widgetPage.locator('[data-action="home-reminder-wish"][data-wish-id="d06-dinner"]')
  .waitFor({state:'visible',timeout:30000});
 const widgetState=()=>widgetPage.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 assert.equal((await widgetState()).content.reminders.find(x=>x.wishId==='d06-dinner').done,false,
  'old mistaken completed check is repaired on startup');
 await widgetPage.locator('[data-action="home-reminder-wish"][data-wish-id="d06-dinner"]').click();
 await widgetPage.locator('[data-action="reminder-wish-buy"]').waitFor({state:'visible'});
 assert.equal((await widgetState()).nav.current.appId,'home','purchase modal must open directly on home');
 await widgetPage.screenshot({path:path+'/05-home-direct-purchase.png',fullPage:true});
 await widgetPage.locator('[data-action="reminder-wish-buy"]').click();
 await widgetPage.locator('[role="dialog"][aria-label="购买成功"]').waitFor({state:'visible'});
 await widgetPage.screenshot({path:path+'/06-dinner-booking-confirmed.png',fullPage:true});
 const paidDinner=await widgetState();
 assert.equal(paidDinner.bankData.balance,650);
 assert.equal(paidDinner.bankData.transactions.filter(x=>x.wishId==='d06-dinner').length,1);
 assert.equal(paidDinner.content.reminders.find(x=>x.wishId==='d06-dinner').done,true);
 console.log('PASS home widget: direct purchase modal, repaired legacy done, paid receipt, one debit');
 await widgetPage.locator('[data-action="reminder-wish-chat"]').click();
 await widgetPage.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.nav.current.appId==='wechat'&&s.nav.current.route==='/chat/group'&&
   s.content.conversations.wechat.find(x=>x.id==='group')?.messages.some(m=>m.id==='wish-dinner-01');
 },key,{timeout:30000});
 const dinnerResponse=await widgetState();
 assert.equal(dinnerResponse.content.conversations.wechat.find(x=>x.id==='group')
  .messages.filter(m=>m.id==='wish-dinner-01').length,1);
 assert.equal(dinnerResponse.content.conversations.wechat.find(x=>x.id==='group')
  .messages.some(m=>m.id==='wish-dinner-photo'),false);
 console.log('PASS dinner purchase triggers prompt WeChat booking confirmation; photo awaits evening');

 if(errors.length)console.log('Browser warnings:\n'+errors.slice(0,20).join('\n'));
 if(failedUrls.length)console.log('HTTP FAILED URLS:',[...new Set(failedUrls)].slice(0,35));
 console.log('D06_MOBILE_SMOKE_PASS');
}catch(err){
 await photo('99-failure').catch(()=>{});
 console.error('D06_MOBILE_SMOKE_FAILED:',err?.stack||String(err));
 console.error('Browser errors:',errors.slice(0,30));
 console.error('HTTP failures:',[...new Set(failedUrls)].slice(0,35));
 process.exitCode=1;
}finally{await browser.close();}
