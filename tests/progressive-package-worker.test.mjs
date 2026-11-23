import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
function setup(shared=new Map(),network=async()=>new Response('fresh')){
 const handlers={},counts=[];
 const caches={open:async name=>{
  if(!shared.has(name))shared.set(name,new Map());const entries=shared.get(name);
  return {put:async(url,res)=>entries.set(String(url),res.clone()),match:async url=>entries.get(String(url))?.clone()||null,keys:async()=>[...entries.keys()].map(url=>({url})),delete:async url=>entries.delete(String(url.url||url))};
 }};
 const self={registration:{scope:'https://game.test/BBBTAI/'},addEventListener:(name,handler)=>handlers[name]=handler,clients:{matchAll:async()=>[{id:'a'},{id:'b'}],claim:async()=>{}},skipWaiting:async()=>{}};
 vm.runInNewContext(source,{self,caches,URL,Response,Headers,AbortController,setTimeout,clearTimeout,Map,Set,fetch:async(url,options)=>{counts.push(String(url));return network(url,options);}});
 async function configure(id,version,hash){
  const name='ximeng-game-package-'+version,url='https://game.test/BBBTAI/assets/startup/full-assets.json';
  await(await caches.open(name)).put(url,new Response(JSON.stringify({assets:[{path:'assets/photo.webp',hash}]})));
  let done,ack=false;
  handlers.message({data:{type:'ACTIVATE_PACKAGE',cache:name,manifestUrl:url,base:'/BBBTAI/releases/'+version+'/'},source:{id},ports:[{postMessage:()=>ack=true}],waitUntil:p=>done=p});
  await done;assert.ok(ack);return caches.open(name);
 }
 async function request(id,{stamp='',range}={}){
  let result;
  const headers=new Headers();if(range)headers.set('range',range);
  handlers.fetch({clientId:id,request:{url:'https://game.test/BBBTAI/assets/photo.webp'+stamp,method:'GET',mode:'cors',headers},respondWith:p=>result=p});
  return result;
 }
 return {configure,request,counts,caches,shared};
}

test('on-demand opening and background prefetch share one download and then hit disk',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);
 const worker=setup(new Map(),async()=>{await gate;return new Response('image-bytes');});
 await worker.configure('a','one','hash-one');
 const background=worker.request('a',{stamp:'?__xm_package=hash-one'}),foreground=worker.request('a');
 await new Promise(resolve=>setImmediate(resolve));assert.equal(worker.counts.length,1);
 release();assert.equal(await(await background).text(),'image-bytes');assert.equal(await(await foreground).text(),'image-bytes');
 assert.equal(await(await worker.request('a')).text(),'image-bytes');assert.equal(worker.counts.length,1);
});

test('a new release never serves changed media from another client package',async()=>{
 const worker=setup();const old=await worker.configure('a','old','hash-old');
 await old.put('https://game.test/BBBTAI/assets/photo.webp',new Response('old-image'));
 await worker.configure('b','new','hash-new');
 assert.equal(await(await worker.request('b')).text(),'fresh');assert.match(worker.counts[0],/__xm_package=hash-new/);
 assert.equal(await(await worker.request('a')).text(),'old-image');assert.equal(worker.counts.length,1);
});

test('selection survives worker restart and cached music ranges use the full stored bytes',async()=>{
 const first=setup(),cache=await first.configure('a','one','hash-one');
 await cache.put('https://game.test/BBBTAI/assets/photo.webp',new Response('0123456789'));
 const restarted=setup(first.shared);
 const response=await restarted.request('a',{range:'bytes=2-5'});
 assert.equal(response.status,206);assert.equal(await response.text(),'2345');assert.equal(response.headers.get('Content-Range'),'bytes 2-5/10');assert.equal(restarted.counts.length,0);
});
