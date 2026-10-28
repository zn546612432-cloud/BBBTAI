import {esc} from '../../../../system/ui.js';
import {phIcon} from '../../components/icons.js';
import {allPhotos,photoArtwork} from '../../data/demo.js';
import {renderSelectionControls} from '../selection/index.js';

export function renderPhotoTile(photo,{selectMode=false,selected=false}={}){
 return `<button class="ph-photo-tile ${selectMode?'is-selectable':''} ${selected?'is-selected':''}" type="button" data-action="${selectMode?'photos-select-photo':'photos-open'}" data-id="${esc(photo.id)}" aria-label="${esc(photo.title||'照片')}" aria-pressed="${selected?'true':'false'}">
  ${photoArtwork(photo)}
  ${selectMode?`<span class="ph-select-badge">${selected?phIcon('check',15):''}</span>`:''}
 </button>`;
}
export function renderLibrary(saved=[],{selectMode=false,selected=new Set(),filter='all'}={}){
 const total=saved.length;
 const all=allPhotos(saved).filter(p=>filter==='favorites'?p.favorite:filter==='videos'?p.kind==='video'||p.kind==='film':true);
 return `<section class="ph-view ph-library" data-view-key="photos-library" aria-label="图库">
   <div class="ph-library-scroll" data-key="photos-library-scroll">
    <header class="ph-library-header">
      <div><h1>图库</h1><p>${total.toLocaleString('zh-CN')}个项目</p></div>
      <div class="ph-header-tools">
       <button type="button" class="ph-circle ph-glass-circle" data-action="photos-filter-menu" aria-label="排列与筛选">${phIcon('filter',24)}</button>
       <button type="button" class="ph-circle ph-glass-circle ph-select-header" data-action="photos-toggle-select">${selectMode?'完成':'选择'}</button>
      </div>
    </header>
    <div class="ph-filter-menu" hidden data-key="photo-filter-menu">
      <button data-action="photos-filter" data-filter="all">所有照片</button>
      <button data-action="photos-filter" data-filter="favorites">个人收藏</button>
      <button data-action="photos-filter" data-filter="videos">视频</button>
      <button data-action="photos-import">${phIcon('plus',16)} 导入照片</button>
    </div>
    <div class="ph-library-grid" data-key="photos-grid">
     ${all.map(p=>renderPhotoTile(p,{selectMode,selected:selected.has(p.id)})).join('')}
    </div>
    ${!all.length?`<div class="ph-library-empty">${phIcon('library',39)}<strong>${filter==='all'?'暂无照片':'没有符合条件的照片'}</strong><span>${filter==='all'?'你导入的照片将显示在这里':'可以尝试其他筛选条件'}</span>${filter==='all'&&!selectMode?'<button type="button" data-action="photos-import">导入照片</button>':''}</div>`:''}
   </div>
   ${selectMode?renderSelectionControls():''}
  </section>`;
}
