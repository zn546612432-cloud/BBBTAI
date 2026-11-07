// Phone-sized browser acceptance for the isolated D08-D10 review deployment.
// Synthetic save; never touches a user's production localStorage.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {initialState} from '../../src/services/storage.js';
import {activateStory55} from '../../src/services/story55/runtime.js';

const url=process.env.D08_D10_PREVIEW_URL||
 'https://zn546612432-cloud.github.io/BBBTAI/review/d08-d10-20261107/';
const key='ximeng-phone-story55-review-d08-d10-20261107';
const path='d08-d10-mobile-results';
mkdirSync(path,{recursive:true});
const seed=initialState();
activateStory55(seed);
seed.day=8;seed.clock='09:12';seed.batteryPercent=85;
seed.unlocked=false;
seed.nav.current={appId:'wechat',route:'/chat/group',params:{}};
seed.nav.stack=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'zh-CN',reducedMotion:'reduce'});
page.setDefaultTimeout(35000);
const pageErrors=[],httpFailures=[];
page.on('pageerror',e=>pageErrors.push(e.message));
page.on('response',r=>{if(r.status()>=400)httpFailures.push(r.status()+' '+r.url());});
const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
const snapshot=name=>page.screenshot({path:path+'/'+name+'.png',fullPage:true});
const currentMessages=async day=>(await state()).content.conversations.wechat.find(c=>c.id==='group').messages.filter(m=>m['storyD'+String(day).padStart(2,'0')]);
async function unlock(){
 await page.locator('#screen-layer [data-action="unlock"]').waitFor({state:'visible',timeout:60000});
 await page.locator('#screen-layer [data-action="unlock"]').click();
 await page.locator('#screen-layer [data-action="passcode-key"][data-key="0"]').waitFor({state:'visible'});
 for(const d of '0816')await page.locator('#screen-layer [data-action="passcode-key"][data-key="'+d+'"]').click();
 await page.waitForFunction(()=>document.querySelector('#phone')?.classList.contains('is-locked')===false,null,{timeout:30000});
}
async function screen(appId,route,day,clock){
 await page.evaluate(({key,appId,route,day,clock})=>{
  const s=JSON.parse(localStorage.getItem(key));
  s.nav.current={appId,route,params:{}};s.nav.stack=[];
  s.unlocked=false;s.day=day;s.clock=clock;
  localStorage.setItem(key,JSON.stringify(s));
 },{key,appId,route,day,clock});
 await page.reload({waitUntil:'domcontentloaded',timeout:90000});
 await unlock();
}
try{
 await page.addInitScript(({key,json})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,json);
 },{key,json:JSON.stringify(seed)});
 let ready=false;
 for(let attempt=0;attempt<5;attempt++){
  const res=await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
  if(res?.ok()){
   try{await page.locator('#phone').waitFor({state:'attached',timeout:19000});ready=true;break;}catch{}
  }
  await page.waitForTimeout(2500*(attempt+1));
 }
 assert.equal(ready,true,'D08-D10 Pages review not reachable');
 await unlock();
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.content.conversations.wechat.find(c=>c.id==='group').messages.some(m=>m.id==='d08-keyboard-0');
 },key,{timeout:75000});
 const day8=await currentMessages(8);
 assert.ok(day8.length>=1);
 assert.equal(day8.filter(m=>m.from==='me').length,0);
 await snapshot('01-day08-group-chat');
 console.log('PASS D08 live NPC group chat on real phone view, no forced Ximeng reply');

 await screen('wechat','/chat/group',9,'15:52');
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.content.conversations.wechat.find(c=>c.id==='group').messages.some(m=>m.id==='d09-training-0');
 },key,{timeout:75000});
 const day9=await currentMessages(9);
 assert.ok(day9.some(m=>m.text.includes('八秒')));
 assert.equal(day9.filter(m=>m.from==='me').length,0);
 assert.equal((await currentMessages(8)).length,20);
 assert.ok((await currentMessages(8)).every(m=>m.historical||m.id==='d08-keyboard-0'&&!m.historical));
 await snapshot('02-day09-training-group');
 console.log('PASS D09 training chat delivered; D08 late history backfilled without Ximeng');

 await screen('wechat','/chat/group',10,'17:46');
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.content.conversations.wechat.find(c=>c.id==='group').messages.some(m=>m.id==='d10-carry-0');
 },key,{timeout:75000});
 assert.equal((await currentMessages(9)).length,20);
 assert.ok((await currentMessages(10)).some(m=>m.text.includes('搬东西')));
 assert.equal((await currentMessages(10)).filter(m=>m.from==='me').length,0);
 await snapshot('03-day10-shopping-group');
 console.log('PASS D10 shopping chat and silent historical D09 replay');

 await screen('mirage','/bounties',10,'18:10');
 await page.locator('form[data-form="mc-login"] button[type="submit"]').waitFor({state:'visible'});
 await page.locator('form[data-form="mc-login"] button[type="submit"]').click();
 await page.locator('[data-action="mc-tab"][data-route="/bounties"]').waitFor({state:'visible',timeout:20000});
 await page.locator('[data-action="mc-tab"][data-route="/bounties"]').click();
 await page.locator('[data-action="mc-open-bounty"][data-id="d10-spectrum-test"]').waitFor({state:'visible',timeout:30000});
 await snapshot('04-d10-mirage-three-contracts');
 await page.locator('[data-action="mc-open-bounty"][data-id="d10-spectrum-test"]').click();
 await page.locator('[data-action="mc-accept-bounty"][data-id="d10-spectrum-test"]').waitFor({state:'visible'});
 const before=await state();
 assert.equal(before.content.mail.filter(m=>m.id==='d04-commission-d10-spectrum-test').length,0);
 await page.locator('[data-action="mc-accept-bounty"][data-id="d10-spectrum-test"]').click();
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.content.orders.some(o=>o.id==='d10-spectrum-test'&&o.status==='ACCEPTED')&&
   s.content.mail.some(m=>m.id==='d04-commission-d10-spectrum-test');
 },key,{timeout:30000});
 const afterAccept=await state();
 assert.equal(afterAccept.content.mail.filter(m=>m.id==='d04-commission-d10-spectrum-test').length,1);
 assert.equal(afterAccept.bankData.transactions.filter(t=>t.id==='d04-receipt-d10-spectrum-test').length,0);
 await snapshot('05-d10-mirage-accepted');
 await page.locator('[data-action="mc-d04-mail"][data-id="d10-spectrum-test"]').click();
 await page.locator('[data-action="kira-open-commission-file"][data-id="d04-commission-d10-spectrum-test"]').waitFor({state:'visible',timeout:30000});
 await snapshot('06-d10-kira-attachment');
 await page.locator('[data-action="kira-open-commission-file"][data-id="d04-commission-d10-spectrum-test"]').click();
 await page.locator('[data-action="files-commission-open-ghost"][data-id="d04-commission-d10-spectrum-test"]').waitFor({state:'visible'});
 await page.locator('[data-action="files-commission-open-ghost"][data-id="d04-commission-d10-spectrum-test"]').click();
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.nav.current.appId==='ghost'&&s.ghost?.orders?.['d10-spectrum-test-stage-1']?.status==='authorized';
 },key,{timeout:25000});
 await snapshot('07-d10-ghost-stage1-authorized');
 console.log('PASS actual phone taps: MIRAGE accept -> KIRA 1 file -> Files -> GHOST stage 1; no early payout');

 if(pageErrors.length)console.log('Browser warnings:',pageErrors.slice(0,12));
 if(httpFailures.length)console.log('HTTP failures:',[...new Set(httpFailures)].slice(0,15));
 console.log('D08_D10_MOBILE_SMOKE_PASS');
}catch(e){
 await snapshot('99-failure').catch(()=>{});
 console.error('D08_D10_MOBILE_SMOKE_FAILED',e?.stack||String(e));
 console.error('HTTP failures:',httpFailures.slice(0,15));
 console.error('Browser warnings:',pageErrors.slice(0,15));
 process.exitCode=1;
}finally{
 await browser.close();
}
