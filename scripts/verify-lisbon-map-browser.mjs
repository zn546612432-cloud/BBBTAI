import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {story55Config} from '../src/services/story55/state.js';
import {D29_IP} from '../src/story/d29/definition.js';

const root=path.resolve('dist'),out='qa/lisbon-map';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{try{
 let route=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/BBBTAI(?=\/)/,'');
 if(route.endsWith('/'))route+='index.html';
 const file=path.resolve(root,'.'+route);
 if(!file.startsWith(root+path.sep))throw Error('bad path');
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(await readFile(file));
 }catch{res.writeHead(404).end('not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}:{})});
await mkdir(out,{recursive:true});
function seed(){
 const s=activateStory55(initialState());
 s.day=29;s.clock='22:00';s.unlocked=true;s.content.alarms=[];
 for(const n of story55Config(s).nodes)if(n.day<=29)s.story55.completed[n.id]={day:n.day,clock:'09:00'};
 s.story55.minutesPerSecond=0;s.story55.activeScene=null;
 s.story55.d01={bankClaimed:true,rewardPaid:true};
 s.content.notes.push({id:'s55-d29-ip',day:29,at:'22:00',title:'Ouroboros',text:D29_IP});
 s.nav.current={appId:'maps',route:'/',params:{}};
 return s;
}
let page;
try{
 for(const width of [320,390,430]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
  await context.addInitScript(state=>{if(!localStorage.getItem('ximeng-phone-story55-v1'))localStorage.setItem('ximeng-phone-story55-v1',JSON.stringify(state));},seed());
  page=await context.newPage();
  await page.goto(base+'/BBBTAI/',{waitUntil:'domcontentloaded'});
  await page.locator('#xm-boot-next').click({timeout:45000});
  await page.locator('#xm-boot').waitFor({state:'detached',timeout:45000});
  await page.locator('[data-action=unlock]').click();
  for(const digit of '0816')await page.locator(`[data-action=passcode-key][data-key="${digit}"]`).click();
  const host=page.locator('xm-leaflet-map[mode=normal]'),input=host.locator('input');
  // The passcode unlock animates before rendering the persisted app route.
  await host.waitFor({timeout:15000});
  await input.waitFor({timeout:15000});
  await input.fill('195.22');
  assert.equal(await host.locator('.xm-map-results button').count(),0);
  await input.fill(D29_IP);
  const result=host.locator('.xm-map-results button');
  assert.equal(await result.textContent(),'葡萄牙・里斯本・銀潮別墅');
  if(width===390)await result.click();else await input.press('Enter');
  await page.waitForFunction(()=>{const node=document.querySelector('xm-leaflet-map');const img=node?.querySelector('img.leaflet-image-layer');return node?.area==='LISBON'&&img?.src.includes('lisbon-offline.webp')&&img.complete&&img.naturalWidth>1000;});
  assert.equal(await host.locator('.xm-map-bottom b').textContent(),'葡萄牙・里斯本・銀潮別墅');
  await host.locator('.leaflet-popup-content').waitFor();
  await page.screenshot({path:`${out}/${width}-lisbon.png`});
  await host.locator('.xm-map-recenter').click();
  await page.waitForFunction(()=>document.querySelector('xm-leaflet-map')?.area==='MACAU');
  assert.equal(await host.locator('.xm-map-bottom b').textContent(),'澳门');
  await input.fill('昌宁');await input.press('Enter');
  assert.match(await host.locator('.xm-map-bottom b').textContent(),/昌宁/);
  console.log('PASS Lisbon local search, remote map, Macau return',width);
  await context.close();
 }
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:`${out}/failure.png`});throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
