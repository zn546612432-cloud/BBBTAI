import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {story55Config,projectById} from '../src/services/story55/state.js';
import {beginTearChatSession} from '../src/apps/ghost/deployment/tear-agent/state.js';
import {D29_IP} from '../src/story/d29/definition.js';
const root=path.resolve('dist'),out='qa/tear-command';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpeg':'image/jpeg','.jpg':'image/jpeg','.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{try{
 let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/BBBTAI(?=\/)/,'');
 if(route.endsWith('/'))route+='index.html';
 const target=path.resolve(root,'.'+route);if(!target.startsWith(root+path.sep))throw Error('path');
 res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'}).end(await readFile(target));
 }catch{res.writeHead(404).end('not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.GHOST_QA_CHROMIUM?{executablePath:process.env.GHOST_QA_CHROMIUM}:{})});await mkdir(out,{recursive:true});
function seed(day=28){
 const s=activateStory55(initialState());s.day=day;s.clock=day===30?'08:01':'19:12';s.unlocked=true;s.content.alarms=[];
 for(const n of story55Config(s).nodes)if(n.day<=day&&n.id!=='identity')s.story55.completed[n.id]={day:n.day,clock:'09:00'};
 if(day===30)s.content.notes.push({id:'s55-d29-ip',text:D29_IP});
 s.story55.projects.base={authorized:true,batches:Array.from({length:projectById(s,'base').batches},()=>({complete:true})),active:null};
 s.story55.baseUpgradeRevision=2;s.story55.minutesPerSecond=0;s.story55.activeScene=null;
 s.story55.d01={bankClaimed:true,rewardPaid:true};
 s.nav.current={appId:'ghost',route:'/tear',params:{}};beginTearChatSession(s);return s;
}
let page;
try{
 for(const width of [375,390]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
  await context.addInitScript(state=>{if(!localStorage.getItem('ximeng-phone-story55-v1'))localStorage.setItem('ximeng-phone-story55-v1',JSON.stringify(state));},seed());
  page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/BBBTAI/',{waitUntil:'domcontentloaded'});
  await page.locator('#xm-boot-next').click({timeout:45000});await page.locator('#xm-boot').waitFor({state:'detached',timeout:45000});
  await page.locator('[data-action=unlock]').click();for(const digit of '0816')await page.locator(`[data-action=passcode-key][data-key="${digit}"]`).click();
  const live=page.locator('#screen-layer'),preset=live.locator('[data-action=gh-tear-prompt][data-id=program]'),plus=live.locator('.gh-agent-input [data-action=gh-tear-picker]'),input=live.locator('#tear-agent-input');
  await live.locator('.gh-agent-screen').waitFor();
  assert.equal(await preset.count(),0);await plus.click();await preset.waitFor();await page.screenshot({path:`${out}/${width}-menu.png`});
  if(width===375){await preset.click();assert.match(await input.inputValue(),/爆破控制程序/);}
  else {await plus.click();await input.fill('爆破程序');}
  await live.locator('button[type=submit]').click();
  await live.locator('.gh-agent-messages').getByText(/好的，已建立工程：BC_01/).waitFor();
  await live.locator('[data-action=gh-tear-task][data-id=program]').waitFor();
  assert.equal(await input.inputValue(),'');
  await plus.click();assert.equal(await preset.count(),0);await plus.click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ximeng-phone-story55-v1')));
  assert.ok(saved.story55.tearAgent.jobs.program);assert.equal(saved.story55.tearAgent.thinking,undefined);
  await page.screenshot({path:`${out}/${width}-running.png`});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({width,entry:width===375?'preset':'free text',local:true,hiddenAfterSend:true}));
  await context.close();
 }
 for(const width of [320,390,430]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
  await context.addInitScript(state=>{if(!localStorage.getItem('ximeng-phone-story55-v1'))localStorage.setItem('ximeng-phone-story55-v1',JSON.stringify(state));},seed(30));
  page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/BBBTAI/',{waitUntil:'domcontentloaded'});
  await page.locator('#xm-boot-next').click({timeout:45000});await page.locator('#xm-boot').waitFor({state:'detached',timeout:45000});
  await page.locator('[data-action=unlock]').click();for(const digit of '0816')await page.locator(`[data-action=passcode-key][data-key="${digit}"]`).click();
  const live=page.locator('#screen-layer'),chat=live.locator('.gh-agent-messages'),orbit=live.locator('xm-tear-orbit');
  await live.locator('.gh-agent-screen').waitFor();await orbit.evaluate(el=>customElements.whenDefined(el.localName));
  await page.clock.install();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+1000)));
  await live.locator('#tear-agent-input').fill(D29_IP);await live.locator('button[type=submit]').click();
  const lines=['已收到。正在核對網絡資訊……','網絡供應商：Claranet Portugal','時區：Europe/Lisbon','有意思。這個地址存在於我的內部記錄中。','已完成資料索引。部分檔案仍處於加密狀態，需要進一步驗證。'];
  for(let i=0;i<=lines.length;i++){
   if(i)await page.clock.runFor(i===1?1900:1200);
   const content=await chat.innerText();
   for(let j=0;j<lines.length;j++)assert.equal(content.includes(lines[j]),j<i,`width ${width}, stage ${i}, line ${j}`);
   assert.equal(await live.locator('[data-action=gh-tear-identity]').count(),i===lines.length?1:0);
   if(i<lines.length)assert.equal(await orbit.getAttribute('status'),'running');
   if(i===0||i===2||i===lines.length)await page.screenshot({path:`${out}/${width}-identity-stage-${i}.png`});
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({width,identitySequence:true}));await context.close();
 }
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:`${out}/failure.png`});throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
