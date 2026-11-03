// Prewarm only assets needed immediately after unlocking. Never reset or mutate the saved game.
// Lightweight offline Macau raster and Leaflet run before the lock cover becomes visible.
import {publicAssetPath,rebaseBundledPublicAsset} from '../services/public-assets.js';
import {wechatAvatars} from '../apps/wechat/avatars.js';

const DEADLINE_MS=20000;

function preloadImage(url) {
 return new Promise(resolve=>{
  if (!url || typeof Image==='undefined') {resolve(false);return;}
  const img=new Image();
  let finished=false;
  const done=success=>{if(finished)return;finished=true;img.onload=null;img.onerror=null;resolve(success);};
  img.decoding='async';
  img.onload=()=>{
   // Let the browser decode images before the first home/WeChat paint.
   if(typeof img.decode==='function')img.decode().then(()=>done(true),()=>done(true));
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
export function beginLockscreenPreload({wallpaper='',onProgress=()=>{}}={}){
 const urls=initialLockscreenImageUrls(wallpaper);
 const total=urls.length+1;let finished=0,failed=0,ready=false;
 const report=()=>onProgress({finished,total,failed,ready});
 const jobs=urls.map(url=>preloadImage(url));
 jobs.push(import('../apps/maps/leaflet.js').then(module=>module.prewarmOfflineMap()));
 const all=Promise.allSettled(jobs.map(p=>Promise.resolve(p).then(
  result=>{finished++;if(result===false)failed++;report();return result;},
  error=>{finished++;failed++;report();console.warn('资源预加载未完成',error);return false;}
 )));
 let deadline;
 const guard=new Promise(resolve=>{deadline=setTimeout(()=>resolve('timeout'),DEADLINE_MS);});
 const settled=Promise.race([all.then(()=>'complete'),guard]).then(reason=>{
  clearTimeout(deadline);ready=true;report();return {reason,finished,total,failed};
 });
 // Continue preloading if the startup deadline was reached; the splash offers a skip.
 return {ready:settled,isReady:()=>ready,progress:()=>({finished,total,failed,ready})};
}
