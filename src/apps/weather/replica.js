import {btn,esc} from '../../system/ui.js';
import {meteoconMarkup} from './meteocons.js';
import {manifest,weatherFor,weatherCities,render as originalRender,handle as originalHandle,change,submit} from './index.js';
import {warmEuropeanHistory} from '../../services/weather/remote-history.js';

export {manifest,weatherFor,weatherCities,change,submit};
const degree=value=>Number.isFinite(value)?value+'°':'—';
// The city list is fixed and read-only. Historical hidden-city preferences
// are intentionally ignored now that editing has been removed.
export const hiddenCityIds=()=>[];
export const visibleWeatherCities=s=>weatherFor(s);
export function render(ctx,loc){
 if(loc.route!=='/')return originalRender(ctx,loc);
 if(globalThis.window)warmEuropeanHistory(()=>ctx.refresh?.());
 const cities=visibleWeatherCities(ctx.store.get());
 return '<div class="weather-screen weather-list ios-weather-list"><header><h1>天氣</h1></header>'+
  '<div class="weather-city-scroll">'+cities.map(c=>'<div class="weather-readonly-row">'+
   btn('weather-city','<span class="weather-city-name">'+esc(c.name)+'</span>'+
    '<span class="weather-city-sub">'+esc(c.subtitle)+'</span>'+
    '<span class="weather-city-temp">'+degree(c.temp)+'</span>'+
    '<span class="weather-city-condition">'+(Number.isFinite(c.temp)?meteoconMarkup(c,{className:'weather-city-icon'}):'')+esc(c.condition)+'</span>'+
    '<span class="weather-city-range">最高 '+degree(c.high)+'　最低 '+degree(c.low)+'</span>',
    'weather-card '+c.theme,'data-city="'+c.id+'"')+
   '</div>').join('')+'</div></div>';
}
export const handle=originalHandle;
export function mountWeatherSwipe(){}
