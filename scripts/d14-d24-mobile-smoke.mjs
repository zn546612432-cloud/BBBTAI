// Real UI acceptance. Only the completed D01–D13 phone is a developer fixture;
// D14 attachment, deployment, five games, later Sends and cut-off are clicked.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,devices} from 'playwright';
const url=process.env.SMOKE_URL||'http://127.0.0.1:8765/BBBTAI/review/xin-stickers-20261107/';
await mkdir('qa-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const context=await browser.newContext({...devices['iPhone 13']});const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.__cameraCalls=0;if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{window.__cameraCalls++;throw Error('Real camera must not be called');};});
const saved=()=>page.evaluate(()=>{const p=(location.pathname.match(/\/review\/([a-z0-9-]+)\//i)||[])[1];return JSON.parse(localStorage.getItem(p?'ximeng-phone-story55-review-'+p:'ximeng-phone-story55-v1'));});
async function unlock(){
 await page.locator('.lock-screen').waitFor({timeout:90000});await page.locator('[data-action="unlock"]').click();
 await page.locator('[data-action="passcode-key"][data-key="0"]').waitFor();
 for(const key of '0816')await page.locator(`[data-action="passcode-key"][data-key="${key}"]`).click();
}
async function route(day,clock,appId,path,params={}){
 await page.evaluate(({day,clock,appId,path,params})=>{
  const p=(location.pathname.match(/\/review\/([a-z0-9-]+)\//i)||[])[1],key=p?'ximeng-phone-story55-review-'+p:'ximeng-phone-story55-v1';
  const s=JSON.parse(localStorage.getItem(key));Object.assign(s,{day,clock,batteryPercent:95,unlocked:false,poweredOff:false,emergencyCharge:false});
  s.story55.activeScene=null;s.nav={current:{appId,route:path,params},stack:[]};localStorage.setItem(key,JSON.stringify(s));
 },{day,clock,appId,path,params});
 await page.reload({waitUntil:'domcontentloaded'});await unlock();
}
const action=a=>page.locator(`[data-action="${a}"]`);
async function scriptLine(id,conversation){
 return page.evaluate(async({id,conversation})=>{const p=(location.pathname.match(/\/review\/([a-z0-9-]+)\//i)||[])[1];const s=JSON.parse(localStorage.getItem(p?'ximeng-phone-story55-review-'+p:'ximeng-phone-story55-v1'));
  const release=await (await fetch(new URL('release.json',location.href))).json();const {currentScript55}=await import(release.url+'src/services/story55/scripted-chat.js');
  return {done:!!s.story55.completed[id],index:s.story55.scenes[id]?.index||0,line:currentScript55(s,'mirage',conversation)};
 },{id,conversation});
}
async function finishMirage(id,conversation){
 for(let n=0;n<100;n++){
  const state=await scriptLine(id,conversation);if(state.done)return;
  if(state.line?.kind==='disconnect'){
   const cut=action('s55-disconnect-session');await cut.waitFor();assert.equal(await cut.isEnabled(),true);
   await page.screenshot({path:'qa-results/d15-camera-disconnect.png'});await cut.click();
  }else if(state.line?.kind==='me'){
   await page.waitForFunction(text=>document.querySelector('.mc-composer input')?.value===text,state.line.text,{timeout:30000});
   await page.locator('.mc-composer button[type="submit"]').click();
  }else{
   await page.waitForFunction(({id,index})=>{const p=(location.pathname.match(/\/review\/([a-z0-9-]+)\//i)||[])[1];const s=JSON.parse(localStorage.getItem(p?'ximeng-phone-story55-review-'+p:'ximeng-phone-story55-v1'));return s.story55.scenes[id]?.index!==index||s.story55.completed[id];},{id,index:state.index},{timeout:20000});
  }
 }
 throw Error('Scene did not finish: '+id);
}
try{
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('.lock-screen').waitFor({timeout:90000});
 await page.evaluate(async()=>{
  const p=(location.pathname.match(/\/review\/([a-z0-9-]+)\//i)||[])[1],key=p?'ximeng-phone-story55-review-'+p:'ximeng-phone-story55-v1';
  const s=JSON.parse(localStorage.getItem(key));const release=await (await fetch(new URL('release.json',location.href))).json();
  const {rebuildStory55AtDay}=await import(release.url+'src/services/story55/rebuild.js');
  rebuildStory55AtDay(s,14,'09:16');s.bankData.balance=100000;s.unlocked=false;s.nav={current:{appId:'kira',route:'/mail/code-mail',params:{}},stack:[]};localStorage.setItem(key,JSON.stringify(s));
 });
 await page.reload({waitUntil:'domcontentloaded'});await unlock();
 await action('s55-read-mail').waitFor();assert.ok(!(await page.locator('.s55-document').innerText()).includes('OUROBOROS-14'));
 await action('s55-read-mail').click();await action('files-story-key-reveal').click();
 await page.locator('.files-d01-document strong').waitFor();const key=await page.locator('.files-d01-document strong').innerText();assert.equal(key,'OUROBOROS-14');
 await page.screenshot({path:'qa-results/d14-one-key-attachment.png'});
 await action('files-story-key-ghost').click();await page.locator('form[data-form="s55-authorize"] input[name="key"]').fill(key);
 await page.locator('form[data-form="s55-authorize"] button[type="submit"]').click();
 let state=await saved();assert.equal(state.story55.projects.base.authorized,true);assert.equal(state.story55.projects.base.batches.length,0);
 await action('s55-upgrade').first().click();
 for(let step=0;step<5;step++){
  await action('s55-run-step').click();await action('gh-start').click();
  state=await saved();const id=state.story55.projects.base.active;let o=state.ghost.orders[id];
  if(o.type==='cipher'){
   for(let i=0;i<9;i++){o=(await saved()).ghost.orders[id];if(o.status!=='running')break;if(o.board.tiles[i]!==i){const j=o.board.tiles.indexOf(i);await page.locator(`[data-action="gh-tile"][data-index="${i}"]`).click();await page.locator(`[data-action="gh-tile"][data-index="${j}"]`).click();}}
  }else if(o.type==='route'){
   const goal=[2,10,12,6,10,9,3,10,8];
   for(let i=0;i<9;i++)for(let n=0;n<4;n++){o=(await saved()).ghost.orders[id];if(o.status!=='running'||o.board.masks[i]===goal[i])break;await page.locator(`[data-action="gh-pipe"][data-index="${i}"]`).click();}
  }else if(o.type==='extract'){
   for(let n=0;n<10;n++){o=(await saved()).ghost.orders[id];if(o.status!=='running')break;await page.locator(`[data-action="gh-match"][data-index="${o.board.correct}"]`).click();}
  }else if(o.type==='veil'){
   for(const digit of o.board.code)await page.locator(`[data-action="gh-key"][data-key="${digit}"]`).click();
  }else if(o.type==='verify'){
   for(const token of o.board.target)await page.locator(`[data-action="gh-verify-token"][data-index="${o.board.tokens.indexOf(token)}"]`).click();
  }else throw Error('Unexpected base game '+o.type);
  await page.waitForFunction(id=>{const p=(location.pathname.match(/\/review\/([a-z0-9-]+)\//i)||[])[1];const s=JSON.parse(localStorage.getItem(p?'ximeng-phone-story55-review-'+p:'ximeng-phone-story55-v1'));return s.ghost.orders[id].status==='success';},id,{timeout:15000});
  await action('gh-close').last().click();
 }
 state=await saved();assert.equal(state.story55.projects.base.batches.filter(b=>b.complete).length,1);assert.equal(state.story55.projects.base.batches[0].steps.filter(Boolean).length,5);assert.ok(!state.story55.completed.base);
 await page.screenshot({path:'qa-results/d14-five-games-9percent.png'});
 await route(15,'15:36','mirage','/chat/s55-ouroboros');
 if(await page.locator('.mc-login-panel').count())await page.getByRole('button',{name:'SIGN IN',exact:true}).click();
 await page.locator('.mc-composer').waitFor();await finishMirage('loan','s55-ouroboros');
 state=await saved();assert.equal(state.bankData.transactions.filter(t=>t.id==='s55-loan').length,1);assert.equal(state.story55.liabilities,1000000);assert.equal(state.story55.sceneCamera.active,false);
 assert.equal(await page.evaluate(()=>window.__cameraCalls),0);
 await page.screenshot({path:'qa-results/d15-loan-complete.png'});
 await route(20,'22:42','wechat','/chat/wang');await page.locator('.wx-composer').waitFor();
 for(let i=0;i<40;i++){
  state=await saved();if(state.story55.authoredDays?.d20?.soup?.completed)break;
  const input=page.locator('.wx-composer input');const draft=await input.inputValue();
  if(draft)await page.locator('.wx-composer-send').click();
  else await page.waitForFunction(()=>{const input=document.querySelector('.wx-composer input');return input?.value;},{timeout:20000});
 }
 state=await saved();assert.equal(state.story55.authoredDays.d20.soup.completed,true);assert.ok(state.content.conversations.wechat.find(c=>c.id==='wang').messages.some(m=>m.text==='那我走九步，你走一步。'));
 await page.screenshot({path:'qa-results/d20-native-brother-chat.png'});
 await route(24,'21:06','mirage','/chat/mc-flow-d03');
 if(await page.locator('.mc-login-panel').count())await page.getByRole('button',{name:'SIGN IN',exact:true}).click();
 await page.locator('.mc-composer').waitFor();await finishMirage('lead','mc-flow-d03');state=await saved();
 assert.equal(state.story55.completed.lead.day,24);const flow=state.content.conversations.mirage.find(c=>c.id==='mc-flow-d03');assert.equal(flow.messages.filter(m=>m.id.startsWith('s55-lead-v2-')).length,7);
 assert.ok(!flow.messages.filter(m=>m.id.startsWith('s55-lead-v2-')).some(m=>/IP|哈佛|陈熙泰|陳熙泰/.test(m.text)));
 assert.equal(state.bankData.transactions.filter(t=>t.id==='s55-loan').length,1);
 await page.screenshot({path:'qa-results/d24-flow-anonymous.png'});
 await page.reload({waitUntil:'domcontentloaded'});state=await saved();assert.equal(state.bankData.transactions.filter(t=>t.id==='s55-loan').length,1);assert.deepEqual(errors,[]);
 console.log('PASS_D14_D24_MOBILE',JSON.stringify({viewport:await page.viewportSize(),baseCompletedSteps:5,frameworkBatches:state.story55.projects.base.batches.filter(b=>b.complete).length,loanTransactions:1,flowMessages:7,cameraCalls:await page.evaluate(()=>window.__cameraCalls),errors}));
}finally{await browser.close();}
