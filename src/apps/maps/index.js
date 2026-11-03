import {isStory55} from '../../services/story55/state.js';
import {story55Map} from './features/story55/index.js';
import {esc} from '../../system/ui.js';
import {visiblePlaces} from './data/places.js';
import {publicAssetPath} from '../../services/public-assets.js';
export const manifest={id:'maps',name:'地图',glyph:'⌖',tone:'#6c9f8d',defaultRoute:'/',supportsDeepLink:true,kicker:'MACAU'};

// IMPORTANT: Do not import 4+ MB of map geometry until this app is opened.
// Custom elements upgrade themselves when their module eventually loads.
let mapLoading;
function ensureMapLoaded(){
 if(typeof window==='undefined'||customElements.get('xm-leaflet-map'))return;
 mapLoading??=import('./leaflet.js').catch(error=>{mapLoading=null;console.error('离线地图加载失败',error);});
}
function mapFrame(places,loc={}){
 const ids=places.map(p=>p.id).join(',');
 const requested=loc?.params?.id||'';
 const selected=places.some(p=>p.id===requested)?requested:'';
 return '<section class="xm-maps-app" data-view-key="maps-normal"><xm-leaflet-map mode="normal" data-visible="'+esc(ids)+'" data-place="'+esc(selected)+'"><div class="xm-map-pending"><img src="'+esc(publicAssetPath('apps/maps/macau-offline.webp'))+'" alt="澳门离线地图"/><div class="xm-map-pending-status">正在初始化离线地图…</div><small>© OpenStreetMap contributors · ODbL</small></div></xm-leaflet-map></section>';
}
export const render=({store}={},loc={})=>{
 const s=store?.get();
 ensureMapLoaded();
 // Preserve the D30 evidence card and prior Story55 /place route.
 if(s&&isStory55(s)&&(loc.route==='/place'||loc.params?.area))return story55Map(s,loc);
 return mapFrame(visiblePlaces(s),loc);
};
