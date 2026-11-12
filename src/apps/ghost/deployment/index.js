import {esc} from '../../../system/ui.js';
import {story55Config,nodeStatus,projectById,completed} from '../../../services/story55/state.js';
import {deployment,deploymentPercent,deploymentReadiness,baseUpgradeCost} from '../../../services/story55/projects.js';
import {renderFlowD03} from '../features/flow-d03/index.js';
import {ghostShareSource} from '../../../services/story55/ghost-share.js';
const b=(a,t,attrs='')=>`<button type="button" class="s55-button" data-action="s55-${a}" ${attrs}>${t}</button>`;
// The D03 scanner and the D14 framework are entries in the SAME GHOST
// Projects list. Do not introduce a second story-themed project dashboard.
export function deploymentHome(s){return renderFlowD03(s,{route:'/flow-projects',params:{}});}

function baseView(s,p){
 const r=deployment(s,'base'),percent=deploymentPercent(s,'base'),ready=deploymentReadiness(s,'base'),
  first=r.batches?.[0],current=r.batches?.[ready.batch],
  today=r.batches?.find(batch=>batch?.testedDay===s.day),
  tested=Math.min(5,(today?.steps||current?.steps||[]).filter(Boolean).length),
  loan=completed(s,'loan'),finished=completed(s,'base'),
  failed=!!first?.runFailed,showFailure=!!r.baseRunNoticePending,
  cost=baseUpgradeCost(s),
  canUpgrade=ready.canUpgrade&&s.bankData.balance>=cost;
 const state=finished?'已完成':
   !first?.complete?'已部署':
   !loan?'运行失败':
   ready.canUpgrade?'待升级':'运行中';
 const modal=showFailure?`<div class="gh-flow-overlay" role="presentation"><section class="gh-flow-dialog" role="alertdialog" aria-modal="true" aria-label="基础框架运行结果"><h2>部署成功！运行失败！</h2><p>错误代码：${esc(p.runtimeErrorCode||'E-ENV-014')}</p><div class="gh-flow-dialog-actions"><button type="button" class="gh-button gh-primary" data-action="s55-base-dismiss-report">确定</button></div></section></div>`:'';
 return `<div class="gh-shell gh-flow-shell gh-fw-shell" data-view-key="ghost-framework-base">
 <div class="gh-top">
  <button type="button" class="gh-button gh-back" data-action="s55-projects" aria-label="返回项目">‹</button>
  <span>GHOST / 项目</span>${ghostShareSource(s,{projectId:'base'})?'<button type="button" class="gh-button gh-share-button" data-action="gh-share" data-project="base" aria-label="分享至 MIRAGE" title="分享至 MIRAGE">↗</button>':'<span>●</span>'}
 </div>
 <h1>${esc(p.title)}</h1>
 <section class="gh-fw-ledger" aria-label="基础框架状态">
  <div class="gh-fw-line"><span>部署</span><strong>${percent}%</strong></div>
  <div class="gh-meter"><i style="width:${percent}%"></i></div>
  <div class="gh-fw-status">${state}${failed&&!loan?' · '+esc(p.runtimeErrorCode||'E-ENV-014'):''}</div>
 </section>
 <section class="gh-fw-actions" aria-label="项目操作">
  <div class="gh-fw-line"><span>链接</span><strong>${tested} / 5</strong></div>
  ${!finished&&ready.canStart?`<button type="button" class="gh-button gh-fw-button" data-action="s55-run-step" data-project="base">链接测试<span>›</span></button>`:''}
  ${loan&&ready.batch>0&&!finished?`
  <div class="gh-fw-line gh-fw-upgrade"><span>设备更新</span><strong>US$${cost.toLocaleString('en-US')}</strong></div>
  <button type="button" class="gh-button gh-fw-button" data-action="s55-base-upgrade" data-project="base" ${canUpgrade?'':'disabled aria-disabled="true"'}>升级<span>›</span></button>`:''}
 </section>
 ${modal}
 </div>`;
}
export function deploymentView(s,id){
 const p=projectById(s,id);if(!p)return deploymentHome(s);
 if(id==='base')return baseView(s,p);
 const r=deployment(s,id),percent=deploymentPercent(s,id),status=nodeStatus(s,p.node),readiness=deploymentReadiness(s,id),
 batch=r.batches.find(b=>!b.complete),index=batch?r.batches.indexOf(batch):r.batches.length;
 return `<div class="s55 s55-dark"><nav>${b('projects','‹ 部署任务')}<small>本地 / ${esc(p.id.toUpperCase())}</small>${ghostShareSource(s,{projectId:p.id})?`<button type="button" class="gh-button gh-share-button" data-action="gh-share" data-project="${esc(p.id)}" aria-label="分享至 MIRAGE">↗</button>`:''}</nav><h1>${esc(p.title)}</h1><div class="s55-card"><strong class="s55-percent">${percent}%</strong><div class="s55-meter"><i style="width:${percent}%"></i></div><p>${r.batches.filter(b=>b.complete).length} / ${p.batches} 組已驗收 · ${esc(readiness.reason)}</p>${(p.streams||[]).map(x=>`<div class="s55-stream"><span>${x}</span><b>${percent}%</b></div>`).join('')}</div>${!r.authorized&&status.state==='ready'?`<form data-form="s55-authorize" class="s55-card"><input type="hidden" name="project" value="${p.id}"><label>授权密钥<input name="key" required maxlength="80" autocomplete="off" placeholder="从 KIRA / 文件获取密钥"></label><button class="s55-button" type="submit">部署</button></form>`:''}${r.authorized&&status.state==='ready'?`<div class="s55-card"><small>本地程序 ${Math.min(index+1,p.batches)} / ${p.batches}</small><ol class="s55-steps">${p.steps.map((t,i)=>`<li class="${batch?.steps[i]?'done':''}"><span>${batch?.steps[i]?'✓':i+1}</span><b>${({cipher:'破译',route:'链接',extract:'窃取',veil:'隐匿',verify:'验证',strike:'攻击'})[t]||t}</b></li>`).join('')}</ol><p>设备等级 ${s.story55.hardware} / 所需等级 ${p.minimumHardware}</p><p class="s55-runtime-status" role="status">${esc(readiness.reason)}</p>${b('run-step',r.active?'繼續目前工具':'執行下一項工具',`data-project="${p.id}" ${readiness.canStart?'':'disabled aria-disabled="true"'}`)}${b('upgrade','升级设备')}</div>`:''}${status.state==='done'?'<p>已验证 · 报告已保存到文件</p>':''}</div>`;
}
