// Open-Meteo ERA5 historical adapter used by the ONE shared weather model.
// The story takes place in 2025. Live 2026 forecasts would be the wrong data.
// European records are fetched in their local IANA time zones and cached as
// read-only data; the phone's game day/clock remain owned by Story55.
const ARCHIVE_CITIES=Object.freeze({
 london:{lat:51.5074,lon:-0.1278,tz:'Europe/London'},
 paris:{lat:48.8566,lon:2.3522,tz:'Europe/Paris'}
});
const CACHE_VERSION='bbbtai-era5-city-history-2025-v1-';
const first='2025-05-18',last='2025-08-18';
const cached=new Map(),pending=new Map(),failAt=new Map();
const allowed=id=>Object.hasOwn(ARCHIVE_CITIES,id);
export function archiveHistoryUrl(id){
 const city=ARCHIVE_CITIES[id];if(!city)return null;
 const params=new URLSearchParams({
  latitude:String(city.lat),longitude:String(city.lon),
  start_date:first,end_date:last,
  hourly:'temperature_2m,apparent_temperature,precipitation,weather_code,cloud_cover,is_day',
  daily:'temperature_2m_max,temperature_2m_min,weather_code',
  timezone:city.tz,models:'era5'
 });
 return 'https://archive-api.open-meteo.com/v1/archive?'+params.toString();
}
const valid=data=>Array.isArray(data?.hourly?.time)&&data.hourly.time.length>100&&
 Array.isArray(data.hourly.temperature_2m)&&data.hourly.temperature_2m.length===data.hourly.time.length&&
 Array.isArray(data.hourly.weather_code)&&data.hourly.weather_code.length===data.hourly.time.length&&
 Array.isArray(data.daily?.time)&&Array.isArray(data.daily.temperature_2m_max)&&
 data.daily.time.length===data.daily.temperature_2m_max.length;
function historyFor(id){
 if(!allowed(id))return null;
 if(cached.has(id))return cached.get(id);
 try{
  const raw=globalThis.localStorage?.getItem(CACHE_VERSION+id);
  if(raw){
   const result=JSON.parse(raw);
   if(valid(result)){cached.set(id,result);return result;}
  }
 }catch{}
 return null;
}
const str=(date,h)=>date+'T'+String(h).padStart(2,'0')+':00';
export function europeanLocalTime(day,clock,id){
 if(!allowed(id)||!Number.isInteger(Number(day))||Number(day)<1||Number(day)>90)return null;
 const start=new Date('2025-05-19T00:00:00Z');
 start.setUTCDate(start.getUTCDate()+Number(day)-1);
 const time=/^([01]\d|2[0-3]):[0-5]\d$/.test(String(clock))?clock:'08:00';
 const iso=start.toISOString().slice(0,10);
 const utc=new Date(iso+'T'+time+':00+08:00'); // Story55 is Macau-local
 const parts=new Intl.DateTimeFormat('en-GB',{
  timeZone:ARCHIVE_CITIES[id].tz,year:'numeric',month:'2-digit',
  day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
 }).formatToParts(utc);
 const get=type=>parts.find(p=>p.type===type)?.value||'00';
 return {date:get('year')+'-'+get('month')+'-'+get('day'),
  hour:Number(get('hour')),subtitle:get('hour')+':'+get('minute')};
}
export function europeanWeatherAt(day,clock,id){
 const local=europeanLocalTime(day,clock,id);
 if(!local)return null;
 const data=historyFor(id);
 if(!data)return null;
 const hourIdx=data.hourly.time.indexOf(str(local.date,local.hour));
 const dayIdx=data.daily.time.indexOf(local.date);
 if(hourIdx<0||dayIdx<0)return null;
 const h=data.hourly,d=data.daily;
 const temp=h.temperature_2m[hourIdx],hi=d.temperature_2m_max[dayIdx],lo=d.temperature_2m_min[dayIdx];
 if(![temp,hi,lo].every(Number.isFinite))return null;
 return {temp:Math.round(temp),tempExact:temp,high:Math.round(hi),low:Math.round(lo),
  feelsLike:h.apparent_temperature?.[hourIdx],precipitation:h.precipitation?.[hourIdx]||0,
  weatherCode:h.weather_code[hourIdx],cloudCover:h.cloud_cover?.[hourIdx],
  isDay:h.is_day?.[hourIdx]??1,date:local.date,subtitle:local.subtitle,
  dataSource:'Open-Meteo ERA5 reanalysis'};
}
export function europeWeatherUnavailable(id){return allowed(id)&&!historyFor(id)&&failAt.has(id);}
export function warmEuropeanHistory(onReady=()=>{}){
 if(!globalThis.window||typeof globalThis.fetch!=='function')return;
 for(const id of Object.keys(ARCHIVE_CITIES)){
  if(historyFor(id)||pending.has(id))continue;
  if(Date.now()-(failAt.get(id)||0)<60000)continue;
  const promise=(async()=>{
   const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),16000);
   try{
    const response=await fetch(archiveHistoryUrl(id),{signal:ctrl.signal});
    if(!response.ok)throw Error('Open-Meteo status '+response.status);
    const data=await response.json();
    if(!valid(data))throw Error('Incomplete ERA5 history');
    cached.set(id,data);failAt.delete(id);
    try{globalThis.localStorage?.setItem(CACHE_VERSION+id,JSON.stringify(data));}catch{}
   }catch{failAt.set(id,Date.now());}
   finally{clearTimeout(timeout);pending.delete(id);onReady();}
  })();
  pending.set(id,promise);
 }
}
