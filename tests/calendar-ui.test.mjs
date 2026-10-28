import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {render,handle,manifest} from '../src/apps/calendar/index.js';
import {offsetDay,monthWeeks,lunar,calendarEvents,eventsOnDate,validEvent} from '../src/apps/calendar/data/model.js';
import {persistCalendarItem} from '../src/apps/calendar/features/editor/actions.js';

const state=initialState(),ctx={store:{get:()=>state}};
const event={id:'cal-1',title:'和熙泰下棋',startDate:'2026-10-26',startTime:'09:00',endDate:'2026-10-26',endTime:'10:00',color:'mint',location:'家里'};

test('Calendar has separately packaged native month, day and editor views',()=>{
 assert.equal(manifest.id,'calendar');
 const month=render(ctx,{route:'/',params:{date:'2026-10-26'}});
 for(const value of ['cl-top-nav','cl-month-title','cl-weekdays','cl-week-row','cl-bottom-nav','cl-day','cl-year','cl-new'])assert.ok(month.includes(value),value);
 assert.match(month,/10月/);
 assert.match(month,/11月/);
 const day=render(ctx,{route:'/day',params:{date:'2026-10-26'}});
 for(const value of ['cl-day-week','cl-day-date','cl-day-timeline','05:00','23:00'])assert.ok(day.includes(value),value);
 const editor=render(ctx,{route:'/new',params:{date:'2026-10-26'}});
 for(const value of ['cl-editor-sheet','日程','提醒事项','标题','位置或视频通话','受邀人','日历','显示为','提醒','行程时间','备注','URL','cl-editor-form'])assert.ok(editor.includes(value),value);
});

test('Calendar does not import screenshot private schedules',()=>{
 const html=render(ctx,{route:'/',params:{date:'2026-10-26'}});
 assert.equal(calendarEvents(state).length,0);
 assert.doesNotMatch(html,/军训开营|早读|中山市公安|工业机器人|zn546612432@gmail/);
});

test('A saved event appears in both month grid and day timeline',()=>{
 const saved=initialState();saved.content.calendarEvents=[event];
 const savedCtx={store:{get:()=>saved}};
 assert.match(render(savedCtx,{route:'/',params:{date:'2026-10-26'}}),/和熙泰下棋/);
 assert.match(render(savedCtx,{route:'/day',params:{date:'2026-10-26'}}),/和熙泰下棋/);
 assert.match(render(savedCtx,{route:'/event',params:{eventId:'cal-1'}}),/和熙泰下棋/);
 assert.equal(eventsOnDate([event],'2026-10-26').length,1);
});

test('Date utilities work across months and event ranges are validated',()=>{
 assert.equal(offsetDay('2026-10-31',1),'2026-11-01');
 assert.equal(monthWeeks('2026-10-26').length,5);
 assert.equal(typeof lunar('2026-10-26'),'string');
 assert.equal(lunar('2026-10-26'),'十七');
 assert.equal(validEvent(event),true);
 assert.equal(validEvent({...event,endTime:'08:59'}),false);
 assert.equal(validEvent({...event,endDate:'2026-10-25'}),false);
});

test('Calendar events persist without changing story logs, and reminder mode uses Reminders data',()=>{
 const live=initialState(),storyCount=live.events.length,store={update:fn=>fn(live)};
 persistCalendarItem(store,{...event,kind:'event'});
 assert.equal(calendarEvents(live)[0].title,'和熙泰下棋');
 persistCalendarItem(store,{...event,kind:'event',title:'改为国际象棋'});
 assert.equal(calendarEvents(live).length,1);
 assert.equal(calendarEvents(live)[0].title,'改为国际象棋');
 persistCalendarItem(store,{...event,id:'cal-rem-1',kind:'reminder',title:'记得休息'});
 assert.equal(live.content.reminders.at(-1).title,'记得休息');
 assert.equal(live.content.reminders.at(-1).dueDate,'2026-10-26');
 assert.equal(live.events.length,storyCount);
});

test('Calendar back navigation and new-event flow use the app route',()=>{
 const opened=[];
 const context={store:{get:()=>state},router:{open:x=>opened.push(x),back:()=>opened.push('back')}};
 handle('cl-day',{dataset:{date:'2026-10-22'}},context,{route:'/',params:{}});
 handle('cl-new',{dataset:{}},context,{route:'/day',params:{date:'2026-10-22'}});
 handle('cl-cancel-new',{dataset:{}},context,{route:'/new',params:{date:'2026-10-22'}});
 assert.deepEqual(opened[0],{appId:'calendar',route:'/day',params:{date:'2026-10-22'}});
 assert.deepEqual(opened[1],{appId:'calendar',route:'/new',params:{date:'2026-10-22'}});
 assert.equal(opened[2],'back');
});

test('The app remains isolated in one calendar folder and reserves the status area',()=>{
 for(const feature of ['month','day','year','agenda','search','editor','events'])assert.ok(existsSync(new URL(`../src/apps/calendar/features/${feature}/index.js`,import.meta.url)),feature);
 const css=readFileSync(new URL('../src/apps/calendar/styles.css',import.meta.url),'utf8');
 assert.match(css,/padding-top:calc\(60px \+ env\(safe-area-inset-top,0px\)\)/);
 assert.match(css,/\.app-calendar \.app-nav\{display:none\}/);
 assert.match(readFileSync(new URL('../index.html',import.meta.url),'utf8'),/src\/apps\/calendar\/styles\.css/);
});
