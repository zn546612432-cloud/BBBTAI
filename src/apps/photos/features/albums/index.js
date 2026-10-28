import {esc} from '../../../../system/ui.js';
import {phIcon} from '../../components/icons.js';
import {allPhotos,people} from '../../data/demo.js';
import {renderPhotoTile} from '../library/index.js';
export function renderAlbum(saved=[],kind='recent',title=''){
 const all=allPhotos(saved);
 let photos=all;
 if(kind==='favorites')photos=all.filter(p=>p.favorite);
 else if(kind==='recent')photos=all.slice(0,30);
 else if(kind==='videos')photos=all.filter(p=>['video','film'].includes(p.kind));
 else if(kind==='recently-deleted')photos=[];
 else if(kind.startsWith('person-'))photos=all.filter(p=>p.kind==='portrait');
 else if(kind==='pinned')photos=all.slice(0,24);
 else if(kind==='albums')photos=all.slice(0,24);
 else photos=all.slice(0,25);
 const name=title||({favorites:'个人收藏',recent:'最近保存',videos:'视频',pinned:'固定',albums:'相簿','recently-deleted':'最近删除'}[kind])||people.find(p=>kind==='person-'+p.id)?.name||'相簿';
 return `<section class="ph-album-page" aria-label="${esc(name)}">
 <header><button type="button" class="ph-round-back ph-album-back" data-action="back" aria-label="返回上一页">${phIcon('back',24)}</button><h1>${esc(name)}</h1></header>
 <p>${photos.length} 个项目</p><div class="ph-album-grid">${photos.map(p=>renderPhotoTile(p)).join('')}</div>
 ${photos.length?'':'<div class="ph-empty-album">这里还没有照片</div>'}</section>`;
}
