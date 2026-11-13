import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {initialState} from '../../src/services/storage.js';
import {activateStory55,advanceScene55} from '../../src/services/story55/runtime.js';
import {story55Config} from '../../src/services/story55/state.js';
import {sendScriptedDraft55} from '../../src/services/story55/scripted-chat.js';
import {startAcceptedInvitation} from '../../src/services/invitations.js';

const base=process.env.CHESS_LOCAL_URL||'http://127.0.0.1:5173/';
const key='ximeng-phone-story55-v1',out='d23-chess-browser-results';
mkdirSync(out,{recursive:true});
function seed({empty=false,failed=false}={}){
 const s=activateStory55(initialState());s.day=23;s.clock='22:30';s.unlocked=true;s.story55.minutesPerSecond=0;
 if(!empty){
  s.story55.activeScene='d23-chess';
  for(const [who,text] of story55Config(s).scenes['d23-chess']){
   if(who==='me')sendScriptedDraft55(s,'mirage','s55-ouroboros',text);
   else advanceScene55(s,'d23-chess');
  }
  const invitation=s.invitations.find(x=>x.source==='d23-mirage-story');
  assert.ok(invitation,'D23 must produce an accepted invitation');
  const store={get:()=>s,update:fn=>fn(s)};
  const id=startAcceptedInvitation(store,invitation.id);
  if(failed){
   const m=s.matches.find(m=>m.id===id);
   m.pgn='1. e4';m.turn='b';m.history=[{from:'e2',to:'e4',san:'e4',by:'player'}];
   m.engineError='國際象棋引擎載入失敗';
  }
  s.nav.current={appId:'chess',route:'/match/'+id,params:{}};
 }else s.nav.current={appId:'chess',route:'/',params:{}};
 return s;
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
async function open(state,{width,height}){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<=430,hasTouch:width<=430});
 await context.addInitScript(({key,value})=>{localStorage.setItem(key,value);},{key,value:JSON.stringify(state)});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 // Phone boot intentionally relocks restored sessions; unlock through the real UI.
 await page.locator('[data-action="unlock"]').click();
 for(const digit of '0816')await page.locator('[data-action="passcode-key"][data-key="'+digit+'"]').click();
 // All screenshots must show the settled phone, not the unlock transition or banner.
 await page.waitForFunction(()=>!document.querySelector('#phone')?.classList.contains('show-passcode'));
 await page.waitForTimeout(1100);
 const banner=page.locator('#toast.visible');
 if(await banner.count())await banner.waitFor({state:'hidden',timeout:7000});
 return {page,context};
}
try{
 const mobile=await open(seed(),{width:390,height:844});
 await mobile.page.locator('.board-grid [data-action="square"]').first().waitFor();
 assert.equal(await mobile.page.locator('.board-grid [data-action="square"]').count(),64);
 await mobile.page.locator('[data-action="square"][data-square="e2"]').click();
 await mobile.page.locator('[data-action="square"][data-square="e4"]').click();
 await mobile.page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.matches.some(m=>m.opponent==='tai'&&m.history.length===2&&m.history.at(-1).by==='stockfish');
 },key,{timeout:30000});
 const played=await mobile.page.evaluate(k=>JSON.parse(localStorage.getItem(k)).matches.find(m=>m.opponent==='tai'),key);
 assert.equal(played.history.length,2);
 assert.equal(played.history.at(-1).by,'stockfish');
 assert.equal(played.engineError,undefined);
 await mobile.page.screenshot({path:out+'/mobile-stockfish-move.png',fullPage:true});
 await mobile.context.close();

 const desktop=await open(seed(),{width:1280,height:900});
 await desktop.page.locator('.board-grid [data-action="square"]').first().waitFor();
 assert.equal(await desktop.page.locator('.board-grid [data-action="square"]').count(),64);
 await desktop.page.screenshot({path:out+'/desktop-chess.png',fullPage:true});
 await desktop.context.close();

 const empty=await open(seed({empty:true}),{width:390,height:844});
 await empty.page.locator('.chess-home').waitFor();
 await empty.page.screenshot({path:out+'/mobile-empty.png',fullPage:true});
 await empty.context.close();

 const failed=await open(seed({failed:true}),{width:390,height:844});
 await failed.page.locator('[data-action="retry-engine"]').waitFor();
 await failed.page.screenshot({path:out+'/mobile-engine-error.png',fullPage:true});
 await failed.context.close();

 assert.deepEqual(errors,[]);
 console.log('PASS D23 real Stockfish Web Worker move, 64-square board, desktop/mobile, empty/error states');
}finally{await browser.close();}
