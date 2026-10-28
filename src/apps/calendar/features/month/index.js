import {esc} from '../../../../system/ui.js';
import {topBar,bottomBar} from '../../components/chrome.js';
import {ymd,monthDate,monthWeeks,monthTitle,weekdays,eventsOnDate,lunar,eventShade} from '../../data/model.js';

function weekRow(days,month,today,events){
 const currentMonth=ymd(month).getUTCMonth();
 return `<div class="cl-week-row">${days.map(date=>{
  const d=ymd(date),out=d.getUTCMonth()!==currentMonth,todayClass=date===today?' cl-today':'';
  const items=eventsOnDate(events,date);
  return `<div class="cl-week-cell ${out?'is-outside':''}"><button class="cl-date-hit${todayClass}" data-action="cl-day" data-date="${date}" aria-label="${d.getUTCDate()}日，${items.length}项日程"><strong>${d.getUTCDate()}</strong><small>${esc(lunar(date))}</small></button><div class="cl-mini-events">${items.slice(0,3).map(item=>`<button class="cl-event-chip" data-action="cl-show-event" data-id="${esc(item.id)}" title="${esc(item.title)}" style="--event-color:${eventShade(item.color)}"><span>${esc(item.title)}</span></button>`).join('')}${items.length>3?`<span class="cl-more-events">+${items.length-3}</span>`:''}</div></div>`;
 }).join('')}</div>`;
}

export function renderMonth(date,today,events){
 // A continuously scrolling calendar, as in the reference: this month and the following months.
 const months=[0,1,2].map(n=>monthDate(date,n));
 return `<section class="cl-page cl-month-page">${topBar(date)}<div class="cl-month-title">${monthTitle(date)}</div><div class="cl-weekdays">${weekdays.map(d=>`<span>${d}</span>`).join('')}</div><div class="cl-month-scroller" data-calendar-scroll>${months.map((month,index)=>`<section class="cl-month-section" aria-label="${month.slice(0,7)}"><h2 class="cl-next-month" ${index?'':'hidden'}>${monthTitle(month)}</h2>${monthWeeks(month).map(week=>weekRow(week,month,today,events)).join('')}</section>`).join('')}</div>${bottomBar('month')}</section>`;
}
