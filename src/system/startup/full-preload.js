// Preload the complete published game package before showing the phone.
// CacheStorage stores compressed responses on disk; only visible critical art
// gets decoded in RAM, avoiding large iOS Safari image-memory spikes.
import {publicAssetBase,publicAssetPath,isStablePublicPath,rebaseBundledPublicAsset} from '../../services/public-assets.js';
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
 await navigator.serviceWorker.register(publicAssetPath('sw.js').replace('/assets/sw.js','/sw.js'),{scope:publicAssetBase().replace(/releases\/[^/]+\/$/,'')});
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
 try{
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw Error('下載清單失敗 '+response.status);
  const manifest=await response.json();
  if(!manifest.version||!Array.isArray(manifest.assets))throw Error('素材清單不完整');
  return manifest;
 }catch(error){
  const cached=await globalThis.caches?.match(url);
  if(cached)return cached.json();
  throw error;
 }
}
function ordered(assets){
 const priority=path=>/^icons\//.test(path)?0:/^wallpapers\//.test(path)?1:/\.(?:png|jpe?g|webp|svg|gif|avif)$/.test(path)?2:/\.(?:mp3|wav|m4a|mp4|webm)$/.test(path)?3:4;
 return assets.slice().sort((a,b)=>priority(a.path)-priority(b.path));
}
async function loadAssets({manifest,cache,onProgress}){
 const assets=ordered(manifest.assets),total=assets.length;
 let done=0,failed=0,cursor=0;const errors=[];
 onProgress({finished:0,total,failed,ready:false});
 async function worker(){
  while(cursor<assets.length){
   const item=assets[cursor++];const url=assetUrl(item.path);
   try{
    if(!(await cache.match(url))){
     const response=await fetch(url,{cache:'default'});
     if(!response.ok||response.type==='opaque')throw Error('HTTP '+response.status);
     await cache.put(url,response);
    }
   }catch(error){failed++;if(errors.length<5)errors.push(item.path+': '+error.message);}
   done++;onProgress({finished:done,total,failed,ready:false});
  }
 }
 await Promise.all(Array.from({length:Math.min(PARALLEL,total)},worker));
 return {done,total,failed,errors};
}
async function trimOldCaches(name){
 const all=(await caches.keys()).filter(k=>k.startsWith(CACHE_PREFIX));
 // Retain the latest previous package for any tab still open on an older release.
 for(const old of all.filter(k=>k!==name).slice(0,-1))await caches.delete(old);
}
export function beginCompleteGamePreload({state=null,onProgress=()=>{},preloadCritical=initialLockscreenImageUrls,loadManifest=getManifest,register=registerWorker,openCache=name=>caches.open(name),fetchAssets=loadAssets}={}){
 let ready=false,finished=0,total=1,failed=0;
 const report=()=>onProgress({finished,total,failed,ready});
 const result=(async()=>{
  await register();
  const manifest=await loadManifest();
  const name=CACHE_PREFIX+manifest.version;
  const cache=await openCache(name);
  total=manifest.assets.length+1;report();
  const status=await fetchAssets({manifest,cache,onProgress:p=>{finished=p.finished;failed=p.failed;report();}});
  if(status.failed)throw Error('有 '+status.failed+' 項素材未能載入：'+status.errors.join('；'));
  // A cache hit proves bytes are present on disk, not that Safari decoded them.
  // Decode only the shell's immediately visible assets for reliable first paint.
  const critical=[...new Set(preloadCritical(state?.wallpaper,state).map(rebaseBundledPublicAsset))];
  for(const source of critical){
   if(!/^data:|^blob:/i.test(source)&&/^https?:/i.test(source)&&!source.startsWith(location.origin))continue;
   // Bundled WebP atlas paths are already rewritten by the release builder.
   const ok=await decodeImage(source);
   if(!ok)throw Error('主畫面素材解碼失敗：'+source);
  }
  finished=total;ready=true;report();
  navigator.serviceWorker.controller?.postMessage({type:'ACTIVATE_PACKAGE',cache:name});
  // Old package deletion never holds up entering the game.
  void trimOldCaches(name).catch(()=>{});
  return {reason:'complete',finished,total,failed:0};
 })();
 return {ready:result,complete:result,isReady:()=>ready,progress:()=>({finished,total,failed,ready})};
}
