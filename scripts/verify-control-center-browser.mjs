import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const output='qa/control-center';await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['server/dev.mjs'],{env:{...process.env,PORT:'5173'},stdio:'inherit'});
let browser;
try{
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5173')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];
 // Expose the actual store only in this test response; production modules stay unchanged.
 await page.route('**/src/main.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nexport {store};'});});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173');await page.waitForSelector('.status-control-trigger');
 // The intro can be skipped by its real "continue" button once ready, or ends itself.
 await page.locator('#xm-boot-next').waitFor({state:'visible',timeout:45000});await page.locator('#xm-boot-next').click();await page.locator('#xm-boot').waitFor({state:'detached'});
 const cdp=await context.newCDPSession(page);
 const swipe=async(x,y,endX,endY)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(endX-x)*i/12,y:y+(endY-y)*i/12}]});}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(550);};
 await swipe(370,32,360,260);assert.equal(await page.locator('#phone').evaluate(el=>el.classList.contains('control-center-open')),true);
 assert.equal(await page.locator('.cc-not-playing').count(),1);assert.equal(await page.locator('.cc-album').count(),0);assert.equal(await page.locator('.cc-track-title').count(),0);
 for(const key of ['airplane','airdrop','wifi','cellular','bluetooth','hotspot','vpn','rotationLock','lowPower']){
  const button=page.locator(`[data-cc="toggle-${key}"]`),initial=await button.getAttribute('aria-pressed');await button.tap();assert.notEqual(await button.getAttribute('aria-pressed'),initial);await button.tap();assert.equal(await button.getAttribute('aria-pressed'),initial);
 }
 await page.getByRole('button',{name:'一鍵靜音',exact:true}).first().tap();assert.equal(await page.locator('.cc-mute').getAttribute('aria-pressed'),'true');
 const result=await page.evaluate(async()=>{const {registerAudio,audioDestination}=await import('/src/system/audio/index.js');const a=registerAudio(new Audio('/assets/night.wav'));const c=new AudioContext();window.ccTest={a,c,g:audioDestination(c)};return {volume:a.volume,gain:window.ccTest.g.gain.value};});assert.deepEqual(result,{volume:0,gain:0});
 for(const width of [320,390,430]){await page.setViewportSize({width,height:width===320?640:width===390?844:932});await page.waitForTimeout(300);const box=await page.locator('.cc-grid').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y+box.height<(width===320?640:width===390?844:932));await page.screenshot({path:`${output}/control-center-${width}.png`});}
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'取消靜音',exact:true}).first().tap();assert.equal(await page.evaluate(()=>window.ccTest.a.volume),.7);assert.ok(Math.abs(await page.evaluate(()=>window.ccTest.g.gain.value)-.7)<.00001);
 await page.locator('[data-cc-slider="volume"]').evaluate(el=>{el.value='35';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.evaluate(()=>window.ccTest.a.volume),.35);
 await page.getByRole('button',{name:'一鍵靜音',exact:true}).first().tap();
 await page.reload();await page.waitForSelector('.status-control-trigger');await page.locator('#xm-boot-next').waitFor({state:'visible',timeout:45000});await page.locator('#xm-boot-next').click();await page.locator('#xm-boot').waitFor({state:'detached'});
 await page.locator('.status-control-trigger').tap();assert.equal(await page.locator('.cc-mute').getAttribute('aria-pressed'),'true');
 await page.locator('.cc-dismiss').tap();assert.equal(await page.locator('#phone').evaluate(el=>el.classList.contains('control-center-open')),false);
 await page.locator('[data-action="unlock"]').tap();for(const digit of ['0','8','1','6'])await page.locator(`[data-action="passcode-key"][data-key="${digit}"]`).tap();await page.waitForSelector('.home-screen');
 await page.locator('.status-control-trigger').tap();
 await page.locator('.cc-mute').tap(); // restore sound: DND must remain independent.
 await page.locator('[data-cc="toggle-focus"]').tap();assert.equal(await page.locator('.cc-focus').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.cc-mute').getAttribute('aria-pressed'),'false');
 await page.locator('.cc-dismiss').tap();
 const incoming=async(messageId,text)=>page.evaluate(async({messageId,text})=>{const {store}=await import('/src/main.js');const {appendAuthoredPhoneMessage}=await import('/src/services/messaging/phone-messages.js');store.update(s=>appendAuthoredPhoneMessage(s,{conversationId:'group',messageId,from:'阿威',text}));return {notice:store.get().notifications.find(n=>n.messageId===messageId),unread:store.get().content.conversations.wechat.find(c=>c.id==='group').unread};},{messageId,text});
 const quiet=await incoming('cc-focus-incoming','勿擾期間的訊息');assert.equal(quiet.notice.bannerSuppressed,true);assert.ok(quiet.unread>0);await page.waitForTimeout(500);assert.ok(!(await page.locator('#toast').getAttribute('data-notice-id')));
 await page.locator('.status-control-trigger').tap();await page.locator('[data-cc="toggle-focus"]').tap();await page.locator('.cc-dismiss').tap();
 const normal=await incoming('cc-normal-incoming','提醒已恢復');await page.waitForFunction(id=>document.querySelector('#toast')?.dataset.noticeId===id,normal.notice.id);assert.ok(normal.unread>quiet.unread);
 await page.locator('.status-control-trigger').tap();
 await page.getByRole('button',{name:'播放',exact:true}).tap();await page.waitForSelector('.cc-media.is-playing');assert.equal(await page.locator('.cc-album').count(),1);await page.screenshot({path:`${output}/playing.png`});await page.getByRole('button',{name:'暫停',exact:true}).tap();await page.waitForSelector('.cc-not-playing');assert.equal(await page.locator('.cc-album').count(),0);
 await page.locator('[data-cc="toggle-focus"]').tap();await page.locator('.cc-mute').tap();
 for(const width of [320,390,430]){await page.setViewportSize({width,height:width===320?640:width===390?844:932});await page.waitForTimeout(200);for(const node of await page.locator('.cc-connections button').all()){const b=await node.boundingBox(),card=await page.locator('.cc-connections').boundingBox();assert.ok(b.x>=card.x&&b.y>=card.y&&b.x+b.width<=card.x+card.width+1&&b.y+b.height<=card.y+card.height+1);}await page.screenshot({path:`${output}/native-idle-${width}.png`});}
 await page.setViewportSize({width:390,height:844});

 await swipe(190,700,190,530);assert.equal(await page.locator('#phone').evaluate(el=>el.classList.contains('control-center-open')),false);
 await swipe(35,30,35,240);assert.equal(await page.locator('#shade-layer').evaluate(el=>el.classList.contains('is-present')),true);
 assert.deepEqual(errors,[]);await writeFile(`${output}/result.json`,JSON.stringify({passed:true,viewports:[320,390,430],checks:['touch swipe open','one tap mute','active and new media/WebAudio','restore volume','slider','refresh persistence','upward close','left notifications','all connectivity toggles','separate DND and silent','DND delivery without banners','new banners after DND off','no idle album','actual music playback metadata','connectivity button bounds'],errors},null,2));
 console.log('Control center mobile checks passed');
}finally{await browser?.close();server.kill();}
