// Local browser acceptance. Only D01–D16 prerequisites are reconstructed;
// every D17 search, link, reply and native Send is clicked in the real phone UI.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const url=process.env.SMOKE_URL||'http://127.0.0.1:8765/BBBTAI/';
const root='qa-results/d17';await mkdir(root,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});
const context=await browser.newContext({...devices['iPhone 13']});
const allowedOrigin=new URL(url).origin,external=[];
await context.route('**/*',route=>{
 const address=route.request().url();
 if(address.startsWith(allowedOrigin+'/')||address.startsWith('data:')||address.startsWith('blob:'))return route.continue();
 external.push(new URL(address).hostname);return route.abort('blockedbyclient');
});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const screen=page.locator('#screen-layer');
const action=a=>screen.locator(`[data-action="${a}"]`);
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')));
async function unlock(){
 await screen.locator('.lock-screen').waitFor({timeout:90000});await action('unlock').click();
 await screen.locator('[data-action="passcode-key"][data-key="0"]').waitFor();
 for(const key of '0816')await screen.locator(`[data-action="passcode-key"][data-key="${key}"]`).click();
}
async function route(day,clock,appId,path,params={}){
 // Flush the native Notes editor before preparing a developer fixture.
 await page.locator('#homebar').click();
 const loaded=page.waitForEvent('domcontentloaded');
 await page.evaluate(({day,clock,appId,path,params})=>{
  const key='ximeng-phone-story55-v1',s=JSON.parse(localStorage.getItem(key));
  Object.assign(s,{day,clock,batteryPercent:95,unlocked:false,poweredOff:false,emergencyCharge:false});
  s.story55.activeScene=null;s.story55.minutesPerSecond=0;
  if(appId==='mirage'){delete s.story55.completed.rumours;delete s.story55.browserReadIds;}
  s.nav={current:{appId,route:path,params},stack:[]};localStorage.setItem(key,JSON.stringify(s));location.reload();
 },{day,clock,appId,path,params});
 await loaded;await unlock();
}
try{
 await page.goto(url,{waitUntil:'domcontentloaded'});await screen.locator('.lock-screen').waitFor({timeout:90000});
 await page.evaluate(async()=>{
  const key='ximeng-phone-story55-v1',s=JSON.parse(localStorage.getItem(key));
  const release=await(await fetch(new URL('release.json',location.href))).json();
  const {rebuildStory55AtDay}=await import(release.url+'src/services/story55/rebuild.js');
  rebuildStory55AtDay(s,17,'10:00');
  s.unlocked=false;s.story55.minutesPerSecond=0;s.story55.activeScene=null;
  s.nav={current:{appId:'browser',route:'/',params:{}},stack:[]};localStorage.setItem(key,JSON.stringify(s));
 });
 await page.reload({waitUntil:'domcontentloaded'});await unlock();
 const search=screen.locator('.saf-address input');await search.fill('MiRaGe');await search.press('Enter');
 await screen.locator('[data-page="d17-xingyue"]').waitFor();
 assert.equal(await screen.locator('.saf-result').count(),4);
 await page.screenshot({path:root+'/01-search.png'});
 const initial=await saved(),money=initial.bankData.balance;
 for(const id of ['d17-mirage-old','d17-mirage-fake','d17-mirage-outdated']){
  await screen.locator(`[data-page="${id}"]`).click();await screen.getByRole('heading',{name:'無法開啟此網頁',exact:true}).waitFor();
  assert.equal((await saved()).story55.browserReadIds,undefined);await action('browser-back').click();
 }
 await screen.locator('[data-page="d17-xingyue"]').click();await screen.locator('.xingyue-forum').waitFor();
 assert.equal(await screen.locator('.xy-comment').count(),3);
 await page.screenshot({path:root+'/02-forum.png'});
 const floor=screen.locator('#xy-fish-reply');await floor.scrollIntoViewIfNeeded();
 assert.ok((await floor.innerText()).includes('盜刷你們的銀行卡'));
 assert.equal(await page.evaluate(()=>document.querySelector('.saf-content').scrollWidth<=document.querySelector('.saf-content').clientWidth),true);
 await page.screenshot({path:root+'/03-replies.png'});
 let state=await saved();assert.ok(state.content.notes.some(n=>n.title==='mirage'&&n.text.includes('尚未核實')));
 await action('browser-forum-login').click();await screen.getByRole('heading',{name:'該帖子已失效',exact:true}).waitFor();
 await page.screenshot({path:root+'/04-expired.png'});
 await action('browser-back').click();await screen.locator('.xingyue-forum').waitFor();
 await page.reload({waitUntil:'domcontentloaded'});await unlock();await screen.locator('.xingyue-forum').waitFor();
 state=await saved();assert.equal(state.story55.browserReadIds.length,1);assert.equal(state.bankData.balance,money);
 const note=state.content.notes.find(n=>n.title==='mirage');
 await route(17,'11:00','notes','/edit',{noteId:note.id});await screen.locator('.nt-screen-editor').waitFor();
 await page.screenshot({path:root+'/05-note.png'});
 // A separate D17 session: leave the optional forum unread and buy no hardware.
 await route(17,'19:00','mirage','/chat/s55-ouroboros');
 await screen.locator('.mc-login-panel, .mc-composer').first().waitFor({timeout:16000});
 const login=screen.locator('form[data-form="mc-login"]');
 if(await login.isVisible())await login.locator('button[type="submit"]').click();
 await screen.locator('.mc-composer').waitFor();
 const decrypt=action('mc-decrypt');if(await decrypt.isVisible())await decrypt.click();
 for(let i=0;i<100;i++){
  state=await saved();if(state.story55.completed['azathoth-invitation'])break;
  const step=state.story55.scenes['azathoth-invitation']?.index||0;
  const release=await page.evaluate(async()=>await(await fetch(new URL('release.json',location.href))).json());
  const line=await page.evaluate(async({release})=>{
   const {currentScript55}=await import(release.url+'src/services/story55/scripted-chat.js');
   return currentScript55(JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')),'mirage','s55-ouroboros');
  },{release});
  if(line?.id==='azathoth-invitation'&&line.kind==='me'){
   await page.waitForFunction(text=>document.querySelector('.mc-composer input')?.value===text,line.text,{timeout:30000});
   await screen.locator('.mc-composer button[type="submit"]').click();
  }else await page.waitForFunction(index=>{
   const s=JSON.parse(localStorage.getItem('ximeng-phone-story55-v1'));
   return (s.story55.scenes['azathoth-invitation']?.index||0)!==index||s.story55.completed['azathoth-invitation'];
  },step,{timeout:20000});
 }
 state=await saved();assert.ok(state.story55.completed['azathoth-invitation']);
 const lines=state.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.filter(m=>m.id.startsWith('s55-d17-invitation-'));
 assert.equal(lines.length,30);assert.equal(state.story55.completed.rumours,undefined);
 await page.screenshot({path:root+'/06-invitation.png'});
 const link=action('mc-azathoth-reference').last();await link.scrollIntoViewIfNeeded();await link.click();
 await screen.getByRole('heading',{name:'神話中的名字'}).waitFor();
 await page.screenshot({path:root+'/07-reference.png'});
 assert.deepEqual(errors,[]);
 const result={passed:true,viewport:await page.viewportSize(),resultCount:4,comments:3,invitationLines:30,readOnce:true,externalRequestsBlocked:[...new Set(external)],errors};
 await writeFile(root+'/result.json',JSON.stringify(result,null,2)+'\n');console.log('PASS_D17_MOBILE',JSON.stringify(result));
}catch(error){
 await page.screenshot({path:root+'/failure.png'}).catch(()=>{});
 await writeFile(root+'/failure.json',JSON.stringify({message:error.message,errors,externalRequestsBlocked:[...new Set(external)],route:await page.evaluate(()=>JSON.parse(localStorage.getItem('ximeng-phone-story55-v1'))?.nav?.current).catch(()=>null)},null,2));
 throw error;
}finally{await browser.close();}
