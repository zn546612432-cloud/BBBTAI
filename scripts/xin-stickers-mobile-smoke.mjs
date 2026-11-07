import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const url=process.env.SMOKE_URL||'http://127.0.0.1:8765/BBBTAI/review/xin-stickers-20261107/';
await mkdir('qa-results',{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});
const context=await browser.newContext({...devices['iPhone 13']});const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url,{waitUntil:'domcontentloaded'});
await page.locator('.lock-screen').waitFor({timeout:90000});
await page.evaluate(()=>{
 const part=(location.pathname.match(/\/review\/([a-z0-9-]+)\//i)||[])[1];const key=part?'ximeng-phone-story55-review-'+part:'ximeng-phone-story55-v1';const s=JSON.parse(localStorage.getItem(key));
 s.day=6;s.clock='18:00';s.batteryPercent=80;s.unlocked=false;s.nav={current:{appId:'home',route:'/',params:{}},stack:[]};
 s.story55.completed.wallet={day:6,clock:'17:00'};
 // Completed-wallet fixture isolates media acceptance from the unrelated minigames.
 localStorage.setItem(key,JSON.stringify(s));
});
await page.reload({waitUntil:'domcontentloaded'});
await page.locator('.lock-screen').waitFor({timeout:90000});
await page.locator('[data-action="unlock"]').click();
await page.locator('[data-action="passcode-key"][data-key="0"]').waitFor();
for(const key of '0816')await page.locator(`[data-action="passcode-key"][data-key="${key}"]`).click();
await page.locator('.home-screen').waitFor();
await page.locator('.home-screen [data-action="open-app"][data-app="wechat"]').click();
await page.locator('[data-action="open-chat"][data-id="group"]').click();
const input=page.locator('.wx-composer input');await input.waitFor();
console.log('DRAFT',await input.inputValue());
assert.match(await input.inputValue(),/10 BTC/);
await page.locator('.wx-composer-send').click();
const first=page.locator('[data-key="message-d06-celebrate-01"] img.wx-bubble-picture');
await first.waitFor({timeout:20000});
await first.evaluate(img=>img.decode());assert.equal(await first.evaluate(img=>img.naturalWidth>0),true);
await page.screenshot({path:'qa-results/xin-mobile-celebration.png'});
console.log('CELEBRATION_IMAGE',await first.getAttribute('src'));
// Exercise all ready assets through the actual versioned Pages base, then offline.
const assetResult=await page.evaluate(async()=>{
 const release=await (await fetch(new URL('release.json',location.href))).json();
 const {xinDogStickers}=await import(release.url+'src/services/assets/xin-dog-stickers.js');
 const result=[];
 for(const a of xinDogStickers.filter(a=>a.status==='ready')){
  const img=new Image();img.src=release.url+a.path.slice(1);await img.decode();
  if(img.naturalWidth!==a.width||img.naturalHeight!==a.height)throw Error(a.id);
  result.push(a.id);
 }
 return result.length;
});assert.equal(assetResult,162);
await page.locator('[data-key="message-d06-celebrate-07"]').waitFor({timeout:30000});
// Serialized older save: already-paid delivery must not charge or duplicate.
await page.evaluate(async()=>{
 const part=(location.pathname.match(/\/review\/([a-z0-9-]+)\//i)||[])[1];const key=part?'ximeng-phone-story55-review-'+part:'ximeng-phone-story55-v1';const s=JSON.parse(localStorage.getItem(key));
 const release=await (await fetch(new URL('release.json',location.href))).json();
 const {addWish,purchaseWish}=await import(release.url+'src/services/wishes/index.js');
 s.bankData.balance=5000;addWish(s,'d06-keyboard');purchaseWish(s,'d06-keyboard');
 s.day=8;s.clock='16:00';s.unlocked=false;s.nav={current:{appId:'home',route:'/',params:{}},stack:[]};
 localStorage.setItem(key,JSON.stringify(s));
});
await page.reload({waitUntil:'domcontentloaded'});await page.locator('.lock-screen').waitFor({timeout:90000});
await page.locator('[data-action="unlock"]').click();await page.locator('[data-action="passcode-key"][data-key="0"]').waitFor();
for(const key of '0816')await page.locator(`[data-action="passcode-key"][data-key="${key}"]`).click();
await page.locator('.home-screen').waitFor();await page.locator('.home-screen [data-action="open-app"][data-app="wechat"]').click();
await page.locator('[data-action="open-chat"][data-id="xiaoxin"]').click();
const thanks=page.locator('[data-key="message-wish-keyboard-thanks-1"] img.wx-bubble-picture');
await thanks.waitFor({timeout:30000});await thanks.evaluate(img=>img.decode());
await page.screenshot({path:'qa-results/xin-mobile-thanks.png'});
await context.setOffline(true);assert.equal(await thanks.evaluate(img=>img.complete&&img.naturalWidth>0),true);
await context.setOffline(false);
const state=await page.evaluate(()=>{const part=(location.pathname.match(/\/review\/([a-z0-9-]+)\//i)||[])[1];return JSON.parse(localStorage.getItem(part?'ximeng-phone-story55-review-'+part:'ximeng-phone-story55-v1'));});
assert.equal(state.content.conversations.wechat.find(c=>c.id==='xiaoxin').messages.filter(m=>m.id==='wish-keyboard-thanks-1').length,1);
assert.equal(state.bankData.balance,4101);assert.equal(state.bankData.transactions.filter(t=>t.id==='wish-purchase-d06-keyboard').length,1);
assert.deepEqual(errors,[]);
console.log('PASS_MOBILE',JSON.stringify({decoded:assetResult,viewport:await page.viewportSize(),balance:state.bankData.balance,errors}));
await browser.close();
