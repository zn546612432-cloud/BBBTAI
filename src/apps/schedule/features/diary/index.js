import {esc} from '../../../../system/ui.js';
import {entryFor,diaryDate,allDiaryDays} from '../../../../story/diary/entries.js';
import {addReminder,reminders} from '../../../../services/reminders.js';

let suggestion=null;
const canOpen=(s,day)=>Number.isInteger(day)&&day>=1&&day<=Math.min(55,s.day);
const dateLabel=day=>{
 const d=new Date(diaryDate(day)+'T00:00:00Z');
 return new Intl.DateTimeFormat('zh-CN',{timeZone:'UTC',year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(d);
};
export function journalText(source=''){
 const tokens=String(source).split(/(\[\[[^\]]{1,200}\]\])/g);
 return tokens.map(token=>{
  const match=token.match(/^\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/);
  if(!match)return esc(token);
  const title=(match[2]||match[1]).trim().slice(0,120);
  return '<button class="diary-reminder-link" data-action="diary-add-reminder" data-title="'+esc(title)+'" type="button">'+esc(match[1])+'</button>';
 }).join('');
}
const header=(title,archive=false)=>'<header class="diary-header"><button type="button" data-action="back" aria-label="返回上一级">‹ <span>返回</span></button><span>'+esc(title)+'</span><button type="button" data-action="diary-archive" aria-label="查看日程档案">▤</button></header>';
const dialog=()=>!suggestion?'':`<div class="diary-confirm-scrim"><section class="diary-confirm" role="alertdialog" aria-modal="true" aria-label="添加提醒事项"><h2>加入提醒事项？</h2><p>${esc(suggestion)}</p><div><button type="button" data-action="diary-cancel-reminder">取消</button><button type="button" data-action="diary-confirm-reminder">加入提醒事项</button></div></section></div>`;
export function diaryView(s,loc){
 const archive=loc.route==='/archive';
 const requested=Number(loc.params?.day||s.day);
 const day=canOpen(s,requested)?requested:s.day;
 if(archive){
  const entries=allDiaryDays(s).filter(d=>d<=s.day).reverse();
  return '<div class="diary-app">'+header('日程')+'<div class="diary-scroll"><div class="diary-overline">JOURNAL</div><h1 class="diary-title">日程</h1><p class="diary-subtitle">记录发生过的日子。</p>'+
  entries.map(d=>'<button type="button" class="diary-archive-row" data-action="diary-open-day" data-day="'+d+'"><span><strong>'+esc(dateLabel(d))+'</strong><small>'+esc(entryFor(s,d).title||'日记')+'</small></span><span>›</span></button>').join('')+
  (entries.length?'':'<p class="diary-empty">还没有留下记录。</p>')+'</div>'+dialog()+'</div>';
 }
 const entry=entryFor(s,day);
 const previous=allDiaryDays(s).filter(d=>d<day).at(-1);
 const next=allDiaryDays(s).find(d=>d>day&&d<=s.day);
 return '<div class="diary-app">'+header('日程')+'<div class="diary-scroll diary-paper"><div class="diary-overline">DAY '+String(day).padStart(2,'0')+'</div><h1 class="diary-date">'+esc(dateLabel(day))+'</h1><div class="diary-weather"><span aria-hidden="true">☀</span> 天气 '+esc(entry?.weather||'暂无记录')+'</div>'+
  (entry?'<h2 class="diary-entry-title">'+esc(entry.title||'日记')+'</h2><article class="diary-prose">'+journalText(entry.body)+'</article>':'<p class="diary-empty">这一天还没有日程记录。</p>')+
  '<div class="diary-page-nav"><button type="button" data-action="diary-open-day" data-day="'+previous+'" '+(previous?'':'disabled')+'>‹ 上一篇</button><button type="button" data-action="diary-archive">全部日程</button><button type="button" data-action="diary-open-day" data-day="'+next+'" '+(next?'':'disabled')+'>下一篇 ›</button></div></div>'+dialog()+'</div>';
}
export function diaryAction(action,target,ctx){
 if(action==='diary-archive'){ctx.router.open({appId:'schedule',route:'/archive'});return true;}
 if(action==='diary-open-day'){const day=Number(target.dataset.day);if(canOpen(ctx.store.get(),day))ctx.router.open({appId:'schedule',route:'/',params:{day:String(day)}});return true;}
 if(action==='diary-add-reminder'){suggestion=String(target.dataset.title||'').slice(0,120);ctx.refresh();return true;}
 if(action==='diary-cancel-reminder'){suggestion=null;ctx.refresh();return true;}
 if(action==='diary-confirm-reminder'){
  const title=suggestion;suggestion=null;
  if(title&&!reminders(ctx.store.get()).some(r=>r.title===title))addReminder(ctx.store,title);
  else ctx.refresh();
  return true;
 }
 return false;
}
