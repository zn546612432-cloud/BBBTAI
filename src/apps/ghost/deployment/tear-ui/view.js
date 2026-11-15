import {esc} from '../../../../system/ui.js';
import {renderAgentContent} from '../tear-agent/view.js';
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
export function renderTearAgent(s){
 ensureTearOrbit();const {working,content}=renderAgentContent(s);
 return `<section class="gh-tear-screen gh-agent-screen" data-view-key="ghost-tear-agent" aria-label="Ouroboros’ Tear"><header class="gh-tear-header"><button type="button" class="gh-tear-icon" data-action="gh-tear-back" aria-label="返回項目">${backIcon}</button><span>OUROBOROS</span><button type="button" class="gh-tear-icon" data-action="gh-tear-history" aria-label="歷史紀錄">◷</button></header><div class="gh-agent-orbit"><xm-tear-orbit data-key="agent-orbit" status="${working?'running':'idle'}" progress="0" aria-hidden="true"></xm-tear-orbit></div>${content}</section>`;
}
