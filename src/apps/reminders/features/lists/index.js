import {wishDefinition} from '../../../../services/wishes/catalog.js';
import {btn,esc} from '../../../../system/ui.js';
const rows=items=>items.map(r=>{
  const w=r.wishId&&wishDefinition(r.wishId);
  if(w)return '<div class="reminder-item wish-reminder-row">'+
    '<span class="reminder-circle '+(r.done?'done':'')+'">'+(r.done?'✓':'')+'</span>'+
    '<button type="button" class="wish-reminder-detail" data-action="reminder-wish-open" data-id="'+esc(w.id)+'"><strong>'+esc(w.title)+'</strong><small>'+
    (r.wishStatus==='delivered'?'已购买 · 已送达':r.wishStatus==='ordered'?'已购买 · 等待收货':r.wishStatus==='expired'?'已错过 · 仅供查看':'预计花费 '+w.price+' USD'+(w.expires?' · D06 限时':''))+
    '</small></button></div>';
  return '<div class="reminder-item">'+btn('reminder-toggle',r.done?'✓':'','reminder-circle '+(r.done?'done':''),`data-id="${esc(r.id)}" aria-label="切换完成状态"`)+
    '<span>'+esc(r.title)+(r.storyD02Order?'<small style="display:block;font-size:11px;opacity:.7">D'+r.deadlineDay+' '+esc(r.deadlineClock)+' · '+esc(r.status||'进行中')+' · '+(r.progress||0)+'/'+(r.total||3)+'</small>':'')+
    '</span>'+btn('reminder-delete','×','reminder-row-delete',`data-id="${esc(r.id)}" aria-label="删除"` )+'</div>';
}).join('');
export const listHome=(items,search)=>`<header class="reminders-head">${btn('reminder-back','‹','','aria-label="返回"')}<strong>提醒事项</strong></header><label class="reminders-search"><img src="/assets/lucide/search.svg" alt=""><input name="reminder-search" placeholder="搜索" value="${esc(search)}"></label><div class="reminders-summary">${btn('reminder-open',`<b><img src="/assets/lucide/list.svg" alt=""> ${items.length}</b><small>全部</small>`,'',`data-route="/all"`)}${btn('reminder-open',`<b><img src="/assets/lucide/circle-check.svg" alt=""> ${items.filter(x=>x.done).length}</b><small>已完成</small>`,'',`data-route="/completed"`)}</div><h1>进行中</h1>${rows(items.filter(x=>!x.done))}<h1>已完成</h1>${rows(items.filter(x=>x.done))}<div class="reminders-float">${btn('reminder-add','＋ 新提醒事项')}</div>`;
export const listDetail=(items,title)=>`<header class="reminders-head">${btn('reminder-back','‹ 返回')}<strong>${title}</strong></header><h1>${title}</h1><div class="reminder-items">${rows(items)||'<p>暂无提醒事项</p>'}</div><form data-form="add-reminder" class="reminder-new"><input name="title" maxlength="120" placeholder="新提醒事项" required><button>＋</button></form>`;
