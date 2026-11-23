export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const btn=(action,label,cls='',attrs='')=>`<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
import {dateLabel} from '../services/calendar.js';
export const timeLabel=s=>`${dateLabel(s)} · ${s.clock}`;
import {iconArt} from './icon-art.js';
import {iconAssets} from './icon-assets.js';
import {rebaseBundledPublicAsset} from '../services/public-assets.js';
export function icon(app,s,cls=''){
  if(app.id==='aomi')return `<span class="app-tile icon-override ${cls}"><img src="/assets/aomi-icon.png" alt="" draggable="false"></span>`;
  const override=s.iconOverrides?.[app.id],asset=iconAssets[app.id];
  if(override)return `<span class="app-tile icon-override ${cls}"><img src="${esc(rebaseBundledPublicAsset(override))}" alt="" draggable="false"></span>`;
  if(asset){
    const {src,x,y,w,h,size}=asset;
    // A single CSS background texture is cheaper on iOS than a scaled <img> per app.
    // The SVG under it stays visible if the shared atlas is unavailable or evicted.
    const backgroundSize=`${size/w*100}% ${size/h*100}%`;
    const backgroundPosition=`${x/(size-w)*100}% ${y/(size-h)*100}%`;
    return `<span class="app-tile icon-rendered ${cls}"><span class="icon-fallback" aria-hidden="true">${iconArt(app.id)}</span><span class="icon-sprite" aria-hidden="true" style="background-image:url('${esc(rebaseBundledPublicAsset(src))}');background-size:${backgroundSize};background-position:${backgroundPosition}"></span></span>`;
  }
  return `<span class="app-tile icon-designed ${cls}" style="--tone:${app.tone||'#37657e'}">${iconArt(app.id)}</span>`;
}
export const avatar=(name,variant='')=>{
 const value=String(name||'?');
 const isImage=/^(?:\/|data:image\/(?:png|jpeg|webp);base64,|https:\/\/)/i.test(value);
 return `<span class="avatar ${variant}">${isImage?`<img src="${esc(rebaseBundledPublicAsset(value))}" alt="" draggable="false">`:esc(value.slice(0,1))}</span>`;
};
export const section=(title,body)=>`<section class="section"><div class="section-heading">${title}</div>${body}</section>`;
// Demo fixtures remain editable in the developer panel but never show debug badges to players.
export const demo=()=>'';
export const empty=(title,desc='')=>`<div class="empty"><span class="empty-orbit">✦</span><strong>${title}</strong><p>${desc}</p></div>`;
export const card=(body,cls='')=>`<div class="card ${cls}">${body}</div>`;
