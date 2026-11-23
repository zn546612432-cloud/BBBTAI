import test from 'node:test';
import assert from 'node:assert/strict';
import {beginCompleteGamePreload} from '../src/system/startup/full-preload.js';

function mocks(){
 const names=new Map();
 const caches={
  keys:async()=>[...names.keys()],
  open:async name=>{
   if(!names.has(name)){
    const entries=new Map();
    names.set(name,{
     match:async url=>entries.get(url)||null,
     put:async(url,response)=>entries.set(url,response)
    });
   }
   return names.get(name);
  },
  delete:async name=>names.delete(name)
 };
 return {caches,names};
}
test('all bundled files must finish before start is marked ready',async()=>{
 const oldCache=globalThis.caches,oldNavigator=globalThis.navigator;
 const fake=mocks(),messages=[],reports=[];
 Object.defineProperty(globalThis,'caches',{configurable:true,value:fake.caches});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{controller:{postMessage:msg=>messages.push(msg)}}}});
 try{
  let release;
  const gate=new Promise(resolve=>release=resolve);
  const preload=beginCompleteGamePreload({
   register:async()=>{},
   loadManifest:async()=>({version:'test-build',assets:[{path:'icons/a.png',hash:'x',bytes:1},{path:'assets/song.mp3',hash:'y',bytes:2}]}),
   openCache:fake.caches.open,
   preloadCritical:()=>['/icons/a.png'],
   decode:async()=>true,
   loadMap:async()=>true,
   fetchAssets:async({manifest,onProgress})=>{
    onProgress({finished:1,total:2,failed:0});
    await gate;
    onProgress({finished:2,total:2,failed:0});
    return {done:2,total:2,failed:0,errors:[]};
   },
   onProgress:p=>reports.push(p)
  });
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(preload.isReady(),false);
  assert.ok(reports.some(p=>p.finished===1));
  release();
  assert.equal((await preload.ready).reason,'complete');
  assert.equal(preload.isReady(),true);
  assert.equal(preload.progress().finished,preload.progress().total);
  assert.equal(messages[0].type,'ACTIVATE_PACKAGE');
 }finally{
  if(oldCache===undefined)delete globalThis.caches;else Object.defineProperty(globalThis,'caches',{configurable:true,value:oldCache});
  if(oldNavigator===undefined)delete globalThis.navigator;else Object.defineProperty(globalThis,'navigator',{configurable:true,value:oldNavigator});
 }
});
test('an incomplete resource cache rejects and does not unlock entry',async()=>{
 const oldCache=globalThis.caches,oldNavigator=globalThis.navigator;
 const fake=mocks();
 Object.defineProperty(globalThis,'caches',{configurable:true,value:fake.caches});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{controller:{postMessage:()=>{}}}}});
 try{
  const preload=beginCompleteGamePreload({
   register:async()=>{},loadManifest:async()=>({version:'broken-build',assets:[{path:'assets/fail.mp4',hash:'bad',bytes:3}]}),
   openCache:fake.caches.open,
   preloadCritical:()=>[],
   loadMap:async()=>true,
   fetchAssets:async()=>({done:1,total:1,failed:1,errors:['assets/fail.mp4']})
  });
  await assert.rejects(preload.ready,/未能載入/);
  assert.equal(preload.isReady(),false);
 }finally{
  if(oldCache===undefined)delete globalThis.caches;else Object.defineProperty(globalThis,'caches',{configurable:true,value:oldCache});
  if(oldNavigator===undefined)delete globalThis.navigator;else Object.defineProperty(globalThis,'navigator',{configurable:true,value:oldNavigator});
 }
});
