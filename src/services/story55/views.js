import {renderRoom404} from '../../apps/browser/features/room404/index.js';
import {esc} from '../../system/ui.js';
import {isStory55,story55Config,nodeStatus,completed,nodeById} from './state.js';
import {scene55,sceneLines,actor55} from './runtime.js';
import {deploymentPercent} from './projects.js';
export const s55Button=(a,t,attrs='',className='')=>`<button type="button" class="s55-button ${className}" data-action="s55-${a}" ${attrs}>${t}</button>`;
const unavailable=(s,id)=>`<div class="s55"><h2>${esc(nodeStatus(s,id).reason)}</h2>${s55Button('objectives','提醒事项')}</div>`;
export function objectives55(s){const c=story55Config(s);return `<div class="s55"><small>REMINDERS / ${s.day}</small><h1>待办事项</h1>${c.nodes.filter(n=>s.day>=n.day&&nodeStatus(s,n.id).state==='ready').map(n=>`<article class="s55-card"><h2>${esc(n.title)}</h2>${n.kind==='project'?`<div class="s55-meter"><i style="width:${deploymentPercent(s,n.project)}%"></i></div><p>${deploymentPercent(s,n.project)}%</p>`:''}${s55Button('node','打开',`data-node="${n.id}"`)}</article>`).join('')||'<p>当前没有待办事项。</p>'}<details><summary>已完成 · ${Object.keys(s.story55.completed).length}</summary>${c.nodes.filter(n=>completed(s,n.id)).map(n=>`<p>✓ ${esc(n.title)}</p>`).join('')}</details></div>`;}
export function mail55(s,m){const ready=['ready','done'].includes(nodeStatus(s,m.storyNode).state);return ready?`<div class="s55"><nav><button data-action="kira-back">‹ 收件箱</button><small>KIRA / ENCRYPTED</small></nav><h1>${esc(m.subject)}</h1><p>${esc(m.from||'Dr Ouroboros')} · ${esc(m.date)} ${esc(m.time||'')}</p><article class="s55-card s55-document">${esc(m.body)}</article>${m.id==='s55-d46-isolde-mail'?'<button class="s55-button" data-action="kira-isolde-chat">前往 MIRAGE</button>':m.id==='invite-mail'?s55Button('install-noapp',s.story55.noappInstalled?'開啟 NoApp':'安裝 NoApp'):!completed(s,m.storyNode)?s55Button('read-mail','打开授权附件',`data-id="${m.id}"`):m.project?s55Button('read-mail','開啟授權附件',`data-id="${m.id}"`):s55Button('node','接受NoApp邀请',`data-node="recognition"`)}</div>`:unavailable(s,m.storyNode);}
export function files55(s,loc){const c=story55Config(s),doc=c.documents.find(x=>x.id===loc.params?.document);
 if(doc){if(!['ready','done'].includes(nodeStatus(s,doc.node).state))return unavailable(s,doc.node);return `<div class="s55"><nav>${s55Button('files','‹ 文件')}</nav><small>LOCAL ARCHIVE</small><h1>${esc(doc.title)}</h1><article class="s55-card s55-document">${doc.asset?`<img src="${esc(doc.asset)}" alt="孤儿院档案照片">`:''}${esc(doc.body)}</article>${s55Button('read-file',completed(s,doc.node)?'已读取':'读取并关联线索',`data-id="${doc.id}"`)}${completed(s,'dossier')&&doc.id==='dossier'?s55Button('node','在地图核对位置',`data-node="uk"`):''}${completed(s,'photo')&&doc.id==='triplets'?s55Button('node','查看邀请邮件',`data-node="invite"`):''}</div>`;}
 return '<div class="s55"><p>無法開啟檔案</p></div>';
}
export function browser55(s,loc){const p=story55Config(s).pages.find(x=>x.id===loc.params?.page);if(!p)return unavailable(s,'rumours');if(!['ready','done'].includes(nodeStatus(s,p.node).state))return unavailable(s,p.node);
 if(p.id==='ig')return renderRoom404(s,loc);
 return `<div class="s55 s55-web"><small>ARCHIVE / PUBLIC RECORD</small><h1>${esc(p.title)}</h1><article class="s55-document">${esc(p.body)}</article>${s55Button('read-page',completed(s,p.node)?'已收录':'收录这条线索',`data-id="${p.id}"`)}${completed(s,p.node)&&p.id==='harvard'?s55Button('node','打开社交账户',`data-node="ig"`):''}</div>`;
}
export function sceneView55(s,loc){
 const id=loc.params?.node,n=nodeById(s,id);if(!n)return unavailable(s,'intro');
 if(completed(s,id))return `<div class="s55"><h1>${esc(n.title)}</h1><p>已記錄。</p></div>`;
 // Authored dialogue and phone calls run in their native app surfaces.
 return `<div class="s55"><h1>${esc(n.title)}</h1>${s55Button('node','開啟對話',`data-node="${esc(id)}"`)}</div>`;
}
export function mirage55(s,loc){if(loc.route==='/story55/payment'&&!['ready','done'].includes(nodeStatus(s,'mercenary').state))return unavailable(s,'mercenary');if(loc.route==='/story55/questions')return `<div class="s55 s55-dark"><h1>Dr Ouroboros</h1>${s55Button('anonymous-chat','開啟對話')}</div>`;
 if(loc.route==='/story55/payment')return `<div class="s55 s55-dark"><small>MIRAGE / CONTRACT</small><h1>委託訂金</h1><article class="s55-card"><p>HK$ 5,000,000</p>${s55Button('node','前往 Pacific 轉帳','data-node="mercenary"')}</article></div>`;
 return `<div class="s55 s55-dark"><small>MIRAGE / CONTRACTS</small><h1>悬赏与联络</h1>${s55Button('objectives','当前计划')}${completed(s,'intrusion')?s55Button('anonymous-chat','Dr Ouroboros / 私密联络'):''}${s55Button('node','钱包挑战','data-node="wallet"')}<h2>独立委托</h2><p>本地数据校验 / 20,000</p>${s55Button('commission','领取并运行委托')}<h2>资源与资产</h2>${s55Button('projects','本地程序')}${s55Button('mining','挖矿与BTC资产')}</div>`;
}
