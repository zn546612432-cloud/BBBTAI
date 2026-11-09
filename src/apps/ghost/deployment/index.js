import {esc} from '../../../system/ui.js';
import {story55Config,nodeStatus,projectById,completed} from '../../../services/story55/state.js';
import {deployment,deploymentPercent,deploymentReadiness,baseUpgradeCost} from '../../../services/story55/projects.js';
const b=(a,t,attrs='')=>`<button type="button" class="s55-button" data-action="s55-${a}" ${attrs}>${t}</button>`;
export function deploymentHome(s){
 const c=story55Config(s),list=c.projects.filter(p=>p.id!=='wallet'&&s.day>=p.day&&(p.id!=='base'||deployment(s,'base').authorized));
 return `<div class="s55 s55-dark"><small>GHOST / 項目</small><h1>項目</h1>${s.day>=25?`<div class="s55-hardware"><b>設備等級 ${s.story55.hardware}</b>${b('upgrade','升級設備')}</div>`:''}${list.map(p=>{
  const percent=deploymentPercent(s,p.id),readiness=deploymentReadiness(s,p.id);
  return `<article class="s55-card"><h2>${esc(p.title)}</h2><div class="s55-meter"><i style="width:${percent}%"></i></div><strong>${percent}%</strong><p>${esc(readiness.reason)}</p>${b('project','打開',`data-project="${esc(p.id)}"`)}</article>`;
 }).join('')||'<p>暂无已部署项目。请先在「01 部署」输入授权密钥。</p>'}</div>`;
}
function baseView(s,p){
 const r=deployment(s,'base'),percent=deploymentPercent(s,'base'),ready=deploymentReadiness(s,'base');
 const initial=r.batches?.[0],bNow=r.batches?.[ready.batch];
 const tested=Math.min(5,(bNow?.steps||[]).filter(Boolean).length);
 const loan=completed(s,'loan');
 const failure=initial?.runFailed&&!r.batches?.slice(1).some(b=>b?.complete);
 const status=completed(s,'base')?'程序已完成':!initial?.complete?'准备首次运行':!loan?'已部署 · 运行环境异常':ready.canUpgrade?'测试完成 · 待升级':ready.reason;
 return `<div class="s55 s55-dark">
   <nav>${b('projects','‹ 項目')}<small>GHOST / 本地程序</small></nav>
   <h1>${esc(p.title)}</h1>
   <article class="s55-card"><small>${esc(status)}</small><strong class="s55-percent">${percent}%</strong>
    <div class="s55-meter"><i style="width:${percent}%"></i></div>
    <p>累计完成 ${r.batches?.reduce((sum,b)=>sum+(b?.steps||[]).filter(Boolean).length,0)||0} 次链接测试</p>
   </article>
   ${failure?`<article class="s55-card" role="status"><strong>错误代码：${esc(p.runtimeErrorCode||'E-ENV-014')}</strong><p>部署成功！运行失败！</p><small>现有设备无法启动基础框架，程序与测试记录已保留。</small></article>`:''}
   ${!completed(s,'base')?`<article class="s55-card">
    <h2>链接测试</h2><p>本轮已完成 ${tested} / 5</p>
    <p class="s55-runtime-status" role="status">${esc(ready.reason)}</p>
    ${b('run-step','执行链接测试',`data-project="base" ${ready.canStart?'':'disabled aria-disabled="true"'}`)}
    ${loan&&ready.batch>0?`<p>设备升级：五次链接测试 + US$${baseUpgradeCost(s).toLocaleString('en-US')}</p>
       ${b('base-upgrade','升级',`data-project="base" ${ready.canUpgrade&&s.bankData.balance>=baseUpgradeCost(s)?'':'disabled aria-disabled="true"'}`)}
       ${ready.canUpgrade&&s.bankData.balance<baseUpgradeCost(s)?'<small>银行余额不足，完成委托或兑换资产后再升级。</small>':''}`:''}
   </article>`:'<article class="s55-card"><h2>程序已完成</h2><p>已完成全部链接测试和升级。</p></article>'}
  </div>`;
}
export function deploymentView(s,id){
 const p=projectById(s,id);if(!p)return deploymentHome(s);
 if(id==='base')return baseView(s,p);
 const r=deployment(s,id),percent=deploymentPercent(s,id),status=nodeStatus(s,p.node),readiness=deploymentReadiness(s,id),
 batch=r.batches.find(b=>!b.complete),index=batch?r.batches.indexOf(batch):r.batches.length;
 return `<div class="s55 s55-dark"><nav>${b('projects','‹ 部署任务')}<small>本地 / ${esc(p.id.toUpperCase())}</small></nav><h1>${esc(p.title)}</h1><div class="s55-card"><strong class="s55-percent">${percent}%</strong><div class="s55-meter"><i style="width:${percent}%"></i></div><p>${r.batches.filter(b=>b.complete).length} / ${p.batches} 組已驗收 · ${esc(readiness.reason)}</p>${(p.streams||[]).map(x=>`<div class="s55-stream"><span>${x}</span><b>${percent}%</b></div>`).join('')}</div>${!r.authorized&&status.state==='ready'?`<form data-form="s55-authorize" class="s55-card"><input type="hidden" name="project" value="${p.id}"><label>授权密钥<input name="key" required maxlength="80" autocomplete="off" placeholder="从 KIRA / 文件获取密钥"></label><button class="s55-button" type="submit">部署</button></form>`:''}${r.authorized&&status.state==='ready'?`<div class="s55-card"><small>本地程序 ${Math.min(index+1,p.batches)} / ${p.batches}</small><ol class="s55-steps">${p.steps.map((t,i)=>`<li class="${batch?.steps[i]?'done':''}"><span>${batch?.steps[i]?'✓':i+1}</span><b>${({cipher:'破译',route:'链接',extract:'窃取',veil:'隐匿',verify:'验证',strike:'攻击'})[t]||t}</b></li>`).join('')}</ol><p>设备等级 ${s.story55.hardware} / 所需等级 ${p.minimumHardware}</p><p class="s55-runtime-status" role="status">${esc(readiness.reason)}</p>${b('run-step',r.active?'繼續目前工具':'執行下一項工具',`data-project="${p.id}" ${readiness.canStart?'':'disabled aria-disabled="true"'}`)}${b('upgrade','升级设备')}</div>`:''}${status.state==='done'?'<p>已验证 · 报告已保存到文件</p>':''}</div>`;
}
