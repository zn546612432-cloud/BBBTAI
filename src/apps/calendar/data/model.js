import {validDate} from '../../../services/calendar.js';

const DAY=86400000;
export const ymd=iso=>new Date(`${iso}T00:00:00Z`);
export const iso=d=>d.toISOString().slice(0,10);
export const offsetDay=(date,delta)=>iso(new Date(ymd(date).getTime()+delta*DAY));
export const monthDate=(date,offset=0)=>{const d=ymd(date);return iso(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+offset,1)));};
export const monthTitle=date=>`${ymd(date).getUTCMonth()+1}月`;
export const yearNumber=date=>ymd(date).getUTCFullYear();
export const longDate=date=>{const d=ymd(date);return `${d.getUTCFullYear()}年${d.getUTCMonth()+1}月${d.getUTCDate()}日`;};
export const weekdays=['日','一','二','三','四','五','六'];
export const weekday=date=>weekdays[ymd(date).getUTCDay()];
export const weekDates=date=>{const start=offsetDay(date,-ymd(date).getUTCDay());return Array.from({length:7},(_,i)=>offsetDay(start,i));};
export function monthWeeks(date){
 const first=monthDate(date),start=offsetDay(first,-ymd(first).getUTCDay()),end=new Date(Date.UTC(yearNumber(first),ymd(first).getUTCMonth()+1,0));
 const count=Math.ceil((end.getUTCDate()+ymd(first).getUTCDay())/7);
 return Array.from({length:count},(_,i)=>Array.from({length:7},(_,day)=>offsetDay(start,i*7+day)));
}
const lunarFormatter=(()=>{try{return new Intl.DateTimeFormat('zh-CN-u-ca-chinese',{month:'long',day:'numeric',timeZone:'UTC'});}catch{return null;}})();
const lunarDay=value=>{
 const n=Number(value),digits=['','一','二','三','四','五','六','七','八','九'];
 if(!Number.isInteger(n)||n<1||n>30)return value;
 if(n<=10)return `初${n===10?'十':digits[n]}`;
 if(n<20)return `十${digits[n-10]}`;
 if(n===20)return '二十';
 if(n<30)return `廿${digits[n-20]}`;
 return '三十';
};
export function lunar(date){
 try{if(!lunarFormatter)return '';const parts=lunarFormatter.formatToParts(ymd(date));const day=parts.find(p=>p.type==='day')?.value||'';const month=parts.find(p=>p.type==='month')?.value||'';return Number(day)===1?month:lunarDay(day);}catch{return '';}
}
export function fullLunar(date){try{if(!lunarFormatter)return '';const parts=lunarFormatter.formatToParts(ymd(date)),year=parts.find(p=>p.type==='yearName')?.value||'',month=parts.find(p=>p.type==='month')?.value||'',day=parts.find(p=>p.type==='day')?.value||'';return `${year?year+'年':''}${month}${lunarDay(day)}`;}catch{return '';}}
export const calendarEvents=s=>Array.isArray(s.content?.calendarEvents)?s.content.calendarEvents:[];
export const eventsOnDate=(events,date)=>events.filter(e=>e.startDate<=date&&e.endDate>=date).sort((a,b)=>a.startTime.localeCompare(b.startTime));
export const eventColors={mint:'#aae9e9',pink:'#e8c6e7',blue:'#c5e5f5',yellow:'#fae4ae',lavender:'#d8d1f5',coral:'#f6c5ba'};
export const eventShade=color=>eventColors[color]||eventColors.mint;
export function validEvent(e){
 if(!e||typeof e.title!=='string'||!e.title.trim()||e.title.length>120||!validDate(e.startDate)||!validDate(e.endDate))return false;
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.startTime)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.endTime))return false;
 return `${e.endDate}T${e.endTime}`>`${e.startDate}T${e.startTime}`;
}
