import {esc,btn} from '../../../../system/ui.js';
import {ghostCarTasks,ghostCarProgress} from '../../../../services/story55/ghost-car.js';
export function ghostCarDetail(s,record){
 if(!record)return '<p>尚無此項計劃。</p>';
 const tasks=ghostCarTasks(s),progress=ghostCarProgress(s);
 return `<header class="reminders-head">${btn('reminder-back','‹','','aria-label="返回"')}<strong>提醒事项</strong></header>
 <section class="reminder-project"><h1>鬼車行動</h1><div class="reminder-project-summary"><strong>${progress}<small>%</small></strong><span>${tasks.filter(t=>t.done).length} / ${tasks.length} 已完成</span></div>
 <div class="reminder-project-meter" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div>
 <ul class="reminder-project-list">${tasks.map(t=>`<li data-key="ghost-car-${esc(t.id)}"><span class="reminder-circle ${t.done?'done':''}">${t.done?'✓':''}</span><div><strong>${esc(t.title)}</strong><small>${esc(t.date.slice(5).replace('-','月'))}日 · ${t.done?'已完成':t.delivered?'待 TAI 解析':t.file&&s.day>=t.day?'待接收':'待完成'}</small></div>${t.delivered&&!t.done?`<button class="reminder-project-file" data-action="reminder-project-file" data-id="${esc(t.file)}" aria-label="查看${esc(t.title)}">›</button>`:''}</li>`).join('')}</ul>
 ${s.day>=40&&progress<100?'<p class="reminder-project-hint">請將未解析的模型檔案分享至 Ouroboros’ Tear。</p>':''}
 </section>`;
}
