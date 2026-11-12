// Current-version, real-deadline STRIKE recovery. Virtual browser time and
// lifecycle events simulate a background interval; not physical iOS testing.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {initialState} from '../../src/services/storage.js';
import {activateStory55} from '../../src/services/story55/runtime.js';

const url=process.env.TAI_REMOTE_LOCAL_URL||'http://127.0.0.1:5173/';
const key='ximeng-phone-story55-v1',output='tai-remote-mobile-results';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,
 ...(process.env.TAI_REMOTE_CHROMIUM_PATH?{executablePath:process.env.TAI_REMOTE_CHROMIUM_PATH}:{}),
 args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
function seed(){
 const s=activateStory55(initialState());s.day=16;s.clock='08:20';s.batteryPercent=90;
 s.story55.minutesPerSecond=0;s.story55.activeScene=null;s.story55.d13={phase:'chat'};
 for(const node of s.story55.config.nodes)if(node.day<=16&&node.id!=='base'&&node.id!=='recognition')
  s.story55.completed[node.id]={day:node.day,clock:'12:00',test:true};
 s.story55.projects.base={authorized:true,batches:[],active:null};
 s.ghost.orders['timed-strike']={id:'timed-strike',type:'strike',key:'GH-TIMED',story55Project:'strike-demo',
  status:'authorized',attempts:0,settings:{seconds:30,retries:1000,rounds:1}};
 s.nav={current:{appId:'ghost',route:'/contract',params:{orderId:'timed-strike'}},stack:[]};s.unlocked=false;
 if(!s.content.conversations.mirage.some(c=>c.id==='s55-ouroboros'))s.content.conversations.mirage.push({id:'s55-ouroboros',messages:[],unread:0});
 return s;
}
const lines=['我想驗證一下你是不是azathoth','嫌低級，那倒是做做看','為了部署你給我的程序，我得努力賺錢才行，還是說你打算再給我一百萬？'];
try{
 for(const mode of ['foreground','release','reload','reopen','JSON import','snapshot restore']){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'zh-TW',reducedMotion:'reduce'});
  await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,state);Math.random=()=>.02;},{key,state:JSON.stringify(seed())});
  let page=await context.newPage();
  const attach=()=>{page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));};attach();
  await page.clock.install({time:new Date('2026-11-12T10:00:00Z')});
  const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  try{
   await page.goto(url,{waitUntil:'domcontentloaded'});
   // Capture this isolated page's actual PhoneStore instance for exercising
   // its real public import/restore API, without a production debug endpoint.
   await page.evaluate(async()=>{
    const {PhoneStore}=await import('/src/services/storage.js');
    const get=PhoneStore.prototype.get;
    PhoneStore.prototype.get=function(){globalThis.__taiLifecycleStore=this;return get.call(this);};
   });
   await page.locator('[data-action="unlock"]').click();
   for(const digit of '0816')await page.locator('[data-action="passcode-key"][data-key="'+digit+'"]').click();
   await page.locator('#screen-layer [data-action="gh-share"]').click();
   await page.locator('#screen-layer [data-action="gh-share-yes"]').click();
   await page.locator('form[data-form="mc-login"] button[type="submit"]').click();
   for(const line of lines){
    await page.waitForFunction(text=>{const input=document.querySelector('.mc-composer input[name="text"]');return input?.value===text&&!input.disabled;},line);
    await page.locator('.mc-composer button[type="submit"]').click();
   }
   await page.waitForFunction(k=>{
    const s=JSON.parse(localStorage.getItem(k)),o=s?.ghost?.orders?.['timed-strike'];
    return s.story55?.ghostShare?.remote?.stage==='running'&&o?.board?.arcade?.hits>=1&&o.status==='running';
   },key);
   const before=await state(),run=before.ghost.orders['timed-strike'];
   assert.equal(run.deadline-run.startedAt,30000,'native STRIKE must have a real thirty-second deadline');
   const pagehideOnly=['release','snapshot restore'].includes(mode);
   await page.evaluate(only=>{
    if(!only){Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));}
    window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
   },pagehideOnly);
   const paused=await state(),anchor=paused.story55.ghostShare.remote.pausedAt;
   assert.ok(Number.isFinite(anchor));
   await page.clock.fastForward(45000);
   const hidden=await state(),virtualNow=await page.evaluate(()=>Date.now());
   assert.ok(virtualNow>run.deadline,'the background interval must cross the OLD deadline');
   assert.equal(hidden.ghost.orders['timed-strike'].status,'running');
   assert.deepEqual(hidden.ghost.orders['timed-strike'].board,paused.ghost.orders['timed-strike'].board);
   let recovered;
   if(mode==='foreground'){
    recovered=await page.evaluate(()=>{
     delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));
     window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
     return {now:Date.now(),state:structuredClone(globalThis.__taiLifecycleStore.get())};
    });
   }else if(mode==='release'){
    recovered=await page.evaluate(async()=>{
     const {createTaiLivePhoneTools}=await import('/src/system/remote-control/mcp.js');
     const store=globalThis.__taiLifecycleStore;
     const tools=createTaiLivePhoneTools({store,router:{},tasks:{},document});
     const result=tools.call(store.get(),'remote_release',{});
     if(!result.ok)throw Error(result.error);
     const resultState={now:Date.now(),state:structuredClone(store.get())};
     window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
     return resultState;
    });
   }else if(mode==='reload'||mode==='reopen'){
    if(mode==='reload')await page.reload({waitUntil:'domcontentloaded'});
    else{
     await page.close();page=await context.newPage();attach();
     await page.clock.install({time:new Date(virtualNow)});await page.goto(url,{waitUntil:'domcontentloaded'});
    }
    // A real reload/reopen returns to the phone's lock screen. Inspect the
    // persisted recovery immediately; waiting for an app button while locked
    // would consume the very countdown this test is meant to preserve.
    await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k))?.story55?.ghostShare?.phase==='interrupted',key);
    recovered={now:await page.evaluate(()=>Date.now()),state:await state()};
   }else{
    recovered=await page.evaluate(async({mode,backup})=>{
     const store=globalThis.__taiLifecycleStore;
     if(mode==='JSON import')store.replace(JSON.parse(JSON.stringify(backup)));
     else{
      const {saveTestSnapshot,restoreTestSnapshot}=await import('/src/services/story55/test-snapshots.js');
      const saved=saveTestSnapshot(store.storage,backup,'paused current timed STRIKE');
      restoreTestSnapshot(store,saved.id);
     }
     const result={now:Date.now(),state:structuredClone(store.get())};
     delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));
     window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
     return result;
    },{mode,backup:paused});
   }
   const actual=recovered.state.ghost.orders['timed-strike'],elapsed=recovered.now-anchor;
   // Reload creates the new store slightly before this observation. Its
   // exact settlement instant is encoded in startedAt, so compare deltas and
   // remaining time instead of treating browser loading as paused play time.
   const shifted=actual.startedAt-run.startedAt;
   assert.ok(shifted>=45000&&shifted<=elapsed+20,mode+' compensation must cover the background interval only');
   assert.equal(actual.deadline-run.deadline,shifted);
   assert.ok(actual.deadline-recovered.now>15000,'restored native countdown retains usable remaining time');
   assert.equal(actual.status,'running','recovery cannot fabricate a failure or victory');
   assert.deepEqual(actual.board,paused.ghost.orders['timed-strike'].board);
   assert.equal(actual.attempts,1);assert.equal(actual.moves,paused.ghost.orders['timed-strike'].moves);
   assert.equal(recovered.state.story55.ghostShareTakeovers,1);
   assert.deepEqual(recovered.state.ghost.history,paused.ghost.history);
   assert.equal(JSON.stringify(recovered.state.bankData),JSON.stringify(paused.bankData));
   assert.equal(recovered.state.story55.ghostShare.remote.pausedAt,null);
   if(mode==='foreground'){
    assert.equal(recovered.state.story55.ghostShare.remote.token,paused.story55.ghostShare.remote.token);
    await page.waitForFunction(k=>{const s=JSON.parse(localStorage.getItem(k));return s.ghost.orders['timed-strike'].status==='success'&&s.story55.ghostShare.phase==='complete';},key);
    assert.equal((await state()).ghost.history.filter(h=>h.orderId==='timed-strike').length,1);
   }else{
    if(mode==='reload'||mode==='reopen'){
     await page.locator('[data-action="unlock"]').click();
     for(const digit of '0816')await page.locator('[data-action="passcode-key"][data-key="'+digit+'"]').click();
     await page.locator('#screen-layer [data-action="gh-arcade-tap"]').first().waitFor({state:'visible'});
    }
    await page.waitForTimeout(650);
    assert.equal((await state()).ghost.orders['timed-strike'].status,'running');
    assert.equal((await state()).ghost.history.filter(h=>h.orderId==='timed-strike').length,0);
   }
   await page.screenshot({path:output+'/lifecycle-'+mode.replaceAll(' ','-')+'.png',fullPage:true});
   console.log('PASS real-deadline STRIKE background recovery: '+mode);
  }catch(error){
   await page.screenshot({path:output+'/FAILED-lifecycle-'+mode.replaceAll(' ','-')+'.png',fullPage:true}).catch(()=>{});
   const failed=await state().catch(()=>null);
   console.error('LIFECYCLE STATE',JSON.stringify({mode,nav:failed?.nav?.current,
    share:failed?.story55?.ghostShare,order:failed?.ghost?.orders?.['timed-strike'],history:failed?.ghost?.history}));
   throw error;
  }finally{await context.close();}
 }
 assert.deepEqual(errors,[]);console.log('ALL TIMED STRIKE LIFECYCLE TESTS PASSED');
}finally{await browser.close();}
