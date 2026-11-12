// Real touch UI: confirm/cancel layout, guaranteed first two, paced later refusal and
// offline resume through the existing Story55 tick (isolated local save only).
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {initialState} from '../../src/services/storage.js';
import {activateStory55} from '../../src/services/story55/runtime.js';
const url=process.env.TAI_REMOTE_LOCAL_URL||'http://127.0.0.1:5173/';
const key='ximeng-phone-story55-v1',output='tai-remote-mobile-results';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],
 ...(process.env.TAI_REMOTE_CHROMIUM_PATH?{executablePath:process.env.TAI_REMOTE_CHROMIUM_PATH}:{})});
const errors=[],results=[];
function seed(clock,takeovers){
 const s=activateStory55(initialState());s.day=16;s.clock=clock;s.batteryPercent=90;
 s.story55.minutesPerSecond=0;s.story55.activeScene=null;s.story55.d13={phase:'chat'};
 for(const n of s.story55.config.nodes)if(n.day<=16&&n.id!=='base'&&n.id!=='recognition')
  s.story55.completed[n.id]={day:n.day,clock:'12:00',test:true};
 s.story55.projects.base={authorized:true,batches:[],active:null};
 s.story55.ghostShareTakeovers=takeovers;
 s.nav={current:{appId:'ghost',route:'/deployment',params:{project:'base'}},stack:[]};s.unlocked=false;
 if(!s.content.conversations.mirage.some(c=>c.id==='s55-ouroboros'))s.content.conversations.mirage.push({id:'s55-ouroboros',name:'Dr Ouroboros',messages:[],unread:0});
 return s;
}
try{
 for(const takeovers of [0,1,2])for(const offline of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'zh-TW',reducedMotion:'reduce'});
  await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,state);Math.random=()=>.99;},{key,state:JSON.stringify(seed(offline?'11:00':'08:20',takeovers))});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('[data-action="unlock"]').click();
  for(const digit of '0816')await page.locator('[data-action="passcode-key"][data-key="'+digit+'"]').click();
  const action=a=>page.locator('#screen-layer [data-action="'+a+'"]');
  await action('gh-share').click();
  const sizes=await page.locator('.gh-share-actions button').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
  assert.equal(sizes.length,2);assert.equal(sizes[0].y,sizes[1].y);assert.equal(sizes[0].height,sizes[1].height);assert.equal(sizes[0].width,sizes[1].width);
  assert.ok(sizes[0].height>=44&&sizes[0].height<=50);
  await page.screenshot({path:output+'/share-confirmation-'+takeovers+'-'+(offline?'offline':'online')+'.png'});
  await action('gh-share-no').click();assert.equal(await page.locator('.gh-share-overlay').count(),0);
  assert.equal(await page.locator('.mc-ghost-card').count(),0);
  await action('gh-share').click();const started=Date.now();await action('gh-share-yes').click();
  await page.locator('#screen-layer .mc-composer').waitFor({state:'visible'});
  assert.equal(await page.locator('form[data-form="mc-login"]').count(),0);
  await page.locator('.mc-ghost-card').waitFor({state:'visible'});
  const saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  if(offline){
   assert.equal((await saved()).story55.ghostShare.phase,'awaiting-online');
   assert.equal(await page.getByText('我很忙，你自己處理',{exact:true}).count(),0);
   // Exercise the canonical transaction + story tick at the next online window.
   await page.evaluate(async()=>{
    const {PhoneStore}=await import('/src/services/storage.js');const get=PhoneStore.prototype.get;
    PhoneStore.prototype.get=function(){window.__shareFeedbackStore=this;return get.call(this);};
   });
   await page.waitForFunction(()=>!!window.__shareFeedbackStore);
   await page.evaluate(async()=>{const {tickStory55}=await import('/src/services/story55/runtime.js');window.__shareFeedbackStore.update(s=>{s.clock='12:00';tickStory55(s);});});
  }
  if(takeovers<2){
   await page.getByText(takeovers===0?'？':'又來？',{exact:true}).waitFor({state:'visible'});
   const final=await saved(),p=final.story55.ghostShare;
   assert.equal(p.script,takeovers===0?'first':'second');
   assert.equal(final.story55.ghostShareTakeovers,takeovers);
   assert.equal(await page.getByText('你真的會寫代碼嗎？',{exact:true}).count(),0);
   assert.equal(await page.getByText('我很忙，你自己處理',{exact:true}).count(),0);
   await page.screenshot({path:output+'/share-guaranteed-'+takeovers+'-'+(offline?'offline':'online')+'.png'});
   results.push({takeovers,offline,script:p.script,phase:p.phase});
   await context.close();continue;
  }
  await page.getByText('你真的會寫代碼嗎？',{exact:true}).waitFor({state:'visible'});
  const firstAt=Date.now();assert.ok(firstAt-started>=2400,'refusal must not appear instantly');
  await page.getByText('我很忙，你自己處理',{exact:true}).waitFor({state:'visible'});
  const final=await saved(),p=final.story55.ghostShare;
  assert.equal(p.phase,'refused');assert.equal(final.story55.ghostShareTakeovers,takeovers);
  assert.equal(final.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.filter(m=>m.id===p.cardId).length,1);
  await page.screenshot({path:output+'/share-refusal-'+(offline?'offline':'online')+'.png'});
  results.push({takeovers,offline,sizes,firstReplyAfterMs:firstAt-started,phase:p.phase});
  await context.close();
 }
 assert.deepEqual(errors,[]);writeFileSync(output+'/share-feedback-results.json',JSON.stringify(results,null,2));
 console.log('PASS share confirmation, guaranteed first two, later refusal, offline resume and reply pacing',JSON.stringify(results));
}finally{await browser.close();}
