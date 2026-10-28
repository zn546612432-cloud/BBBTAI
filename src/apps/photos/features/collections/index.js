import {esc} from '../../../../system/ui.js';
import {phIcon} from '../../components/icons.js';
import {photoArtwork} from '../../data/demo.js';
function sectionHead(title,{editable=false}={}){
 return `<div class="ph-section-heading"><button class="ph-section-title" data-action="photos-album" data-kind="${title==='固定'?'pinned':title==='相簿'?'albums':'people'}" aria-label="打开${title}"><h2>${title}</h2>${phIcon('next',16)}</button>
 <div class="ph-section-controls">${editable?'<button type="button" class="ph-edit-chip" data-action="photos-edit-pin">编辑</button>':''}
 <button type="button" class="ph-down-button" data-action="photos-collapse" aria-label="折叠或展开${title}" aria-expanded="true">${phIcon('chevron',23)}</button></div></div>`;
}
function collectionCard({title,id,photo,icon='collections',badge=''}) {
 const art=photo?photoArtwork(photo):`<span class="ph-empty-collection-art">${phIcon(icon,32)}</span>`;
 return `<button class="ph-collection-card" type="button" data-action="photos-album" data-kind="${esc(id)}" data-title="${esc(title)}" aria-label="打开${esc(title)}">
  <span class="ph-collection-image">${art}${badge?`<span class="ph-card-badge">${badge}</span>`:''}<span class="ph-card-caption">${esc(title)}</span></span>
 </button>`;
}
export function renderCollections(saved=[]){
 const newest=saved[0],fav=saved.find(p=>p.favorite);
 return `<section class="ph-view ph-collections" data-view-key="photos-collections" aria-label="精选集">
  <div class="ph-collection-scroll" data-key="photos-collections-scroll">
   <header class="ph-collection-header">
    <div class="ph-collection-title-row"><h1>精选集</h1><div class="ph-header-tools">
      <button class="ph-circle ph-white-circle" data-action="photos-more" aria-label="更多操作">${phIcon('more',24)}</button>
      <button class="ph-circle ph-white-circle" data-action="photos-profile" aria-label="账户">${phIcon('person',24)}</button>
    </div></div>
    <p class="ph-cloud-state">${phIcon('cloud',14)} ${saved.length} 个项目</p>
   </header>
   <section class="ph-memory-section"><div class="ph-section-heading"><h2>回忆</h2><button type="button" class="ph-down-button" data-action="photos-collapse" aria-expanded="true" aria-label="折叠或展开回忆">${phIcon('chevron',23)}</button></div>
    <div class="ph-collapsible"><div class="ph-memory-card">${phIcon('memory',27)}<strong>无可用回忆</strong><span>“精选内容”已关闭</span></div></div>
   </section>
   <section class="ph-card-section" data-photos-section="pinned">${sectionHead('固定',{editable:true})}
    <div class="ph-collapsible"><div class="ph-horizontal-cards">
      ${collectionCard({title:'个人收藏',id:'favorites',photo:fav,icon:'heart',badge:phIcon('heart',19)})}
      ${collectionCard({title:'最近保存',id:'recent',photo:newest,icon:'clock'})}
      ${collectionCard({title:'视频',id:'videos',icon:'play'})}
      ${collectionCard({title:'最近删除',id:'recently-deleted',icon:'trash'})}
    </div></div>
   </section>
   <section class="ph-card-section" data-photos-section="albums">${sectionHead('相簿')}
    <div class="ph-collapsible"><p class="ph-empty-section">暂无相簿</p></div>
   </section>
   <section class="ph-card-section" data-photos-section="people">${sectionHead('人物')}
    <div class="ph-collapsible"><p class="ph-empty-section">暂无人物</p></div>
   </section>
  </div>
  <div class="ph-floating-menu" hidden data-key="photos-more-menu">
   <button data-action="photos-import">${phIcon('plus',17)} 导入照片</button>
   <button data-action="photos-tab" data-route="/">前往图库</button>
  </div>
  <div class="ph-profile-sheet" hidden data-key="photos-profile-sheet"><div class="ph-sheet-head"><strong>照片与 iCloud</strong><button data-action="photos-profile">${phIcon('close',20)}</button></div>
  <p>照片已保存在这部手机的游戏存档中，导入的内容可继续用于壁纸和分享。</p></div>
 </section>`;
}
