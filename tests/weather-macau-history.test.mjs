import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {MACAU_HISTORY_2025} from '../src/services/weather/data/macau-2025-hourly.js';
import {WEATHER_HISTORY,conditionFromWeatherCode,getWeather,getDailyWeather,weatherForDay,weatherHours,setWeatherOverride} from '../src/services/weather/world.js';
import {render as weatherRender,weatherEditChanges} from '../src/apps/weather/index.js';
import {entryFor,saveDiaryEntry} from '../src/story/diary/entries.js';

const fresh=()=>activateStory55(initialState());

test('Open-Meteo historical source is an actual offline 55-day hourly archive, with stable local dates',()=>{
 const {metadata,days}=MACAU_HISTORY_2025;
 assert.equal(metadata.source.includes('ERA5'),true);
 assert.match(metadata.attribution,/Open-Meteo/);
 assert.equal(WEATHER_HISTORY.timezone,'Asia/Macau');
 assert.equal(WEATHER_HISTORY.start,'2025-05-19');
 assert.equal(WEATHER_HISTORY.end,'2025-07-12');
 assert.equal(days.length,55);
 assert.equal(days.reduce((sum,d)=>sum+d.hours.length,0),1320);
 assert.equal(days[0].date,'2025-05-19');
 assert.equal(days[6].date,'2025-05-25');
 assert.equal(days[54].date,'2025-07-12');
 for(let i=0;i<55;i++){
  const date=new Date(Date.UTC(2025,4,19+i)).toISOString().slice(0,10);
  assert.equal(days[i].date,date);
  assert.equal(days[i].hours.length,24);
  for(const hour of days[i].hours){
   assert.equal(hour.length,8);
   assert.equal(hour.every(n=>typeof n==='number'&&Number.isFinite(n)),true);
  }
 }
});

test('D07 Macau data follows 08:00 and 14:00 game time, not real system time',()=>{
 const s=fresh();s.day=7;s.clock='08:17';
 let morning=getWeather(s);
 assert.equal(morning.date,'2025-05-25');
 assert.equal(morning.source,'historical');
 assert.equal(morning.tempExact,24.2);
 assert.equal(morning.temp,24);
 assert.equal(morning.high,26);
 assert.equal(morning.low,23);
 assert.equal(morning.windSpeed,18.7);
 s.clock='14:02';
 const afternoon=getWeather(s);
 assert.equal(afternoon.tempExact,25.6);
 assert.equal(afternoon.temp,26);
 assert.equal(afternoon.windSpeed,21.7);
 assert.notEqual(morning.temp,afternoon.temp);
 assert.equal(afternoon.dailyPrecipitation,0);
 assert.equal(getDailyWeather(s,{day:7}).condition,'阴天');
 const html=weatherRender({store:{get:()=>s}},{route:'/city/macau',params:{}});
 assert.match(html,/26°/);
 assert.match(html,/Open-Meteo/);
 assert.match(html,/14:00|现在/);
});

test('D08 keeps actual 2025-05-26 temperatures and daily recap is independent of current hour',()=>{
 const s=fresh();s.day=8;
 s.clock='08:00';
 assert.equal(getWeather(s).tempExact,23.4);
 assert.equal(getWeather(s).date,'2025-05-26');
 s.clock='14:59';
 assert.equal(getWeather(s).tempExact,27);
 const journalDay=getDailyWeather(s,{day:8});
 assert.equal(journalDay.condition,'阴天');
 assert.equal(journalDay.high,27);
 assert.equal(journalDay.low,23);
 assert.equal(getDailyWeather(s,{day:8}).condition,journalDay.condition);
 assert.equal(conditionFromWeatherCode(95),'雷雨');
 assert.equal(conditionFromWeatherCode(3),'阴天');
 assert.equal(conditionFromWeatherCode(80),'阵雨');
});

test('hourly forecast moves to next game date and remains deterministic across repeat reads',()=>{
 const s=fresh();s.day=7;s.clock='23:27';
 const hours=weatherHours(s,{count:5});
 assert.deepEqual(hours.map(x=>[x.day,x.hour]),[[7,23],[8,0],[8,1],[8,2],[8,3]]);
 assert.deepEqual(hours,weatherHours(s,{count:5}));
 assert.equal(hours[0].date,'2025-05-25');
 assert.equal(hours[1].date,'2025-05-26');
 assert.equal(hours[1].label,'00:00');
 const last=weatherHours(s,{day:55,clock:'23:02',count:6});
 assert.equal(last.length,1,'first-view story ending cannot look into a fictional D56');
});

test('the approved D01-D06 conditions remain authored overrides but temperature is historical',()=>{
 const s=fresh();
 s.day=6;s.clock='14:00';
 const weather=getWeather(s);
 assert.equal(weather.condition,'多云');
 assert.equal(weather.source,'authored');
 assert.equal(weather.dataSource,'Open-Meteo ERA5 reanalysis');
 assert.equal(weather.tempExact,28.1);
 assert.equal(weather.dailyPrecipitation,25.4);
 assert.equal(entryFor(s,6).weather,'多云');
 assert.equal(getWeather(s,{day:1,clock:'08:00'}).condition,'晴');
});

test('editing only the condition leaves hourly temperature variations and original daily data intact',()=>{
 const s=fresh();s.day=7;
 s.clock='08:00';const original=getWeather(s);
 const record={name:original.name,condition:'雷雨',temp:original.temp,high:original.high,low:original.low};
 const changes=weatherEditChanges(record,original);
 assert.deepEqual(changes,{condition:'雷雨'});
 setWeatherOverride(s,{day:7,cityId:'macau',values:changes});
 assert.equal(getWeather(s).tempExact,24.2);
 s.clock='14:00';
 assert.equal(getWeather(s).tempExact,25.6);
 assert.equal(getWeather(s).condition,'雷雨');
 assert.equal(getWeather(s).source,'manual');
 assert.equal(getWeather(s,{day:8,clock:'08:00'}).source,'historical');
 assert.equal(weatherForDay(s,7).find(x=>x.id==='london').source,'placeholder');
});

test('a new journal record reads the same daily weather without changing message or mission data',()=>{
 const s=fresh();s.day=7;s.clock='08:00';
 assert.equal(entryFor(s,7),null,'D07 diary story is not written in this weather phase');
 saveDiaryEntry(s,7,{weather:'阴天',title:'普通的一天',body:'今天把衣服洗了。'});
 assert.equal(entryFor(s,7).weather,'阴天');
 assert.equal(getDailyWeather(s,{day:7}).condition,'阴天');
 assert.equal(entryFor(s,7).body,'今天把衣服洗了。');
 assert.equal(s.content.storyDiary[7].weather,undefined);
});
