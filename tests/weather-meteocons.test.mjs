import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {getWeather} from '../src/services/weather/world.js';
import {render as weatherDetail} from '../src/apps/weather/index.js';
import {render as weatherList,hideWeatherCity,visibleWeatherCities} from '../src/apps/weather/replica.js';
import {METEOCON_SLUGS,meteoconSlug,meteoconMarkup} from '../src/apps/weather/meteocons.js';

const fresh=()=>{const s=activateStory55(initialState());s.day=7;s.clock='08:00';return s;};
const ctx=s=>({store:{get:()=>s}});

test('Meteocons 16 real animated and 16 static MIT SVGs are vendored locally and reproducibly pinned',()=>{
 const manifest=JSON.parse(readFileSync('public/assets/meteocons/SOURCES.json','utf8'));
 const license=readFileSync('public/assets/meteocons/LICENSE','utf8');
 assert.match(license,/MIT License/);
 assert.match(license,/Bas Milius/);
 assert.equal(manifest.version,'3.0.0-next.10');
 assert.equal(manifest.license,'MIT');
 assert.equal(manifest.files.length,METEOCON_SLUGS.length*2);
 assert.equal(METEOCON_SLUGS.length,16);
 for(const slug of METEOCON_SLUGS){
  for(const folder of ['fill','static']){
   const path='public/assets/meteocons/'+folder+'/'+slug+'.svg';
   assert.ok(existsSync(path),path);
   const text=readFileSync(path,'utf8');
   assert.match(text,/<svg\b/i);
   assert.match(text,/<\/svg>/i);
   assert.ok(text.length>250);
   assert.ok(manifest.files.some(x=>x.path===folder+'/'+slug+'.svg'));
  }
  const animated=readFileSync('public/assets/meteocons/fill/'+slug+'.svg','utf8');
  assert.match(animated,/<animate|@keyframes|animation\s*:/i);
 }
});

test('every weather category and both times of day select only local approved slugs',()=>{
 const cases=[
  ['晴',1,'clear-day'],['晴朗无云',0,'clear-night'],
  ['大部晴朗无云',1,'mostly-clear-day'],['大部晴朗无云',0,'mostly-clear-night'],
  ['多云',1,'partly-cloudy-day'],['多云',0,'partly-cloudy-night'],
  ['阴天',1,'overcast'],
  ['小雨',1,'drizzle'],['中雨',0,'overcast-rain'],
  ['阵雨',1,'partly-cloudy-day-rain'],['阵雨',0,'partly-cloudy-night-rain'],
  ['雷雨',1,'thunderstorms-day-rain'],['雷雨',0,'thunderstorms-night-rain'],
  ['雾',1,'fog-day'],['雾',0,'fog-night'],['下雪',0,'snow']
 ];
 for(const [condition,isDay,slug] of cases){
  assert.equal(meteoconSlug({condition,isDay}),slug);
  assert.ok(METEOCON_SLUGS.includes(slug));
 }
 assert.equal(meteoconSlug({condition:'../../secrets',isDay:0}),'clear-night');
});

test('all icon HTML loads local assets and swaps to official static icons for reduced motion',()=>{
 const html=meteoconMarkup({condition:'小雨',isDay:1},{className:'weather-hourly-icon',priority:true});
 assert.match(html,/src="\/assets\/meteocons\/fill\/drizzle\.svg"/);
 assert.match(html,/srcset="\/assets\/meteocons\/static\/drizzle\.svg"/);
 assert.match(html,/prefers-reduced-motion: reduce/);
 assert.match(html,/aria-hidden="true"/);
 assert.match(html,/loading="eager"/);
 assert.doesNotMatch(html,/https?:\/\//);
});

test('existing Weather App list, city detail and hourly strip use real SVG icons with no new screens',()=>{
 const s=fresh(),context=ctx(s);
 const list=weatherList(context,{route:'/',params:{}});
 assert.match(list,/weather-swipe-row/);
 assert.match(list,/weather-city-icon/);
 assert.match(list,/\/assets\/meteocons\/fill\//);
 assert.match(list,/weather-delete/);
 const detail=weatherDetail(context,{route:'/city/macau',params:{}});
 assert.match(detail,/weather-hero-icon/);
 assert.match(detail,/weather-hourly-icon/);
 assert.match(detail,/weather-history-credit/);
 assert.match(detail,/\/assets\/meteocons\/fill\//);
 assert.equal((detail.match(/weather-hourly-icon/g)||[]).length,4);
 assert.doesNotMatch(detail,/lottie-web|cdn\.meteocons\.com/);
 assert.equal(getWeather(s).date,'2025-05-25');
});

test('deleted weather cities remain hidden and restored city data is unchanged',()=>{
 const s=fresh(),store={update:fn=>fn(s)};
 hideWeatherCity(store,'london');
 assert.deepEqual(visibleWeatherCities(s).map(x=>x.id),['macau','paris']);
 const list=weatherList(ctx(s),{route:'/',params:{}});
 assert.equal((list.match(/weather-city-icon/g)||[]).length,2);
 assert.ok(list.includes('恢复城市'));
 assert.equal(s.content.weatherHiddenCities.includes('london'),true);
});

test('github-pages asset rebasing supports local Meteocons for released and preview builds',()=>{
 const build=readFileSync('scripts/build-pages.mjs','utf8');
 assert.ok(build.includes('src|assets|apps'));
 assert.ok(build.includes('releaseBase'));
 const sources=readFileSync('src/apps/weather/meteocons.js','utf8');
 assert.match(sources,/\/assets\/meteocons\/fill\//);
 assert.match(sources,/\/assets\/meteocons\/static\//);
 assert.match(build,/releaseBase/);
});
