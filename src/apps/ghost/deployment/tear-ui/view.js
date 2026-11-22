import {esc} from '../../../../system/ui.js';
import {renderAgentContent} from '../tear-agent/view.js';
import {agent,agentFiles,tearTaskInfo,identityRevealPending} from '../tear-agent/state.js';
import {TEAR_STAGES} from '../../../../story/d25/tear-agent.js';
import {completed} from '../../../../services/story55/state.js';
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
// A square stage keeps both the canvas and ring in one coordinate space.
const TASK_POSITIONS=Object.fromEntries(['survey','maintenance','staff','validation','program'].map((id,i)=>{
 const angle=-Math.PI/2+i*Math.PI*2/5;
 return [id,[50+44*Math.cos(angle),50+44*Math.sin(angle)]];
}));
TASK_POSITIONS.identity=[50,94];
TASK_POSITIONS['personal-files']=[80,17];
TASK_POSITIONS['archive-password']=[20,17];
const TASK_DESCRIPTIONS={
 survey:'分析設備資料、建立研究模型並啟動持續測試。',
 maintenance:'比對新的維保記錄，更新研究模型。',
 staff:'核對胡楓與阿威的安保人員資料。',
 validation:'使用接入的設備驗證此前的研究結果。',
 program:'整理 BC_01 專案需求，執行模擬測試並封裝結果。',
 identity:'核對既有連線記錄，整理可讀取的資料索引。',
 'personal-files':'',
 'archive-password':'嘗試破譯加密文件。'
};
const pad=n=>String(n).padStart(2,'0');
function durationLabel(minutes){
 const mins=Math.max(0,Math.floor(minutes||0)),days=Math.floor(mins/1440),hours=Math.floor(mins%1440/60),rest=mins%60;
 return days?`${days}天 ${pad(hours)}:${pad(rest)}`:`${pad(hours)}:${pad(rest)}`;
}
function taskMarkers(s){
 const a=agent(s);
 const ids=[...new Set([...Object.keys(TASK_POSITIONS),...Object.keys(a.jobs)])].filter(id=>{
  const info=tearTaskInfo(s,id);return info&&!(id==='personal-files'&&info.running)&&!(id==='identity'&&identityRevealPending(s));
 });
 const hasDocuments=ids.some(id=>!TASK_POSITIONS[id]);
 return ids.map((id,index)=>{
  const info=tearTaskInfo(s,id),angle=-Math.PI/2+index*Math.PI*2/ids.length,pos=hasDocuments?[50+44*Math.cos(angle),50+44*Math.sin(angle)]:TASK_POSITIONS[id];
  const selected=a.selectedTask===id,accepted=info.complete&&!!(a.acceptedTasks?.[id]||a.collectedArtifacts?.[id]),cls=info.running?'is-running':accepted?'is-accepted':'is-complete';
  return `<button type="button" class="gh-agent-task-dot ${cls}${selected?' is-selected':''}" style="left:${pos[0]}%;top:${pos[1]}%" data-action="gh-tear-task" data-id="${esc(id)}" aria-label="${esc(info.title)}，${info.running?'處理中':accepted?'已驗收':'已完成'}，${info.percent}%" aria-pressed="${selected}"><span aria-hidden="true"></span></button>`;
 }).join('');
}
function taskDetail(s){
 const id=agent(s).selectedTask,definition=TEAR_STAGES[id],info=id&&tearTaskInfo(s,id);
 if(!info)return '';
 if(info.document&&info.complete&&agent(s).documentReading)return `<section class="gh-agent-document" role="dialog" aria-modal="true" aria-label="完整解析結果" data-key="tear-document-result"><header><button type="button" data-action="gh-tear-task-close" aria-label="返回">${backIcon}</button><div><strong>${esc(info.title)}</strong><small>解析完成 · 100%</small></div><span aria-hidden="true">✓</span></header><article class="gh-agent-document-body" tabindex="0">${esc(agent(s).jobs[id].text)}</article><footer>END OF DOCUMENT</footer></section>`;
 const artifact=info.complete&&definition?.artifact?agentFiles(s).find(f=>f.id==='tear-artifact-'+id):null,collected=!!agent(s).collectedArtifacts?.[id];
 return `<div class="gh-agent-task-backdrop" data-key="tear-task-backdrop" data-action="gh-tear-task-close" aria-hidden="true"></div><aside class="gh-agent-task-detail" role="dialog" aria-modal="true" aria-label="任務詳情" data-key="tear-task-detail">
  <header><div><span>${esc(info.title)}</span><strong class="${info.running?'is-running':'is-complete'}">${esc(info.status)}</strong></div><button type="button" data-action="gh-tear-task-close" aria-label="關閉任務詳情">×</button></header>
  ${TASK_DESCRIPTIONS[id]?'<p>'+esc(TASK_DESCRIPTIONS[id])+'</p>':''}
  <div class="gh-agent-task-metrics"><div><span>運行時間</span><strong>${info.document?info.elapsedSeconds+' 秒':durationLabel(info.elapsedMinutes)}</strong></div><div><span>完成進度</span><strong>${info.percent}%</strong></div></div>
  <div class="gh-agent-task-progress" role="progressbar" aria-label="任務完成進度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${info.percent}"><i style="width:${info.percent}%"></i></div>
  ${info.document&&info.complete?`<button type="button" class="gh-agent-pickup" data-action="gh-tear-document-read" data-id="${esc(id)}">${fileIcon}<span><strong>查看完整解析結果</strong><small>${esc(info.title)}</small></span>${arrowIcon}</button>`:''}
  ${id==='identity'&&info.complete?`<button type="button" class="gh-agent-pickup" data-action="gh-tear-identity" ${agent(s).archiveRun||completed(s,'identity')&&s.day<33?'disabled':''}>${fileIcon}<span><strong>REMOTE ARCHIVE</strong><small>${completed(s,'identity')?(agent(s).archiveRun?'已啟動':s.day<33?'明日啟動':'啟動'):'查看部署'}</small></span>${arrowIcon}</button>`:id==='personal-files'&&info.complete?`<button type="button" class="gh-agent-pickup" data-action="gh-tear-archive-save"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h7l2 3h9v11H3z"/></svg><span><strong>Personal Files</strong><small>${agentFiles(s).some(f=>f.id==='personal-files')?'已存入本機 · 開啟':'存入本機'}</small></span>↓</button>`:artifact?`<button type="button" class="gh-agent-pickup${collected?' is-collected':''}" data-action="gh-tear-${collected?'artifact':'collect'}" data-id="${esc(collected?artifact.id:id)}">${fileIcon}<span><strong>${esc(artifact.name)}</strong><small>${collected?'已領取 · 查看檔案':'領取檔案'}</small></span>${collected?arrowIcon:'↓'}</button>`:''}
 </aside>`;
}
export function renderTearAgent(s){
 ensureTearOrbit();const {working,hasDialogue,content}=renderAgentContent(s),a=agent(s);
 const expanded=!hasDialogue&&!a.picking&&!a.selected&&!a.draft;
 const progress=Math.max(0,Math.min(1,Number(a.visualProgress)||0));
 const complete=!!a.visualTaskIds?.length&&a.visualTaskIds.every(id=>tearTaskInfo(s,id)?.complete);
 const status=identityRevealPending(s)?'running':complete&&progress===1?'complete':working?'running':'idle';
 return `<section class="gh-tear-screen gh-agent-screen${expanded?' is-expanded':''}" data-visual-mode="${expanded?'expanded':'conversation'}" data-view-key="ghost-tear-agent" aria-label="Ouroboros’ Tear">
 <header class="gh-tear-header"><button type="button" class="gh-tear-icon" data-action="gh-tear-back" aria-label="返回項目">${backIcon}</button><span class="gh-agent-wordmark">Ouroboros’ Tear<small>Α · Ω / TAI</small></span><button type="button" class="gh-tear-icon gh-agent-history-toggle" data-action="gh-tear-history" aria-label="查看本次聊天紀錄" aria-expanded="${!!a.history}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h10"/></svg></button></header>
 <div class="gh-agent-orbit"><xm-tear-stage class="gh-agent-visual" expanded="${expanded?1:0}"><xm-tear-orbit data-key="agent-orbit-${a.chatSession||0}" layout="agent" status="${status}" progress="${progress}" attention="${a.draft?1:0}" aria-hidden="true"></xm-tear-orbit><svg class="gh-agent-ring-graphic" viewBox="0 0 400 400" aria-hidden="true"><circle cx="200" cy="200" r="176" class="gh-agent-ring-ticks"/><circle cx="200" cy="200" r="176" class="gh-agent-ring-sweep"/></svg><div class="gh-agent-task-ring" role="group" aria-label="研究工程">${taskMarkers(s)}</div></xm-tear-stage></div>
 ${taskDetail(s)}${content}</section>`;
}
