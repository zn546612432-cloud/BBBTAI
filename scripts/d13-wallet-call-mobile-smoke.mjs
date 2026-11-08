// Prior days and the daytime exhibition are fixtures; KIRA, wallet, green screen and the D13 call below use native UI.
import assert from 'node:assert/strict';
import {D13_VOICE_INDICES} from '../src/story/d13/content.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {previewNode55} from '../src/services/story55/controller.js';
let preReloadAudioEvents=[];
const url=process.env.SMOKE_URL||'http://127.0.0.1:5173/';
const seed=initialState();activateStory55(seed);previewNode55(seed,'d13-wallet-mail');seed.story55.completed.exhibition={day:13,clock:'20:00',test:true};seed.story55.minutesPerSecond=0;seed.unlocked=false;
seed.nav={current:{appId:'kira',route:'/',params:{}},stack:[]};
const key='ximeng-phone-story55-v1',bank=structuredClone(seed.bankData),btc=seed.content.mirage.digitalBalance;
await mkdir('qa-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const context=await browser.newContext({...devices['iPhone 13']});const page=await context.newPage(),errors=[];
const requestedSpeech=[];
await page.route('https://api.minimaxi.com/v1/t2a_v2',route=>{
 requestedSpeech.push(route.request().method());
 return route.abort();
});
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(({seed,key})=>{
 sessionStorage.setItem('ximeng-ai-session-keys-v1',JSON.stringify({minimax:'D13_TEST_ONLY',region:'cn'}));
 if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));
 window.__realMediaCalls=0;window.__d13AudioEvents=[];
 if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{window.__realMediaCalls++;throw Error('Real permissions forbidden');};
 const play=HTMLMediaElement.prototype.play;
 HTMLMediaElement.prototype.play=function(...args){
  const match=/\/assets\/story55\/d13\/call-(\d+)\.mp3(?:[?#]|$)/.exec(this.src||'');
  if(match||(this.src||'').startsWith('blob:')){
   const index=match?Number(match[1]):JSON.parse(localStorage.getItem(key)||'{}')?.story55?.scenes?.intrusion?.index;
   for(const kind of ['playing','ended','error'])this.addEventListener(kind,()=>{
    const input=document.querySelector('.mc-composer input');
    window.__d13AudioEvents.push({index,kind,inputDisabled:input?.disabled===true,bubblePresent:!!document.querySelector('[data-key="message-s55-intrusion-v2-'+index+'"]')});
   },{once:true});
  }
  return play.apply(this,args);
 };
},{seed,key});
const action=a=>page.locator(`[data-action="${a}"]`);
const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
async function unlock(){
 const boot=page.locator('#xm-boot'),next=page.getByRole('button',{name:'继续进入锁屏',exact:true});
 await Promise.race([boot.waitFor({state:'hidden',timeout:90000}),next.waitFor({state:'visible',timeout:90000})]);
 if(await next.isVisible())await next.click();
 await boot.waitFor({state:'hidden',timeout:10000});
 if(await action('unlock').isVisible()){
  await action('unlock').click();for(const k of '0816')await page.locator(`[data-action="passcode-key"][data-key="${k}"]`).click();
 }
}
async function signIn(){const login=page.locator('form[data-form="mc-login"]');await page.locator('.mc-login-panel,.mc-composer,.mc-wallet-list').first().waitFor();if(await login.isVisible())await login.locator('button[type="submit"]').click();}
async function send(index){
 const selector=`.mc-composer input[data-story-stage="intrusion:${index}"]`;
 await page.locator(selector).waitFor({timeout:60000});
 await page.waitForFunction(selector=>{const i=document.querySelector(selector);return i&&i.value===i.dataset.storyType;},selector,{timeout:20000});
 const before=await saved();assert.equal(before.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.some(m=>m.id==='s55-intrusion-v2-'+index),false);
 await page.locator('.mc-composer button[type="submit"]').click();
}
try{
 await page.goto(url);await unlock();
 await page.locator('[data-action="kira-mail"][data-id="s55-d13-wallet-mail"]').click();
 await page.locator('.kira-d13-mail').waitFor();
 assert.match(await page.locator('.kira-d13-mail').innerText(),/數位資產入帳通知/);
 await page.screenshot({path:'qa-results/d13-kira-native-mail.png'});
 await action('kira-d13-wallet').click();await signIn();
 await page.locator('.mc-wallet-list').waitFor();
 await page.locator('.mc-wallet-back[data-action="mc-wallet-back"]').first().click();await page.locator('.kira-d13-mail').waitFor();
 await action('kira-d13-wallet').click();await signIn();
 await page.locator('.mc-wallet-list').waitFor();await page.screenshot({path:'qa-results/d13-wallet-list.png'});
 await action('mc-bind-wallet').click();
 await page.locator('form[data-form="mc-wallet-bind"]').waitFor();
 await page.locator('.mc-login-back[data-action="mc-wallet-back"]').first().click();await page.locator('.mc-wallet-list').waitFor();
 await action('mc-bind-wallet').click();const bind=page.locator('form[data-form="mc-wallet-bind"]');await bind.waitFor();
 assert.ok(await bind.locator('input[name="account"]').inputValue());assert.ok(await bind.locator('input[name="password"]').inputValue());
 await bind.locator('button[type="submit"]').click();
 await action('mc-wallet-detail').click();await page.locator('.mc-wallet-back[data-action="mc-wallet-back"]').first().click();await page.locator('.mc-wallet-list').waitFor();
 await action('mc-wallet-detail').click();
 await action('mc-wallet-transfer').click();await action('mc-wallet-cancel-transfer').click();
 await page.locator('.mc-wallet-transfer-confirm').waitFor({state:'hidden'});
 await action('mc-wallet-transfer').click();await action('mc-wallet-transfer-confirm').click();
 await page.locator('.tel-green-screen').waitFor();await page.screenshot({path:'qa-results/d13-green-screen.png'});await page.locator('.tel-green-screen').waitFor({state:'hidden',timeout:8000});
 await page.locator('.mc-composer').waitFor();await send(2);await send(4);
 await page.locator('.tel-call-screen').waitFor({timeout:90000});assert.equal(await action('tel-decline').count(),1);assert.equal(await action('tel-answer').count(),1);await page.waitForFunction(()=>getComputedStyle(document.querySelector('#day-transition-layer')).opacity==='1');await page.screenshot({path:'qa-results/d13-forced-call.png'});
 await action('tel-decline').click();
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).phoneCall?.reason==='user-declined',key);
 await page.locator('.tel-call-island').waitFor({timeout:20000});
 assert.doesNotMatch(await page.locator('.tel-call-island').innerText(),/REMOTE OVERRIDE/);
 await action('tel-return').click();await action('tel-end').waitFor();
 await page.screenshot({path:'qa-results/d13-in-call-controls.png'});
 await action('tel-chat').click();await page.locator('.mc-composer').waitFor();
 await page.locator('.mc-composer input[data-story-stage="intrusion:9"]').waitFor({timeout:90000});
 preReloadAudioEvents=await page.evaluate(()=>window.__d13AudioEvents);
 await page.reload();await unlock();await action('tel-resume').waitFor({timeout:12000});await action('tel-resume').click();await signIn();
 await page.locator('#homebar').click();await page.locator('.home-screen').waitFor();await action('tel-return').click();await action('tel-chat').waitFor();await action('tel-chat').click();await signIn();
 await action('tel-return').click();await action('tel-end').click();
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).phoneCall?.reason==='user-hangup',key);
 await action('tel-answer').click();
 await send(9);await send(11);await send(13);await send(17);await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).phoneCall?.state==='ended',key,{timeout:90000});
 const s=await saved(),chat=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
 assert.ok(s.story55.completed.intrusion);assert.equal(s.content.mirage.digitalBalance,btc);assert.deepEqual(s.bankData,bank);
 assert.equal(s.content.mirage.wallets[0].status,'frozen');assert.equal(chat.messages.filter(m=>m.kind==='divider').length,1);
 assert.equal(chat.messages.filter(m=>m.id==='s55-intrusion-v2-8').length,1);assert.equal(chat.messages.filter(m=>m.id==='s55-intrusion-v2-9').length,1);
 const logs=s.content.phone.calls.filter(c=>c.id.startsWith('s55-d13-call-v2'));
 assert.equal(logs.length,3);assert.equal(logs.filter(c=>c.missed).length,1);assert.equal(new Set(logs.map(c=>c.id)).size,3);assert.equal(await page.evaluate(()=>window.__realMediaCalls),0);
 await page.locator('#homebar').click();await page.locator('[data-action="open-app"][data-app="phone"]').click();await page.locator('.ios-recents-page').waitFor();await page.screenshot({path:'qa-results/d13-call-log.png'});
 const audioEvents=[...preReloadAudioEvents,...await page.evaluate(()=>window.__d13AudioEvents)];
 await writeFile('qa-results/d13-audio-events.json',JSON.stringify(audioEvents,null,2));
 {
  assert.deepEqual(audioEvents.filter(e=>e.kind==='playing').map(e=>e.index),D13_VOICE_INDICES,'All seven real MP3s must start in script order');
  assert.deepEqual(audioEvents.filter(e=>e.kind==='ended').map(e=>e.index),D13_VOICE_INDICES,'All seven real MP3s must end normally');
  assert.ok(audioEvents.filter(e=>e.kind==='playing').every(e=>e.inputDisabled&&e.bubblePresent),'Speech locks Send and displays the speaker avatar at sound start');
  assert.equal(audioEvents.filter(e=>e.kind==='error').length,0);
 }
 assert.equal(requestedSpeech.length,0,'Bundled D13 audio must not silently request live MiniMax');
 assert.deepEqual(errors,[]);
 const result={wallets:s.content.mirage.wallets.length,bankUnchanged:true,btcUnchanged:true,divider:1,callLogs:logs.length,declineRedial:true,hangupRedial:true,manualAnswer:true,automaticAnswer:true,refreshResumed:true,manualSends:[2,4,9,11,13,17],realMediaCalls:0,audioPlayed:audioEvents.filter(e=>e.kind==='playing').length,audioCompleted:audioEvents.filter(e=>e.kind==='ended').length,pageErrors:errors};
 await writeFile('qa-results/d13-result.json',JSON.stringify(result,null,2));console.log('PASS_D13_MOBILE',JSON.stringify(result));
}catch(error){await page.screenshot({path:'qa-results/d13-failure.png'}).catch(()=>{});await writeFile('qa-results/d13-failure.txt',String(error)+'\nPAGE_ERRORS='+JSON.stringify(errors)+'\n'+JSON.stringify(await saved().catch(()=>null),null,2));throw error;}
finally{await browser.close();}
