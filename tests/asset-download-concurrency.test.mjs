import test from 'node:test';
import assert from 'node:assert/strict';
import {createDownloadPolicy} from '../src/system/startup/download-policy.js';
import {loadAssets} from '../src/system/startup/full-preload.js';

test('Safari starts four background transfers and learns fast connections from real-sized downloads',()=>{
 const policy=createDownloadPolicy({connection:null});
 assert.equal(policy.concurrency('low'),4);assert.equal(policy.concurrency('high'),6);
 for(let i=0;i<10;i++)policy.observe(500,1);
 assert.equal(policy.concurrency('low'),4,'tiny files cannot trigger a bandwidth upgrade');
 policy.observe(131072,100);policy.observe(131072,100);
 assert.equal(policy.concurrency('low'),6);assert.equal(policy.concurrency('high'),8);
});

test('reported slow networks and data saving bound new requests even after fast transfers',()=>{
 const connection={downlink:10,effectiveType:'4g'},policy=createDownloadPolicy({connection});
 assert.equal(policy.concurrency('low'),6);
 connection.effectiveType='3g';assert.equal(policy.concurrency('low'),2);
 connection.effectiveType='4g';connection.saveData=true;assert.equal(policy.concurrency('low'),1);
});

async function exercise(policy){
 const original=globalThis.fetch,gates=[],seen=[],cache={match:async()=>null,put:async()=>{}};
 let active=0,peak=0;
 globalThis.fetch=async(url,options)=>{
  active++;peak=Math.max(peak,active);seen.push({url,priority:options.priority});
  await new Promise(resolve=>gates.push(resolve));active--;return new Response('bytes');
 };
 try{
  const assets=Array.from({length:18},(_,i)=>({path:'assets/f'+i+'.webp',hash:String(i),bytes:1000}));
  const operation=loadAssets({manifest:{version:'test',assets},cache,priority:'low',downloadPolicy:policy,onProgress:()=>{}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(active,policy.concurrency('low'),'multiple files must start before any finishes');
  while(gates.length){gates.splice(0).forEach(resolve=>resolve());await new Promise(resolve=>setImmediate(resolve));}
  const status=await operation;assert.equal(status.failed,0);assert.equal(status.done,18);
  assert.equal(seen.length,18);assert.ok(seen.every(x=>x.priority==='low'));return peak;
 }finally{globalThis.fetch=original;}
}

test('the real downloader runs four files simultaneously without exceeding its default cap',async()=>{
 assert.equal(await exercise(createDownloadPolicy({connection:null})),4);
});

test('a fast network runs six files simultaneously and retains low background priority',async()=>{
 assert.equal(await exercise(createDownloadPolicy({connection:{downlink:10}})),6);
});
