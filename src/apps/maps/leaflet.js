import {publicAssetPath} from '../../services/public-assets.js';
import {MAP_PLACES,searchPlaces,locationById} from './data/places.js';
// Native phone navigation and save data remain owned by the existing system.
const MACAU=[22.19875,113.54387],OVERVIEW=[22.175,113.552];
let loader;
let lastView={center:OVERVIEW,zoom:13};
function loadLeaflet(){
 if(window.L)return Promise.resolve(window.L);
 if(loader)return loader;
 loader=new Promise((resolve,reject)=>{
  if(!document.querySelector('link[data-xm-leaflet]')){
   const link=document.createElement('link');link.rel='stylesheet';
   link.href=publicAssetPath('vendor/leaflet/leaflet.css');
   link.dataset.xmLeaflet='1';document.head.append(link);
  }
  const script=document.createElement('script');script.src=publicAssetPath('vendor/leaflet/leaflet.js');
  script.onload=()=>window.L?resolve(window.L):reject(Error('Leaflet unavailable'));
  script.onerror=()=>reject(Error('地图引擎加载失败'));document.head.append(script);
 }).catch(error=>{loader=null;throw error;});
 return loader;
}
// Draw ONE locally generated geographic image, not 18,898 costly Leaflet
// GeoJSON shapes. The raster is rendered from openly licensed OSM geometry
// during the build and never accesses online tiles or CDN resources.
const MACAU_IMAGE_BOUNDS=[[22.095,113.505],[22.235,113.612]];
function drawOfflineBase(L,map,{world=false}={}){
 if(world)return null;
 const image=L.imageOverlay(publicAssetPath('apps/maps/macau-offline.webp'),MACAU_IMAGE_BOUNDS,{
  alt:'澳门离线街道地图 · OpenStreetMap',
  interactive:false,
  opacity:1
 }).addTo(map);
 map.attributionControl.addAttribution('<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors · ODbL</a>');
 return image;
}
// When called on the lock cover, all local Macau geometry is already parsed by this module import.
// This also fetches the locally vendored Leaflet runtime before the keypad appears.
export const prewarmOfflineMap=()=>loadLeaflet();
const safeText=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function pinIcon(kind){
 return window.L.divIcon({className:'xm-map-pin'+(kind==='fictional'?' is-fictional':''),html:'<span></span>',iconSize:[24,30],iconAnchor:[12,29]});
}
class XimengMap extends HTMLElement {
 static get observedAttributes(){return ['data-visible','data-place','area'];}
 attributeChangedCallback(name){
  if(!this.map)return;
  if(this.mode==='normal')this.refreshPlaces();
  else if(name==='area')this.map.setView(this.getAttribute('area')==='WORLD'?[28,10]:MACAU,this.getAttribute('area')==='WORLD'?2:11,{animate:false});
 }
 connectedCallback(){
  this.alive=true;this.mode=this.getAttribute('mode')||'normal';
  this.innerHTML='<div class="xm-map-tiles" aria-label="澳门互动地图"></div>'+(this.mode==='normal'?'<div class="xm-map-search"><form class="xm-map-form"><input type="search" aria-label="搜索地图地点" placeholder="搜索地点" enterkeyhint="search"/><button type="submit" aria-label="搜索">⌕</button></form><div class="xm-map-results" hidden></div></div><button type="button" class="xm-map-recenter" aria-label="回到澳门">⌖</button><div class="xm-map-bottom"><b>澳门</b><span>离线地图 · 可拖动、缩放、搜索</span></div>':'<div class="xm-map-story-notice">真实地理底图 · 剧情地点为示意</div>')+'<div class="xm-map-error" hidden>地图暂时无法加载，请检查网络后重试。<button type="button">重试</button></div>';
  this.querySelector('.xm-map-error button').addEventListener('click',()=>this.init());
  if(this.mode==='normal'){
   this.querySelector('.xm-map-form').addEventListener('submit',event=>{
    event.preventDefault();
    const input=this.querySelector('.xm-map-form input');
    const match=searchPlaces(input?.value||'',this.getPlaces())[0];
    if(match){
     this.selectPlace(match.id);
     this.querySelector('.xm-map-results').hidden=true;
     input?.blur();
    }else this.showSearch();
   });
   this.querySelector('input').addEventListener('input',()=>this.showSearch());
   // Delegate clicks and keep matching result nodes stable across frequent
   // phone state updates; iOS WebKit cancels taps when buttons are replaced.
   this.querySelector('.xm-map-results').addEventListener('click',event=>{
    const button=event.target.closest?.('button[data-place-id]');
    if(!button)return;
    this.selectPlace(button.dataset.placeId);
    const results=this.querySelector('.xm-map-results');
    if(results)results.hidden=true;
    this.querySelector('input')?.blur();
   });
   this.querySelector('.xm-map-recenter').addEventListener('click',()=>this.map?.flyTo(OVERVIEW,13,{duration:.6}));
   // Do not stop touchmove propagation here: Leaflet tracks active touch
   // gestures on document so both panning and pinch zoom require bubbling.
  }
  this.init();
 }
 disconnectedCallback(){
  this.alive=false;this.observer?.disconnect();
  if(this.map){
   if(this.mode==='normal'){const p=this.map.getCenter();lastView={center:[p.lat,p.lng],zoom:this.map.getZoom()};}
   this.map.remove();this.map=null;
  }
 }
 getPlaces(){
  const allowed=(this.getAttribute('data-visible')||'').split(',').filter(Boolean);
  return MAP_PLACES.filter(p=>allowed.includes(p.id));
 }
 showSearch(){
  const input=this.querySelector('input');if(!input)return;
  const query=input.value.trim(),result=this.querySelector('.xm-map-results');
  const found=searchPlaces(query,this.getPlaces());
  const ids=found.map(p=>p.id).join('|');
  if(result.dataset.query===query&&result.dataset.ids===ids){
   result.hidden=!query;return;
  }
  result.dataset.query=query;
  result.dataset.ids=ids;
  result.hidden=!query;
  result.replaceChildren();
  if(query&&!found.length)result.textContent='没有找到已解锁的地点';
  for(const p of found){
   const button=document.createElement('button');
   button.type='button';
   button.dataset.placeId=p.id;
   button.textContent=p.name+(p.kind==='fictional'?' · 剧情地点':'');
   result.append(button);
  }
 }
 selectPlace(id){
  const p=this.getPlaces().find(place=>place.id===id);
  if(!p||!this.map)return;
  this.map.flyTo([p.lat,p.lng],Math.max(this.map.getZoom(),15),{duration:.6});
  this.markers?.get(p.id)?.openPopup();
  this.querySelector('.xm-map-bottom').innerHTML='<b>'+safeText(p.name)+'</b><span>'+(p.kind==='fictional'?'虚构剧情地点 · 位置仅为示意':safeText(p.description))+'</span>';
 }
 refreshPlaces(){
  if(!this.map||this.mode!=='normal')return;
  if(!this.markers)this.markers=new Map();
  const available=this.getPlaces(),ids=new Set(available.map(p=>p.id));
  for(const [id,marker] of this.markers)if(!ids.has(id)){marker.remove();this.markers.delete(id);}
  for(const p of available){
   if(this.markers.has(p.id))continue;
   const title=safeText(p.name),note=p.kind==='fictional'?'虚构剧情地点 · 非真实地址 · 不提供导航':safeText(p.description);
   const marker=window.L.marker([p.lat,p.lng],{icon:pinIcon(p.kind)}).addTo(this.map)
    .bindPopup('<strong>'+title+'</strong><div>'+note+'</div>');
   marker.on('click',()=>{this.querySelector('.xm-map-bottom').innerHTML='<b>'+title+'</b><span>'+note+'</span>';});
   this.markers.set(p.id,marker);
  }
  const requested=this.getAttribute('data-place');
  if(requested&&requested!==this.selectedId){this.selectedId=requested;requestAnimationFrame(()=>this.selectPlace(requested));}
  this.showSearch();
 }
 async init(){
  const error=this.querySelector('.xm-map-error');if(!error)return;error.hidden=true;
  try{
   const L=await loadLeaflet();if(!this.alive||!this.isConnected||this.map)return;
   this.map=L.map(this.querySelector('.xm-map-tiles'),{zoomControl:this.mode==='normal',attributionControl:true,scrollWheelZoom:this.mode==='normal',dragging:this.mode==='normal',touchZoom:this.mode==='normal',doubleClickZoom:this.mode==='normal',tap:false,preferCanvas:true,zoomSnap:.5,minZoom:this.mode==='story'&&this.getAttribute('area')==='WORLD'?2:10,maxZoom:18});
   const world=this.mode==='story'&&this.getAttribute('area')==='WORLD';
   this.map.setView(world?[28,10]:(this.mode==='story'?MACAU:lastView.center),world?2:(this.mode==='story'?11:lastView.zoom));
   this.baseImage=drawOfflineBase(L,this.map,{world});
   if(this.mode==='normal')this.refreshPlaces();
   else{
    // Story55 screen buttons use original x/y positions and existing story actions.
    this.map.dragging.disable();this.map.touchZoom.disable();this.map.doubleClickZoom.disable();this.map.boxZoom.disable();this.map.keyboard.disable();
   }
   this.observer=new ResizeObserver(()=>this.map?.invalidateSize({pan:false,animate:false}));
   this.observer.observe(this);
   requestAnimationFrame(()=>this.map?.invalidateSize({pan:false,animate:false}));
  }catch(e){if(this.alive&&this.isConnected)error.hidden=false;console.warn('Ximeng map:',e);}
 }
}
if(!customElements.get('xm-leaflet-map'))customElements.define('xm-leaflet-map',XimengMap);
export function mapHtml(places,loc={}){
 const ids=places.map(p=>p.id).join(',');
 const selected=locationById(loc.params?.id)&&places.some(p=>p.id===loc.params.id)?loc.params.id:'';
 return '<section class="xm-maps-app" data-view-key="maps-normal"><xm-leaflet-map mode="normal" data-visible="'+safeText(ids)+'" data-place="'+safeText(selected)+'"></xm-leaflet-map></section>';
}
