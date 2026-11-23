// Preload the complete published game package before showing the phone.
// CacheStorage stores compressed responses on disk; only visible critical art
// gets decoded in RAM, avoiding large iOS Safari image-memory spikes.
import {publicAssetBase,stablePublicAssetBase,publicAssetPath,isStablePublicPath,rebaseBundledPublicAsset} from '../../services/public-assets.js';
import {initialLockscreenImageUrls} from '../preload.js';

const PARALLEL=4;
const CACHE_PREFIX='ximeng-game-package-';
const manifestUrl=()=>publicAssetPath('assets/startup/full-assets.json');
const assetUrl=path=>isStablePublicPath(path)?publicAssetPath(path):publicAssetBase()+path.replace(/^\/+/,'');

const decodeImage=url=>new Promise(resolve=>{
 if(!url||typeof Image==='undefined'){resolve(false);return;}
 const img=new Image();let done=false;
 const finish=ok=>{if(done)return;done=true;img.onload=null;img.onerror=null;resolve(ok);};
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
async function loadAssets({manifest,cache,previous,onProgress}){
 const assets=ordered(manifest.assets),total=assets.length;
 let done=0,failed=0,cursor=0;const errors=[];
 onProgress({finished:0,total,failed,ready:false});
 async function worker(){
  while(cursor<assets.length){
   const item=assets[cursor++];const url=assetUrl(item.path);
   try{
    if(!(await cache.match(url))){
     let reused=false;
     if(previous?.versions.get(item.path)===item.hash){
      const saved=await previous.cache.match(url);
      if(saved){await cache.put(url,saved);reused=true;}
     }
     if(!reused){
      // Bypass a previous service-worker cache when the artwork changed.
      const freshUrl=url+(url.includes('?')?'&':'?')+'__xm_package='+encodeURIComponent(manifest.version);
      const response=await fetch(freshUrl,{cache:'reload'});
      if(!response.ok||response.type==='opaque')throw Error('HTTP '+response.status);
      await cache.put(url,response);
     }
    }
   }catch(error){failed++;if(errors.length<5)errors.push(item.path+': '+error.message);}
   done++;onProgress({finished:done,total,failed,ready:false});
  }
 }
 await Promise.all(Array.from({length:Math.min(PARALLEL,total)},worker));
 return {done,total,failed,errors};
}
async function trimOldCaches(name,namespace){
 const all=(await caches.keys()).filter(k=>k.startsWith(namespace));
 // Retain the latest previous package for any tab still open on an older release.
 for(const old of all.filter(k=>k!==name).slice(0,-1))await caches.delete(old);
}
export function beginCompleteGamePreload({state=null,onProgress=()=>{},preloadCritical=initialLockscreenImageUrls,loadManifest=getManifest,register=registerWorker,openCache=name=>caches.open(name),fetchAssets=loadAssets,decode=decodeImage,loadMap=()=>import('../../apps/maps/leaflet.js').then(module=>module.prewarmOfflineMap())}={}){
 let ready=false,finished=0,total=1,failed=0,phase='manifest';
 const report=()=>onProgress({finished,total,failed,ready,phase});
 const result=(async()=>{
  // CacheStorage itself does not require a controlling Service Worker.
  // Do not block the loading counter behind navigator.serviceWorker.ready:
  // Safari can leave that promise pending while the page is already usable.
  report();
  const manifest=await loadManifest();
  total=manifest.assets.length+1;phase='cache';report();
  if(!globalThis.caches)throw Error('瀏覽器無法使用離線資源快取，請用 Safari 正常視窗開啟。');
  const site=stablePublicAssetBase().replace(/[^a-z0-9]/gi,'_');
  const namespace=CACHE_PREFIX+site+'-';
  const name=namespace+manifest.version;
  const cache=await openCache(name);
  let activated=false,packageReady=false;
  const activate=()=>{
   if(!packageReady||!activated)return;
   globalThis.navigator?.serviceWorker?.controller?.postMessage({type:'ACTIVATE_PACKAGE',cache:name});
  };
  // Installation is best-effort and independent of the full download queue.
  // A stalled/unsupported worker must never freeze a progress bar at 0%.
  void Promise.resolve().then(register).then(()=>{
   activated=true;activate();
  }).catch(error=>console.warn('離線背景服務尚未就緒，直接使用本機資源快取',error));
  let previous=null;
  for(const old of (await caches.keys()).filter(k=>k.startsWith(namespace)&&k!==name).reverse()){
   const prior=await caches.open(old),saved=await prior.match(manifestUrl());
   if(!saved)continue;
   try{const data=await saved.json();previous={cache:prior,versions:new Map(data.assets.map(x=>[x.path,x.hash]))};break;}catch{}
  }
  await cache.put(manifestUrl(),new Response(JSON.stringify(manifest),{headers:{'Content-Type':'application/json'}}));
  phase='assets';report();
  const status=await fetchAssets({manifest,cache,previous,onProgress:p=>{finished=p.finished;failed=p.failed;report();}});
  if(status.failed)throw Error('有 '+status.failed+' 項素材未能載入：'+status.errors.join('；'));
  phase='decoding';report();
  // Compressed assets stay on disk. Only immediately visible artwork needs
  // eager decode; decoding every future-day photograph would exhaust iOS RAM.
  const critical=[...new Set(preloadCritical(state?.wallpaper,state).map(rebaseBundledPublicAsset))];
  for(const source of critical){
   if(!/^data:|^blob:/i.test(source)&&/^https?:/i.test(source)&&!source.startsWith(location.origin))continue;
   const ok=await decode(source);
   if(!ok)throw Error('主畫面素材解碼失敗：'+source);
  }
  phase='map';report();
  await loadMap();
  finished=total;phase='complete';ready=true;report();
  packageReady=true;activate();
  void trimOldCaches(name,namespace).catch(()=>{});
  return {reason:'complete',finished,total,failed:0};
 })();
 return {ready:result,complete:result,isReady:()=>ready,progress:()=>({finished,total,failed,ready,phase})};
}
