import test from 'node:test';
import assert from 'node:assert/strict';
import {beginCompleteGamePreload,loadAssets} from '../src/system/startup/full-preload.js';
import {partitionPackageAssets} from '../src/system/startup/package-policy.js';

function mocks(){
 const names=new Map();
 const caches={
  keys:async()=>[...names.keys()],
  open:async name=>{
   if(!names.has(name)){
    const entries=new Map();
    names.set(name,{match:async url=>entries.get(String(url))?.clone()||null,put:async(url,response)=>entries.set(String(url),response.clone())});
   }
   return names.get(name);
  },
  delete:async name=>names.delete(name)
 };
 return {caches,names};
}
const manifest={version:'test-build',assets:[{path:'icons/a.png',hash:'x',bytes:1},{path:'assets/story55/d55/future.mp3',hash:'y',bytes:2}]};
async function withCache(run){
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'caches');
 const fake=mocks();Object.defineProperty(globalThis,'caches',{configurable:true,value:fake.caches});
 try{await run(fake);}finally{if(descriptor)Object.defineProperty(globalThis,'caches',descriptor);else delete globalThis.caches;}
}
const options={register:async()=>{},activate:async()=>true,loadManifest:async()=>manifest,preloadCritical:()=>['/icons/a.png'],decode:async()=>true,loadMap:async()=>true};
const status=assets=>({done:assets.length,total:assets.length,failed:0,errors:[],failedAssets:[]});

test('all App essentials finish before entry; a held future asset cannot block play',()=>withCache(async()=>{
 let release;const gate=new Promise(resolve=>release=resolve),seen=[],reports=[];
 const preload=beginCompleteGamePreload({...options,onProgress:p=>reports.push(p),fetchAssets:async({manifest,onProgress,downloadPolicy,priority})=>{
  seen.push({paths:manifest.assets.map(x=>x.path),concurrency:downloadPolicy.concurrency(priority),priority});
  if(priority==='low')await gate;
  onProgress({finished:manifest.assets.length,failed:0});return status(manifest.assets);
 }});
 await preload.ready;
 assert.ok(preload.isReady());assert.equal(preload.progress().finished,preload.progress().total);
 assert.ok(reports.some(p=>p.ready&&p.packageFinished<p.packageTotal),'entry is ready while the overall package is still downloading');
 assert.deepEqual(seen[0].paths,['icons/a.png']);assert.deepEqual(seen[1].paths,['assets/story55/d55/future.mp3']);
 assert.equal(seen[1].concurrency,4);assert.equal(seen[1].priority,'low');
 let complete=false;void preload.complete.then(()=>complete=true);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(complete,false);
 release();await preload.complete;assert.equal(reports.at(-1).phase,'complete');
 assert.equal(reports.at(-1).packageFinished,reports.at(-1).packageTotal);
}));

test('failed essential art prevents entry and never starts the optional queue',()=>withCache(async()=>{
 let calls=0;
 const preload=beginCompleteGamePreload({...options,fetchAssets:async()=>{calls++;return {failed:1,errors:['icons/a.png']};}});
 await assert.rejects(preload.ready,/基礎素材未能載入/);assert.equal(preload.isReady(),false);assert.equal(calls,1);
}));

test('failed future assets retry until complete while entry remains available',()=>withCache(async()=>{
 let attempts=0,retries=0;const background=[];
 const preload=beginCompleteGamePreload({...options,onBackgroundProgress:p=>background.push(p),waitForRetry:async()=>{retries++;assert.ok(preload.isReady());},fetchAssets:async({manifest,onProgress,priority})=>{
  const fails=priority==='low'&&attempts++===0;
  onProgress({finished:manifest.assets.length,failed:fails?1:0});
  return {...status(manifest.assets),failed:fails?1:0,failedAssets:fails?manifest.assets:[]};
 }});
 await preload.ready;await preload.complete;
 assert.equal(retries,1);assert.equal(attempts,2);assert.equal(background.at(-1).finished,1);assert.equal(background.at(-1).failed,0);
}));

test('a Safari worker that never becomes ready cannot freeze startup',()=>withCache(async()=>{
 const reports=[];
 const preload=beginCompleteGamePreload({...options,register:()=>new Promise(()=>{}),onProgress:p=>reports.push(p),fetchAssets:async({manifest,onProgress})=>{onProgress({finished:manifest.assets.length,failed:0});return status(manifest.assets);}});
 await preload.ready;await preload.complete;assert.ok(preload.isReady());assert.equal(reports[0].phase,'manifest');assert.equal(reports.at(-1).phase,'complete');
}));

test('existing player pictures, all App base art and dynamic engines are essential; future media is deferred',()=>{
 const assets=['icons/a.png','apps/chess/pieces/wp.svg','apps/ghost/idle.mp4','vendor/stockfish.wasm','src/story/presets/days/pre-d01-wechat.json','apps/wechat/media/existing.webp','apps/wechat/media/future.webp','assets/story55/d55/final.mp3'].map(path=>({path}));
 const {foreground,background}=partitionPackageAssets({assets},null,['/apps/wechat/media/existing.webp']);
 assert.ok(foreground.some(x=>x.path==='apps/wechat/media/existing.webp'));
 for(const path of ['icons/a.png','apps/chess/pieces/wp.svg','vendor/stockfish.wasm','src/story/presets/days/pre-d01-wechat.json'])assert.ok(foreground.some(x=>x.path===path));
 assert.ok(background.some(x=>x.path==='apps/wechat/media/future.webp'));assert.ok(background.some(x=>x.path.endsWith('final.mp3')));
});

test('unchanged files reuse the previous package and only changed bytes are downloaded',()=>withCache(async fake=>{
 const oldFetch=globalThis.fetch,requests=[];
 globalThis.fetch=async url=>{requests.push(url);return new Response('new');};
 try{
  const cache=await fake.caches.open('new'),previous=await fake.caches.open('old');
  await previous.put('/icons/a.png',new Response('unchanged'));
  const result=await loadAssets({manifest:{version:'next',assets:[manifest.assets[0],{path:'icons/b.png',hash:'new'}]},cache,previous:{cache:previous,versions:new Map([['icons/a.png','x']])},onProgress:()=>{}});
  assert.equal(result.failed,0);assert.equal(requests.length,1);assert.match(requests[0],/__xm_package=new/);
  assert.equal(await (await cache.match('/icons/a.png')).text(),'unchanged');
 }finally{globalThis.fetch=oldFetch;}
}));

test('full resource storage falls back to network without clearing saves or blocking App entry',()=>withCache(async fake=>{
 let writes=0;
 const preload=beginCompleteGamePreload({...options,openCache:async()=>({match:async()=>null,put:async()=>{writes++;throw new DOMException('Quota exceeded','QuotaExceededError');}}),fetchAssets:async({manifest,cache,onProgress})=>{
  for(const item of manifest.assets)await cache.put('/'+item.path,new Response('bytes'));
  onProgress({finished:manifest.assets.length,failed:0});return status(manifest.assets);
 }});
 await preload.ready;await preload.complete;assert.ok(preload.isReady());assert.equal(writes,2);
}));

test('hydrated existing chat artwork is downloaded before the player enters',()=>withCache(async()=>{
 const art={path:'apps/wechat/media/history.webp',hash:'history'};
 const stages=[];
 const preload=beginCompleteGamePreload({...options,loadManifest:async()=>({...manifest,assets:[...manifest.assets,art]}),prepareState:async()=>({wallpaper:'',historyLoaded:true}),preloadCritical:(_wallpaper,state)=>state?.historyLoaded?['/icons/a.png','/apps/wechat/media/history.webp']:['/icons/a.png'],fetchAssets:async({manifest,onProgress,priority})=>{
  stages.push({paths:manifest.assets.map(x=>x.path),ready:preload.isReady(),priority});
  onProgress({finished:manifest.assets.length,failed:0});return status(manifest.assets);
 }});
 await preload.ready;await preload.complete;
 assert.deepEqual(stages[1].paths,[art.path]);assert.equal(stages[1].ready,false);assert.equal(stages[2].priority,'low');
}));
