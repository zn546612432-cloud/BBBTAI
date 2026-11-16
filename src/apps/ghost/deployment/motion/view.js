import {esc} from '../../../../system/ui.js';

let loading;
function ensureMotion(){
 if(typeof customElements==='undefined'||customElements.get('xm-ghost-deploy-motion'))return;
 loading??=import('./element.js').catch(error=>{loading=null;console.error('Ghost field unavailable',error);});
}
const label={cipher:'破譯',route:'鏈接',extract:'竊取',veil:'隱匿',verify:'驗證',strike:'攻擊'};
const devices='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3.5" width="18" height="13" rx="2"/><path d="M2 20h20"/></svg>';
const back='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg>';
export function deviceButton(action,attrs='',caption='設備'){
 return `<button type="button" class="gh-deploy-device" data-action="${action}" ${attrs}>${devices}<span>${caption}</span></button>`;
}
export function deploymentHeader(s,share){
 return `<nav class="gh-deploy-nav"><button type="button" data-action="s55-projects" aria-label="返回項目">${back}</button><span>Ghost</span>${share||'<span aria-hidden="true"></span>'}</nav>`;
}
export function deploymentHero({id,title,status,percent,count,total,token,detail='',tone='ready'}){
 ensureMotion();
 return `<section class="gh-deploy-hero" data-key="deploy-hero-${esc(id)}">
 <xm-ghost-deploy-motion class="gh-deploy-field" data-key="deploy-field-${esc(id)}" project="${esc(id)}" token="${token}" aria-hidden="true"></xm-ghost-deploy-motion>
 <div class="gh-deploy-title"><h1>部署</h1><p class="gh-deploy-status" data-tone="${tone}"><i></i>${esc(status)}</p><small>${esc(title)}</small></div>
 <div class="gh-deploy-progress" role="status" aria-label="部署進度"><strong>${Math.floor(percent)}<span>%</span></strong>${total?`<small>${count} / ${total} 已完成</small>`:''}${detail?`<small>${esc(detail)}</small>`:''}</div>
 </section>`;
}
export function deploymentRows(steps,batch,{running=false,ready=false,prefix=false}={}){
 const next=steps.findIndex((_,i)=>!batch?.steps?.[i]);
 return `<ol class="gh-deploy-steps" aria-label="本地程序步驟">${steps.map((type,i)=>{
 const done=!!batch?.steps?.[i],active=i===next&&(ready||running),state=done?'done':active?'active':'waiting';
 return `<li class="${state}" data-key="deploy-step-${i}"><span class="gh-step-number">${String(i+1).padStart(2,'0')}</span><i aria-hidden="true">${done?'✓':''}</i><b>${esc(prefix?label[type]+' '+String(i+1).padStart(2,'0'):label[type]||type)}</b><small>${done?'已完成':active?(running?'執行中…':'待執行'):'待執行'}</small></li>`;
 }).join('')}</ol>`;
}
// A receipt count is presentation-only and can also be compared after returning
// from the existing GHOST runner. Upgrades increment the committed percentage.
export function motionToken(r,percent){
 return (r.batches||[]).reduce((sum,b)=>sum+(b?.steps||[]).filter(Boolean).length,0)*101+Math.floor(percent);
}
