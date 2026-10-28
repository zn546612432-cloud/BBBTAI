import {btn,esc} from '../../system/ui.js';
import {manifest,weatherFor,weatherCities,render as originalRender,handle as originalHandle,change,submit} from './index.js';

export {manifest,weatherFor,weatherCities,change,submit};
export const hiddenCityIds=s=>Array.isArray(s.content.weatherHiddenCities)?s.content.weatherHiddenCities:[];
export const visibleWeatherCities=s=>weatherFor(s).filter(city=>!hiddenCityIds(s).includes(city.id));
export const swipeOutcome=(offset,cancel=false)=>cancel?'closed':offset< -160?'remove':offset< -62?'reveal':'closed';
export function hideWeatherCity(store,id){
 if(!weatherCities.some(city=>city.id===id))return;
 store.update(s=>{const hidden=s.content.weatherHiddenCities||[];if(!hidden.includes(id))s.content.weatherHiddenCities=[...hidden,id];});
}
export function restoreWeatherCities(store,id=null){
 store.update(s=>{const hidden=s.content.weatherHiddenCities||[];s.content.weatherHiddenCities=id?hidden.filter(x=>x!==id):[];});
}

let lastRemoved=null;
export function render(ctx,loc){
 if(loc.route!=='/')return originalRender(ctx,loc);
 const s=ctx.store.get(),cities=visibleWeatherCities(s),removed=hiddenCityIds(s);
 return `<div class="weather-screen weather-list ios-weather-list"><header><h1>天气</h1>${btn('weather-edit','•••','weather-more',`aria-label="编辑天气" data-city="${cities[0]?.id||weatherCities[0].id}"`)}</header>
 <div class="weather-city-scroll">${cities.map(c=>`<div class="weather-swipe-row" data-weather-city="${c.id}"><div class="weather-delete-underlay">${btn('weather-delete','删除','weather-delete-button',`data-city="${c.id}" aria-label="删除${esc(c.name)}天气"`)}</div><div class="weather-swipe-main">${btn('weather-city',`<span class="weather-city-name">${esc(c.name)}</span><span class="weather-city-sub">${esc(c.subtitle)}</span><span class="weather-city-temp">${c.temp}°</span><span class="weather-city-condition">${esc(c.condition)}</span><span class="weather-city-range">最高 ${c.high}°　最低 ${c.low}°`,'weather-card '+c.theme,`data-city="${c.id}" aria-label="${esc(c.name)}天气，左滑删除"`)}</div></div>`).join('')||'<div class="weather-none">还没有城市天气。<br>你可以恢复之前删除的城市。</div>'}
 <p class="weather-foot">${removed.length?`已移除 ${removed.length} 个城市　${btn('weather-restore','恢复城市','weather-restore-button')}`:'向左轻扫城市卡片可删除'}</p></div>
 ${lastRemoved&&removed.includes(lastRemoved)?`<div class="weather-undo">城市已删除 ${btn('weather-undo','撤销','',`data-city="${lastRemoved}"`)}</div>`:''}</div>`;
}
function animateRemoval(target,ctx){
 const row=target.closest('.weather-swipe-row');const id=target.dataset.city||row?.dataset.weatherCity;
 if(!row||!id)return;
 row.classList.add('weather-removing');
 row.style.height=`${row.offsetHeight}px`;
 requestAnimationFrame(()=>{row.style.height='0px';row.style.marginBottom='0px';row.style.opacity='0';});
 setTimeout(()=>{lastRemoved=id;hideWeatherCity(ctx.store,id);},290);
}
export function handle(a,t,c){
 if(a==='weather-delete'){animateRemoval(t,c);return;}
 if(a==='weather-restore'){lastRemoved=null;restoreWeatherCities(c.store);return;}
 if(a==='weather-undo'){restoreWeatherCities(c.store,t.dataset.city);lastRemoved=null;return;}
 originalHandle(a,t,c);
}

// The outer phone gesture recognizer owns home swipes and notification pulls.
// Weather owns horizontal drags beginning on a city card only.
export function mountWeatherSwipe(root,ctx){
 let gesture=null,suppressUntil=0;
 const rowFor=t=>t?.closest?.('.app-weather .weather-swipe-row');
 const start=(x,y,id,source,t)=>{
  const row=rowFor(t);if(!row||t.closest('.weather-delete-button'))return;
  gesture={x,y,id,source,row,offset:row.classList.contains('weather-revealed')?-92:0,dragging:false};
 };
 const move=(x,y,id,source,e)=>{
  if(!gesture||gesture.id!==id||gesture.source!==source)return;
  const g=gesture,dx=x-g.x,dy=y-g.y;
  if(!g.dragging){if(Math.hypot(dx,dy)<9)return;if(Math.abs(dx)<Math.abs(dy)*1.12){gesture=null;return;}g.dragging=true;g.row.classList.add('weather-dragging');}
  if(e.cancelable)e.preventDefault();
  const reveal=Math.max(-Math.min(g.row.clientWidth*.86,225),Math.min(0,g.offset+dx));
  g.row.querySelector('.weather-swipe-main')?.style.setProperty('transform',`translate3d(${reveal}px,0,0)`);
  g.current=reveal;suppressUntil=Date.now()+410;
 };
 const finish=(id,source,cancel=false)=>{
  if(!gesture||gesture.id!==id||gesture.source!==source)return;
  const g=gesture;gesture=null;
  if(!g.dragging)return;
  const row=g.row;row.classList.remove('weather-dragging');
  const offset=g.current??0;
  const outcome=swipeOutcome(offset,cancel);
  if(outcome==='remove'){animateRemoval(row.querySelector('.weather-delete-button'),ctx());return;}
  const reveal=outcome==='reveal';
  row.classList.toggle('weather-revealed',reveal);
  row.querySelector('.weather-swipe-main')?.style.setProperty('transform',`translate3d(${reveal?-92:0}px,0,0)`);
 };
 root.addEventListener('touchstart',e=>{if(e.touches.length===1){const p=e.changedTouches[0];start(p.clientX,p.clientY,p.identifier,'touch',e.target);}},{passive:true});
 root.addEventListener('touchmove',e=>{const p=[...e.changedTouches].find(t=>t.identifier===gesture?.id);if(p)move(p.clientX,p.clientY,p.identifier,'touch',e);},{passive:false});
 root.addEventListener('touchend',e=>{for(const t of e.changedTouches)finish(t.identifier,'touch');});
 root.addEventListener('touchcancel',e=>{for(const t of e.changedTouches)finish(t.identifier,'touch',true);});
 root.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'&&e.button===0)start(e.clientX,e.clientY,e.pointerId,'pointer',e.target);});
 root.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')move(e.clientX,e.clientY,e.pointerId,'pointer',e);});
 root.addEventListener('pointerup',e=>finish(e.pointerId,'pointer'));
 root.addEventListener('pointercancel',e=>finish(e.pointerId,'pointer',true));
 root.addEventListener('click',e=>{if(Date.now()<suppressUntil&&e.target.closest('.weather-card')){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
}
