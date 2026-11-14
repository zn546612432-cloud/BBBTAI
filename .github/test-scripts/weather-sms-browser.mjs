import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {initialState} from '../../src/services/storage.js';
import {activateStory55,tickStory55} from '../../src/services/story55/runtime.js';
import {appendAuthoredPhoneMessage} from '../../src/services/messaging/phone-messages.js';

const base=process.env.WEATHER_SMS_QA_URL||'http://127.0.0.1:5173/';
const key='ximeng-phone-story55-v1',output='weather-sms-qa-results';
mkdirSync(output,{recursive:true});
function scenario(day,clock,appId='weather',route='/city/macau'){
 const s=activateStory55(initialState());
 s.story55.minutesPerSecond=0;s.day=day;s.clock=clock;s.unlocked=true;
 tickStory55(s);s.nav.current={appId,route,params:{}};return s;
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
async function open(s,viewport={width:390,height:844}){
 const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:viewport.width<=430,hasTouch:viewport.width<=430});
 await context.addInitScript(({k,v})=>localStorage.setItem(k,v),{k:key,v:JSON.stringify(s)});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.locator('[data-action="unlock"]').click();
 for(const digit of '0816')await page.locator('[data-action="passcode-key"][data-key="'+digit+'"]').click();
 await page.waitForFunction(()=>!document.querySelector('#phone')?.classList.contains('show-passcode'));
 await page.addStyleTag({content:'#toast{visibility:hidden!important;pointer-events:none!important}'});
 return {context,page};
}
try{
 const avatar=await open(scenario(23,'11:41','wechat','/chat/group'));
 // A traditional-named NPC bubble exposes the same avatar resolver as the
 // real D20 group scene; without changing plot progress or triggering drafts.
 await avatar.context.close();

 const s= scenario(23,'11:41','wechat','/chat/group');
 appendAuthoredPhoneMessage(s,{channel:'wechat',conversationId:'group',messageId:'qa-hufeng-photo',from:'胡楓',text:'我晚點看。',day:23,clock:'11:41',sentDate:'2025-06-10',notify:false});
 const face=await open(s);
 await face.page.locator('[data-key="message-qa-hufeng-photo"] img').waitFor();
 const src=await face.page.locator('[data-key="message-qa-hufeng-photo"] img').getAttribute('src');
 assert.match(src||'',/\/apps\/wechat\/avatars\/originals\/hufeng\.jpeg$/);
 assert.equal(await face.page.locator('[data-key="message-qa-hufeng-photo"] img').evaluate(i=>i.complete&&i.naturalWidth>0),true);
 await face.page.locator('[data-key="message-qa-hufeng-photo"]').scrollIntoViewIfNeeded();
 await face.page.screenshot({path:output+'/mobile-hufeng-restored.png',fullPage:true});
 await face.context.close();

 const heat=await open(scenario(23,'11:41'));
 await heat.page.locator('.weather-detail-temp').waitFor();
 assert.equal((await heat.page.locator('.weather-detail-temp').innerText()).trim(),'32°');
 await heat.page.getByText('體感溫度 39° · 戶外悶熱',{exact:true}).waitFor();
 assert.equal(await heat.page.locator('.weather-signal-banner').count(),0);
 await heat.page.screenshot({path:output+'/mobile-d23-hot-weather.png',fullPage:true});
 await heat.context.close();

 const wind=await open(scenario(24,'08:20'));
 await wind.page.locator('.weather-signal-banner').waitFor();
 assert.ok((await wind.page.locator('.weather-signal-banner').innerText()).includes('一號風球'));
 await wind.page.screenshot({path:output+'/mobile-d24-signal1-weather.png',fullPage:true});
 await wind.context.close();

 const sms=await open(scenario(24,'08:20','messages','/chat/macau-meteorological-bureau'));
 await sms.page.locator('.ios-msg-conversation').waitFor();
 assert.equal(await sms.page.locator('.ios-chat-line').count(),3);
 assert.ok((await sms.page.locator('.ios-chat-scroll').innerText()).includes('一號風球'));
 await sms.page.locator('.ios-chat-line').last().scrollIntoViewIfNeeded();
 await sms.page.screenshot({path:output+'/mobile-d24-weather-sms.png',fullPage:true});
 await sms.context.close();

 const storm=await open(scenario(25,'06:00'));
 await storm.page.locator('.weather-signal-banner').waitFor();
 assert.ok((await storm.page.locator('.weather-signal-banner').innerText()).includes('三號風球'));
 await storm.page.screenshot({path:output+'/mobile-d25-signal3-weather.png',fullPage:true});
 await storm.context.close();

 const late=await open(scenario(25,'18:00'));
 await late.page.locator('.weather-signal-banner').waitFor();
 assert.ok((await late.page.locator('.weather-signal-banner').innerText()).includes('一號風球'));
 await late.page.screenshot({path:output+'/mobile-d25-signal1-evening.png',fullPage:true});
 await late.context.close();
 assert.deepEqual(errors,[]);
 console.log('PASS original Hu Feng picture and D23-D25 Macau Weather/SMS mobile screen QA');
}finally{await browser.close();}
