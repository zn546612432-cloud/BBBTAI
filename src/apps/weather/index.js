import {btn,esc} from '../../system/ui.js';
import {meteoconMarkup} from './meteocons.js';
import {WEATHER_CITY_DEFAULTS,weatherForDay,weatherHours} from '../../services/weather/world.js';
import {warmEuropeanHistory} from '../../services/weather/remote-history.js';

export const manifest={id:'weather',name:'天氣',glyph:'☀',tone:'#5a87a5',defaultRoute:'/',kicker:'MACAU'};
export const weatherCities=WEATHER_CITY_DEFAULTS;
export const weatherFor=weatherForDay;
const degree=n=>Number.isFinite(n)?n+'°':'—';
const signalBanner=c=>c.id==='macau'&&c.cycloneSignal
 ?'<aside class="weather-signal-banner level-'+c.cycloneSignal.level+'" aria-label="熱帶氣旋信號"><span class="weather-signal-number">'+c.cycloneSignal.level+
 '</span><span class="weather-signal-caption"><strong>'+(c.cycloneSignal.level===1?'一號風球':'三號風球')+' · 蝴蝶</strong><small>'+c.cycloneSignal.date.slice(5).replace('-','/')+' '+c.cycloneSignal.clock+' 發出 · 澳門地球物理氣象局</small></span></aside>':'';
const heatHint=c=>c.id==='macau'&&Number.isFinite(c.feelsLike)&&c.feelsLike>=37
 ?'<p class="weather-heat-hint">體感溫度 '+Math.round(c.feelsLike)+'° · 戶外悶熱</p>':'';
export function render(ctx,loc){
 if(globalThis.window)warmEuropeanHistory(()=>ctx.refresh?.());
 const s=ctx.store.get(),day=Math.max(1,Math.min(90,Number(loc.params?.day)||s.day)),
 cities=weatherFor(s,day);
 if(loc.route.startsWith('/city/')){
  const c=cities.find(item=>item.id===loc.route.slice(6))||cities[0];
  const hourly=weatherHours(s,{day,clock:s.clock,cityId:c.id,count:4});
  return '<div class="weather-screen weather-detail '+c.theme+'"><header>'+
   btn('weather-back','‹ 城市列表','')+'</header><h1>'+esc(c.name)+'</h1>'+
   (Number.isFinite(c.temp)?meteoconMarkup(c,{className:'weather-hero-icon',priority:true}):'')+
   '<div class="weather-detail-temp">'+degree(c.temp)+'</div><p>'+esc(c.condition)+'</p>'+
   '<span>最高 '+degree(c.high)+'　最低 '+degree(c.low)+'</span>'+
   heatHint(c)+signalBanner(c)+
   '<div class="weather-hourly">'+hourly.map(h=>'<div><small>'+esc(h.label)+'</small>'+
    (Number.isFinite(h.temp)?meteoconMarkup(h,{className:'weather-hourly-icon'}):'')+
    '<strong>'+degree(h.temp)+'</strong></div>').join('')+'</div></div>';
 }
 return '<div class="weather-screen weather-list"><header><h1>天氣</h1></header>'+
  '<div class="weather-city-scroll">'+cities.map(c=>btn('weather-city','<span class="weather-city-name">'+esc(c.name)+'</span>'+
   '<span class="weather-city-sub">'+esc(c.subtitle)+'</span>'+
   '<span class="weather-city-temp">'+degree(c.temp)+'</span>'+
   '<span class="weather-city-condition">'+(Number.isFinite(c.temp)?meteoconMarkup(c,{className:'weather-city-icon'}):'')+esc(c.condition)+'</span>'+
   '<span class="weather-city-range">最高 '+degree(c.high)+'　最低 '+degree(c.low)+'</span>',
   'weather-card '+c.theme,'data-city="'+c.id+'"')+signalBanner(c)).join('')+'</div></div>';
}
export function handle(a,t,c){
 if(a==='weather-city')c.router.open({appId:'weather',route:'/city/'+t.dataset.city});
 if(a==='weather-back')c.router.back();
}
// Retired weather editing routes and form submission deliberately do nothing.
// Historical city data and the authored Macau/SMS timeline remain read-only.
export function change(){}
export function submit(){}
