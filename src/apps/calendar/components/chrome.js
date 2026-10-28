import {ci} from './icons.js';
import {yearNumber,monthTitle} from '../data/model.js';

export function topBar(date,{kind='month'}={}){
 const year=yearNumber(date),back=kind==='month'?`${year}年`:kind==='day'?monthTitle(date):kind==='year'?'日历':'返回';
 const action=kind==='month'?'cl-year':kind==='day'||kind==='year'?'cl-month':'back';
 const left=`<button type="button" class="cl-glass-pill cl-back-pill" data-action="${action}" ${action==='cl-month'?`data-date="${date}"`:''} aria-label="返回${back}">${ci('back',24)}<span>${back}</span></button>`;
 return `<header class="cl-top-nav">${left}<div class="cl-tools-pill" role="group" aria-label="日历操作"><button data-action="cl-agenda" aria-label="日程列表">${ci('list',25)}</button><button data-action="cl-search" aria-label="搜索日程">${ci('search',26)}</button><button data-action="cl-new" aria-label="新建日程">${ci('plus',28)}</button></div></header>`;
}
export function bottomBar(mode='month'){
 return `<footer class="cl-bottom-nav"><button class="cl-glass-pill cl-today-pill" data-action="cl-today">今天</button><div class="cl-tools-pill cl-bottom-tools"><button data-action="${mode==='month'?'cl-day':'cl-month'}" ${mode==='month'?'data-date=""':''} aria-label="${mode==='month'?'按日查看':'按月查看'}">${ci('calendar',25)}</button><button data-action="cl-agenda" aria-label="日程收件箱">${ci('inbox',26)}</button></div></footer>`;
}
