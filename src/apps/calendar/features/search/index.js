import {esc} from '../../../../system/ui.js';
import {ci} from '../../components/icons.js';
import {longDate,eventShade} from '../../data/model.js';
export function renderSearch(events){
 return `<section class="cl-page cl-search-page"><header class="cl-search-header"><button class="cl-round-control" data-action="back" aria-label="返回上一页">${ci('back',24)}</button><label class="cl-search-box">${ci('search',20)}<input data-calendar-search type="search" placeholder="搜索日程" aria-label="搜索日程" autocomplete="off"></label><button class="cl-search-cancel" data-action="back">取消</button></header><div class="cl-search-list">${events.map(e=>`<button class="cl-search-result" data-search-text="${esc([e.title,e.location,e.notes].join(' ').toLocaleLowerCase())}" data-action="cl-show-event" data-id="${esc(e.id)}"><i style="background:${eventShade(e.color)}"></i><span><strong>${esc(e.title)}</strong><small>${longDate(e.startDate)} · ${esc(e.startTime)}</small></span></button>`).join('')}<div class="cl-search-empty" ${events.length?'hidden':''}>没有找到日程</div></div></section>`;
}
export function searchCalendar(input){
 const q=input.value.trim().toLocaleLowerCase(),page=input.closest('.cl-search-page');let visible=0;
 page?.querySelectorAll('.cl-search-result').forEach(row=>{row.hidden=!!q&&!row.dataset.searchText.includes(q);if(!row.hidden)visible++;});
 const empty=page?.querySelector('.cl-search-empty');if(empty)empty.hidden=visible>0;
}
