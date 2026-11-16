import {tools} from '../../catalog.js';
import {toolIcon} from '../../visuals.js';
import {motionField} from '../../deployment/motion/view.js';

const names={verify:'部署',cipher:'破譯',route:'鏈接',extract:'竊取',veil:'隱匿',strike:'攻擊'};
export function workspaceHero(id,title,subtitle='',status=''){
 return `<section class="gh-workspace-hero">${motionField(id,0,'gh-workspace-field')}<div class="gh-workspace-hero-copy"><h1>${title}</h1>${subtitle?`<p>${subtitle}</p>`:''}${status?`<span class="gh-workspace-live"><i></i>${status}</span>`:''}</div></section>`;
}
export function renderGhostHome(story){
 return `<header class="gh-workspace-brand"><span class="gh-workspace-wordmark">GHOST<sup>®</sup></span><span class="gh-workspace-live"><i></i>本地 / 在線</span></header>
 ${workspaceHero('ghost-home','工具程序','LOCAL WORKSPACE')}
 ${story?`<button class="gh-button gh-workspace-projects" data-action="gh-flow-projects"><span>項目<small>已部署程序</small></span><span aria-hidden="true">↗</span></button>`:''}
 <div class="gh-workspace-section"><span>程序</span><small>06</small></div>
 <div class="gh-tools gh-workspace-tools">${tools.map(t=>`<button class="gh-button" data-action="gh-tool" data-tool="${t.id}"><span class="gh-tool-glyph">${toolIcon(t.id)}</span><section><b>${names[t.id]}</b><small>${t.en}</small></section><span class="gh-arrow" aria-hidden="true">↗</span></button>`).join('')}</div>
 <button class="gh-button gh-workspace-history" data-action="gh-history">歷史記錄 <span aria-hidden="true">↗</span></button>`;
}
