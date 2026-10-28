import {phIcon} from './components/icons.js';
import {renderLibrary} from './features/library/index.js';
import {renderCollections} from './features/collections/index.js';
import {renderViewer} from './features/viewer/index.js';
import {renderSearch} from './features/search/index.js';
import {renderAlbum} from './features/albums/index.js';
import {selection,resetSelection,handleSelection} from './features/selection/index.js';
import {importPhoto} from './features/import/index.js';
import {handleCollectionAction} from './features/collections/actions.js';
import {handleViewerAction} from './features/viewer/actions.js';

export const manifest={id:'photos',name:'照片',icon:2,defaultRoute:'/',supportsDeepLink:true,kicker:'LIBRARY'};
function tab(id,label,ico,route,active){
 return `<button class="ph-tab ${active?'active':''}" type="button" data-action="photos-tab" data-route="${route}" aria-label="${label}" aria-current="${active?'page':'false'}">${phIcon(ico,25)}<span>${label}</span></button>`;
}
function bottomBar(route){
 return `<nav class="ph-bottom-bar" aria-label="照片主导航"><div class="ph-tab-pill">${tab('library','图库','library','/',route==='/')}${tab('collections','精选集','collections','/collections',route==='/collections')}</div>
 <button type="button" class="ph-search-button" data-action="photos-search" aria-label="搜索">${phIcon('search',30)}</button></nav>`;
}
export function render({store},loc){
 const saved=store.get().content.photos||[],route=loc.route||'/';
 if(route==='/photo')return `<main class="ph-screen is-detail">${renderViewer(saved,loc.params?.photoId)}</main>`;
 if(route==='/search')return `<main class="ph-screen is-search">${renderSearch(saved)}</main>`;
 if(route==='/album')return `<main class="ph-screen is-detail">${renderAlbum(saved,loc.params?.kind,loc.params?.title)}</main>`;
 const collections=route==='/collections';
 return `<main class="ph-screen ${collections?'is-collections':'is-library'}" data-view-key="photos-root">
  <div class="ph-first-level">
   <div class="ph-main-view ${collections?'':'is-current'}" aria-hidden="${collections}">${renderLibrary(saved,{selectMode:selection.enabled,selected:selection.selected,filter:selection.filter})}</div>
   <div class="ph-main-view ${collections?'is-current':''}" aria-hidden="${!collections}">${renderCollections(saved)}</div>
  </div>${selection.enabled&&!collections?'':bottomBar(route)}
 </main>`;
}
export function handle(action,t,ctx){
 const current=ctx.store.get().nav.current;
 if(action==='photos-tab'){
  const route=t.dataset.route||'/';
  if(route!==current.route){
   resetSelection()
   ctx.store.update(s=>{s.nav.current.route=route;s.nav.current.params={};});
  }
  return;
 }
 if(action==='photos-search'){ctx.router.open({appId:'photos',route:'/search'});return;}
 if(action==='photos-open'){
  ctx.router.open({appId:'photos',route:'/photo',params:{photoId:t.dataset.id}});
  return;
 }
 if(action==='photos-album'){
  ctx.router.open({appId:'photos',route:'/album',params:{kind:t.dataset.kind||'recent',title:t.dataset.title||''}});
  return;
 }
 if(action==='photos-import'){importPhoto(ctx);return;}
 if(action==='photos-filter-menu'||action==='photos-more'){
  const scope=t.closest('.ph-view')||t.closest('.ph-single-view');
  const menu=scope?.querySelector('.ph-filter-menu,.ph-floating-menu,.ph-viewer-menu');
  if(menu)menu.hidden=!menu.hidden;
  return;
 }
 if(handleSelection(action,t,ctx))return;
 if(handleCollectionAction(action,t))return;
 if(handleViewerAction(action,t,ctx))return;
}
export function input(target){
 if(!target.matches('[data-photo-search]'))return;
 const query=target.value.trim().toLocaleLowerCase();
 const page=target.closest('.ph-search-page');
 let found=0;
 page?.querySelectorAll('[data-photo-search-item]').forEach(row=>{
  row.hidden=!!query&&!String(row.dataset.photoSearchItem).toLocaleLowerCase().includes(query);
  if(!row.hidden)found++;
 });
 const empty=page?.querySelector('.ph-search-empty');
 if(empty)empty.hidden=found>0;
}
