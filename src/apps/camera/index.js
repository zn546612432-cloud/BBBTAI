import {dateLabel} from '../../services/calendar.js';
import {uid} from '../../services/id.js';
import {btn} from '../../system/ui.js';
export const manifest={id:'camera',name:'相机',icon:1,defaultRoute:'/',kicker:'CAMERA'};
export const render=()=>`<div class="camera-view"><div class="camera-scene"><div class="camera-focus">⌗</div><span>本机演示取景</span></div><div class="camera-controls">${btn('take-photo','<span></span>','shutter','aria-label="拍照"')}</div></div>`;
export const handle=(a,t,c)=>{if(a==='take-photo'){c.store.update(s=>s.content.photos.unshift({id:uid(),title:'夜色 · '+dateLabel(s),src:s.wallpaper,actual:true}));c.toast('演示照片已存到相册');}};
