import {esc} from '../../../../system/ui.js';
import {phIcon} from '../../components/icons.js';
import {allPhotos} from '../../data/demo.js';
import {renderPhotoTile} from '../library/index.js';
export function renderSearch(saved=[]){
 const photos=allPhotos(saved);
 return `<section class="ph-search-page" aria-label="搜索照片">
  <div class="ph-search-header"><button type="button" class="ph-round-back" data-action="back" aria-label="返回上一页">${phIcon('back',24)}</button><div class="ph-search-field">${phIcon('search',19)}<input data-photo-search type="search" placeholder="搜索照片" aria-label="搜索照片" autocomplete="off"></div>
  <button type="button" data-action="back">取消</button></div>
  <div class="ph-search-results">${photos.map(p=>`<div data-photo-search-item="${esc((p.title||'')+' '+(p.kind||''))}">${renderPhotoTile(p)}</div>`).join('')}</div>
  <p class="ph-search-empty" hidden>没有找到照片</p>
 </section>`;
}
