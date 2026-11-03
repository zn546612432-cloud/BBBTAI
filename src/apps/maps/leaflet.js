// Real map is isolated from the game clock, story state, and other apps.
// Map tiles require a network connection. Fictional story pins stay schematic.
const MACAU=[22.19875,113.54387];
const places=[
 {id:'macau',name:'澳门半岛',lat:22.19875,lng:113.54387,desc:'澳门历史城区'},
 {id:'taipa',name:'氹仔',lat:22.1577,lng:113.5583,desc:'氹仔城区'},
 {id:'coloane',name:'路环',lat:22.1182,lng:113.5602,desc:'路环村'}
];
let loader;
let lastView={center:MACAU,zoom:12};
function loadLeaflet(){
 if(window.L)return Promise.resolve(window.L);
 if(loader)return loader;
 loader=new Promise((resolve,reject)=>{
  if(!document.querySelector('link[data-xm-leaflet]')){
   const link=document.createElement('link');link.rel='stylesheet';
   link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
   link.dataset.xmLeaflet='1';document.head.append(link);
  }
  const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.crossOrigin='anonymous';script.onload=()=>window.L?resolve(window.L):reject(Error('Leaflet unavailable'));
  script.onerror=()=>reject(Error('地图引擎加载失败'));document.head.append(script);
 }).catch(error=>{loader=null;throw error;});
 return loader;
}
const pinIcon=()=>window.L.divIcon({className:'xm-map-pin',html:'<span></span>',iconSize:[24,30],iconAnchor:[12,29]});
class XimengMap extends HTMLElement {
 connectedCallback(){
  this.mode=this.getAttribute('mode')||'normal';this.alive=true;
  this.innerHTML='<div class="xm-map-tiles" aria-label="澳门互动地图"></div>'+(this.mode==='normal'?'<div class="xm-map-search"><form class="xm-map-form"><input type="search" aria-label="搜索澳门地点" placeholder="搜索澳门、氹仔、路环" enterkeyhint="search"/><button type="submit" aria-label="搜索">⌕</button></form><div class="xm-map-results" hidden></div></div><button type="button" class="xm-map-recenter" aria-label="回到澳门">⌖</button><div class="xm-map-bottom"><b>澳门</b><span>轻扫地图探索地点</span></div>':'<div class="xm-map-story-notice">地图为真实底图 · 剧情标记仅为位置示意</div>')+'<div class="xm-map-error" hidden>地图暂时无法加载，请检查网络后重试。<button type="button">重试</button></div>';
  this.querySelector('.xm-map-error button').addEventListener('click',()=>this.init());
  if(this.mode==='normal'){
   this.querySelector('.xm-map-form').addEventListener('submit',event=>{event.preventDefault();const term=this.querySelector('input').value.trim();const found=places.filter(p=>p.name.includes(term)||p.desc.includes(term));const result=this.querySelector('.xm-map-results');result.hidden=!term;result.replaceChildren();if(term&&!found.length)result.textContent='暂无匹配地点';for(const place of found){const b=document.createElement('button');b.type='button';b.textContent=place.name+' · '+place.desc;b.addEventListener('click',()=>{this.map?.flyTo([place.lat,place.lng],15,{duration:.6});this.markers?.get(place.id)?.openPopup();result.hidden=true;});result.append(b);}});
   this.querySelector('.xm-map-recenter').addEventListener('click',()=>this.map?.flyTo(MACAU,12,{duration:.6}));
  }
  this.init();
 }
 disconnectedCallback(){this.alive=false;this.observer?.disconnect();if(this.map){if(this.mode==='normal'){const p=this.map.getCenter();lastView={center:[p.lat,p.lng],zoom:this.map.getZoom()};}this.map.remove();this.map=null;}}
 async init(){
  const error=this.querySelector('.xm-map-error');error.hidden=true;
  try{
   const L=await loadLeaflet();if(!this.alive||!this.isConnected||this.map)return;
   const tiles=this.querySelector('.xm-map-tiles');
   this.map=L.map(tiles,{zoomControl:this.mode==='normal',attributionControl:true,scrollWheelZoom:false,tap:false,preferCanvas:true,zoomSnap:.5});
   this.map.setView(this.mode==='story'?MACAU:lastView.center,this.mode==='story'?11:lastView.zoom);
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
   }).addTo(this.map);
   if(this.mode==='normal'){
    this.markers=new Map();for(const p of places)this.markers.set(p.id,L.marker([p.lat,p.lng],{icon:pinIcon()}).addTo(this.map).bindPopup('<b>'+p.name+'</b><div>'+p.desc+'</div>'));
   }else{
    this.map.dragging.disable();this.map.touchZoom.disable();this.map.doubleClickZoom.disable();this.map.boxZoom.disable();this.map.keyboard.disable();
   }
   this.observer=new ResizeObserver(()=>this.map?.invalidateSize({pan:false,animate:false}));this.observer.observe(this);
   requestAnimationFrame(()=>this.map?.invalidateSize({pan:false,animate:false}));
  }catch(e){if(this.alive&&this.isConnected)error.hidden=false;console.warn('Ximeng map:',e);}
 }
}
if(!customElements.get('xm-leaflet-map'))customElements.define('xm-leaflet-map',XimengMap);
export const mapHtml=()=>'<section class="xm-maps-app"><xm-leaflet-map mode="normal"></xm-leaflet-map></section>';
