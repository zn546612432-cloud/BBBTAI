import {publicAssetBase,publicAssetPath,isStablePublicPath,rebaseBundledPublicAsset} from '../../services/public-assets.js';
import {initialLockscreenImageUrls} from '../preload.js';
import {trackById} from '../../apps/music/features/shared/catalog.js';

export const packageAssetUrl=path=>isStablePublicPath(path)?publicAssetPath(path):publicAssetBase()+path.replace(/^\/+/, '');
const image=/\.(?:png|jpe?g|webp|svg|gif|avif)$/i;

// All installed Apps share the already-imported registry. Prepare their base
// artwork, dynamic engines and existing player content before opening the phone;
// future story media and the rest of the offline package can follow during play.
export function startupImageUrls(state){
 const urls=initialLockscreenImageUrls(state?.wallpaper,state);
 for(const photo of state?.content?.photos||[])if(photo.image)urls.push(photo.image);
 for(const conversations of Object.values(state?.content?.conversations||{})){
  if(!Array.isArray(conversations))continue;
  for(const chat of conversations)for(const message of chat.messages||[]){
   if(message.kind==='image'&&message.text)urls.push(message.text);
  }
 }
 return [...new Set(urls.map(source=>rebaseBundledPublicAsset(source)))];
}

export function partitionPackageAssets(manifest,state,critical=startupImageUrls(state)){
 const immediate=new Set(critical);
 immediate.add(trackById(state?.musicTrack).src);
 const essential=item=>{
  const path=item.path;
  if(immediate.has(packageAssetUrl(path)))return true;
  if(/^vendor\//.test(path)||/^apps\/ghost\//.test(path))return true;
  if(/^src\/.+\.json$/.test(path))return true;
  if(!image.test(path))return false;
  // Other photographs and story attachments remain in the continuous queue.
  if(/^apps\/wechat\/(?:media|stickers)\//.test(path)||/^assets\/(?:story55|browser)\//.test(path))return false;
  if(/^wallpapers\//.test(path))return false;
  return true;
 };
 const foreground=[],background=[];
 for(const item of manifest.assets)(essential(item)?foreground:background).push(item);
 // Download nearer story days before later ones, and images before bulky films.
 const day=path=>Number(path.match(/(?:^|\/)[dD](\d{2,3})(?:[\/.-]|$)/)?.[1]||0);
 background.sort((a,b)=>{
  const distance=x=>{const d=day(x.path);return d?Math.max(0,d-(state?.day||1)):0;};
  const rank=x=>/\.(?:js|css|json|html|woff2?)$/.test(x.path)?0:image.test(x.path)?1:2;
  return rank(a)-rank(b)||distance(a)-distance(b)||(a.bytes||0)-(b.bytes||0);
 });
 return {foreground,background};
}
