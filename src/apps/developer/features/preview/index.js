import {isStory55} from '../../../../services/story55/state.js';
import {story55Editor} from '../story55/index.js';
import {btn,card,demo,empty,esc} from '../../../../system/ui.js';
import {storyDay,dateParts,dateLabel,setPreviewDate} from '../../../../services/calendar.js';
import {dueProactiveRule,inRuleDay} from '../../../../story/presets/engine.js';
const attr=v=>esc(v);
const stageText=(s,r)=>{
 const p=s.storyPresets||{};
 if(p.usedIds?.includes(r.id)||p.firedProactiveDays?.includes(`${r.id}:${s.day}`))return '✓ 已触发';
 if(!r.enabled)return '已停用';
 if(!inRuleDay(r,s.day))return '当前日期不在有效范围内';
 if(s.clock<r.from)return '等待时间';
 if(r.requiresFlag&&!p.flags?.includes(r.requiresFlag))return `等待剧情标记 ${r.requiresFlag}`;
 if(r.mode!=='scheduled')return '条件触发 · 需要玩家消息';
 return dueProactiveRule(s)?.id===r.id?'等待下一次检查':'应补发 · 点击补齐';
};
const ruleDate=r=>r.dayScope==='any'?'任意日期':r.dayScope==='range'?`D${String(r.startDay??r.day).padStart(2,'0')}–D${String(r.endDay??r.day).padStart(2,'0')}`:`D${String(r.day).padStart(2,'0')}`;
export function preview(s){if(isStory55(s))return story55Editor(s);const d=dateParts(s),rules=(s.storyPresets?.rules||[]).filter(r=>r.kind==='proactive').sort((a,b)=>a.day-b.day||a.from.localeCompare(b.from));return `<div class="editor-panel">${card(`<span class="eyebrow">TIMELINE / CHECK</span><h2 data-preview-date-label>${dateLabel(s)}</h2><p data-preview-countdown>距离 BIG DAY 还有 ${storyDay(s.day).remaining} 天</p><p>D1 · 2025.05.19 — D90 · 2025.08.16</p>`)}<form data-form="preview"><label>手机显示日期</label><input data-preview-date type="date" value="${d.iso}" aria-label="手机显示日期" readonly><label>游戏时间</label><input name="clock" type="time" value="${s.clock}" required><label>剧情天数</label><input name="day" type="number" min="1" max="90" value="${s.day}" required><button class="button-primary wide" type="submit">跳转时间并触发途经的定时消息</button></form><div class="section-heading">主动消息排查 · ${rules.length} 条规则</div><p class="editor-help">向前跳日会自动补齐经过的定时主动消息，并保留消息的原始日期。需要玩家发言的条件消息不会凭空触发。</p>${rules.map(r=>`<div class="editor-trigger-row"><b>${ruleDate(r)} ${esc(r.from)} · ${esc(r.title)}</b><small>${esc(r.channel)} / ${esc(r.conversationId)} · ${r.mode==='scheduled'?'定时':'条件'}</small><span>${esc(stageText(s,r))}</span></div>`).join('')||'<p class="editor-help">暂无主动消息，请先在「剧情预设」导入或创建。</p>'}${btn('editor-preview-replay','核对并补齐截至当前日期的定时消息','button-quiet wide')}<div class="section-heading">重大剧情 · 暂停充电</div><form data-form="charge-gate"><label>剧情天数</label><input name="day" type="number" min="1" max="89" value="${Math.min(89,s.day)}" required><label>完成标记</label><input name="flag" placeholder="day-57-complete" required><button class="button-primary wide" type="submit">保存</button></form><p class="editor-help">完成标记生效后才可充电跳日。第 90 天禁止充电。</p>${(s.storyChargeGates||[]).map(g=>`<div class="card">D${g.day} · ${esc(g.untilFlag)} ${btn('remove-charge-gate','删除','text-button',`data-day="${g.day}"`)}</div>`).join('')}${btn('export-content','导出全部本机内容','button-quiet wide')}</div>`;}


export function updateTimelinePreview(input){
 if(input.name!=='day'||input.closest('form')?.dataset.form!=='preview')return;
 const panel=input.closest('.editor-panel'),day=Number(input.value);
 if(!Number.isSafeInteger(day)||day<1){input.setCustomValidity('请输入有效的剧情天数');return;}
 input.setCustomValidity('');const value=storyDay(day);
 panel.querySelector('[data-preview-date]').value=value.iso;
 panel.querySelector('[data-preview-date-label]').textContent=value.label;
 panel.querySelector('[data-preview-countdown]').textContent=`距离 BIG DAY 还有 ${value.remaining} 天`;
}
