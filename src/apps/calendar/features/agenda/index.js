import {esc} from '../../../../system/ui.js';
import {topBar,bottomBar} from '../../components/chrome.js';
import {longDate,weekday,eventShade} from '../../data/model.js';
export function renderAgenda(date,today,events){
 const sorted=[...events].sort((a,b)=>`${a.startDate}${a.startTime}`.localeCompare(`${b.startDate}${b.startTime}`));
 const dates=[...new Set(sorted.map(e=>e.startDate))];
 return `<section class="cl-page cl-agenda-page">${topBar(date,{kind:'agenda'})}<h1>日程</h1><div class="cl-agenda-scroll">${dates.length?dates.map(day=>`<section class="cl-agenda-group"><h2>${longDate(day)} · 周${weekday(day)}</h2>${sorted.filter(e=>e.startDate===day).map(e=>`<button class="cl-agenda-row" data-action="cl-show-event" data-id="${esc(e.id)}"><i style="background:${eventShade(e.color)}"></i><span><strong>${esc(e.title)}</strong><small>${esc(e.startTime)}–${esc(e.endTime)}${e.location?' · '+esc(e.location):''}</small></span></button>`).join('')}</section>`).join(''):'<div class="cl-no-events">暂无日程<br><small>点击右上角 ＋ 添加第一项日程</small></div>'}</div>${bottomBar('agenda')}</section>`;
}
