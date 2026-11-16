import {esc} from '../../../system/ui.js';
import {nodeStatus,projectById,completed} from '../../../services/story55/state.js';
import {deployment,deploymentPercent,deploymentReadiness,baseUpgradeCost} from '../../../services/story55/projects.js';
import {renderFlowD03} from '../features/flow-d03/index.js';
import {ghostShareSource} from '../../../services/story55/ghost-share.js';
import {tearDeployed} from './tear-run.js';
import {deploymentHeader,deploymentHero,deploymentRows,deviceButton,motionToken} from './motion/view.js';
const primary=(action,label,attrs='')=>`<button type="button" class="gh-deploy-primary" data-action="${action}" ${attrs}>${label}</button>`;
const share=(s,id)=>ghostShareSource(s,{projectId:id})?`<button type="button" class="gh-button gh-share-button" data-action="gh-share" data-project="${esc(id)}" aria-label="分享至 MIRAGE" title="分享至 MIRAGE">↗</button>`:'';
// The D03 scanner and the D14 framework are entries in the SAME GHOST Projects list.
export function deploymentHome(s){return renderFlowD03(s,{route:'/flow-projects',params:{}});}

function baseView(s,p){
 const r=deployment(s,'base'),percent=deploymentPercent(s,'base'),ready=deploymentReadiness(s,'base'),
  first=r.batches?.[0],current=r.batches?.[ready.batch],
  today=r.batches?.find(batch=>batch?.testedDay===s.day),
  tested=Math.min(5,(today?.steps||current?.steps||[]).filter(Boolean).length),
  loan=completed(s,'loan'),finished=completed(s,'base'),
  failed=!!first?.runFailed,showFailure=!!r.baseRunNoticePending,
  cost=baseUpgradeCost(s),canUpgrade=ready.canUpgrade&&s.bankData.balance>=cost;
 const state=finished?'已完成':!first?.complete?'已部署':!loan?'运行失败':ready.canUpgrade?'待升级':'运行中';
 const modal=showFailure&&s.day===14?`<div class="gh-flow-overlay" role="presentation"><section class="gh-flow-dialog" role="alertdialog" aria-modal="true" aria-label="基础框架运行结果"><h2>部署成功！运行失败！</h2><p>错误代码：${esc(p.runtimeErrorCode||'E-ENV-014')}</p><div class="gh-flow-dialog-actions"><button type="button" class="gh-button gh-primary" data-action="s55-base-dismiss-report">确定</button></div></section></div>`:'';
 const visibleBatch=today||current||(finished?r.batches?.at(-1):null);
 const status=state+(failed&&!loan?' · '+(p.runtimeErrorCode||'E-ENV-014'):'');
 return `<div class="gh-shell gh-flow-shell gh-fw-shell gh-deploy-screen" data-view-key="ghost-framework-base">
 ${deploymentHeader(s,share(s,'base'))}
 ${deploymentHero({id:'base',title:p.title,status,percent,count:finished?5:tested,total:5,token:motionToken(r,percent),tone:failed&&!loan?'failed':ready.canUpgrade?'blocked':'ready'})}
 ${deploymentRows(p.steps,visibleBatch,{ready:ready.canStart,running:!!r.active,prefix:true})}
 ${loan&&ready.batch>0&&!finished?`<div class="gh-deploy-meta">設備更新 · US$${cost.toLocaleString('en-US')}</div>`:''}
 <div class="gh-deploy-bottom">
 ${tearDeployed(s)?primary('gh-tear-open','啟動 Ouroboros’ Tear'):ready.canStart?primary('s55-run-step',r.active?'繼續鏈接測試':'鏈接測試','data-project="base"'):ready.canUpgrade?primary('s55-base-upgrade','升級設備',`data-project="base" ${canUpgrade?'':'disabled aria-disabled="true"'}`):primary('s55-run-step','等待下一次鏈接','disabled aria-disabled="true"')}
 ${loan&&ready.batch>0&&!finished&&!ready.canUpgrade?deviceButton('s55-base-upgrade',`data-project="base" ${canUpgrade?'':'disabled aria-disabled="true"'}`):''}
 </div>
 ${modal}
 </div>`;
}
export function deploymentView(s,id){
 const p=projectById(s,id);if(!p)return deploymentHome(s);
 if(id==='base')return baseView(s,p);
 const r=deployment(s,id),percent=deploymentPercent(s,id),status=nodeStatus(s,p.node),readiness=deploymentReadiness(s,id),
 batch=r.batches.find(b=>!b.complete),index=batch?r.batches.indexOf(batch):r.batches.length,
 visibleBatch=batch||(status.state==='done'?r.batches.at(-1):null),
 count=p.steps.filter((_,i)=>!!visibleBatch?.steps?.[i]).length,
 stepPercent=status.state==='done'?100:Math.floor(count/Math.max(1,p.steps.length)*100),
 state=status.state==='done'?'本地程序 · 已完成':!r.authorized?'尚未取得授權':!readiness.canStart?'本地程序 · 等待':r.active?'本地程序 · 運行中':'本地程序 · 就緒';
 return `<div class="gh-shell gh-deploy-screen" data-view-key="ghost-deploy-${esc(id)}">
 ${deploymentHeader(s,share(s,id))}
 ${deploymentHero({id,title:p.title,status:state,percent:stepPercent,count,total:p.steps.length,token:motionToken(r,percent),detail:p.batches>1?`總部署 ${percent}% · ${r.batches.filter(b=>b.complete).length} / ${p.batches} 組已驗收`:'',tone:!readiness.canStart&&status.state!=='done'?'blocked':'ready'})}
 ${deploymentRows(p.steps,visibleBatch,{ready:readiness.canStart,running:!!r.active})}
 ${(p.streams||[]).map(x=>`<div class="gh-deploy-meta">${esc(x)} · ${percent}%</div>`).join('')}
 ${!r.authorized&&status.state==='ready'?`<form data-form="s55-authorize" class="gh-deploy-authorize"><input type="hidden" name="project" value="${esc(p.id)}"><label>授權密鑰<input name="key" required maxlength="80" autocomplete="off" placeholder="從 KIRA / 檔案取得密鑰"></label><button class="gh-deploy-primary" type="submit">部署</button></form>`:''}
 ${r.authorized&&status.state==='ready'?`<div class="gh-deploy-meta">本地程序 ${Math.min(index+1,p.batches)} / ${p.batches} · 設備等級 ${s.story55.hardware||1} / 所需等級 ${p.minimumHardware}<p class="s55-runtime-status" role="status">${esc(readiness.reason)}</p></div>
 <div class="gh-deploy-bottom">${primary('s55-run-step','繼續執行',`data-project="${esc(p.id)}" ${readiness.canStart?'':'disabled aria-disabled="true"'}`)}${deviceButton('s55-upgrade')}</div>`:''}
 ${status.state==='done'&&id!=='identity'?'<p class="gh-deploy-meta">已驗證 · 報告已保存到檔案</p>':''}
 </div>`;
}
