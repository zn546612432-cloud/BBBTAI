// Mobile Chromium: historic D10, real D11 and D12 native Send, Notes, D13 arrival.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const url=process.env.SMOKE_URL||'http://127.0.0.1:8765/BBBTAI/review/d10-d13-20261108/';
await mkdir('qa-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const context=await browser.newContext({...devices['iPhone 13']});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const storageKey=()=>page.evaluate(()=>{const part=(location.pathname.match(/\/review\/([a-z0-9-]+)\//i)||[])[1];return 'ximeng-phone-story55-review-'+part;});
const saved=async()=>{const k=await storageKey();return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),k);};
async function unlock(){
 await page.locator('.lock-screen').waitFor({timeout:90000});
 await page.locator('[data-action="unlock"]').click();
 await page.locator('[data-action="passcode-key"][data-key="0"]').waitFor();
 for(const digit of '0816')await page.locator('[data-action="passcode-key"][data-key="'+digit+'"]').click();
}
// A single pre-boot override is deterministic across repeated date changes:
// current PhoneStore timers cannot overwrite the QA target saved in sessionStorage.
await page.addInitScript(()=>{
 try{
  const raw=sessionStorage.getItem('ximeng-qa-target');
  if(!raw)return;
  sessionStorage.removeItem('ximeng-qa-target');
  const {k,day,clock,appId,route}=JSON.parse(raw);
  const previous=localStorage.getItem(k);
  if(!previous)return;
  const s=JSON.parse(previous);
  Object.assign(s,{day,clock,unlocked:false,poweredOff:false,emergencyCharge:false,batteryPercent:95});
  s.story55.activeScene=null;
  s.nav={current:{appId,route,params:{}},stack:[]};
  localStorage.setItem(k,JSON.stringify(s));
 }catch(e){console.error('QA_BOOT_OVERRIDE_FAILURE',String(e));}
});
async function visit(day,clock,appId,route){
 const k=await storageKey();
 await page.evaluate(target=>sessionStorage.setItem('ximeng-qa-target',JSON.stringify(target)),{k,day,clock,appId,route});
 await page.reload({waitUntil:'domcontentloaded'});
 await unlock();
 await page.waitForFunction(({k,day,appId})=>{
  const s=JSON.parse(localStorage.getItem(k));
  return s.day===day&&s.unlocked&&s.nav.current.appId===appId;
 },{k,day,appId},{timeout:16000});
}
async function waitDraft(text){
 await page.waitForFunction(text=>document.querySelector('.wx-composer input')?.value===text,text,{timeout:30000});
}
try{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('.lock-screen').waitFor({timeout:90000});
 const k=await storageKey();
 await page.evaluate(async k=>{
  const s=JSON.parse(localStorage.getItem(k));
  const release=await (await fetch(new URL('release.json',location.href))).json();
  const {rebuildStory55AtDay}=await import(release.url+'src/services/story55/rebuild.js');
  rebuildStory55AtDay(s,11,'08:40');
  s.unlocked=false;s.nav={current:{appId:'wechat',route:'/chat/wang',params:{}},stack:[]};
  localStorage.setItem(k,JSON.stringify(s));
 },k);
 await page.reload({waitUntil:'domcontentloaded'});await unlock();
 await page.locator('.wx-composer').waitFor({state:'visible',timeout:15000});
 let s=await saved();
 let group=s.content.conversations.wechat.find(c=>c.id==='group');
 let d10=group.messages.filter(m=>/^d10-(?:shopping-list|noodles|heat|supermarket|carry|dinner|night)-/.test(m.id));
 assert.equal(d10.length,20,'D10 backfill preserves original 20 NPC IDs');
 assert.ok(d10.some(m=>m.text.includes('首爾今天一直下雨')));
 assert.ok(!d10.some(m=>m.text.includes('我们还在停车场')));
 const reply='干爹回来了？哥，你怎么现在才告诉我！';
 await waitDraft(reply);
 s=await saved();
 assert.equal(s.content.conversations.wechat.find(c=>c.id==='wang').messages.filter(m=>m.id==='s55-return-2'&&m.from==='me').length,0,'player speech requires actual tap');
 await page.screenshot({path:'qa-results/d11-before-send.png'});
 await page.locator('.wx-composer-send').click();
 await page.waitForFunction(k=>!!JSON.parse(localStorage.getItem(k)).story55.completed.return,k,{timeout:30000});
 s=await saved();
 assert.equal(s.content.conversations.wechat.find(c=>c.id==='wang').messages.filter(m=>m.id==='s55-return-2'&&m.from==='me').length,1);
 assert.equal(s.content.conversations.wechat.find(c=>c.id==='group').messages.filter(m=>m.id.startsWith('s55-return-')).length,0);
 await page.screenshot({path:'qa-results/d11-wang-native-send.png'});
 await visit(11,'22:00','notes','/');
 // The passcode unlock animation is asynchronous. Do not assert the generic
 // screen shell or screenshot the lock screen; require the real Notes list.
 await page.locator('#screen-layer .nt-screen-list').waitFor({state:'visible',timeout:15000});
 s=await saved();let note=s.content.notes.find(n=>n.id==='xm-note-d11-meeting');
 assert.ok(note&&note.text.includes('五亿美元'));
 assert.ok(note.text.includes('\n'));
 assert.equal(s.content.notes.filter(n=>n.id===note.id).length,1);
 const noteRow=page.locator('[data-action="open-note"][data-id="xm-note-d11-meeting"]');
 await noteRow.waitFor({state:'visible'});
 await page.screenshot({path:'qa-results/d11-meeting-notes-list.png'});
 await noteRow.click();
 await page.locator('#screen-layer .nt-screen-editor').waitFor({state:'visible',timeout:15000});
 const visibleBody=await page.locator('.nt-body-input').inputValue();
 assert.equal(visibleBody,note.text,'player can actually open the authored D11 Notes entry');
 assert.match(visibleBody,/三个月筹三千万/);
 await page.waitForTimeout(450); // Let native push animation finish before visual QA.
 await page.screenshot({path:'qa-results/d11-meeting-notes.png'});
 await visit(12,'10:10','wechat','/chat/group');
 await page.locator('.wx-composer').waitFor({state:'visible',timeout:15000});
 await waitDraft('机房那几台机器你们先别动，我自己整理。');
 await page.locator('.wx-composer-send').click();
 await page.waitForFunction(k=>!!JSON.parse(localStorage.getItem(k)).story55.completed.move,k,{timeout:30000});
 s=await saved();
 assert.equal(s.content.conversations.wechat.find(c=>c.id==='group').messages.filter(m=>m.id==='s55-move-2'&&m.from==='me').length,1);
 await page.screenshot({path:'qa-results/d12-real-move.png'});
 await visit(13,'20:00','wechat','/chat/group');
 await page.locator('.wx-composer').waitFor({state:'visible',timeout:15000});
 s=await saved();group=s.content.conversations.wechat.find(c=>c.id==='group');
 const arrivals=group.messages.filter(m=>m.id.startsWith('d12-'));
 const day13=group.messages.filter(m=>m.id.startsWith('d13-'));
 assert.ok(arrivals.some(m=>m.text.includes('落地了')),'Hu Feng arrival retained as real D12 history');
 assert.ok(day13.some(m=>m.text.includes('昨晚到得太晚了')));
 const release=await page.evaluate(async()=>await (await fetch(new URL('release.json',location.href))).json());
 assert.ok(release.url.startsWith('/BBBTAI/review/d10-d13-20261108/releases/'));
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'qa-results/d13-quiet-group.png'});
 console.log('PASS_D10_D13_MOBILE',JSON.stringify({d10Messages:d10.length,d11Send:1,d11Notes:1,d12Send:1,d12History:arrivals.length,d13History:day13.length,errors}));
}catch(e){
 await page.screenshot({path:'qa-results/d10-d13-failure.png'}).catch(()=>{});
 const s=await saved().catch(()=>null);
 if(s)await writeFile('qa-results/d10-d13-failure.json',JSON.stringify({day:s.day,clock:s.clock,nav:s.nav,scenes:s.story55?.scenes,active:s.story55?.activeScene},null,2));
 console.error('D10_D13_FAILURE',e);throw e;
}finally{await browser.close();}
