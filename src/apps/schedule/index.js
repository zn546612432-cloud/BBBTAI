import {dateLabel} from '../../services/calendar.js';
import {btn,card,esc} from '../../system/ui.js';
export const manifest={id:'schedule',name:'日程',glyph:'▦',tone:'#597482',defaultRoute:'/',kicker:'YOUR DAY'};
export const render=({store})=>`<div class="page-pad"><span class="eyebrow">${dateLabel(store.get())}</span><div class="large-title">今天</div>${card(`<div class="timeline-entry"><i></i><div><strong>留一点时间给自己</strong><small>没有必须立刻完成的事。</small></div></div>`)}<div class="section-heading">手记</div>${store.get().content.notes.map(n=>card(`<strong>${esc(n.title)}</strong><p>${esc(n.text)}</p>`)).join('')}</div>`;
