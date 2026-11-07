// Only prior days are a fixture. Every D13 interaction below uses native UI.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {previewNode55} from '../src/services/story55/controller.js';
const url=process.env.SMOKE_URL||'http://127.0.0.1:5173/';
const seed=initialState();activateStory55(seed);previewNode55(seed,'d13-wallet-mail');seed.story55.minutesPerSecond=0;seed.unlocked=false;
seed.nav={current:{appId:'kira',route:'/',params:{}},stack:[]};
const key='ximeng-phone-story55-v1',bank=structuredClone(seed.bankData),btc=seed.content.mirage.digitalBalance;
await mkdir('qa-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const context=await browser.newContext({...devices['iPhone 13']});const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(({seed,key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));window.__realMediaCalls=0;if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{window.__realMediaCalls++;throw Error('Real permissions forbidden');};},{seed,key});
const action=a=>page.locator(`[data-action="${a}"]`);
const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
async function unlock(){
 await page.locator('#xm-boot').waitFor({state:'hidden',timeout:90000});
 if(await action('unlock').isVisible()){
  await action('unlock').click();for(const k of '0816')await page.locator(`[data-action="passcode-key"][data-key="${k}"]`).click();
 }
}
async function signIn(){const login=page.locator('form[data-form="mc-login"]');await page.locator('.mc-login-panel,.mc-composer,.mc-wallet-list').first().waitFor();if(await login.isVisible())await login.locator('button[type="submit"]').click();}
async function send(index){
 const selector=`.mc-composer input[data-story-stage="intrusion:${index}"]`;
 await page.locator(selector).waitFor({timeout:30000});
 await page.waitForFunction(selector=>{const i=document.querySelector(selector);return i&&i.value===i.dataset.storyType;},selector,{timeout:20000});
 const before=await saved();assert.equal(before.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.some(m=>m.id==='s55-intrusion-v2-'+index),false);
 await page.locator('.mc-composer button[type="submit"]').click();
}
try{
 await page.goto(url);await unlock();
 await page.locator('[data-action="kira-mail"][data-id="s55-d13-wallet-mail"]').click();await action('kira-d13-wallet').click();await signIn();
 await page.locator('.mc-wallet-list').waitFor();await page.screenshot({path:'qa-results/d13-wallet-list.png'});
 await action('mc-bind-wallet').click();const bind=page.locator('form[data-form="mc-wallet-bind"]');await bind.waitFor();
 assert.ok(await bind.locator('input[name="account"]').inputValue());assert.ok(await bind.locator('input[name="password"]').inputValue());
 await bind.locator('button[type="submit"]').click();await action('mc-wallet-detail').click();await action('mc-wallet-transfer').click();await action('mc-wallet-transfer-confirm').click();
 await page.locator('.tel-green-screen').waitFor();await page.screenshot({path:'qa-results/d13-green-screen.png'});await page.locator('.tel-green-screen').waitFor({state:'hidden',timeout:8000});
 await page.locator('.mc-composer').waitFor();await send(2);await send(4);
 await page.locator('.tel-call-screen').waitFor({timeout:25000});assert.equal(await action('tel-decline').count(),0);await page.screenshot({path:'qa-results/d13-forced-call.png'});
 await page.locator('.tel-call-island').waitFor({timeout:12000});assert.match(await page.locator('.tel-call-island').innerText(),/REMOTE OVERRIDE/);
 await page.locator('.mc-composer input[data-story-stage="intrusion:9"]').waitFor({timeout:25000});
 await page.reload();await unlock();await action('tel-resume').waitFor({timeout:12000});await action('tel-resume').click();await signIn();
 await action('home').first().click();await page.locator('.home-screen').waitFor();await action('tel-return').click();await signIn();
 await send(9);await send(11);await send(13);await send(17);await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).phoneCall?.state==='ended',key,{timeout:25000});
 const s=await saved(),chat=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
 assert.ok(s.story55.completed.intrusion);assert.equal(s.content.mirage.digitalBalance,btc);assert.deepEqual(s.bankData,bank);
 assert.equal(s.content.mirage.wallets[0].status,'frozen');assert.equal(chat.messages.filter(m=>m.kind==='divider').length,1);
 assert.equal(chat.messages.filter(m=>m.id==='s55-intrusion-v2-8').length,1);assert.equal(chat.messages.filter(m=>m.id==='s55-intrusion-v2-9').length,1);
 assert.equal(s.content.phone.calls.filter(c=>c.id==='s55-d13-call-v2').length,1);assert.equal(await page.evaluate(()=>window.__realMediaCalls),0);
 await action('home').first().click();await page.locator('[data-action="open-app"][data-app="phone"]').click();await page.locator('.ios-recents-page').waitFor();await page.screenshot({path:'qa-results/d13-call-log.png'});
 assert.deepEqual(errors,[]);
 const result={wallets:s.content.mirage.wallets.length,bankUnchanged:true,btcUnchanged:true,divider:1,callLogs:1,automaticAnswer:true,refreshResumed:true,manualSends:[2,4,9,11,13,17],realMediaCalls:0,pageErrors:errors};
 await writeFile('qa-results/d13-result.json',JSON.stringify(result,null,2));console.log('PASS_D13_MOBILE',JSON.stringify(result));
}catch(error){await page.screenshot({path:'qa-results/d13-failure.png'}).catch(()=>{});await writeFile('qa-results/d13-failure.txt',String(error)+'\nPAGE_ERRORS='+JSON.stringify(errors)+'\n'+JSON.stringify(await saved().catch(()=>null),null,2));throw error;}
finally{await browser.close();}
