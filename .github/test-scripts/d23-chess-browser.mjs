import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium,webkit} from 'playwright';
import {initialState} from '../../src/services/storage.js';
import {activateStory55,advanceScene55} from '../../src/services/story55/runtime.js';
import {story55Config} from '../../src/services/story55/state.js';
import {sendScriptedDraft55} from '../../src/services/story55/scripted-chat.js';
import {receiveInvitation} from '../../src/services/invitations.js';

const engine=process.env.CHESS_BROWSER==='webkit'?webkit:chromium;
const base=process.env.CHESS_LOCAL_URL||'http://127.0.0.1:5173/';
const key='ximeng-phone-story55-v1',out='d23-chess-browser-results/'+engine.name();
mkdirSync(out,{recursive:true});
function seed({empty=false,failed=false}={}){
 const s=activateStory55(initialState());s.day=23;s.clock='22:30';s.unlocked=true;s.story55.minutesPerSecond=0;
 Object.assign(s.story55.completed,{wallet:{day:6,clock:'15:00'},return:{day:11,clock:'22:20'},move:{day:12,clock:'18:00'}});
 if(!empty){
  s.story55.activeScene='d23-chess';
  for(const [who,text] of story55Config(s).scenes['d23-chess']){
   if(who==='me')sendScriptedDraft55(s,'mirage','s55-ouroboros',text);
   else advanceScene55(s,'d23-chess');
  }
  const invitation=s.invitations.find(x=>x.source==='d23-mirage-story');
  assert.ok(invitation,'D23 must produce an invitation');
  const store={get:()=>s,update:fn=>fn(s)};
  const id=receiveInvitation(store,invitation.id);
  if(failed){
   const m=s.matches.find(m=>m.id===id);
   m.pgn='1. e4';m.turn='b';m.history=[{from:'e2',to:'e4',san:'e4',by:'player'}];
   m.engineError='國際象棋引擎載入失敗';
  }
  s.nav.current={appId:'chess',route:'/match/'+id,params:{}};
 }else s.nav.current={appId:'chess',route:'/',params:{}};
 return s;
}
const browser=await engine.launch({headless:true,...(engine===chromium?{executablePath:process.env.CHESS_CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']}:{})});
const errors=[];
async function open(state,{width,height}){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<=430,hasTouch:width<=430});
 await context.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key,value:JSON.stringify(state)});
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
async function assertPiecesLoad(page){
 try{
  await page.waitForFunction(()=>{
   const imgs=[...document.querySelectorAll('.board-grid .chess-piece img')];
   return imgs.length===32&&imgs.every(img=>img.complete&&img.naturalWidth>0&&getComputedStyle(img).opacity==='1');
  },null,{timeout:12000});
 }catch(error){
  const diag=await page.locator('.board-grid .chess-piece img').evaluateAll(imgs=>imgs.slice(0,8).map(img=>({src:img.src,complete:img.complete,width:img.naturalWidth,classes:img.className,opacity:getComputedStyle(img).opacity})));
  console.log('CHESS IMAGE VISIBILITY DIAGNOSTICS',JSON.stringify(diag));
  await page.screenshot({path:out+'/image-visibility-failure.png',fullPage:true});
  throw error;
 }
 const assets=await page.locator('.board-grid .chess-piece img').evaluateAll(imgs=>imgs.map(img=>({src:img.src,width:img.naturalWidth,visible:getComputedStyle(img).opacity==='1'})));
 assert.equal(assets.length,32);
 assert.ok(assets.every(x=>x.width>0&&x.visible),'every real chess piece must be loaded and visible');
 assert.ok(assets.every(x=>x.src.includes('/apps/chess/pieces/')),'all chess pieces must resolve from bundled image assets');
}
async function assertNoStackedBoardOrChat(page){
 const state=await page.evaluate(()=>{
  const board=document.querySelector('.board-frame'),chat=document.querySelector('.chess-chat');
  const pieces=[...document.querySelectorAll('.board-grid .chess-piece')];
  return {piecesStacked:pieces.some(p=>p.querySelectorAll('img').length>1||p.querySelector('.chess-piece-fallback')),
   chatOverlapsBoard:board&&chat&&chat.getBoundingClientRect().top<board.getBoundingClientRect().bottom-2,
   chatIsSticky:chat&&getComputedStyle(chat).position==='sticky'};
 });
 assert.equal(state.piecesStacked,false,'no chess glyph/image stack');
 assert.equal(state.chatOverlapsBoard,false,'chat may not cover board');
 assert.equal(state.chatIsSticky,false,'revert sticky phone chat layout');
}
async function capture(page,name){
 // Class removal starts a CSS fade; wait for the actual opacity before capture.
 await page.waitForFunction(()=>getComputedStyle(document.getElementById('toast')).opacity==='0');
 await page.screenshot({path:out+'/'+name,fullPage:true});
}
async function sendFarewell(page){
 await page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.story55.scenes['d23-chess-finish']?.index===2;
 },key,{timeout:15000});
 assert.equal(await page.evaluate(k=>!!JSON.parse(localStorage.getItem(k)).story55.completed['d23-chess-finish'],key),false,'NPC goodbye cannot send the player preset');
 const input=page.locator('[data-form="mc-send"] input[name="text"]');
 await input.fill('去吧。');
 assert.equal(await input.isEnabled(),true,'closing phase releases the native story composer');
 await page.locator('[data-form="mc-send"] button[type="submit"]').click();
}
try{
 const storyState=seed({empty:true});
 // D23 is reached after the D06 wallet introduction. Restoring that real
 // prerequisite lets the runtime create Ouroboros; do not fabricate a contact.
 storyState.story55.completed.wallet={day:6,clock:'15:00'};
 storyState.clock='22:16';storyState.story55.activeScene='d23-chess';
 storyState.nav.current={appId:'mirage',route:'/chat/s55-ouroboros',params:{}};
 const story=await open(storyState,{width:390,height:844});
 const login=story.page.locator('[data-form="mc-login"] button[type="submit"]');
 if(await login.count())await login.click();
 for(let index=0;index<story55Config(storyState).scenes['d23-chess'].length;index++){
  const [who,text]=story55Config(storyState).scenes['d23-chess'][index];
  if(who==='me'){
   const input=story.page.locator('[data-form="mc-send"] input[name="text"]');
   await input.fill(text);
   await story.page.locator('[data-form="mc-send"] button[type="submit"]').click();
   if(index===0){
    const pacing=await story.page.evaluate(key=>{
     const s=JSON.parse(localStorage.getItem(key));
     return {index:s.story55.scenes['d23-chess']?.index,remaining:s.story55.scenes['d23-chess']?.nextAt-Date.now()};
    },key);
    assert.equal(pacing.index,1,'player Send should commit only the authored player line');
    assert.ok(pacing.remaining>=1600&&pacing.remaining<=2100,'D23 restores shared message pacing');
    await story.page.waitForTimeout(1500);
    const stillWaiting=await story.page.evaluate(key=>JSON.parse(localStorage.getItem(key)).story55.scenes['d23-chess']?.index,key);
    assert.equal(stillWaiting,1,'visible-chat timer must not bypass Story55 pacing');
   }
  }
  try{
   await story.page.waitForFunction(({key,index})=>{
    const s=JSON.parse(localStorage.getItem(key));return s.story55.completed['d23-chess']||s.story55.scenes['d23-chess']?.index>index;
   },{key,index},{timeout:15000});
  }catch(error){
   const diag=await story.page.evaluate(({key,index})=>{
    const s=JSON.parse(localStorage.getItem(key));
    const chat=s.content.conversations.mirage?.find(c=>c.id==='s55-ouroboros');
    return {expectedIndex:index,expectedLine:s.story55.config.scenes['d23-chess']?.[index],day:s.day,clock:s.clock,activeScene:s.story55.activeScene,
     scene:s.story55.scenes['d23-chess'],completed:s.story55.completed['d23-chess'],nav:s.nav.current,
     lastMessages:chat?.messages?.slice(-5).map(m=>({from:m.from,text:m.text,id:m.id})),
     currentDraft:document.querySelector('[data-form="mc-send"] input[name="text"]')?.value,
     toast:document.getElementById('toast')?.textContent};
   },{key,index});
   console.log('D23 STORY PROGRESSION DIAGNOSTICS',JSON.stringify(diag));
   await story.page.screenshot({path:out+'/mobile-story-stall.png',fullPage:true});
   throw error;
  }
 }
 const avatarGeometry=await story.page.locator('.mc-clear-row').evaluateAll(rows=>rows.filter(row=>row.querySelector('.mc-avatar')&&row.querySelector('.mc-clear-text')).map(row=>{
  const portrait=row.querySelector('.mc-avatar').getBoundingClientRect(),text=row.querySelector('.mc-clear-text').getBoundingClientRect();
  return {delta:Math.abs(portrait.top-text.top),height:text.height};
 }));
 assert.ok(await story.page.locator('.mc-clear-text').evaluateAll(rows=>rows.some(row=>row.getBoundingClientRect().height>60)),'opening includes a real multiline reply, including grouped continuations');
 assert.ok(avatarGeometry.length>0,'first messages have actual avatars');
 assert.ok(avatarGeometry.every(x=>x.delta<8),'avatars align to the first text line rather than the bottom');
 await capture(story.page,'mobile-mirage-first-line-avatar.png');
 const card=story.page.locator('[data-action="mc-chess-invite"]');
 assert.match(await card.innerText(),/接受邀請/,'the invitation should be unaccepted until tapped');
 const preAccept=await story.page.evaluate(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return {status:s.invitations.find(i=>i.source==='d23-mirage-story').status,count:s.matches.length};
 },key);
 assert.deepEqual(preAccept,{status:'pending',count:0});
 await card.click();
 await story.page.locator('.board-grid').waitFor();
 await assertPiecesLoad(story.page);
 await assertNoStackedBoardOrChat(story.page);
 const routed=await story.page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 assert.equal(routed.matches.length,1);assert.equal(routed.story55.completed.recognition,undefined);
 assert.equal(routed.matches[0].lesson.started,true);
 assert.equal(routed.invitations.find(i=>i.source==='d23-mirage-story').status,'accepted');
 assert.equal(routed.matches[0].chat.filter(m=>m.from==='tai').length,0,'opening is not front-loaded');
 await story.page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).matches[0].chat.filter(m=>m.from==='tai').length>=1,key,{timeout:8000});
 const first=await story.page.evaluate(k=>JSON.parse(localStorage.getItem(k)).matches[0].chat.filter(m=>m.from==='tai').length,key);
 assert.equal(first,1,'first tutorial bubble is singular');
 await story.page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).matches[0].lesson.openingDone,key,{timeout:17000});
 const completedOpening=await story.page.evaluate(k=>JSON.parse(localStorage.getItem(k)).matches[0].chat.filter(m=>m.from==='tai').length,key);
 assert.equal(completedOpening,3,'three tutorial bubbles delivered in order');
 await capture(story.page,'mobile-story-card-to-board.png');
 await story.context.close();

 const mobile=await open(seed(),{width:390,height:844});
 await mobile.page.locator('.board-grid [data-action="square"]').first().waitFor();
 await assertPiecesLoad(mobile.page);
 await assertNoStackedBoardOrChat(mobile.page);
 await mobile.page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).matches[0].lesson.openingDone,key,{timeout:17000});
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
 await capture(mobile.page,'mobile-stockfish-move.png');
 // The real mobile composer must trigger a lesson reminder, preserve the
 // MIRAGE spoiler-send semantics, then close the entire match on resignation.
 const composer=mobile.page.locator('[data-form="chess-chat"]');
 await composer.locator('input[name="text"]').fill('親親');
 await composer.locator('button[type="submit"]').click();
 try{await mobile.page.waitForFunction(k=>{
  const m=JSON.parse(localStorage.getItem(k)).matches.find(m=>m.opponent==='tai');
  return m.chat.some(x=>x.from==='tai'&&/上課|還沒講完|先聽|注意力|坐不住|想得倒美|先保住|嘴倒是甜|撒嬌/.test(x.text));
 },key,{timeout:10000});}catch(error){
  console.log('CHESS REPLY DIAGNOSTICS',await mobile.page.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k)),m=s.matches.find(m=>m.opponent==='tai');return {nav:s.nav.current,chat:m.chat.slice(-6),lesson:m.lesson,errors:document.getElementById('toast')?.textContent};},key));
  await mobile.page.screenshot({path:out+'/mobile-reply-failure.png',fullPage:true});throw error;
 }
 const latestMessageVisible=await mobile.page.evaluate(()=>{
  const el=document.querySelector('.chess-chat-messages');
  const newest=el?.querySelector('.chess-chat-line');
  if(!el||!newest||getComputedStyle(el).flexDirection!=='column-reverse')return false;
  const container=el.getBoundingClientRect(),bubble=newest.getBoundingClientRect();
  return bubble.bottom<=container.bottom+2&&bubble.top>=container.top-2;
 });
 assert.equal(latestMessageVisible,true,'fresh lesson reply must be visible without an inner chat scroll');
 const chatBeforeSpoiler=await mobile.page.evaluate(k=>JSON.parse(localStorage.getItem(k)).matches.find(m=>m.opponent==='tai').chat.length,key);
 await composer.locator('input[name="text"]').fill('陳熙泰');
 await composer.locator('button[type="submit"]').click();
 const afterSpoiler=await mobile.page.evaluate(k=>JSON.parse(localStorage.getItem(k)).matches.find(m=>m.opponent==='tai').chat,key);
 assert.equal(afterSpoiler.length,chatBeforeSpoiler,'spoiler must be blocked before the real Send');
 await capture(mobile.page,'mobile-tai-lesson-reminder.png');
 await mobile.page.locator('[data-action="resign-match"]').click();
 const immediately=await mobile.page.evaluate(k=>{
  const m=JSON.parse(localStorage.getItem(k)).matches.find(m=>m.opponent==='tai');
  return {finished:m.status==='finished',queued:m.lesson.outbox.length,postgame:m.lesson.postgame};
 },key);
 assert.equal(immediately.finished,true);
 assert.equal(immediately.queued,2,'approved resignation replies remain on chess board');
 assert.equal(immediately.postgame,undefined,'AI cannot start inside chess');
 await mobile.page.waitForFunction(k=>{
  const m=JSON.parse(localStorage.getItem(k)).matches.find(m=>m.opponent==='tai');
  return m.lesson.outbox.length===0&&m.chat.some(x=>/好吧，放你走/.test(x.text));
 },key,{timeout:18000});
 assert.match(await mobile.page.locator('.match-card .match-status').last().innerText(),/已認輸/);
 await capture(mobile.page,'mobile-tai-resignation.png');
 assert.equal(await mobile.page.locator('[data-form="chess-chat"]').count(),0,'no postgame AI composer in chess');
 assert.equal(await mobile.page.locator('[data-action="end-match"]').count(),1,'player manually exits after the preset');
 const beforeRefresh=await mobile.page.evaluate(k=>JSON.parse(localStorage.getItem(k)).matches.find(m=>m.opponent==='tai'),key);
 assert.ok(beforeRefresh.feedbackEvents.every(e=>e.consumed));
 await mobile.page.reload();
 await mobile.page.locator('[data-action="unlock"]').click();
 for(const digit of '0816')await mobile.page.locator('[data-action="passcode-key"][data-key="'+digit+'"]').click();
 await mobile.page.locator('.board-grid').waitFor();
 assert.equal(await mobile.page.locator('.chess-feedback').count(),0,'refresh must not replay terminal effect');
 await mobile.page.locator('[data-action="end-match"]').click();
 await mobile.page.locator('[data-form="mc-send"]').waitFor({timeout:6000});
 await mobile.page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.nav.current.appId==='mirage'&&s.nav.current.route==='/chat/s55-ouroboros'&&s.story55.d23Postgame?.phase==='chat';
 },key,{timeout:30000});
 const entered=await mobile.page.evaluate(k=>{
  const s=JSON.parse(localStorage.getItem(k)),chat=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
  return {rounds:s.story55.d23Postgame.rounds,AI:chat.messages.filter(m=>/^s55-d23-mirage-intro-/.test(m.id)).length,
   farewell:!!s.story55.completed['d23-chess-finish']};
 },key);
 assert.equal(entered.rounds,0);assert.ok(entered.AI>=1);
 assert.equal(entered.farewell,false,'board completion never releases the next day');
 await capture(mobile.page,'mobile-d23-mirage-postgame.png');
 // A pending earlier Story55 scene must not steal a genuine D23 free-chat Send.
 const chatComposer=mobile.page.locator('[data-form="mc-send"] input[name="text"]');
 await chatComposer.fill('你剛才是在欺負新手嗎？');
 await mobile.page.locator('[data-form="mc-send"] button[type="submit"]').click();
 await mobile.page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k)),pg=s.story55.d23Postgame;
  return pg?.rounds===1&&pg.phase==='chat'&&s.content.conversations.mirage
   .find(c=>c.id==='s55-ouroboros').messages.some(m=>m.id==='s55-d23-mirage-reply-1-0');
 },key,{timeout:27000});
 await mobile.page.locator('[data-action="mc-d23-finish-conversation"]').click();
 await mobile.page.waitForTimeout(3600);
 const afterD23Farewell=await mobile.page.evaluate(k=>{
  const s=JSON.parse(localStorage.getItem(k)),q=s.story55.scenes['d23-chess-finish'];
  const messages=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros')?.messages||[];
  return {day:s.day,clock:s.clock,nav:s.nav.current,phase:s.story55.d23Postgame?.phase,
   activeScene:s.story55.activeScene,queued:q,sceneNode:s.story55.config.nodes.find(n=>n.id==='d23-chess-finish'),
   completed:s.story55.completed['d23-chess-finish'],messages:messages.filter(m=>/s55-d23-chess-finish/.test(m.id)).map(m=>({id:m.id,text:m.text}))};
 },key);
 console.log('D23_FAREWELL_DIAGNOSTICS',JSON.stringify(afterD23Farewell));
 await sendFarewell(mobile.page);
 await mobile.page.waitForFunction(k=>{
  const s=JSON.parse(localStorage.getItem(k)),chat=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
  return !!s.story55.completed['d23-chess-finish']&&chat.messages.filter(m=>/^s55-d23-chess-finish-/.test(m.id)).length===3;
 },key,{timeout:15000});
 const farewell=await mobile.page.locator('.mc-clear-messages').innerText();
 assert.match(farewell,/我得走了，還有點事/);assert.match(farewell,/下次有空再下/);assert.match(farewell,/去吧/);
 await capture(mobile.page,'mobile-d23-mirage-farewell.png');
 await mobile.context.close();

 // Valid opening position; the winning move is clicked in the actual board.
 // Stockfish may never move for White, and the terminal capture must produce
 // both the piece reaction and the result overlay, without operation hints.
 const mateState=seed(),mateMatch=mateState.matches[0];
 mateMatch.pgn='1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6';
 mateMatch.history=[['e2','e4','e4'],['e7','e5','e5'],['d1','h5','Qh5'],['b8','c6','Nc6'],['f1','c4','Bc4'],['g8','f6','Nf6']].map(([from,to,san],i)=>({from,to,san,by:i%2?'stockfish':'player'}));
 mateMatch.turn='w';
 const mate=await open(mateState,{width:390,height:844});
 await mate.page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).matches[0].lesson.openingDone,key,{timeout:17000});
 // Observe audio/vibration attempts, without substituting a board or feedback.
 await mate.page.evaluate(()=>{
  window.chessFeedbackQA={tones:0,haptics:0,effects:[]};
  navigator.vibrate=()=>{window.chessFeedbackQA.haptics++;return true;};
  if(window.OscillatorNode){const start=OscillatorNode.prototype.start;OscillatorNode.prototype.start=function(...args){window.chessFeedbackQA.tones++;return start.apply(this,args);};}
  new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node.nodeType===1&&node.matches?.('.chess-feedback'))window.chessFeedbackQA.effects.push({kind:node.className,text:node.textContent});}}).observe(document.getElementById('screen-layer'),{childList:true,subtree:true});
 });
 await mate.page.locator('[data-square="h5"]').click();
 await mate.page.locator('[data-square="f7"]').click();
 await mate.page.waitForFunction(()=>window.chessFeedbackQA.effects.length>=2);
 const feedback=await mate.page.evaluate(()=>window.chessFeedbackQA);
 assert.ok(feedback.effects.some(x=>x.kind.includes('capture')));
 assert.ok(feedback.effects.some(x=>x.kind.includes('win')));
 assert.ok(feedback.effects.filter(x=>x.kind.includes('capture')).every(x=>x.text===''),'capture effects have no hint text');
 assert.ok(feedback.effects.some(x=>x.kind.includes('win')&&/白方勝/.test(x.text)),'terminal overlay shows the real result');
 assert.ok(feedback.haptics>=2);assert.ok(feedback.tones>=2,'short sounds use an unlocked audio context');
 await mate.page.waitForFunction(k=>{
  const m=JSON.parse(localStorage.getItem(k)).matches[0];
  return m.status==='finished'&&m.lesson.outbox.length===0&&m.chat.some(x=>/贏|輸/.test(x.text));
 },key,{timeout:18000});
 const won=await mate.page.evaluate(k=>JSON.parse(localStorage.getItem(k)).matches[0],key);
 assert.equal(won.result,'player-win');
 assert.ok(won.chat.some(m=>m.id.includes('capture-white-')&&m.text.includes('兵')));
 assert.ok(won.chat.some(m=>m.id.includes('ending-')),'original board endgame reply survives');
 assert.ok(won.feedbackEvents.every(x=>x.consumed));
 await capture(mate.page,'mobile-capture-checkmate.png');
 await mate.page.locator('[data-action="end-match"]').click();
 await mate.page.locator('[data-form="mc-send"]').waitFor({timeout:6000});
 await mate.page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).story55.d23Postgame?.phase==='chat',key,{timeout:30000});
 const phase=await mate.page.evaluate(k=>JSON.parse(localStorage.getItem(k)).story55.d23Postgame,key);
 assert.equal(phase.rounds,0);assert.equal(phase.closed,false);
 await mate.page.locator('[data-action="mc-d23-finish-conversation"]').click();
 await sendFarewell(mate.page);
 await mate.page.waitForFunction(k=>!!JSON.parse(localStorage.getItem(k)).story55.completed['d23-chess-finish'],key,{timeout:15000});
 await mate.context.close();

 const desktop=await open(seed(),{width:1280,height:900});
 await desktop.page.locator('.board-grid [data-action="square"]').first().waitFor();
 await assertPiecesLoad(desktop.page);
 assert.equal(await desktop.page.locator('.board-grid [data-action="square"]').count(),64);
 await capture(desktop.page,'desktop-chess.png');
 await desktop.context.close();

 const empty=await open(seed({empty:true}),{width:390,height:844});
 await empty.page.locator('.chess-home').waitFor();
 await capture(empty.page,'mobile-empty.png');
 await empty.context.close();

 const failed=await open(seed({failed:true}),{width:390,height:844});
 await failed.page.locator('[data-action="retry-engine"]').waitFor();
 await failed.page.locator('[data-action="retry-engine"]').scrollIntoViewIfNeeded();
 await capture(failed.page,'mobile-engine-error.png');
 await failed.page.locator('[data-action="retry-engine"]').click();
 await failed.page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).matches.some(m=>m.history.at(-1)?.by==='stockfish'&&!m.engineError),key,{timeout:30000});
 await failed.context.close();

 assert.deepEqual(errors,[]);
 console.log('PASS D23 real Stockfish Web Worker move, 64-square board, desktop/mobile, empty/error states');
}finally{await browser.close();}
