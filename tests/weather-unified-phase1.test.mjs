import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {WEATHER_CITY_DEFAULTS,AUTHORED_WEATHER,getWeather,setWeatherOverride,weatherForDay,weatherSymbol} from '../src/services/weather/world.js';
import {weatherFor,render as weatherRender} from '../src/apps/weather/index.js';
import {entryFor,saveDiaryEntry} from '../src/story/diary/entries.js';
import {diaryView} from '../src/apps/schedule/features/diary/index.js';
import {diaryEditor} from '../src/apps/developer/features/diary/index.js';

const fresh=()=>activateStory55(initialState());
const weatherApp=s=>({get:()=>s});

test('D01-D06 authored journal condition is the SAME read model as the iOS weather app',()=>{
 const s=fresh();
 for(const [day,condition] of [[1,'晴'],[2,'晴'],[5,'多云'],[6,'多云']]){
  assert.equal(getWeather(s,{day,cityId:'macau'}).condition,condition);
  assert.equal(weatherFor(s,day).find(x=>x.id==='macau').condition,condition);
  assert.equal(entryFor(s,day).weather,condition);
  assert.equal(getWeather(s,{day,cityId:'macau'}).source,'authored');
 }
 assert.equal(Object.keys(AUTHORED_WEATHER).length,4);
 assert.equal(WEATHER_CITY_DEFAULTS.length,3);
 assert.equal(s.content.weather?.[6]?.macau,undefined,'read never mutates a save');
});

test('weather app edit immediately changes existing journal without changing authored journal story lines',()=>{
 const s=fresh();s.day=6;s.clock='15:25';
 const before=entryFor(s,6).body;
 setWeatherOverride(s,{day:6,cityId:'macau',values:{condition:'雷雨',temp:28,high:30,low:24}});
 assert.equal(getWeather(s).condition,'雷雨');
 assert.equal(getWeather(s,{day:6,clock:'15:25'}).clock,'15:25');
 assert.equal(weatherFor(s,6).find(x=>x.id==='macau').temp,28);
 assert.equal(entryFor(s,6).weather,'雷雨');
 assert.equal(entryFor(s,6).body,before);
 const html=diaryView(s,{route:'/',params:{day:'6'}});
 assert.match(html,/天气 雷雨/);
 assert.match(html,/⛈/);
 const edit=weatherRender({store:weatherApp(s)},{route:'/edit',params:{day:6,city:'macau'}});
 assert.match(edit,/value="28"/);
 assert.match(edit,/雷雨/);
});

test('diary editor weather writes the canonical Weather App day and does not create competing diary weather',()=>{
 const s=fresh();s.day=6;
 const initial=entryFor(s,6);
 saveDiaryEntry(s,6,{weather:'小雨',title:initial.title,body:initial.body});
 assert.equal(s.content.weather[6].macau.condition,'小雨');
 assert.equal(s.content.storyDiary[6].weather,undefined);
 assert.equal(weatherFor(s,6).find(x=>x.id==='macau').condition,'小雨');
 assert.equal(entryFor(s,6).weather,'小雨');
 assert.match(diaryEditor(s),/小雨/);
 assert.equal(weatherSymbol('小雨'),'🌧');
});

test('existing saved diary weather survives until a new canonical edit overrides it',()=>{
 const s=fresh();
 s.content.storyDiary={6:{title:'旧日记',body:'旧文字',weather:'阴天'}};
 assert.equal(entryFor(s,6).weather,'阴天');
 assert.equal(weatherFor(s,6).find(x=>x.id==='macau').condition,'阴天');
 assert.equal(getWeather(s,{day:6,cityId:'macau'}).source,'legacy-diary');
 setWeatherOverride(s,{day:6,cityId:'macau',values:{condition:'多云'}});
 assert.equal(entryFor(s,6).weather,'多云');
 assert.equal(getWeather(s,{day:6,cityId:'macau'}).source,'manual');
 assert.equal(s.content.storyDiary[6].body,'旧文字','weather edits do not rewrite history');
});

test('D07 and later have no invented historical readings; separate city and day edits stay independent',()=>{
 const s=fresh();
 const seven=getWeather(s,{day:7,cityId:'macau'});
 assert.equal(seven.source,'placeholder');
 assert.equal(seven.condition,'晴朗无云');
 const london=getWeather(s,{day:7,cityId:'london'});
 setWeatherOverride(s,{day:7,cityId:'macau',values:{condition:'阵雨'}});
 assert.equal(getWeather(s,{day:7,cityId:'macau'}).condition,'阵雨');
 assert.equal(getWeather(s,{day:8,cityId:'macau'}).condition,'晴朗无云');
 assert.equal(getWeather(s,{day:7,cityId:'london'}).condition,london.condition);
 assert.deepEqual(weatherForDay(s,7).map(x=>x.id),['macau','london','paris']);
 assert.equal(getWeather(s,{day:91,cityId:'macau'}),null);
 assert.throws(()=>setWeatherOverride(s,{day:0,cityId:'macau',values:{condition:'晴'}}));
});
