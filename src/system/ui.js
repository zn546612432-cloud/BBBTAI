export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const btn=(action,label,cls='',attrs='')=>`<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
import {dateLabel} from '../services/calendar.js';
export const timeLabel=s=>`${dateLabel(s)} · ${s.clock}`;
import {iconArt} from './icon-art.js';
import {iconAssets} from './icon-assets.js';
export function icon(app,s,cls=''){
  if(app.id==='aomi')return `<span class="app-tile icon-override ${cls}"><img src="/assets/aomi-icon.png" alt="" draggable="false"></span>`;
  const override=s.iconOverrides?.[app.id],asset=iconAssets[app.id];
  if(override)return `<span class="app-tile icon-override ${cls}"><img src="${esc(override)}" alt="" draggable="false"></span>`;
  if(asset){const {src,x,y,w,h,size}=asset;return `<span class="app-tile icon-rendered ${cls}"><img src="${src}" alt="" draggable="false" style="width:${size/w*100}%;height:${size/h*100}%;left:${-x/w*100}%;top:${-y/h*100}%"></span>`;}
  return `<span class="app-tile icon-designed ${cls}" style="--tone:${app.tone||'#37657e'}">${iconArt(app.id)}</span>`;
}
export const avatar=(name,variant='')=>{
 const value=String(name||'?');
 const isImage=/^(?:\/|data:image\/(?:png|jpeg|webp);base64,|https:\/\/)/i.test(value);
 return `<span class="avatar ${variant}">${isImage?`<img src="${esc(value)}" alt="" draggable="false">`:esc(value.slice(0,1))}</span>`;
};
export const section=(title,body)=>`<section class="section"><div class="section-heading">${title}</div>${body}</section>`;
// Demo fixtures remain editable in the developer panel but never show debug badges to players.
export const demo=()=>'';
export const empty=(title,desc='')=>`<div class="empty"><span class="empty-orbit">✦</span><strong>${title}</strong><p>${desc}</p></div>`;
export const card=(body,cls='')=>`<div class="card ${cls}">${body}</div>`;
