import {isStory55} from '../../services/story55/state.js';
import {story55Map} from './features/story55/index.js';
import {btn} from '../../system/ui.js';
import {mapHtml} from './leaflet.js';
import {visiblePlaces} from './data/places.js';
export const manifest={id:'maps',name:'地图',glyph:'⌖',tone:'#6c9f8d',defaultRoute:'/',supportsDeepLink:true,kicker:'MACAU'};
export const render=({store}={},loc={})=>{
 const s=store?.get();
 // Keep the old D30 evidence/linked-map workflow exactly as authored.
 if(s&&isStory55(s)&&(loc.route==='/place'||loc.params?.area))return story55Map(s,loc);
 return mapHtml(visiblePlaces(s),loc);
};
