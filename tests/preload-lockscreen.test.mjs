import test from 'node:test';
import assert from 'node:assert/strict';
import {initialLockscreenImageUrls,beginLockscreenPreload} from '../src/system/preload.js';

test('lock-screen preload includes both icon atlases, wallpaper, and real character portraits',()=>{
 const images=initialLockscreenImageUrls('/wallpapers/midnight-glass.png');
 assert.ok(images.includes('/icons/glass-atlas.png'));
 assert.ok(images.includes('/icons/glass-utilities.png'));
 assert.ok(images.some(x=>x.endsWith('/wallpapers/midnight-glass.png')));
 assert.ok(images.includes('/apps/wechat/avatars/originals/ximeng.jpeg'));
 assert.ok(images.includes('/apps/wechat/avatars/originals/fulongsheng.jpeg'));
 assert.equal(images.length,new Set(images).size);
 assert.ok(images.every(x=>x.startsWith('/')&&!x.startsWith('//')));
});

test('custom wallpapers remain untouched when they are saved as data URLs',()=>{
 const uri='data:image/png;base64,AAAA';
 const images=initialLockscreenImageUrls(uri);
 assert.ok(images.includes(uri));
 assert.equal(images.filter(x=>x===uri).length,1);
});

test('bundled assets use one bounded queue, deduplication and truthful progress',async()=>{
 const critical=initialLockscreenImageUrls(),extra=['/apps/browser/room404/media/avatar.webp','/assets/story55/personal-files/Student_ID.jpg'];
 const seen=[],reports=[];let running=0,maxRunning=0;
 const preload=beginLockscreenPreload({loadManifest:async()=>[...critical,...extra],loadMap:async()=>true,loadImage:async(url)=>{
  running++;maxRunning=Math.max(maxRunning,running);seen.push(url);await Promise.resolve();running--;return url!==extra[1];
 },onProgress:p=>reports.push(p)});
 const result=await preload.ready;
 assert.equal(result.reason,'complete');assert.equal(result.failed,1);assert.equal(result.finished,result.total);
 assert.equal(seen.length,critical.length+extra.length);assert.ok(maxRunning<=8);assert.ok(seen.includes(extra[0]));
 assert.ok(reports.every((p,i)=>!i||p.finished>=reports[i-1].finished));
});

test('slow optional assets continue loading after the startup deadline',async()=>{
 let resolve;const slow=new Promise(r=>resolve=r);
 const reports=[];
 const preload=beginLockscreenPreload({loadManifest:async()=>['/extra.png'],loadMap:async()=>true,loadImage:async(url)=>url==='/extra.png'?slow:true,deadlineMs:5,onProgress:p=>reports.push(p)});
 const result=await preload.ready;
 assert.equal(result.reason,'timeout');assert.ok(result.finished<result.total);assert.ok(preload.isReady());
 resolve(true);await new Promise(r=>setImmediate(r));
 assert.equal(preload.progress().finished,preload.progress().total);
});
