import {esc} from '../../../../system/ui.js';
import {topBar,bottomBar} from '../../components/chrome.js';
import {ymd,weekDates,weekdays,longDate,fullLunar,eventsOnDate,eventShade} from '../../data/model.js';

function timeValue(time){const [h,m]=time.split(':').map(Number);return h*60+m;}
function eventBox(e){
 const start=Math.max(5*60,timeValue(e.startTime)),end=Math.min(24*60,timeValue(e.endTime));
 const top=Math.max(0,(start-5*60)/60*72),height=Math.max(27,(end-start)/60*72);
 return `<button class="cl-day-event" style="top:${top}px;height:${height}px;--event-color:${eventShade(e.color)}" data-action="cl-show-event" data-id="${esc(e.id)}" aria-label="${esc(e.title)} ${esc(e.startTime)}"><strong>${esc(e.title)}</strong>${e.location&&height>43?`<small>${esc(e.location)}</small>`:''}</button>`;
}
export function renderDay(date,today,events){
 const week=weekDates(date),items=eventsOnDate(events,date);
 return `<section class="cl-page cl-day-page">${topBar(date,{kind:'day'})}<div class="cl-day-week">${week.map((day,i)=>`<button class="cl-day-choice ${day===date?'selected':''} ${day===today?'today':''}" data-action="cl-day" data-date="${day}" aria-label="${longDate(day)}"><small>${weekdays[i]}</small><strong>${ymd(day).getUTCDate()}</strong><span>${day===date?fullLunar(day):''}</span></button>`).join('')}</div><div class="cl-day-date"><strong>${longDate(date)} - 周${weekdays[ymd(date).getUTCDay()]}</strong><span>${esc(fullLunar(date))}</span></div><div class="cl-day-timeline" data-calendar-scroll><div class="cl-day-hours">${Array.from({length:19},(_,i)=>{const h=i+5;return `<div class="cl-hour"><span>${String(h).padStart(2,'0')}:00</span><i></i></div>`;}).join('')}${items.map(eventBox).join('')}</div></div>${bottomBar('day')}</section>`;
}
