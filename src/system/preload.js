// Prewarm critical assets and bundled artwork. Never reset or mutate the saved game.
// Lightweight offline Macau raster and Leaflet run before the lock cover becomes visible.
import {publicAssetPath,rebaseBundledPublicAsset} from '../services/public-assets.js';
import {wechatAvatars} from '../apps/wechat/avatars.js';

const DEADLINE_MS=20000;
const CONCURRENCY=8;

function preloadImage(url,decode=false) {
 return new Promise(resolve=>{
  if (!url || typeof Image==='undefined') {resolve(false);return;}
  const img=new Image();
  let finished=false;
  const done=success=>{if(finished)return;finished=true;img.onload=null;img.onerror=null;resolve(success);};
  img.decoding='async';
  img.onload=()=>{
   // Let the browser decode images before the first home/WeChat paint.
   if(decode&&typeof img.decode==='function')img.decode().then(()=>done(true),()=>done(true));
   else done(true);
  };
  img.onerror=()=>done(false);
  img.src=url;
  if(img.complete&&img.naturalWidth>0)done(true);
 });
}

const dedupe=items=>[...new Set(items.filter(Boolean))];
export function initialLockscreenImageUrls(wallpaper=''){
 return dedupe([
  publicAssetPath('apps/maps/macau-offline.webp'),
  publicAssetPath('icons/glass-atlas.png'),
  publicAssetPath('icons/glass-utilities.png'),
  publicAssetPath('assets/aomi-icon.png'),
  ...Object.values(wechatAvatars),
  wallpaper?rebaseBundledPublicAsset(wallpaper):publicAssetPath('wallpapers/midnight-glass.png')
 ]);
}

/** Start only once per boot; complete without throwing if an optional image is missing. */
export function beginLockscreenPreload({wallpaper='',onProgress=()=>{},loadManifest=()=>import('./startup/image-manifest.js').then(m=>m.default),loadImage=preloadImage,loadMap=()=>import('../apps/maps/leaflet.js').then(module=>module.prewarmOfflineMap()),deadlineMs=DEADLINE_MS}={}){
 const critical=initialLockscreenImageUrls(wallpaper);
 let total=critical.length+2,finished=0,failed=0,ready=false;
 const report=()=>onProgress({finished,total,failed,ready});
 const all=(async()=>{
  let manifest=[];
  try{manifest=await loadManifest();}catch(error){failed++;console.warn('素材清單未能載入',error);}
  const urls=dedupe([...critical,...manifest]);
  total=urls.length+2;finished++;report();
  const jobs=[()=>loadMap(),...urls.map(url=>()=>loadImage(url,critical.includes(url)))];
  let cursor=0;
  async function worker(){
   while(cursor<jobs.length){
    const job=jobs[cursor++];
    try{if(await job()===false)failed++;}catch(error){failed++;console.warn('資源預載未完成',error);}
    finished++;report();
   }
  }
  await Promise.all(Array.from({length:Math.min(CONCURRENCY,jobs.length)},worker));
 })();
 let deadline;
 const guard=new Promise(resolve=>{deadline=setTimeout(()=>resolve('timeout'),deadlineMs);});
 const settled=Promise.race([all.then(()=>'complete'),guard]).then(reason=>{
  clearTimeout(deadline);ready=true;report();return {reason,finished,total,failed};
 });
 // Continue preloading if the startup deadline was reached; the splash offers a skip.
 return {ready:settled,isReady:()=>ready,progress:()=>({finished,total,failed,ready})};
}
