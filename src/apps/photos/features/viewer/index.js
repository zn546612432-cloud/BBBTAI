import {esc} from '../../../../system/ui.js';
import {phIcon} from '../../components/icons.js';
import {findPhoto,photoArtwork} from '../../data/demo.js';
export function renderViewer(saved=[],id){
 const photo=findPhoto(saved,id);
 if(!photo)return `<section class="ph-single-view" aria-label="照片详情"><header class="ph-viewer-header"><button type="button" class="ph-round-back" data-action="back" aria-label="返回上一页">${phIcon('back',24)}</button><span>照片</span><span aria-hidden="true" class="ph-round-back"></span></header><div class="ph-missing">找不到这张照片。</div></section>`;
 const real=!photo.fixture;
 return `<section class="ph-single-view" aria-label="照片详情">
  <header class="ph-viewer-header"><button type="button" class="ph-round-back" data-action="back" aria-label="返回上一页">${phIcon('back',24)}</button><span>${esc(photo.title||'照片')}</span><button type="button" class="ph-round-back" data-action="photos-more" aria-label="更多">${phIcon('more',22)}</button></header>
  <div class="ph-photo-stage">${photo.image?`<img src="${esc(photo.image)}" alt="${esc(photo.title||'照片')}">`:`<div class="ph-stage-fixture">${photoArtwork(photo)}</div>`}</div>
  <div class="ph-viewer-menu" hidden><button data-action="photos-import">导入照片</button>${real?`<button data-action="photos-wallpaper" data-id="${esc(photo.id)}">设为壁纸</button>`:""}</div>
  <footer class="ph-viewer-tools">
   <button data-action="photos-share" data-id="${esc(photo.id)}" ${real?'':'disabled'} aria-label="分享">${phIcon('share',23)}</button>
   <button data-action="photos-favorite" data-id="${esc(photo.id)}" ${real?'':'disabled'} aria-label="${photo.favorite?'取消收藏':'收藏'}" class="${photo.favorite?'is-favorite':''}">${phIcon('heart',25)}</button>
   <button data-action="photos-wallpaper" data-id="${esc(photo.id)}" ${real?'':'disabled'} aria-label="设为壁纸">${phIcon('collections',25)}</button>
   <button data-action="photos-delete" data-id="${esc(photo.id)}" ${real?'':'disabled'} aria-label="删除照片">${phIcon('trash',23)}</button>
  </footer>${real?'':'<p class="ph-demo-caption">排版演示缩略图 · 可导入真实照片替换</p>'}
 </section>`;
}
