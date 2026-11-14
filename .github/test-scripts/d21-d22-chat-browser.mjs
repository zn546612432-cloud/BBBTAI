import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {initialState} from '../../src/services/storage.js';
import {activateStory55} from '../../src/services/story55/runtime.js';
import {D14_D24_TRACKS} from '../../src/story/d14-d24/wechat.js';

const base=process.env.WECHAT_QA_URL||'http://127.0.0.1:5173/';
const storeKey='ximeng-phone-story55-v1';
const output='d21-d22-browser-results';
mkdirSync(output,{recursive:true});

function scenario(day,kind='chat'){
 const s=activateStory55(initialState());s.story55.minutesPerSecond=0;
 s.day=day;s.clock=day===21?'18:42':day===22?'15:20':'10:00';s.unlocked=true;
 if(kind==='chat'){
  const track=D14_D24_TRACKS.find(x=>x.name==='D'+day)?.track;
  assert.ok(track);
  track.tick(s,1000000);
  for(let i=1;i<=10;i++)track.tick(s,1000000+i*2100);
 }
 s.nav.current={appId:'wechat',route:kind==='missing'?'/chat/missing-identity':'/chat/group',params:{}};
 return s;
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
async function open(state,viewport){
 const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:viewport.width<=430,hasTouch:viewport.width<=430});
 await context.addInitScript(({key,value})=>{localStorage.setItem(key,value);},{key:storeKey,value:JSON.stringify(state)});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('[data-action="unlock"]').click();
 for(const digit of '0816')await page.locator('[data-action="passcode-key"][data-key="'+digit+'"]').click();
 await page.waitForFunction(()=>!document.querySelector('#phone')?.classList.contains('show-passcode'));
 await page.waitForTimeout(1800);
 // D21/D22 may surface a backlog of unrelated historical banners after a day jump.
 // Keep screenshot evidence on the native chat surface without waiting for an
 // unrelated, continuously rotating notification queue to clear.
 await page.addStyleTag({content:'#toast{visibility:hidden!important;pointer-events:none!important}'});
 return {page,context};
}
try{
 const d21=await open(scenario(21),{width:390,height:844});
 await d21.page.locator('.wx-conversation[data-wx-conversation="group"]').waitFor();
 assert.equal(await d21.page.locator('[data-key^="message-d21-after-training-"]').count(),6);
 assert.equal(await d21.page.locator('[data-key^="message-d21-clothes-"]').count(),6,'the earlier clothes chat is preserved');
 assert.equal(await d21.page.locator('[data-key="message-d21-after-training-3"]').innerText().then(s=>s.includes('醫療包還有嗎？')),true);
 await d21.page.locator('[data-key="message-d21-after-training-5"]').scrollIntoViewIfNeeded();
 await d21.page.screenshot({path:output+'/mobile-d21-training-and-medical-kit.png',fullPage:true});
 await d21.context.close();

 const d22=await open(scenario(22),{width:390,height:844});
 await d22.page.locator('.wx-conversation[data-wx-conversation="group"]').waitFor();
 assert.equal(await d22.page.locator('[data-key^="message-d22-training-check-"]').count(),5);
 assert.ok((await d22.page.locator('.wx-chat-messages').innerText()).includes('腿要廢了'));
 await d22.page.locator('[data-key="message-d22-training-check-4"]').scrollIntoViewIfNeeded();
 await d22.page.screenshot({path:output+'/mobile-d22-training-chat.png',fullPage:true});
 await d22.context.close();

 const desktop=await open(scenario(21),{width:1280,height:900});
 await desktop.page.locator('.wx-conversation[data-wx-conversation="group"]').waitFor();
 assert.equal(await desktop.page.locator('[data-key^="message-d21-after-training-"]').count(),6);
 await desktop.page.locator('[data-key="message-d21-after-training-5"]').scrollIntoViewIfNeeded();
 await desktop.page.screenshot({path:output+'/desktop-d21-training-chat.png',fullPage:true});
 await desktop.context.close();

 const empty=await open(scenario(20,'none'),{width:390,height:844});
 await empty.page.locator('.wx-conversation[data-wx-conversation="group"]').waitFor();
 assert.equal(await empty.page.locator('[data-key^="message-d21-after-training-"]').count(),0);
 assert.equal(await empty.page.locator('[data-key^="message-d22-training-check-"]').count(),0);
 await empty.page.screenshot({path:output+'/mobile-before-d21.png',fullPage:true});
 await empty.context.close();

 const error=await open(scenario(21,'missing'),{width:390,height:844});
 await error.page.getByText('对话不存在',{exact:true}).waitFor();
 await error.page.screenshot({path:output+'/mobile-missing-chat.png',fullPage:true});
 await error.context.close();

 assert.deepEqual(errors,[]);
 console.log('PASS D21-D22 native WeChat: mobile, desktop, no premature messages, missing-chat error');
}finally{await browser.close();}
