const DAY=86400000;
const weekdays=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
export function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;}
export function todayShanghai(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),get=t=>parts.find(p=>p.type===t).value;
 return `${get('year')}-${get('month')}-${get('day')}`;
}
export const calendarAnchor=(day=1,date)=>date?({anchorDay:day,anchorDate:date}):({anchorDay:90,anchorDate:'2025-08-16'});
export function displayDate(s){const anchor=s.calendar||calendarAnchor(s.day);return new Date(new Date(anchor.anchorDate+'T00:00:00Z').getTime()+(s.day-anchor.anchorDay)*DAY);}
export function dateParts(s){const d=displayDate(s);return {iso:d.toISOString().slice(0,10),year:d.getUTCFullYear(),month:d.getUTCMonth()+1,date:d.getUTCDate(),weekday:weekdays[d.getUTCDay()]};}
export function dateLabel(s,{year=true,weekday=false}={}){const d=dateParts(s);return `${year?d.year+'年':''}${d.month}月${d.date}日${weekday?' '+d.weekday:''}`;}
export function monthCells(s){const {year,month,date}=dateParts(s),start=new Date(Date.UTC(year,month-1,1)).getUTCDay(),count=new Date(Date.UTC(year,month,0)).getUTCDate();return Array.from({length:Math.ceil((start+count)/7)*7},(_,i)=>{const n=i-start+1;return n<1||n>count?null:{date:n,today:n===date};});}
export function setPreviewDate(s,{day,clock}){if(!Number.isSafeInteger(day)||day<1||!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))throw Error('请输入有效的日期、时间和剧情进度');s.day=day;s.clock=clock;s.calendar=calendarAnchor(day);s.deathPhase=null;s.powerMode='idle';s.emergencyCharge=false;s.poweredOff=false;s.alarmRinging=null;s.dayChargeRemainingMs=0;s.worldMinuteFraction=0;s.powerActiveMs=0;s.chargeFraction=0;s.sleepWakeAt=null;s.batteryPercent=82;}
