// Prewarm critical assets and bundled artwork. Never reset or mutate the saved game.
// Lightweight offline Macau raster and Leaflet run before the lock cover becomes visible.
import {publicAssetPath,rebaseBundledPublicAsset} from '../services/public-assets.js';
import {wechatAvatars} from '../apps/wechat/avatars.js';
import {iconAssets} from './icon-assets.js';
import {momentImageUrls} from '../apps/wechat/features/moments/index.js';
import {chatImageUrls} from '../apps/wechat/components/chat-view.js';

const DEADLINE_MS=20000;
const CONCURRENCY=8;

function preloadImage(url,decode=false) {
 return new Promise(resolve=>{
  if (!url || typeof Image==='undefined') {resolve(false);return;}
  const img=new Image();
  let finished=false,decoding=false;
  const done=success=>{if(finished)return;finished=true;img.onload=null;img.onerror=null;resolve(success);};
  img.decoding='async';
  img.fetchPriority=decode?'high':'low';
  const loaded=()=>{
   if(finished||decoding)return;
   decoding=true;
   // Let the browser decode images before the first home/WeChat paint.
   if(decode&&typeof img.decode==='function')img.decode().then(()=>done(true),()=>done(false));
   else done(true);
  };
  img.onload=loaded;
  img.onerror=()=>done(false);
  img.src=url;
  if(img.complete&&img.naturalWidth>0)loaded();
 });
}

const dedupe=items=>[...new Set(items.filter(Boolean).map(source=>{
 if(/^https?:/i.test(source)&&globalThis.location){
  const url=new URL(source);
  if(url.origin===globalThis.location.origin)return url.pathname+url.search+url.hash;
 }
 return source;
}))];
export function initialLockscreenImageUrls(wallpaper='',state=null){
 return dedupe([
  publicAssetPath('apps/maps/macau-offline.webp'),
  ...Object.values(iconAssets).map(asset=>asset.src),
  publicAssetPath('assets/aomi-icon.png'),
  ...Object.values(wechatAvatars),
  wallpaper?rebaseBundledPublicAsset(wallpaper):publicAssetPath('wallpapers/midnight-glass.png'),
  ...(state?momentImageUrls(state):[]),
  ...(state?.nav?.current?.appId==='wechat'&&state.nav.current.route.startsWith('/chat/')?chatImageUrls(state,state.nav.current.route.slice(6)):[]),
  ...Object.values(state?.characterAvatars||{}).filter(source=>/^(?:\/|https?:|data:image|blob:)/i.test(source)).map(source=>rebaseBundledPublicAsset(source)),
  ...Object.values(state?.iconOverrides||{})
 ]);
}

/** Start only once per boot; complete without throwing if an optional image is missing. */
export function beginLockscreenPreload({wallpaper='',state=null,onProgress=()=>{},loadManifest=()=>import('./startup/image-manifest.js').then(m=>m.default),loadImage=preloadImage,loadMap=()=>import('../apps/maps/leaflet.js').then(module=>module.prewarmOfflineMap()),deadlineMs=DEADLINE_MS}={}){
 const critical=initialLockscreenImageUrls(wallpaper,state);
 const total=critical.length+1;
 let finished=0,failed=0,ready=false;
 const report=()=>onProgress({finished,total,failed,ready});
 // A delayed manifest or future-day artwork must not hold up today's screen.
 const manifest=Promise.resolve().then(loadManifest).catch(error=>{console.warn('素材清單未能載入',error);return [];});
 async function run(jobs,foreground){
  let cursor=0;
  async function worker(){
   while(cursor<jobs.length){
    const job=jobs[cursor++];
    try{if(await job()===false&&foreground)failed++;}catch(error){if(foreground)failed++;console.warn('資源預載未完成',error);}
    if(foreground){finished++;report();}
   }
  }
  await Promise.all(Array.from({length:Math.min(CONCURRENCY,jobs.length)},worker));
 }
 const foreground=run([()=>loadMap(),...critical.map(url=>()=>loadImage(url,true))],true);
 const complete=foreground.then(async()=>{
  const urls=dedupe(await manifest).filter(url=>!critical.includes(url));
  await run(urls.map(url=>()=>loadImage(url,false)),false);
 });
 let deadline;
 const guard=new Promise(resolve=>{deadline=setTimeout(()=>resolve('timeout'),deadlineMs);});
 const settled=Promise.race([foreground.then(()=>'complete'),guard]).then(reason=>{
  clearTimeout(deadline);ready=true;report();return {reason,finished,total,failed};
 });
 // Continue preloading if the startup deadline was reached; the splash offers a skip.
 return {ready:settled,complete,isReady:()=>ready,progress:()=>({finished,total,failed,ready})};
}
