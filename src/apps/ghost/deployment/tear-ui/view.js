import {esc} from '../../../../system/ui.js';
import {renderAgentContent} from '../tear-agent/view.js';
import {agent,tearTaskInfo} from '../tear-agent/state.js';
import {TEAR_STAGES} from '../../../../story/d25/tear-agent.js';
let loading;
function ensureTearOrbit(){
 if(typeof window==='undefined'||typeof customElements==='undefined'||customElements.get('xm-tear-orbit'))return;
 loading??=import('./element.js').catch(error=>{loading=null;console.error('Ouroboros visual unavailable',error);});
}
const backIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg>';
const arrowIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
const fileIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h4"/></svg>';
export function renderTearOrbit({id,title,status,index,count}){
 ensureTearOrbit();
 const done=status==='complete',failed=status==='failed',progress=done?1:Math.max(0,Math.min(.99,index/Math.max(1,count)));
 const idle=status==='idle',label=idle?'待機':done?'執行完成 · 待提交':failed?'執行中止':'執行中';
 const key='ghost-tear-'+id;
 return `<section class="gh-tear-screen" data-view-key="${esc(key)}" data-tear-status="${esc(status)}" aria-label="Ouroboros’ Tear">
 <xm-tear-orbit data-key="${esc(key)}-orbit" status="${esc(status)}" progress="${progress}" aria-hidden="true"></xm-tear-orbit>
 <header class="gh-tear-header"><button type="button" class="gh-tear-icon" data-action="${idle?'gh-tear-back':'gh-tear-return'}" data-id="${esc(id)}" aria-label="${idle?'返回項目':'返回 MIRAGE'}">${backIcon}</button><span>OUROBOROS</span><i aria-hidden="true"></i></header>
 <span class="gh-tear-sr" role="status">${esc(label)}${idle?'':` ${Math.min(count,index)} / ${count}`}</span>
 ${done||failed?`<section class="gh-tear-result" aria-label="執行結果"><span class="gh-tear-result-mark" aria-hidden="true">${done?'✓':'×'}</span><p>${esc(title)}</p><small>${esc(label)}</small></section>`:''}
 <footer class="gh-tear-dock"><div class="gh-tear-package">${fileIcon}<span title="${esc(title)}">${esc(title)}</span>${done||failed?`<button type="button" class="gh-tear-return" data-action="gh-tear-return" data-id="${esc(id)}" aria-label="返回 MIRAGE">${arrowIcon}</button>`:'<i class="gh-tear-pulse" aria-hidden="true"></i>'}</div></footer>
 </section>`;
}
const TASK_POSITIONS={survey:[50,5.5],maintenance:[74.5,32.7],staff:[65,76.4],validation:[35,76.4],program:[25.5,32.7]};
const TASK_DESCRIPTIONS={
 survey:'分析設備資料、建立研究模型並啟動持續測試。',
 maintenance:'比對新的維保記錄，更新研究模型。',
 staff:'核對胡楓與阿威的安保人員資料。',
 validation:'使用接入的設備驗證此前的研究結果。',
 program:'整理 BC_01 專案需求，執行模擬測試並封裝結果。'
};
const pad=n=>String(n).padStart(2,'0');
function durationLabel(minutes){
 const mins=Math.max(0,Math.floor(minutes||0)),days=Math.floor(mins/1440),hours=Math.floor(mins%1440/60),rest=mins%60;
 return days?`${days}天 ${pad(hours)}:${pad(rest)}`:`${pad(hours)}:${pad(rest)}`;
}
function taskMarkers(s){
 const a=agent(s);
 return Object.keys(TASK_POSITIONS).filter(id=>a.jobs?.[id]&&TEAR_STAGES[id]).map(id=>{
  const info=tearTaskInfo(s,id),pos=TASK_POSITIONS[id];
  if(!info)return '';
  const selected=a.selectedTask===id,cls=info.running?'is-running':'is-complete';
  return `<button type="button" class="gh-agent-task-dot ${cls}${selected?' is-selected':''}" style="left:${pos[0]}%;top:${pos[1]}%" data-action="gh-tear-task" data-id="${id}" aria-label="${TEAR_STAGES[id].title}，${info.status}，${info.percent}%" aria-pressed="${selected}"><span aria-hidden="true"></span></button>`;
 }).join('');
}
function taskDetail(s){
 const id=agent(s).selectedTask,definition=TEAR_STAGES[id],info=id&&tearTaskInfo(s,id);
 if(!definition||!info)return '';
 return `<aside class="gh-agent-task-detail" role="dialog" aria-label="任務詳情">
  <header><div><span>${esc(definition.title)}</span><strong class="${info.running?'is-running':'is-complete'}">${esc(info.status)}</strong></div><button type="button" data-action="gh-tear-task-close" aria-label="關閉任務詳情">×</button></header>
  <p>${esc(TASK_DESCRIPTIONS[id]||definition.title)}</p>
  <div class="gh-agent-task-metrics"><div><span>運行時間</span><strong>${durationLabel(info.elapsedMinutes)}</strong></div><div><span>完成進度</span><strong>${info.percent}%</strong></div></div>
  <div class="gh-agent-task-progress" role="progressbar" aria-label="任務完成進度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${info.percent}"><i style="width:${info.percent}%"></i></div>
 </aside>`;
}
export function renderTearAgent(s){
 ensureTearOrbit();const {working,content}=renderAgentContent(s),a=agent(s);
 const progress=Math.max(0,Math.min(1,Number(a.visualProgress)||0));
 const status=progress>=.999?'complete':working?'running':'idle';
 return `<section class="gh-tear-screen gh-agent-screen" data-view-key="ghost-tear-agent" aria-label="Ouroboros’ Tear">
 <header class="gh-tear-header"><button type="button" class="gh-tear-icon" data-action="gh-tear-back" aria-label="返回項目">${backIcon}</button><span>OUROBOROS</span><i aria-hidden="true"></i></header>
 <div class="gh-agent-orbit"><xm-tear-orbit data-key="agent-orbit" status="${status}" progress="${progress}" aria-hidden="true"></xm-tear-orbit><div class="gh-agent-task-ring" role="group" aria-label="執行中的任務">${taskMarkers(s)}</div></div>
 ${taskDetail(s)}${content}</section>`;
}
