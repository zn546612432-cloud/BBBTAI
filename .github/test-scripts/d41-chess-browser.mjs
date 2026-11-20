import assert from 'node:assert/strict';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import {mkdirSync} from 'node:fs';
import {initialState} from '../../src/services/storage.js';
import {activateStory55,advanceScene55,scene55,sceneLines} from '../../src/services/story55/runtime.js';
import {rebuildStory55AtDay} from '../../src/services/story55/rebuild.js';
import {sendScriptedDraft55} from '../../src/services/story55/scripted-chat.js';
import {completed} from '../../src/services/story55/state.js';
import {D41_CHESS_INVITATION} from '../../src/services/invitations.js';
import {D41_CALL} from '../../src/story/d34-d42/definition.js';
const key='ximeng-phone-story55-v1',s=initialState();activateStory55(s);rebuildStory55AtDay(s,41,'23:40');s.unlocked=true;
while(!completed(s,'d41-opening')){const [who,text]=sceneLines(s,'d41-opening')[scene55(s,'d41-opening').index];if(who==='me')sendScriptedDraft55(s,'wechat','group',text);else advanceScene55(s,'d41-opening');}
s.nav.current={appId:'home',route:'/',params:{}};
const browser=await (process.env.CHESS_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:process.env.CHESS_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']}));
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key,value:JSON.stringify(s)});
mkdirSync('d23-chess-browser-results/d41',{recursive:true});
const page=await context.newPage(),errors=[],tts=[];page.on('pageerror',e=>errors.push(e.message));
// Use the published MP3 recordings. Force one transient load failure while
// ensuring the game recovers without skipping audio or spending live quota.
const wav=Buffer.alloc(44+2400);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(2400,40);
let bishopAttempts=0,bishopFileAttempts=0;const recordings=new Set();
await page.route('**/api/voice/tts',async route=>{
 const text=route.request().postDataJSON().text;tts.push(text);
 if(text.includes('Go bishop')&&++bishopAttempts===1){await new Promise(r=>setTimeout(r,12000));await route.fulfill({status:503,body:'temporary test failure'});return;}
 await route.fulfill({status:200,contentType:'audio/wav',body:wav});
});
await page.route('**/assets/story55/d41-d42/*.mp3',async route=>{
 const file=new URL(route.request().url()).pathname.split('/').at(-1);recordings.add(file);
 if(file==='d41-chess-19.mp3'&&++bishopFileAttempts===1){await route.fulfill({status:404,body:''});return;}
 await route.continue();
});
try{
 await page.goto(process.env.CHESS_LOCAL_URL||'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 const boot=page.locator('#xm-boot-next');if(await boot.count()){await boot.click({timeout:45000});await page.locator('#xm-boot').waitFor({state:'detached',timeout:45000});}
 await page.locator('[data-action="unlock"]').click();for(const digit of '0816')await page.locator('[data-action="passcode-key"][data-key="'+digit+'"]').click();
 await page.locator('[data-action="tai-banner-accept"]').click({timeout:15000});
 const draft=page.locator('form[data-form="tai-call-turn"]');
 for(const i of [1,2]){
  await page.waitForFunction(text=>document.querySelector('form[data-form="tai-call-turn"] input')?.value===text,D41_CALL.steps[i][1],{timeout:15000});
  await draft.locator('button[type=submit]').click();
 }
 await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).invitations.some(i=>i.id==='s55-d41-chess-invite'),key,{timeout:20000});
 assert.equal(await page.locator('.tai-native-call .invite-card').count(),0);
 await page.locator('[data-action="tai-minimize-call"]').click();
 await page.locator('[data-action="page"][data-page="2"]').click();
 await page.locator('[data-action="open-app"][data-app="noapp"]:visible').first().click();
 await page.locator('[data-action="open-chat"][data-id="tai"]').click();
 await page.locator('.invite-card [data-action="accept-invite"][data-id="s55-d41-chess-invite"]').click({timeout:20000});
 assert.equal(await page.locator('.invite-page-symbol').count(),0);
 await page.getByText('Opening with a little pawn.',{exact:true}).waitFor({timeout:15000});
 console.log('first cue and board visible',await page.locator('.board-grid .chess-piece img').count());
 assert.equal(await page.locator('[data-action="resign-match"]').count(),0);
 const match=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)).matches.find(x=>x.invitationId==='s55-d41-chess-invite'),key);
 await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).matches.find(x=>x.invitationId==='s55-d41-chess-invite')?.history.length===36,key,{timeout:90000});
 const input=page.locator('.chess-chat-form input');await page.waitForFunction(()=>document.querySelector('.chess-chat-form input')?.value==='Checkmate.'&&!document.querySelector('.chess-chat-form button')?.disabled);
 assert.equal((await match()).status,'active');assert.equal((await match()).chat.length,5);assert.equal(await input.inputValue(),'Checkmate.');
 await input.scrollIntoViewIfNeeded();await page.screenshot({path:'d23-chess-browser-results/d41/before-send.png'});
 await page.locator('.chess-chat-form button').click();
 await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).matches.find(x=>x.invitationId==='s55-d41-chess-invite')?.d41Script.completed,key,{timeout:15000});
 const final=await match();assert.equal(final.history.length,37);assert.equal(final.history.at(-1).san,'Qh7#');assert.equal(final.result,'player-win');assert.equal(final.chat.length,7);
 assert.deepEqual(final.d41Script.spoken,[1,7,19,25,31,37]);assert.equal(final.d41Script.voiceUnavailable,undefined);
 assert.equal(await page.locator('[data-action="d41-retry-voice"],[data-action="d41-skip-voice"],[data-action="tai-scripted-next"]').count(),0);
 assert.equal(tts.filter(t=>t.includes('恭喜')).length,0);
 assert.equal(bishopAttempts,1);assert.equal(bishopFileAttempts,2);assert.equal(tts.length,1);
 assert.equal(recordings.size,10);assert.ok(!recordings.has('d41-chess-13.mp3'));
 await page.locator('.board-frame').scrollIntoViewIfNeeded();await page.screenshot({path:'d23-chess-browser-results/d41/checkmate.png'});
 assert.deepEqual(errors,[]);console.log('D41 MOBILE PASS',JSON.stringify({url:page.url(),title:await page.title(),plies:final.history.length,voiceCount:tts.length,final:final.history.at(-1).san,result:final.result,errors}));
}finally{await browser.close();}
