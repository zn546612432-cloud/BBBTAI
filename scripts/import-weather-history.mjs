// Run once to build the OFFLINE historical dataset committed to this repo.
// The phone never calls Open-Meteo at runtime. The 2025 weather is ERA5
// reanalysis (estimated gridded historical data), not a Macau station record.
// Attribution: Open-Meteo.com (CC BY 4.0), ECMWF/Copernicus ERA5.
import {mkdir,writeFile} from 'node:fs/promises';

const START='2025-05-19',END='2025-07-12',DAYS=55;
const hourlyNames=[
 'temperature_2m','apparent_temperature','relative_humidity_2m',
 'precipitation','weather_code','cloud_cover','wind_speed_10m','is_day'
];
const dailyNames=[
 'temperature_2m_max','temperature_2m_min','precipitation_sum',
 'weather_code','sunrise','sunset'
];
const params=new URLSearchParams({
 latitude:'22.1987',longitude:'113.5439',
 start_date:START,end_date:END,
 timezone:'Asia/Macau',models:'era5',
 hourly:hourlyNames.join(','),daily:dailyNames.join(',')
});
const url='https://archive-api.open-meteo.com/v1/archive?'+params.toString();
let result,lastError;
for(let attempt=0;attempt<4;attempt++){
 try{
  const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw Error('Archive API '+response.status+': '+(await response.text()).slice(0,350));
  result=await response.json();break;
 }catch(error){
  lastError=error;
  if(attempt<3)await new Promise(resolve=>setTimeout(resolve,(attempt+1)*4000));
 }
}
if(!result)throw Error('Unable to import historical weather: '+String(lastError));
if(result.error)throw Error('Open-Meteo error: '+result.reason);
if(result.timezone!=='Asia/Macau'||result.utc_offset_seconds!==28800)
 throw Error('Unexpected timezone or UTC offset: '+result.timezone);
const hours=result.hourly,times=hours?.time,days=result.daily?.time;
if(times?.length!==DAYS*24||days?.length!==DAYS)
 throw Error('Expected 1320 hourly records and 55 days, found '+times?.length+' / '+days?.length);
for(const name of hourlyNames)if(!Array.isArray(hours[name])||hours[name].length!==times.length)
 throw Error('Missing hourly field '+name);
for(const name of dailyNames)if(!Array.isArray(result.daily[name])||result.daily[name].length!==DAYS)
 throw Error('Missing daily field '+name);
const history={metadata:{
 source:'Open-Meteo Historical Weather API / ECMWF ERA5 reanalysis',
 attribution:'Weather data by Open-Meteo.com (CC BY 4.0); ERA5 by ECMWF/Copernicus.',
 sourceUrl:url,latitude:22.1987,longitude:113.5439,timezone:'Asia/Macau',
 model:'era5',start:START,end:END,days:DAYS,
 hourlyFields:['temp','feels','humidity','precipitation','code','cloud','wind','isDay'],
 dailyFields:['max','min','precipitation','code','sunrise','sunset'],
 units:{temp:'°C',feels:'°C',humidity:'%',precipitation:'mm',cloud:'%',wind:'km/h'}
 },days:[]};
for(let day=0;day<DAYS;day++){
 const date=new Date(Date.UTC(2025,4,19+day)).toISOString().slice(0,10);
 if(days[day]!==date)throw Error('Nonconsecutive daily timeline at day '+(day+1));
 const h=[];
 for(let hr=0;hr<24;hr++){
  const idx=day*24+hr;
  const expected=date+'T'+String(hr).padStart(2,'0')+':00';
  if(times[idx]!==expected)throw Error('Missing or shifted local hour '+expected+': '+times[idx]);
  const record=hourlyNames.map(name=>hours[name][idx]);
  if(record.some(v=>typeof v!=='number'||!Number.isFinite(v)))
   throw Error('Invalid hourly observation at '+expected+': '+JSON.stringify(record));
  const [temp,feels,humidity,precipitation,code,cloud,wind,isDay]=record;
  if(temp< -70||temp>65||humidity<0||humidity>100||precipitation<0
    ||code<0||code>99||cloud<0||cloud>100||wind<0||![0,1].includes(isDay))
   throw Error('Out of range weather at '+expected);
  h.push(record);
 }
 const dailyRecord=dailyNames.map(name=>result.daily[name][day]);
 if(dailyRecord.slice(0,4).some(v=>typeof v!=='number'||!Number.isFinite(v))
   ||dailyRecord.slice(4).some(x=>typeof x!=='string'||!x.startsWith(date+'T')))
  throw Error('Invalid daily weather summary '+date);
 history.days.push({date,summary:dailyRecord,hours:h});
}
const path='src/services/weather/data/macau-2025-hourly.js';
await mkdir('src/services/weather/data',{recursive:true});
await writeFile(path,
 '// Generated from Open-Meteo ERA5 reanalysis; see scripts/import-weather-history.mjs.\n'+
 '// Weather data by Open-Meteo.com, CC BY 4.0. This is modelled historical weather.\n'+
 'export const MACAU_HISTORY_2025='+JSON.stringify(history)+';\n');
console.log('IMPORTED '+DAYS+' days / '+times.length+' hourly records -> '+path);
console.log('Sample D01, D07, D55:',[0,6,54].map(i=>({
 date:history.days[i].date,
 max:history.days[i].summary[0],
 min:history.days[i].summary[1],
 precipitation:history.days[i].summary[2],
 code:history.days[i].summary[3]
})));
