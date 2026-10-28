import {btn,esc} from '../../../../system/ui.js';
export function alarmsView(s,editing){const list=s.content.alarms||[];return `<header class="clock-head">${btn('clock-edit',editing?'完成':'编辑')}${btn('alarm-add','＋','clock-plus')}</header><h1>闹钟</h1><h2>☾　睡眠 | 起床</h2><div class="clock-sleep">未设定睡眠时间 <span>设置 ›</span></div><h2>其他</h2><div class="alarm-list">${list.map(x=>`<div class="alarm-row">${editing?btn('alarm-delete','−','alarm-remove',`data-id="${esc(x.id)}"`):''}<div><input type="time" data-alarm-field="time" data-id="${esc(x.id)}" value="${esc(x.time)}" aria-label="闹钟时间"><small><input data-alarm-field="label" data-id="${esc(x.id)}" value="${esc(x.label)}" aria-label="闹钟名称"></small></div>${btn('alarm-toggle',x.enabled?'●':'○',x.enabled?'is-on':'',`data-id="${esc(x.id)}" aria-label="${x.enabled?'关闭':'打开'}闹钟"`)}</div>`).join('')||'<p class="clock-empty">没有闹钟，点右上角＋添加</p>'}</div>`;}
export function tickAlarms(store){
 const s=store.get(),due=(s.content.alarms||[]).filter(a=>a.enabled&&a.time===s.clock&&a.lastFiredDay!==s.day);
 if(!due.length)return [];
 store.update(next=>{
  for(const alarm of next.content.alarms){
   if(!due.some(item=>item.id===alarm.id))continue;
   alarm.lastFiredDay=next.day;
   next.notifications.unshift({id:`alarm-${alarm.id}-${next.day}`,title:'闹钟',body:alarm.label||'闹钟',link:{appId:'clock',route:'/',params:{}}});
  }
 });
 return due;
}
