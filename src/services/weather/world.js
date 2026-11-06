// One weather data source for the iPhone. No network requests, timers or random
// conditions at runtime. Historical Macau data is shipped with the game.
// Source: Open-Meteo Historical Weather API, ECMWF ERA5 reanalysis (CC BY 4.0).
import {MACAU_HISTORY_2025} from './data/macau-2025-hourly.js';

export const WEATHER_HISTORY=MACAU_HISTORY_2025.metadata;
export const WEATHER_CITY_DEFAULTS=Object.freeze([
 {id:'macau',name:'澳门特别行政区',subtitle:'00:30',temp:26,high:29,low:25,condition:'晴朗无云',theme:'night'},
 {id:'london',name:'伦敦',subtitle:'16:30',temp:16,high:17,low:9,condition:'多云',theme:'cloud'},
 {id:'paris',name:'巴黎',subtitle:'17:30',temp:14,high:15,low:8,condition:'多云',theme:'cloud'}
]);

// These existing authored conditions must survive importing historical data.
// They are narrative overrides, not claimed historical observations.
export const AUTHORED_WEATHER=Object.freeze({
 1:{macau:{condition:'晴'}},
 2:{macau:{condition:'晴'}},
 5:{macau:{condition:'多云'}},
 6:{macau:{condition:'多云'}}
});

export const WEATHER_CONDITIONS=Object.freeze([
 '晴','晴朗无云','大部晴朗无云','多云','阴天','雾',
 '小雨','阵雨','中雨','大雨','暴雨','雷雨','下雪'
]);

const validDay=day=>Number.isInteger(Number(day))&&Number(day)>=1&&Number(day)<=90;
const cityFor=id=>WEATHER_CITY_DEFAULTS.find(c=>c.id===id);
const numeric=(x)=>typeof x==='number'&&Number.isFinite(x);
const historyDay=day=>Number.isInteger(Number(day))&&day>=1&&day<=55
 ?MACAU_HISTORY_2025.days[Number(day)-1]:null;
const validClock=clock=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(clock||''));
const hourOf=clock=>validClock(clock)?Number(clock.slice(0,2)):8;

export function conditionFromWeatherCode(code,precipitation=0){
 if([95,96,99].includes(code))return '雷雨';
 if([80,81,82].includes(code))return code===82?'大雨':'阵雨';
 if([65,67].includes(code))return '大雨';
 if([63].includes(code))return '中雨';
 if([51,53,55,56,57,61,66].includes(code))return '小雨';
 if([71,73,75,77,85,86].includes(code))return '下雪';
 if([45,48].includes(code))return '雾';
 if(code===3)return '阴天';
 if(code===2)return '多云';
 if(code===1)return '大部晴朗无云';
 if(code===0)return '晴朗无云';
 return precipitation>0?'阵雨':'多云';
}

function historyWeather(day,clock,cityId){
 if(cityId!=='macau')return null;
 const record=historyDay(day);
 if(!record)return null;
 const [temp,feels,humidity,precipitation,code,cloud,wind,isDay]=record.hours[hourOf(clock)];
 const [max,min,dailyPrecipitation,dailyCode,sunrise,sunset]=record.summary;
 return {
  temp:Math.round(temp),tempExact:temp,high:Math.round(max),low:Math.round(min),
  feelsLike:feels,humidity,precipitation,weatherCode:code,cloudCover:cloud,
  windSpeed:wind,isDay,dailyPrecipitation,dailyWeatherCode:dailyCode,
  sunrise,sunset,date:record.date,
  condition:conditionFromWeatherCode(code,precipitation),
  dataSource:'Open-Meteo ERA5 reanalysis'
 };
}

const themeFor=record=>{
 if(record.isDay===0)return 'night';
 if(/雷|雨|雪/.test(record.condition||''))return 'cloud';
 if(/云|阴|雾/.test(record.condition||''))return 'cloud';
 return 'day';
};

export function getWeather(s,{day=s.day,clock=s.clock,cityId='macau'}={}){
 const baseline=cityFor(cityId);
 if(!baseline||!validDay(day))return null;
 const index=String(Number(day));
 const historical=historyWeather(day,clock,cityId);
 // Read old player saves without rewriting them. New edits always use content.weather.
 const olderDiary=s.content?.storyDiary?.[index]?.weather;
 const legacy=cityId==='macau'&&typeof olderDiary==='string'&&olderDiary.trim()
  ?{condition:olderDiary.trim()}:null;
 const authored=AUTHORED_WEATHER[index]?.[cityId];
 const manual=s.content?.weather?.[index]?.[cityId];
 const value={...baseline,...historical,...authored,...legacy,...manual};
 value.day=Number(day);
 value.clock=validClock(clock)?clock:'08:00';
 value.theme=manual?.theme|| (historical?themeFor(value):baseline.theme);
 value.source=manual&&Object.keys(manual).length?'manual'
  :legacy?'legacy-diary':authored?'authored'
  :historical?'historical':'placeholder';
 return value;
}

// A journal entry refers to the whole past day, not the player's current hour.
// The daily WMO code describes the day's most significant weather, except
// for preserved authored or manually edited narrative overrides.
export function getDailyWeather(s,{day=s.day,cityId='macau'}={}){
 const value=getWeather(s,{day,clock:'12:00',cityId});
 if(!value)return null;
 if(value.source==='historical'&&numeric(value.dailyWeatherCode)){
  return {...value,condition:conditionFromWeatherCode(value.dailyWeatherCode,value.dailyPrecipitation)};
 }
 return value;
}

export function weatherForDay(s,day=s.day){
 return WEATHER_CITY_DEFAULTS.map(city=>getWeather(s,{day,cityId:city.id})).filter(Boolean);
}

// A shared hourly selector for the existing Weather UI and future story hooks.
// It uses ONLY the phone game day/clock, including crossing midnight.
export function weatherHours(s,{day=s.day,clock=s.clock,cityId='macau',count=8}={}){
 if(!validDay(day)||!cityFor(cityId))return [];
 const hour=hourOf(clock),limit=Math.max(1,Math.min(24,Math.floor(count)||8));
 const result=[];
 for(let i=0;i<limit;i++){
  const total=hour+i,atDay=Number(day)+Math.floor(total/24);
  if(!validDay(atDay)||(s.story55?.version===1&&atDay>55))break;
  const atHour=total%24;
  const atClock=String(atHour).padStart(2,'0')+':00';
  const weather=getWeather(s,{day:atDay,clock:atClock,cityId});
  if(weather)result.push({...weather,label:i===0?'现在':atClock,hour:atHour});
 }
 return result;
}

export function setWeatherOverride(s,{day,cityId='macau',values}){
 if(!validDay(day)||!cityFor(cityId)||!values||typeof values!=='object'||Array.isArray(values))
  throw Error('天气日期、城市或内容无效');
 const index=String(Number(day));
 s.content.weather??={};
 s.content.weather[index]??={};
 // One storage layout used by the Weather App and the journal editor.
 s.content.weather[index][cityId]={...(s.content.weather[index][cityId]||{}),...values};
 return s.content.weather[index][cityId];
}

export function weatherSymbol(condition){
 if(/雷/.test(condition||''))return '⛈';
 if(/雨|雪/.test(condition||''))return '🌧';
 if(/阴|云|雾/.test(condition||''))return '☁';
 return '☀';
}
