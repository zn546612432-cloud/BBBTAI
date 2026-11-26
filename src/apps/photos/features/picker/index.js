import {esc} from '../../../../system/ui.js';
import {allPhotos} from '../../data/demo.js';
import {rebaseBundledPublicAsset} from '../../../../services/public-assets.js';
let active=null;
const locationKey=s=>JSON.stringify([s.nav?.current?.appId,s.nav?.current?.route,s.nav?.current?.params||{}]);
const isImage=src=>{
 if(typeof src!=='string')return false;
 if(/^data:image\/(?:jpeg|jpg|png|webp|gif|avif|bmp);base64,/i.test(src))return true;
 // Authored photos in the phone's saved album may point to bundled artwork.
 // Do not list videos, arbitrary URLs or non-image files as photos.
 return /^\/(?!\/)(?:[\w.-]+\/)*[\w.-]+\.(?:jpe?g|png|webp|gif|avif|bmp)(?:[?#].*)?$/i.test(src)&&!src.split('/').includes('..');
};
export function gameAlbumPhotos(s){
 return allPhotos(s.content?.photos||[]).filter(p=>p.id&&isImage(p.src)).map(p=>({...p,src:rebaseBundledPublicAsset(p.src)}));
}
export function gameAlbumPhoto(s,id){return gameAlbumPhotos(s).find(p=>p.id===id);}
export function openGamePhotoPicker(ctx,onSelect){
 active={store:ctx.store,key:locationKey(ctx.store.get()),onSelect};ctx.refresh();
}
function currentPicker(s){return active&&active.key===locationKey(s);}
export function renderGamePhotoPicker(s){
 if(!currentPicker(s))return '';
 const photos=gameAlbumPhotos(s);
 return '<div class="wx-moment-modal" role="dialog" aria-modal="true" aria-label="選擇照片"><div class="wx-moment-photo-sheet"><strong>選擇照片</strong><small>遊戲相冊</small>'+
 (photos.length?'<div class="wx-moment-photo-grid">'+photos.map(p=>'<button type="button" data-action="game-photo-select" data-id="'+esc(p.id)+'" aria-label="'+esc(p.title||'照片')+'"><img src="'+esc(p.src)+'" alt=""></button>').join('')+'</div>':'<p class="game-photo-empty">暫無照片，請先前往照片 App 匯入</p>')+
 '<button type="button" data-action="game-photo-cancel">取消</button></div></div>';
}
export function handleGamePhotoPicker(action,target,ctx){
 if(!['game-photo-select','game-photo-cancel'].includes(action))return false;
 if(!currentPicker(ctx.store.get())||active.store!==ctx.store){active=null;ctx.refresh();return true;}
 const selected=active;active=null;
 if(action==='game-photo-cancel'){ctx.refresh();return true;}
 const photo=gameAlbumPhoto(ctx.store.get(),target.dataset.id);
 if(!photo){ctx.refresh();ctx.toast?.('照片已不存在');return true;}
 ctx.refresh();
 try{const task=selected.onSelect(photo,ctx);if(task?.catch)task.catch(()=>ctx.toast?.('無法打開這張照片'));}
 catch{ctx.toast?.('無法打開這張照片');}
 return true;
}
// Published photos and sent images retain a snapshot when the album item
// is deleted. Convert bundled or unsupported image formats only once,
// keeping the existing vision input compatible with the stored attachment.
export async function snapshotGamePhoto(photo){
 if(/^data:image\/(?:jpeg|png|webp);base64,/i.test(photo.src)&&photo.src.length<=2_400_000)return photo.src;
 const bitmap=await createImageBitmap(await (await fetch(photo.src)).blob());
 try{
  const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(bitmap,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg',.82);
 }finally{bitmap.close?.();}
}
