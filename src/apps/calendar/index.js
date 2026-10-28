import {uid} from '../../services/id.js';
import {dateParts} from '../../services/calendar.js';
import {calendarEvents,validEvent,longDate,weekday} from './data/model.js';
import {renderMonth} from './features/month/index.js';
import {renderDay} from './features/day/index.js';
import {renderYear} from './features/year/index.js';
import {renderAgenda} from './features/agenda/index.js';
import {renderSearch,searchCalendar} from './features/search/index.js';
import {renderEditor} from './features/editor/index.js';
import {persistCalendarItem} from './features/editor/actions.js';
import {renderEvent} from './features/events/index.js';

export const manifest={id:'calendar',name:'日历',defaultRoute:'/',kicker:'CALENDAR'};
const isoDate=(state,params)=>/^\d{4}-\d{2}-\d{2}$/.test(params?.date||'')?params.date:dateParts(state).iso;
const open=(ctx,route,params={})=>ctx.router.open({appId:'calendar',route,params});

export function render({store},loc={route:'/',params:{}}){
 const state=store.get(),route=loc.route||'/',params=loc.params||{},today=dateParts(state).iso;
 const date=isoDate(state,params),events=calendarEvents(state);
 const inner=route==='/year'?renderYear(date,today):
   route==='/day'?renderDay(date,today,events):
   route==='/agenda'?renderAgenda(date,today,events):
   route==='/search'?renderSearch(events):
   route==='/new'||route==='/edit'?renderEditor(date,events.find(e=>e.id===params.eventId)):
   route==='/event'?renderEvent(events.find(e=>e.id===params.eventId)):
   renderMonth(date,today,events);
 return `<main class="cl-screen" data-view-key="calendar-${route.replace(/\W/g,'')}">${inner}</main>`;
}

export function handle(action,target,ctx,loc){
 const state=ctx.store.get(),params=loc.params||{},today=dateParts(state).iso,date=isoDate(state,params);
 if(action==='cl-day'){open(ctx,'/day',{date:target.dataset.date||date});return;}
 if(action==='cl-month'){open(ctx,'/',{date:target.dataset.date});return;}
 if(action==='cl-year'){open(ctx,'/year',{date});return;}
 if(action==='cl-agenda'){open(ctx,'/agenda',{date});return;}
 if(action==='cl-search'){open(ctx,'/search',{date});return;}
 if(action==='cl-new'){open(ctx,'/new',{date});return;}
 if(action==='cl-today'){open(ctx,loc.route==='/day'?'/day':'/',{date:today});return;}
 if(action==='cl-show-event'){open(ctx,'/event',{eventId:target.dataset.id,date});return;}
 if(action==='cl-edit-event'){open(ctx,'/edit',{eventId:target.dataset.id,date});return;}
 if(action==='cl-editor-mode'){
  const sheet=target.closest('.cl-editor-sheet');if(!sheet)return;
  sheet.dataset.kind=target.dataset.kind;
  sheet.querySelector('form').dataset.kind=target.dataset.kind;
  sheet.querySelectorAll('[data-action="cl-editor-mode"]').forEach(button=>{
   const selected=button.dataset.kind===target.dataset.kind;
   button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
  });
  return;
 }
 if(action==='cl-cancel-new'){ctx.router.back();return;}
 if(action==='cl-delete-event'){
  const dialog=document.querySelector('.cl-delete-confirm');if(dialog)dialog.hidden=false;return;
 }
 if(action==='cl-cancel-delete'){
  const dialog=document.querySelector('.cl-delete-confirm');if(dialog)dialog.hidden=true;return;
 }
 if(action==='cl-confirm-delete'){
  const id=target.dataset.id;
  ctx.store.update(s=>{s.content.calendarEvents=calendarEvents(s).filter(e=>e.id!==id);});
  ctx.router.back();return;
 }
}

export function input(target){
 if(target.matches('[data-calendar-search]')){searchCalendar(target);return;}
 if(target.matches('[data-calendar-date]')&&/^\d{4}-\d{2}-\d{2}$/.test(target.value)){
  const label=target.closest('.cl-local-date')?.querySelector('.cl-local-date-label');
  if(label)label.textContent=`${longDate(target.value)} 周${weekday(target.value)}`;
 }
}
export const change=input;

export function submit(form,ctx,loc){
 if(form.dataset.form!=='calendar-event')return;
 const fields=new FormData(form),kind=form.dataset.kind||'event';
 const title=String(fields.get('title')||'').trim();
 if(!title)throw Error('请填写标题');
 const event={id:loc.params?.eventId||uid(),title,startDate:String(fields.get('startDate')||''),startTime:String(fields.get('startTime')||'09:00'),endDate:String(fields.get('endDate')||''),endTime:String(fields.get('endTime')||'10:00'),location:String(fields.get('location')||'').trim(),invitees:String(fields.get('invitees')||'').trim(),color:String(fields.get('color')||'mint'),availability:String(fields.get('availability')||'busy'),alert:String(fields.get('alert')||'none'),travel:String(fields.get('travel')||'none'),notes:String(fields.get('notes')||'').trim(),url:String(fields.get('url')||'').trim(),kind};
 if(!validEvent(event))throw Error('请检查日期、时间（结束不能早于开始）');
 persistCalendarItem(ctx.store,event);
 ctx.router.back();
}
