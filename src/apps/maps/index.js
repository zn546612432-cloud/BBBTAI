import {isStory55} from '../../services/story55/state.js';
import {story55Map} from './features/story55/index.js';
import {btn} from '../../system/ui.js';
import {mapHtml} from './leaflet.js';
export const manifest={id:'maps',name:'地图',glyph:'⌖',tone:'#6c9f8d',defaultRoute:'/',supportsDeepLink:true,kicker:'MACAU'};
export const render=({store}={},loc={})=>store&&isStory55(store.get())?story55Map(store.get(),loc):mapHtml();
