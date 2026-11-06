// Original animated Meteocons by Bas Milius (MIT).
// Public SVGs are vendored locally. Never query the CDN from the running phone.
// Both sources in <picture> use the same trusted slug, and users who prefer
// reduced motion get the official non-animated Meteocons asset.
export const METEOCON_SLUGS=Object.freeze([
 'clear-day','clear-night',
 'mostly-clear-day','mostly-clear-night',
 'partly-cloudy-day','partly-cloudy-night',
 'partly-cloudy-day-rain','partly-cloudy-night-rain',
 'overcast','overcast-rain','drizzle',
 'thunderstorms-day-rain','thunderstorms-night-rain',
 'fog-day','fog-night','snow'
]);
const animated='/assets/meteocons/fill/';
const staticIcons='/assets/meteocons/static/';

export function meteoconSlug(weather){
 const condition=String(weather?.condition||'');
 const day=weather?.isDay===1?true:weather?.isDay===0?false:weather?.theme!=='night';
 if(/雷/.test(condition))return day?'thunderstorms-day-rain':'thunderstorms-night-rain';
 if(/霧|雾/.test(condition))return day?'fog-day':'fog-night';
 if(/雪/.test(condition))return 'snow';
 if(/暴雨|大雨|中雨/.test(condition))return 'overcast-rain';
 if(/小雨|毛毛雨|细雨/.test(condition))return 'drizzle';
 if(/阵雨|陣雨|雨/.test(condition))return day?'partly-cloudy-day-rain':'partly-cloudy-night-rain';
 if(/阴|陰/.test(condition))return 'overcast';
 if(/多云|多雲/.test(condition))return day?'partly-cloudy-day':'partly-cloudy-night';
 if(/大部晴朗/.test(condition))return day?'mostly-clear-day':'mostly-clear-night';
 return day?'clear-day':'clear-night';
}

export function meteoconMarkup(weather,{className='',priority=false}={}){
 // Icon names are from the local allowlist, not derived from a user-controlled URL.
 const slug=meteoconSlug(weather);
 return '<picture class="weather-meteocon '+className+'">'+
  '<source media="(prefers-reduced-motion: reduce)" srcset="'+staticIcons+slug+'.svg">'+
  '<img src="'+animated+slug+'.svg" alt="" aria-hidden="true" width="64" height="64" '+
  'loading="'+(priority?'eager':'lazy')+'" decoding="async">'+
  '</picture>';
}
