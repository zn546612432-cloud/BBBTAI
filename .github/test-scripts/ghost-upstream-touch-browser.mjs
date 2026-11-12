// Chromium iPhone-touch acceptance for source-ported Ghost arcade mechanics.
// Uses the isolated local /ghost-preview.html; never writes production saves.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {puzzleNeighbors} from '../../src/apps/ghost/games/vendor/puzzle-slide.js';
import {veilPlan} from '../../src/system/remote-control/veil-solver.js';

const origin=process.env.TAI_REMOTE_LOCAL_URL||'http://127.0.0.1:5173/';
const output='tai-remote-mobile-results';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,
 ...(process.env.TAI_REMOTE_CHROMIUM_PATH?{executablePath:process.env.TAI_REMOTE_CHROMIUM_PATH}:{}),
 args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
async function inspect(type,grade='B',callback=async()=>{}){
 const context=await browser.newContext({
  viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
  locale:'zh-TW',reducedMotion:'reduce'
 });
 const page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(type+': '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(type+': '+m.text());});
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ghost-preview-v1')));
 try{
  const response=await page.goto(new URL('ghost-preview.html',origin).href,{waitUntil:'domcontentloaded',timeout:60000});
  assert.ok(response?.ok(),'isolated phone preview unavailable');
  await page.locator('#preview-tier').selectOption(grade);
  await page.locator('[data-action="gh-tool"][data-tool="'+type+'"]').tap();
  await page.locator('[data-action="gh-start"]').tap();
  const initial=await state();
  const id=initial.nav.current.params.orderId,order=initial.ghost.orders[id];
  assert.equal(order.type,type);
  assert.equal(order.status,'running');
  if(type!=='route')assert.equal(order.settings.grade,grade);
  if(type==='route'||type==='cipher')assert.equal(order.board.arcade,undefined);
  else assert.equal(order.board.arcade?.upstream,true,'upstream arcade must be active');
  await callback({page,state,id,order});
  await page.screenshot({path:output+'/ghost-upstream-'+type+'-iphone.png',fullPage:true});
  console.log('PASS upstream iPhone touch '+type+' / '+grade);
 }catch(e){
  await page.screenshot({path:output+'/FAILED-ghost-upstream-'+type+'.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await context.close();}
}
try{
 await inspect('route','B',async({page,order})=>{
  assert.ok(Array.isArray(order.board.masks));
  await page.locator('[data-action="gh-pipe"]').first().waitFor({state:'visible'});
  assert.ok(await page.locator('[data-action="gh-pipe"]').count()>=9);
 });
 await inspect('cipher','C',async({page,state,order,id})=>{
  const tiles=order.board.tiles;
  assert.equal(order.settings.cipherSwaps,2);
  assert.equal(await page.locator('#gh-puzzle [data-action="gh-tile"]').count(),9);
  assert.equal(await page.locator('.gh-arcade-slide').count(),0);
  const i=tiles.findIndex((x,j)=>x!==j),j=tiles.indexOf(i);
  assert.ok(i>=0&&j>=0);
  await page.locator('[data-action="gh-tile"][data-index="'+i+'"]').tap();
  await page.locator('[data-action="gh-tile"][data-index="'+j+'"]').tap();
  const updated=(await state()).ghost.orders[id];
  assert.notDeepEqual(updated.board.tiles,tiles);
  assert.equal(updated.board.selected,null);
 });
 await inspect('extract','A',async({page,state,order,id})=>{
  const b=order.board.arcade;
  assert.equal(b.cards.length,16);
  assert.equal(await page.locator('.gh-arcade-memory .gh-arcade-cell').count(),16);
  await page.locator('[data-action="gh-arcade-tap"][data-value="0"]').tap();
  const changed=(await state()).ghost.orders[id];
  assert.deepEqual(changed.board.arcade.revealed,[0]);
 });
 await inspect('veil','B',async({page,state,order,id})=>{
  const b=order.board.arcade,plan=veilPlan(b);
  assert.ok(plan?.length);
  assert.equal(await page.locator('.gh-arcade-maze .gh-arcade-tile').count(),b.size*b.size);
  await page.locator('[data-action="gh-arcade-step"][data-value="'+plan[0]+'"]').tap();
  const updated=(await state()).ghost.orders[id];
  assert.equal(updated.board.arcade.steps,1);
  assert.equal(updated.board.arcade.heat,0);
 });
 await inspect('strike','B',async({page,state,order,id})=>{
  const first=order.board.arcade.target;
  assert.equal(await page.locator('.gh-arcade-strike .gh-arcade-cell').count(),16);
  await page.waitForFunction(({id,old})=>{
   const s=JSON.parse(localStorage.getItem('ghost-preview-v1'));
   return s.ghost.orders[id].board.arcade.target!==old;
  },{id,old:first},{timeout:8000});
  const target=(await state()).ghost.orders[id].board.arcade.target;
  await page.locator('[data-action="gh-arcade-tap"][data-value="'+target+'"]').tap();
  assert.equal((await state()).ghost.orders[id].moves,1);
 });
 assert.deepEqual(errors,[],'browser console errors: '+errors.join(' | '));
 console.log('ALL SOURCE-PORTED GHOST IPHONE TOUCH TESTS PASSED');
}finally{await browser.close();}
