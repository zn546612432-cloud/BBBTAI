import {topBar,bottomBar} from '../../components/chrome.js';
import {monthDate,monthWeeks,ymd,yearNumber,weekdays} from '../../data/model.js';
export function renderYear(date,today){
 const first=monthDate(date,-ymd(date).getUTCMonth());
 return `<section class="cl-page cl-year-page">${topBar(date,{kind:'year'})}<h1 class="cl-year-title">${yearNumber(date)}年</h1><div class="cl-year-scroll"><div class="cl-year-grid">${Array.from({length:12},(_,i)=>{
  const month=monthDate(first,i);
  return `<button class="cl-year-month" data-action="cl-month" data-date="${month}"><strong>${i+1}月</strong><div class="cl-small-week">${weekdays.map(w=>`<span>${w}</span>`).join('')}</div><div class="cl-small-dates">${monthWeeks(month).flat().map(d=>`<span class="${ymd(d).getUTCMonth()===i?'':'outside'} ${d===today?'today':''}">${ymd(d).getUTCDate()}</span>`).join('')}</div></button>`;
 }).join('')}</div></div>${bottomBar('month')}</section>`;
}
