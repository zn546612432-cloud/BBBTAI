// Native-looking task rows: one tap opens the exact existing application route.
import {esc} from '../../../../system/ui.js';
import {mainlineTasks,mainlineDayLabel} from './model.js';
const row=(record,first=false)=>{
 const done=record.done,link=!done&&!!record.link;
 const title='<strong>'+esc(record.title)+'</strong>';
 const detail='<small>'+esc(record.detail||'')+'</small>';
 const content='<span class="ml-copy">'+title+detail+'</span>';
 return '<div class="ml-row'+(done?' is-done':'')+(first?' is-first':'')+'">'+
  '<span class="ml-status" aria-hidden="true">'+(done?'✓':'')+'</span>'+
  (link?'<button type="button" class="ml-target" data-action="reminder-mainline" data-id="'+esc(record.id)+'" aria-label="前往：'+esc(record.title)+'">'+content+'<span class="ml-chevron" aria-hidden="true">›</span></button>':
   '<div class="ml-target ml-disabled">'+content+'</div>')+
 '</div>';
};
export function renderMainline(s,route='/',search=''){
 const day=mainlineDayLabel(s),records=mainlineTasks(s)
  .filter(r=>!search||r.title.toLowerCase().includes(search.toLowerCase())||(r.detail||'').toLowerCase().includes(search.toLowerCase()));
 const done=records.filter(x=>x.done),todo=records.filter(x=>!x.done);
 const selected=route==='/completed'?done:route==='/all'?records:todo;
 const section=route==='/completed'?'已完成':route==='/all'?'今天的主線':'待辦事項';
 return '<header class="reminders-head"><button type="button" data-action="reminder-back" aria-label="返回">‹</button><strong>提醒事項</strong></header>'+
  '<div class="ml-heading"><small>'+esc(day)+'</small><h1>'+esc(section)+'</h1>'+
  '<span>'+selected.filter(x=>!x.done).length+' 項待辦</span></div>'+
  '<div class="ml-list">'+(selected.length?selected.map((t,i)=>row(t,i===0&&!t.done)).join(''):
   '<p class="ml-empty">目前沒有要處理的事項。</p>')+'</div>'+
  (route==='/'&&done.length?'<div class="ml-bottom"><button type="button" data-action="reminder-open" data-route="/completed">已完成 · '+done.length+'　›</button></div>':
   route!=='/'?'<div class="ml-bottom"><button type="button" data-action="reminder-open" data-route="/">返回今天</button></div>':'');
}
