import test from 'node:test';
import assert from 'node:assert/strict';
import {initialLockscreenImageUrls,beginLockscreenPreload} from '../src/system/preload.js';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {momentImage,renderMoments} from '../src/apps/wechat/features/moments/index.js';
import {pictureSrc} from '../src/apps/wechat/components/chat-view.js';

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
 await preload.complete;
 assert.equal(result.reason,'complete');assert.equal(result.failed,0);assert.equal(result.finished,result.total);
 assert.equal(seen.length,critical.length+extra.length);assert.ok(maxRunning<=8);assert.ok(seen.includes(extra[0]));
 assert.ok(reports.every((p,i)=>!i||p.finished>=reports[i-1].finished));
});

test('slow optional assets do not delay entry or reset the foreground progress',async()=>{
 let resolve;const slow=new Promise(r=>resolve=r);
 const reports=[];
 const preload=beginLockscreenPreload({loadManifest:async()=>['/extra.png'],loadMap:async()=>true,loadImage:async(url)=>url==='/extra.png'?slow:true,deadlineMs:5,onProgress:p=>reports.push(p)});
 const result=await preload.ready;
 assert.equal(result.reason,'complete');assert.equal(result.finished,result.total);assert.ok(preload.isReady());
 resolve(true);await preload.complete;
 assert.equal(preload.progress().finished,preload.progress().total);
});

test('critical images start before a stalled manifest and use the rendered Moments URLs',async()=>{
 const s=activateStory55(initialState());s.clock='08:17';
 const images=initialLockscreenImageUrls(s.wallpaper,s);
 assert.ok(images.includes(momentImage('ximengCover')));
 assert.ok(images.includes(momentImage('morning')));
 assert.ok(!images.includes(momentImage('foodMenu')),'future story posts are background work');
 for(const [,src] of renderMoments(s,'/moments').matchAll(/<img[^>]+src="([^"]+)"/g))assert.ok(images.includes(src),src);
 let release;const manifest=new Promise(resolve=>release=resolve),seen=[];
 const preload=beginLockscreenPreload({state:s,loadManifest:()=>manifest,loadMap:async()=>true,loadImage:async url=>{seen.push(url);return true;},deadlineMs:20});
 const result=await preload.ready;
 assert.equal(result.reason,'complete');assert.ok(seen.includes(momentImage('morning')));
 release([]);await preload.complete;
});

test('cached critical images still await decoding before allowing entry',async()=>{
 const previous=globalThis.Image,decoders=[];
 globalThis.Image=class{
  complete=true;naturalWidth=100;
  decode(){return new Promise(resolve=>decoders.push(resolve));}
 };
 try{
  const preload=beginLockscreenPreload({loadManifest:async()=>[],loadMap:async()=>true,deadlineMs:1000});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(preload.isReady(),false);
  // Releasing one batch creates the next batch in the same bounded queue.
  while(!preload.isReady()){
   for(const resolve of decoders.splice(0))resolve();
   await new Promise(resolve=>setImmediate(resolve));
  }
  assert.equal((await preload.ready).reason,'complete');await preload.complete;
 }finally{if(previous===undefined)delete globalThis.Image;else globalThis.Image=previous;}
});

test('the restored chat warms the same media URLs as its message bubbles',()=>{
 const s=activateStory55(initialState());
 s.nav.current={appId:'wechat',route:'/chat/wang',params:{}};
 const c=s.content.conversations.wechat.find(c=>c.id==='wang');
 c.messages.push({id:'photo-preload',from:'me',kind:'image',text:'/apps/wechat/media/user-food-rice.jpeg',day:1,time:'00:00'});
 assert.ok(initialLockscreenImageUrls(s.wallpaper,s).includes(pictureSrc('/apps/wechat/media/user-food-rice.jpeg')));
 const module='https://example.test/BBBTAI/releases/0123456789abcdef/src/apps/wechat/components/chat-view.js';
 assert.equal(new URL(pictureSrc('/apps/wechat/media/macau-morning.webp',module)).pathname,'/BBBTAI/apps/wechat/media/macau-morning.webp');
});
