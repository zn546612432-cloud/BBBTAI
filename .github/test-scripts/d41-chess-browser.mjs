import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
import {initialState} from '../../src/services/storage.js';
import {activateStory55,advanceScene55,scene55,sceneLines} from '../../src/services/story55/runtime.js';
import {rebuildStory55AtDay} from '../../src/services/story55/rebuild.js';
import {sendScriptedDraft55} from '../../src/services/story55/scripted-chat.js';
import {completed} from '../../src/services/story55/state.js';
import {offerD41ChessInvitation,D41_CHESS_INVITATION} from '../../src/services/invitations.js';
import {D41_CALL} from '../../src/story/d34-d42/definition.js';
const key='ximeng-phone-story55-v1',s=initialState();activateStory55(s);rebuildStory55AtDay(s,41,'23:40');s.unlocked=true;
while(!completed(s,'d41-opening')){const [who,text]=sceneLines(s,'d41-opening')[scene55(s,'d41-opening').index];if(who==='me')sendScriptedDraft55(s,'wechat','group',text);else advanceScene55(s,'d41-opening');}
s.story55.d41CallTriggered=true;s.story55.scriptedCallCompleted={[D41_CALL.id]:true};offerD41ChessInvitation(s);s.nav.current={appId:'chess',route:'/invitation',params:{invitationId:D41_CHESS_INVITATION}};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key,value:JSON.stringify(s)});
mkdirSync('d23-chess-browser-results/d41',{recursive:true});
const page=await context.newPage(),errors=[],tts=[];page.on('pageerror',e=>errors.push(e.message));
// Use actual browser audio playback with a short synthetic WAV; no live key is used.
const wav=Buffer.alloc(44+2400);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(2400,40);
await page.route('**/api/voice/tts',async route=>{tts.push(route.request().postDataJSON().text);await route.fulfill({status:200,contentType:'audio/wav',body:wav});});
try{
 await page.goto(process.env.CHESS_LOCAL_URL||'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 const boot=page.locator('#xm-boot-next');if(await boot.count()){await boot.click({timeout:45000});await page.locator('#xm-boot').waitFor({state:'detached',timeout:45000});}
 await page.locator('[data-action="unlock"]').click();for(const digit of '0816')await page.locator('[data-action="passcode-key"][data-key="'+digit+'"]').click();
 await page.locator('[data-action="accept-bridge"]').click({timeout:15000});
 await page.getByText('Opening with a little pawn.',{exact:true}).waitFor({timeout:15000});
 console.log('first cue and board visible',await page.locator('.board-grid .chess-piece img').count());
 assert.equal(await page.locator('[data-action="resign-match"]').count(),0);
 const match=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)).matches.find(x=>x.invitationId==='s55-d41-chess-invite'),key);
 await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).matches.find(x=>x.invitationId==='s55-d41-chess-invite')?.history.length===36,key,{timeout:90000});
 const input=page.locator('.chess-chat-form input');await page.waitForFunction(()=>document.querySelector('.chess-chat-form input')?.value==='Checkmate.'&&!document.querySelector('.chess-chat-form button')?.disabled);
 assert.equal((await match()).status,'active');assert.equal((await match()).chat.length,6);assert.equal(await input.inputValue(),'Checkmate.');
 await input.scrollIntoViewIfNeeded();await page.screenshot({path:'d23-chess-browser-results/d41/before-send.png'});
 await page.locator('.chess-chat-form button').click();
 await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).matches.find(x=>x.invitationId==='s55-d41-chess-invite')?.d41Script.completed,key,{timeout:15000});
 const final=await match();assert.equal(final.history.length,37);assert.equal(final.history.at(-1).san,'Qh7#');assert.equal(final.result,'player-win');assert.equal(final.chat.length,8);assert.equal(tts.length,7);
 await page.locator('.board-frame').scrollIntoViewIfNeeded();await page.screenshot({path:'d23-chess-browser-results/d41/checkmate.png'});
 assert.deepEqual(errors,[]);console.log('D41 MOBILE PASS',JSON.stringify({url:page.url(),title:await page.title(),plies:final.history.length,voiceCount:tts.length,final:final.history.at(-1).san,result:final.result,errors}));
}finally{await browser.close();}
