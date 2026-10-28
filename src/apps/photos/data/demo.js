import {esc} from '../../../system/ui.js';
const A='/apps/wechat/avatars/originals/';
export const people=[
 {id:'wang',name:'熙旺',image:A+'xiwang.jpeg'},
 {id:'ximeng',name:'熙蒙',image:A+'ximeng.jpeg'},
 {id:'tai',name:'熙泰',image:A+'awei.jpeg'},
 {id:'hufeng',name:'胡枫',image:A+'hufeng.jpeg'},
 {id:'xiaoxin',name:'小辛',image:A+'xiaoxin.jpeg'},
 {id:'zaizai',name:'仔仔',image:A+'zaizai.jpeg'}
];
// Screenshots supplied for UI reference must never become the player's photo library.
// Only user-imported or story-authored images appear as photos.
export const samplePhotos=[];
export const sampleCount=0;
export function allPhotos(saved=[]){return saved.map(p=>({...p,kind:'uploaded',image:p.src}));}
export function findPhoto(saved=[],id){return allPhotos(saved).find(p=>p.id===id);}
export function photoArtwork(photo){
 if(photo.image)return `<img src="${esc(photo.image)}" alt="" loading="lazy" draggable="false">`;
 const kind=photo.kind||'chat';
 if(kind==='chat'||kind==='message')return `<span class="ph-art ph-art-${kind} tone-${photo.tone||0}"><i class="ph-mini-head"></i><b></b><em></em><small></small><b></b><em></em><small></small><b></b><em></em></span>`;
 if(kind==='settings'||kind==='list')return `<span class="ph-art ph-art-${kind} tone-${photo.tone||0}"><i></i><b></b><i></i><b></b><i></i><b></b><i></i><b></b><i></i><b></b></span>`;
 if(kind==='terminal'||kind==='blueprint')return `<span class="ph-art ph-art-${kind} tone-${photo.tone||0}"><i></i><b></b><em></em><b></b><i></i><small></small></span>`;
 if(kind==='flower')return '<span class="ph-art ph-art-flower"><i></i><b></b><em></em><small></small></span>';
 if(kind==='sky')return '<span class="ph-art ph-art-sky"><i></i><b></b><em></em></span>';
 if(kind==='art'||kind==='poster')return `<span class="ph-art ph-art-${kind} tone-${photo.tone||0}"><i></i><b></b><em></em></span>`;
 if(kind==='nature')return '<span class="ph-art ph-art-nature"><i></i><b></b><em></em></span>';
 return `<span class="ph-art ph-art-${kind} tone-${photo.tone||0}"><i></i><b></b><em></em></span>`;
}
