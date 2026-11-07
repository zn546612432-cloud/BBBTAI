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
const errors=[];
page.on('pageerror',e=>errors.push('pageerror: '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
const photo=(name)=>page.screenshot({path:path+'/'+name+'.png',fullPage:true});
async function unlock(){
 await page.locator('#screen-layer [data-action="unlock"]').waitFor({state:'visible',timeout:60000});
 await page.locator('#screen-layer [data-action="unlock"]').click();
 await page.locator('#screen-layer [data-action="passcode-key"][data-key="0"]').waitFor({state:'visible',timeout:45000});
 for(const d of '0816')await page.locator('#screen-layer [data-action="passcode-key"][data-key="'+d+'"]').click();
 await page.waitForFunction(()=>document.querySelector('#phone')?.classList.contains('is-locked')===false,null,{timeout:30000});
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
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
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
 await photo('04-recipient-photo-loaded');
 const delivered=await state();
 assert.equal(delivered.content.conversations.wechat.find(c=>c.id==='xiaoxin')
  .messages.filter(m=>m.id==='wish-keyboard-photo').length,1);
 assert.equal(delivered.bankData.balance,1256.82);
 console.log('PASS D08 post-delivery private WeChat photo loaded and is not duplicated');
 if(errors.length)console.log('Browser warnings:\n'+errors.slice(0,20).join('\n'));
 console.log('D06_MOBILE_SMOKE_PASS');
}catch(err){
 await photo('99-failure').catch(()=>{});
 console.error('D06_MOBILE_SMOKE_FAILED:',err?.stack||String(err));
 console.error('Browser errors:',errors.slice(0,30));
 process.exitCode=1;
}finally{await browser.close();}
