import {btn,card,demo,empty,esc} from '../../../../system/ui.js';
import {storyDay,dateParts,dateLabel,setPreviewDate} from '../../../../services/calendar.js';
const attr=v=>esc(v);
export function preview(s){const d=dateParts(s);return `<div class="editor-panel">${card(`<span class="eyebrow">TIMELINE</span><h2 data-preview-date-label>${dateLabel(s)}</h2><p data-preview-countdown>距离 BIG DAY 还有 ${storyDay(s.day).remaining} 天</p><p>D1 · 2025.05.19 — D90 · 2025.08.16</p>`)}<form data-form="preview"><label>手机显示日期</label><input data-preview-date type="date" value="${d.iso}" aria-label="手机显示日期" readonly><label>游戏时间</label><input name="clock" type="time" value="${s.clock}" required><label>剧情天数</label><input name="day" type="number" min="1" value="${s.day}" required><button class="button-primary wide" type="submit">应用预览</button></form><div class="section-heading">重大剧情 · 暂停充电</div><form data-form="charge-gate"><label>剧情天数</label><input name="day" type="number" min="1" max="89" value="${Math.min(89,s.day)}" required><label>完成标记</label><input name="flag" placeholder="day-57-complete" required><button class="button-primary wide" type="submit">保存</button></form><p class="editor-help">剧情规则写入完成标记后，即可充电跳日。第 90 天固定禁止充电。</p>${(s.storyChargeGates||[]).map(g=>`<div class="card">D${g.day} · ${esc(g.untilFlag)} ${btn('remove-charge-gate','删除','text-button',`data-day="${g.day}"`)}</div>`).join('')}${btn('export-content','导出全部本机内容','button-quiet wide')}</div>`;}


export function updateTimelinePreview(input){
 if(input.name!=='day'||input.closest('form')?.dataset.form!=='preview')return;
 const panel=input.closest('.editor-panel'),day=Number(input.value);
 if(!Number.isSafeInteger(day)||day<1){input.setCustomValidity('请输入有效的剧情天数');return;}
 input.setCustomValidity('');const value=storyDay(day);
 panel.querySelector('[data-preview-date]').value=value.iso;
 panel.querySelector('[data-preview-date-label]').textContent=value.label;
 panel.querySelector('[data-preview-countdown]').textContent=`距离 BIG DAY 还有 ${value.remaining} 天`;
}
