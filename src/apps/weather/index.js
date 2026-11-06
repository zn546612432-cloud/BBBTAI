import {btn,esc} from '../../system/ui.js';
import {meteoconMarkup} from './meteocons.js';
import {WEATHER_CITY_DEFAULTS,WEATHER_CONDITIONS,weatherForDay,weatherHours,getWeather,setWeatherOverride} from '../../services/weather/world.js';
export const manifest={id:'weather',name:'天气',glyph:'☀',tone:'#5a87a5',defaultRoute:'/',kicker:'MACAU'};
// Re-export the existing contract for the iOS city-list replica and test tools.
export const weatherCities=WEATHER_CITY_DEFAULTS;
export const weatherFor=weatherForDay;
const field=(key,label,value,type='text')=>`<label>${label}<input name="${key}" type="${type}" value="${esc(value)}" required></label>`;
export function render({store},loc){const s=store.get(),day=Math.max(1,Math.min(90,Number(loc.params?.day)||s.day)),cities=weatherFor(s,day),selected=cities.find(c=>c.id===loc.params?.city)||cities[0];if(loc.route==='/edit')return `<div class="weather-screen weather-edit"><header>${btn('weather-back','‹ 返回','') }<strong>编辑天气</strong></header><form data-form="weather-edit"><label>第几天<input name="day" type="number" min="1" max="90" value="${day}" required></label><label>地点<select name="city">${cities.map(c=>`<option value="${c.id}" ${c.id===selected.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>${field('name','地点名称',selected.name)}<label>天气<select name="condition">${WEATHER_CONDITIONS.map(x=>`<option ${selected.condition===x?'selected':''}>${x}</option>`).join('')}</select></label>${field('temp','当前温度 °',selected.temp,'number')}${field('high','最高温度 °',selected.high,'number')}${field('low','最低温度 °',selected.low,'number')}<button type="submit">保存第 ${day} 天</button></form></div>`;
 if(loc.route.startsWith('/city/')){
  const c=cities.find(item=>item.id===loc.route.slice(6))||cities[0];
  const hourly=weatherHours(s,{day,clock:s.clock,cityId:c.id,count:4});
  const attribution=c.dataSource
   ?'<p class="weather-history-credit">历史天气：<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> / ERA5 再分析模型</p>'
   :'<p class="weather-history-credit">游戏内预设或手动编辑的天气</p>';
  return `<div class="weather-screen weather-detail ${c.theme}"><header>${btn('weather-back','‹ 城市列表','')} ${btn('weather-edit','编辑','',`data-city="${c.id}"`)}</header><h1>${esc(c.name)}</h1>${meteoconMarkup(c,{className:"weather-hero-icon",priority:true})}<div class="weather-detail-temp">${c.temp}°</div><p>${esc(c.condition)}</p><span>最高 ${c.high}°　最低 ${c.low}°</span><div class="weather-hourly">${hourly.map(h=>`<div><small>${esc(h.label)}</small>${meteoconMarkup(h,{className:"weather-hourly-icon"})}<strong>${h.temp}°</strong></div>`).join('')}</div>${attribution}</div>`;

 }
 return `<div class="weather-screen weather-list"><header><h1>天气</h1>${btn('weather-edit','•••','weather-more',`aria-label="编辑天气" data-city="${cities[0].id}"`)}</header><div class="weather-city-scroll">${cities.map(c=>btn('weather-city',`<span class="weather-city-name">${esc(c.name)}</span><span class="weather-city-sub">${esc(c.subtitle)}</span><span class="weather-city-temp">${c.temp}°</span><span class="weather-city-condition">${meteoconMarkup(c,{className:"weather-city-icon"})}${esc(c.condition)}</span><span class="weather-city-range">最高 ${c.high}°　最低 ${c.low}°</span>`,'weather-card '+c.theme,`data-city="${c.id}"`)).join('')}<p class="weather-foot">澳门历史天气：Open-Meteo ERA5 · 其余城市为游戏预设</p></div><div class="weather-search">⌕ <input placeholder="搜索城市或机场" aria-label="搜索城市或机场" disabled><span>♩</span></div></div>`;}
export function handle(a,t,c){if(a==='weather-city')c.router.open({appId:'weather',route:'/city/'+t.dataset.city});if(a==='weather-edit')c.router.open({appId:'weather',route:'/edit',params:{city:t.dataset.city||weatherCities[0].id}});if(a==='weather-back')c.router.back();}
export function change(el,ctx){if(el.name==='city'||el.name==='day'){const form=el.closest('form');ctx.router.open({appId:'weather',route:'/edit',params:{city:form.elements.city.value,day:form.elements.day.value}});}}
// Editing a condition must not freeze all 24 historical temperatures.
export const weatherEditChanges=(requested,current)=>Object.fromEntries(
 Object.entries(requested).filter(([key,value])=>value!==current?.[key])
);
export function submit(form,ctx){if(form.dataset.form!=='weather-edit')return;const d=new FormData(form),id=String(d.get('city')),day=Number(d.get('day')),record={name:String(d.get('name')).trim(),condition:String(d.get('condition')),temp:Number(d.get('temp')),high:Number(d.get('high')),low:Number(d.get('low'))};if(!Number.isInteger(day)||day<1||day>90||!weatherCities.some(c=>c.id===id)||!record.name||[record.temp,record.high,record.low].some(n=>!Number.isFinite(n)||n< -80||n>70))throw Error('请填写有效的天数、地点和温度');ctx.store.update(s=>{const changes=weatherEditChanges(record,getWeather(s,{day,cityId:id}));if(Object.keys(changes).length)setWeatherOverride(s,{day,cityId:id,values:changes});});ctx.router.back();ctx.toast('天气已保存');}
