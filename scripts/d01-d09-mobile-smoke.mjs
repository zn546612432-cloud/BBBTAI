// Mobile browser acceptance for the isolated D01–D09 review.
// Runs against the generated GitHub Pages build, not mocked UI components.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,devices} from 'playwright';

const url=process.env.SMOKE_URL||'http://127.0.0.1:8765/BBBTAI/review/d01-d09-20261107/';
const report=resolve(process.env.SMOKE_OUTPUT_DIR||'qa-results');
await mkdir(report,{recursive:true});
const issues=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({...devices['iPhone 13'],reducedMotion:'reduce'});
const page=await context.newPage();
page.on('pageerror',e=>issues.push(e.message));

const timeout=90000;
async function unlock(){
 await page.locator('.lock-screen').waitFor({timeout});
 await page.locator('[data-action="unlock"]').click();
 await page.locator('[data-action="passcode-key"][data-key="0"]').waitFor({timeout:20000});
 for(const digit of '0816')await page.locator('[data-action="passcode-key"][data-key="'+digit+'"]').click();
 await page.locator('.home-screen').waitFor({timeout:20000});
}
async function openMoments(){
 await page.locator('.home-screen [data-action="open-app"][data-app="wechat"]').click();
 await page.locator('.wx-screen').waitFor();
 await page.locator('[data-action="wx-tab"][data-tab="discover"]').click();
 await page.locator('[data-action="wx-open-entry"][data-label="朋友圈"]').click();
 await page.locator('.wx-moments-screen').waitFor();
}
try{
 console.log('MOBILE_SMOKE_START',url);
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout});
 assert.equal(response?.status(),200,'review entry must return HTTP 200');
 await unlock();
 await openMoments();
 const initialPosts=await page.locator('.wx-moments-post').count();
 assert.ok(initialPosts>0,'D01 Moments include at least one post');
 assert.equal(await page.locator('.wx-moments-post[data-key^="hf-"]').count(),0,'retired Hu Feng authored Moments must be absent');
 await page.screenshot({path:resolve(report,'fresh-d01-moments.png')});
 console.log('MOBILE_SMOKE_D01',JSON.stringify({initialPosts}));

 // Emulate a *real serialized earlier-save shape*, not an in-memory mock:
 // let PhoneStore load and migrate the payload after a browser reload.
 await page.evaluate(()=>{
   const suffix=(location.pathname.match(/\/review\/([a-z0-9-]+)\//i)||[])[1];
   const key='ximeng-phone-story55-review-'+suffix;
   const saved=JSON.parse(localStorage.getItem(key));
   if(!saved?.story55||saved.day!==1)throw Error('missing D01 preview save fixture');
   saved.day=8;saved.clock='22:15';saved.batteryPercent=75;
   saved.unlocked=false;saved.nav.current={appId:'home',route:'/',params:{}};
   saved.nav.stack=[];
   saved.story55.legacyHuFengPlotRetired=false;
   const friend=saved.content.conversations.wechat.find(c=>c.id==='hufeng');
   friend.messages.push({id:'historic-friend-2024',from:'胡枫',text:'好久不見',day:1,time:'09:30',sentDate:'2024-03-10'});
   friend.messages.push({id:'d04-hufeng-am-0',from:'胡枫',text:'阿蒙',day:4,time:'09:50',sentDate:'2025-05-22',storyD04:true});
   friend.messages.push({id:'d04-hufeng-am-2',from:'me',text:'有',day:4,time:'09:51',sentDate:'2025-05-22',storyD04:true});
   const group=saved.content.conversations.wechat.find(c=>c.id==='group');
   group.messages.push({id:'player-group-kept',from:'me',text:'玩家自己發過的話',day:7,time:'20:00',sentDate:'2025-05-25'});
   saved.content.moments??={};
   saved.content.moments.posts??=[];
   saved.content.moments.posts.push({id:'player-moment-kept',storyDay:8,author:'熙蒙',publishedAt:'2025-05-26T18:00',text:'玩家自己的朋友圈',media:[],comments:[],likes:[]});
   saved.content.moments.editedPosts??={};
   saved.content.moments.editedPosts['hf-0519']={id:'hf-0519',storyDay:1,author:'胡枫',publishedAt:'2025-05-19T12:16',text:'舊稿改過的胡楓朋友圈',media:[],comments:[]};
   saved.story55.wishes={records:{'d06-shoes':{id:'d06-shoes',status:'delivered',purchasedDay:6}},story:{lines:[{id:'wish-shoes-photo',wishRewardId:'d06-shoes'}],delivered:[],nextAt:0,d07Started:true}};
   saved.content.reminders??=[];
   saved.content.reminders.push({id:'saved-shoes-old',wishId:'d06-shoes',done:true});
   saved.bankData.transactions??=[];
   saved.bankData.transactions.push({id:'wish-purchase-d06-shoes',wishId:'d06-shoes',amount:-180});
   saved.bankData.balance=500;
   localStorage.setItem(key,JSON.stringify(saved));
 });
 await page.reload({waitUntil:'domcontentloaded',timeout});
 await page.locator('.lock-screen').waitFor({timeout});
 // The constructor/scheduler must migrate old authored content before unlock.
 await page.waitForFunction(()=>{
   const part=(location.pathname.match(/\/review\/([a-z0-9-]+)\//i)||[])[1];
   const s=JSON.parse(localStorage.getItem('ximeng-phone-story55-review-'+part)||'null');
   return s?.story55?.legacyHuFengPlotRetired===true;
 },{timeout:30000});
 const state=await page.evaluate(()=>{
   const suffix=(location.pathname.match(/\/review\/([a-z0-9-]+)\//i)||[])[1];
   return JSON.parse(localStorage.getItem('ximeng-phone-story55-review-'+suffix));
 });
 assert.equal(state.day,8,'older save must stay at D08');
 const hufeng=state.content.conversations.wechat.find(c=>c.id==='hufeng');
 assert.ok(hufeng.messages.some(m=>m.id==='historic-friend-2024'),'pre-D01 history preserved');
 assert.ok(!hufeng.messages.some(m=>m.id?.startsWith('d04-hufeng-am-')),'retired authored repair messages removed');
 assert.ok(state.content.conversations.wechat.find(c=>c.id==='group').messages.some(m=>m.id==='player-group-kept'),'player messages preserved');
 assert.ok(state.content.moments.posts.some(p=>p.id==='player-moment-kept'),'player Moments preserved');
 assert.ok(!state.content.reminders.some(r=>r.wishId==='d06-shoes'),'retired shoe purchase reminders removed');
 assert.ok(state.bankData.transactions.some(x=>x.id==='wish-purchase-d06-shoes'),'already-paid financial history retained');
 assert.equal(state.bankData.balance,500,'balance must not be debited again');
 assert.ok(!state.story55.wishes.story.lines.some(x=>x.wishRewardId==='d06-shoes'),'retired shoe photos not queued');
 await unlock();
 await page.locator('.home-screen [data-action="open-app"][data-app="wechat"]').click();
 await page.locator('.wx-screen').waitFor();
 await page.locator('[data-action="open-chat"][data-id="group"]').click();
 await page.locator('.wx-conversation').waitFor();
 await page.locator('.wx-conversation').getByText('最近好無聊，我有點想老頭子了。',{exact:true}).waitFor({timeout:25000});
 await page.screenshot({path:resolve(report,'old-save-d08-group.png')});
 console.log('MOBILE_SMOKE_OLD_SAVE',JSON.stringify({day:state.day,balance:state.bankData.balance,historyKept:true,retiredRemoved:true,groupRendered:true}));
 if(issues.length)console.warn('MOBILE_PAGE_ERRORS',JSON.stringify(issues.slice(0,8)));
 console.log('MOBILE_SMOKE_PASS');
}finally{
 await context.close();
 await browser.close();
}
