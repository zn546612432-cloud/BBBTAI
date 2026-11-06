// One read/write interface for story weather. Every app consumes this module.
// Phase 1 preserves existing manually edited weather and authored diary weather.
// Historical hourly data and Meteocons assets are separate future content layers;
// do not fabricate historical measurements or introduce a second game clock.
export const WEATHER_CITY_DEFAULTS=Object.freeze([
 {id:'macau',name:'澳门特别行政区',subtitle:'00:30',temp:26,high:29,low:25,condition:'晴朗无云',theme:'night'},
 {id:'london',name:'伦敦',subtitle:'16:30',temp:16,high:17,low:9,condition:'多云',theme:'cloud'},
 {id:'paris',name:'巴黎',subtitle:'17:30',temp:14,high:15,low:8,condition:'多云',theme:'cloud'}
]);

// These reflect the already-authored D01/D02/D05/D06 journal descriptions,
// not claimed historical observations. Later days use history once imported.
export const AUTHORED_WEATHER=Object.freeze({
 1:{macau:{condition:'晴'}},
 2:{macau:{condition:'晴'}},
 5:{macau:{condition:'多云'}},
 6:{macau:{condition:'多云'}}
});

export const WEATHER_CONDITIONS=Object.freeze([
 '晴','晴朗无云','大部晴朗无云','多云','阴天','小雨','阵雨','雷雨','下雪'
]);

const validDay=day=>Number.isInteger(Number(day))&&Number(day)>=1&&Number(day)<=90;
const cityFor=id=>WEATHER_CITY_DEFAULTS.find(c=>c.id===id);

export function getWeather(s,{day=s.day,clock=s.clock,cityId='macau'}={}){
 const baseline=cityFor(cityId);
 if(!baseline||!validDay(day))return null;
 const onDay=String(Number(day));
 const historicalDiary=s.content?.storyDiary?.[onDay]?.weather;
 const previousDiary=cityId==='macau'&&typeof historicalDiary==='string'&&historicalDiary.trim()
  ?{condition:historicalDiary.trim()}:{};
 const authored=AUTHORED_WEATHER[onDay]?.[cityId]||{};
 const manual=s.content?.weather?.[onDay]?.[cityId]||{};
 return {
  ...baseline,
  ...authored,
  ...previousDiary,
  ...manual,
  // The clock comes from the existing phone timeline, never wall time.
  day:Number(day),
  clock,
  source:Object.keys(manual).length?'manual':Object.keys(previousDiary).length?'legacy-diary':Object.keys(authored).length?'authored':'placeholder'
 };
}

export function weatherForDay(s,day=s.day){
 return WEATHER_CITY_DEFAULTS.map(city=>getWeather(s,{day,cityId:city.id})).filter(Boolean);
}

export function setWeatherOverride(s,{day,cityId='macau',values}){
 if(!validDay(day)||!cityFor(cityId)||!values||typeof values!=='object'||Array.isArray(values))
  throw Error('天气日期、城市或内容无效');
 const onDay=String(Number(day));
 s.content.weather??={};
 s.content.weather[onDay]??={};
 // All edits use the same storage layout as legacy Weather App saves.
 s.content.weather[onDay][cityId]={...(s.content.weather[onDay][cityId]||{}),...values};
 return s.content.weather[onDay][cityId];
}

export function weatherSymbol(condition){
 if(/雷/.test(condition||''))return '⛈';
 if(/雨|雪/.test(condition||''))return '🌧';
 if(/阴|云/.test(condition||''))return '☁';
 return '☀';
}
