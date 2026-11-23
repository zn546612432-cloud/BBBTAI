// Prepare every App before showing the phone, then finish the offline package during play.
// CacheStorage stores compressed responses on disk; only visible critical art
// gets decoded in RAM, avoiding large iOS Safari image-memory spikes.
import {publicAssetBase,stablePublicAssetBase,publicAssetPath,isStablePublicPath,rebaseBundledPublicAsset} from '../../services/public-assets.js';
import {packageAssetUrl as assetUrl,startupImageUrls,partitionPackageAssets} from './package-policy.js';
import {createDownloadPolicy} from './download-policy.js';
const pinnedImages=new Map();
const CACHE_PREFIX='ximeng-game-package-';
const manifestUrl=()=>publicAssetPath('assets/startup/full-assets.json');

const decodeImage=url=>new Promise(resolve=>{
 if(!url||typeof Image==='undefined'){resolve(false);return;}
 const img=new Image();let done=false;
 const finish=ok=>{if(done)return;done=true;img.onload=null;img.onerror=null;if(ok&&/\/(?:icons|wallpapers)\//.test(url))pinnedImages.set(url,img);resolve(ok);};
 img.decoding='async';img.onload=()=>Promise.resolve(img.decode?.()).then(()=>finish(img.naturalWidth>0),()=>finish(false));
 img.onerror=()=>finish(false);img.src=url;
 if(img.complete&&img.naturalWidth>0)img.onload();
});

async function registerWorker(){
 if(!globalThis.navigator?.serviceWorker||!globalThis.caches)throw Error('瀏覽器無法使用持久離線快取。');
 await navigator.serviceWorker.register(stablePublicAssetBase()+'sw.js',{scope:stablePublicAssetBase()});
 await navigator.serviceWorker.ready;
 if(navigator.serviceWorker.controller)return;
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('controllerchange',changed);reject(Error('離線快取未能啟動，請重新載入。'));},8000);
  function changed(){if(!navigator.serviceWorker.controller)return;clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',changed);resolve();}
  navigator.serviceWorker.addEventListener('controllerchange',changed);changed();
 });
}

async function getManifest(){
 const url=manifestUrl();
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(url,{cache:'no-store',signal:controller.signal});
  if(!response.ok)throw Error('下載清單失敗 '+response.status);
  const manifest=await response.json();
  if(!manifest.version||!Array.isArray(manifest.assets))throw Error('素材清單不完整');
  return manifest;
 }catch(error){
  const cached=await globalThis.caches?.match(url);
  if(cached)return cached.json();
  throw new Error('無法取得遊戲資源清單，請檢查網路後重試：'+error.message);
 }finally{
  clearTimeout(timeout);
 }
}
function ordered(assets){
 const priority=path=>/^icons\//.test(path)?0:/^wallpapers\//.test(path)?1:/\.(?:png|jpe?g|webp|svg|gif|avif)$/.test(path)?2:/\.(?:mp3|wav|m4a|mp4|webm)$/.test(path)?3:4;
 return assets.slice().sort((a,b)=>priority(a.path)-priority(b.path));
}
export async function loadAssets({manifest,cache,previous,onProgress,concurrency=null,downloadPolicy=createDownloadPolicy(),priority='high'}){
 const assets=priority==='low'?manifest.assets:ordered(manifest.assets),total=assets.length;
 let done=0,failed=0,cursor=0;const errors=[],failedAssets=[];
 onProgress({finished:0,total,failed,ready:false});
 async function download(item){
   const url=assetUrl(item.path);
   try{
    if(!(await cache.match(url))){
     let reused=false;
     if(previous?.versions.get(item.path)===item.hash&&(previous.base===publicAssetBase()||(isStablePublicPath(item.path)&&!/\.(?:js|css|html)$/.test(item.path)))){
      const saved=await previous.cache.match(previous.urls?.get(item.path)||url);
      if(saved){await cache.put(url,saved);reused=true;}
     }
     if(!reused){
      // Bypass a previous service-worker cache when the artwork changed.
      const freshUrl=url+(url.includes('?')?'&':'?')+'__xm_package='+encodeURIComponent(item.hash||manifest.version);
      const started=Date.now(),controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),30000);
      let response;
      try{response=await fetch(freshUrl,{cache:'force-cache',priority,signal:controller.signal});}
      finally{clearTimeout(timeout);}
      if(!response.ok||response.type==='opaque')throw Error('HTTP '+response.status);
      await cache.put(url,response);
      downloadPolicy.observe(item.bytes||0,Date.now()-started);
     }
    }
   }catch(error){failed++;failedAssets.push(item);if(errors.length<5)errors.push(item.path+': '+error.message);}
   done++;onProgress({finished:done,total,failed,ready:false});
 }
 // Re-read the policy whenever a slot finishes: faster measured transfers can
 // open more slots, while a connection downgrade limits the next requests.
 await new Promise((resolve,reject)=>{
  let active=0;
  const pump=()=>{
   if(done===total){resolve();return;}
   const limit=Math.max(1,Math.min(8,concurrency??downloadPolicy.concurrency(priority)));
   while(active<limit&&cursor<total){
    active++;
    void download(assets[cursor++]).then(()=>{active--;pump();},reject);
   }
  };
  pump();
 });
 return {done,total,failed,errors,failedAssets};
}
async function trimOldCaches(name,namespace,keepPrevious=true){
 const all=(await caches.keys()).filter(k=>k.startsWith(namespace));
 // Retain the latest previous package for any tab still open on an older release.
 const old=all.filter(k=>k!==name);
 for(const key of keepPrevious?old.slice(0,-1):old)await caches.delete(key);
}
// Wake immediately when connectivity returns; otherwise retry without blocking play.
const retryLater=delay=>new Promise(resolve=>{
 let timer;
 const finish=()=>{clearTimeout(timer);globalThis.removeEventListener?.('online',finish);resolve();};
 globalThis.addEventListener?.('online',finish,{once:true});timer=setTimeout(finish,delay);
});
const bounded=(promise,ms)=>new Promise(resolve=>{
 const timer=setTimeout(()=>resolve(false),ms);
 Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value??true);},()=>{clearTimeout(timer);resolve(false);});
});

// The ACK ensures decoding uses the selected package rather than an old worker.
export async function activatePackage({name,manifest,base=publicAssetBase()}){
 const worker=globalThis.navigator?.serviceWorker?.controller;
 if(!worker)return false;
 const channel=new MessageChannel();
 try{
  return await bounded(new Promise(resolve=>{
   channel.port1.onmessage=event=>resolve(event.data?.ready===true);
   worker.postMessage({type:'ACTIVATE_PACKAGE',cache:name,manifestUrl:manifestUrl(),base},[channel.port2]);
  }),1500);
 }finally{channel.port1.close();channel.port2.close();}
}

export function beginCompleteGamePreload({state=null,onProgress=()=>{},onBackgroundProgress=()=>{},downloadPolicy=createDownloadPolicy(),prepareState=async()=>state,preloadCritical=(_wallpaper,current)=>startupImageUrls(current),loadManifest=getManifest,register=registerWorker,activate=activatePackage,openCache=name=>caches.open(name),fetchAssets=loadAssets,decode=decodeImage,waitForRetry=retryLater,loadMap=()=>import('../../apps/maps/leaflet.js').then(module=>module.prewarmOfflineMap())}={}){
 let ready=false,finished=0,total=1,failed=0,phase='manifest';
 let backgroundFinished=0,backgroundTotal=0,backgroundFailed=0,packageTotal=1;
 const report=()=>onProgress({finished,total,failed,ready,phase,packageFinished:Math.min(packageTotal,finished+backgroundFinished),packageTotal});
 const backgroundReport=()=>{onBackgroundProgress({finished:backgroundFinished,total:backgroundTotal,failed:backgroundFailed});report();};
 let context;
 const registered=Promise.resolve().then(register).catch(error=>{console.warn('離線背景服務尚未就緒',error);return false;});
 const result=(async()=>{
  report();
  const manifest=await loadManifest();
  packageTotal=manifest.assets.length+1;
  let critical=[...new Set(preloadCritical(state?.wallpaper,state).map(rebaseBundledPublicAsset))];
  const {foreground,background}=partitionPackageAssets(manifest,state,critical);
  total=foreground.length+1;phase='cache';report();
  if(!globalThis.caches)throw Error('瀏覽器無法使用離線資源快取，請用 Safari 正常視窗開啟。');
  const site=stablePublicAssetBase().replace(/[^a-z0-9]/gi,'_');
  const namespace=CACHE_PREFIX+site+'-';
  const name=namespace+manifest.version;
  await trimOldCaches(name,namespace);
  const diskCache=await openCache(name);
  let diskFull=false;
  const cache={
   match:url=>diskCache.match(url),
   put:async(url,response)=>{
    if(diskFull)return;
    const backup=response.clone();
    try{await diskCache.put(url,response);}
    catch(error){
     if(!/quota/i.test(error.name+' '+error.message))throw error;
     await trimOldCaches(name,namespace,false);
     try{await diskCache.put(url,backup);}
     catch(retry){
      if(!/quota/i.test(retry.name+' '+retry.message))throw retry;
      diskFull=true;console.warn('本機資源快取空間不足，使用網路快取繼續載入；存檔保持不變。');
     }
    }
   }
  };
  let previous=null;
  for(const old of (await caches.keys()).filter(k=>k.startsWith(namespace)&&k!==name).reverse()){
   const prior=await caches.open(old),saved=await prior.match(manifestUrl());
   if(!saved)continue;
   try{
    const data=await saved.json();
    previous={cache:prior,base:data.base,versions:new Map(data.assets.map(x=>[x.path,x.hash])),urls:new Map(data.assets.map(x=>[x.path,isStablePublicPath(x.path)?publicAssetPath(x.path):(data.base||publicAssetBase())+x.path]))};
    break;
   }catch{}
  }
  await cache.put(manifestUrl(),new Response(JSON.stringify({...manifest,base:publicAssetBase()}),{headers:{'Content-Type':'application/json'}}));
  // Registration proceeds alongside downloads. Even Safari leaving ready pending
  // cannot hold the startup counter hostage. Activate again if it finishes later.
  const usePackage=()=>activate({name,manifest});
  globalThis.navigator?.serviceWorker?.addEventListener?.('controllerchange',()=>{void usePackage().catch(()=>{});});
  const activation=registered.then(ok=>ok===false?false:usePackage()).catch(()=>false);
  context={name,namespace,manifest,cache,previous,background};
  phase='assets';report();
  const status=await fetchAssets({manifest:{...manifest,assets:foreground},cache,previous,downloadPolicy,onProgress:p=>{finished=p.finished;failed=p.failed;report();}});
  if(status.failed)throw Error('有 '+status.failed+' 項基礎素材未能載入：'+status.errors.join('；'));
  phase='history';report();
  const currentState=await prepareState(async url=>(await cache.match(url))||fetch(url));
  if(currentState){
   critical=[...new Set(preloadCritical(currentState.wallpaper,currentState).map(rebaseBundledPublicAsset))];
   const known=new Set(foreground.map(x=>x.path)),needed=new Set(critical);
   const extra=manifest.assets.filter(item=>!known.has(item.path)&&needed.has(assetUrl(item.path)));
   if(extra.length){
    const offset=finished;total+=extra.length;phase='assets';report();
    const more=await fetchAssets({manifest:{...manifest,assets:extra},cache,previous,downloadPolicy,onProgress:p=>{finished=offset+p.finished;failed=p.failed;report();}});
    if(more.failed)throw Error('有 '+more.failed+' 項聊天圖片未能載入：'+more.errors.join('；'));
    const loaded=new Set(extra.map(item=>item.path));
    context.background=context.background.filter(item=>!loaded.has(item.path));
   }
  }
  await bounded(activation,1500);
  phase='decoding';report();
  for(const source of critical){
   if(!/^data:|^blob:/i.test(source)&&/^https?:/i.test(source)&&!source.startsWith(location.origin))continue;
   if(!await decode(source))throw Error('主畫面素材解碼失敗：'+source);
  }
  phase='map';report();await loadMap();
  finished=total;phase='ready';ready=true;report();
  return {reason:'complete',finished,total,failed:0,cacheName:name};
 })();
 const complete=result.then(async()=>{
  const {name,namespace,manifest,cache,previous,background}=context;
  backgroundTotal=background.length;phase='background';
  let pending=background,attempt=0;
  while(pending.length){
   const completed=backgroundFinished;
   const status=await fetchAssets({manifest:{...manifest,assets:pending},cache,previous,downloadPolicy,priority:'low',onProgress:p=>{
    backgroundFinished=completed+p.finished-p.failed;backgroundFailed=p.failed;backgroundReport();
   }});
   pending=status.failedAssets||[];
   if(status.failed&&!pending.length)throw Error('背景素材下載未完成');
   if(pending.length)await waitForRetry(Math.min(60000,1000*4**Math.min(attempt++,3)));
  }
  backgroundFinished=backgroundTotal;backgroundFailed=0;phase='complete';backgroundReport();
  await trimOldCaches(name,namespace);
  return {reason:'complete',finished:backgroundFinished,total:backgroundTotal,failed:0,cacheName:name};
 });
 // Startup errors are shown by the caller; a background retry never closes an App.
 void complete.catch(error=>console.warn('背景資源下載未完成',error));
 return {ready:result,complete,isReady:()=>ready,progress:()=>({finished,total,failed,ready,phase,backgroundFinished,backgroundTotal,backgroundFailed})};
}
