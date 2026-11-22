import {btn,esc} from '../../../../system/ui.js';
import {nodeStatus} from '../../../../services/story55/state.js';
import {D45_PUBLISH,D46_CONTACT,PRIVATE_CONTRACT,PRIVATE_ORDER} from '../../../../story/d46/definition.js';
export const privateContractVisible=s=>['ready','done'].includes(nodeStatus(s,D45_PUBLISH).state)&&!s.story55?.completed?.[D45_PUBLISH]?.legacySkipped;
export function privateContractEntry(s){
 if(!privateContractVisible(s))return '';
 return btn('mc-private-contract',s.content.orders.some(o=>o.id===PRIVATE_ORDER)?'PRIVATE CONTRACT · 我的委託　›':'＋ PUBLISH CONTRACT · 發佈委託','mc-my-orders');
}
export function privateContractPage(s,header,tabs){
 const o=s.content.orders.find(o=>o.id===PRIVATE_ORDER),c=o||PRIVATE_CONTRACT;
 return header('PRIVATE CONTRACT','',true)+`<div class="mc-scroll mc-detail"><small>${esc(c.id)}</small><h1>${esc(c.title)}</h1><div class="mc-detail-state">${esc(o?.status||'DRAFT')}</div><label>CLIENT</label><p>${esc(c.owner)}</p><label>RISK LEVEL</label><p>${esc(c.risk)}</p><label>REWARD</label><strong class="mc-reward">${esc(c.reward)}</strong><label>BRIEF</label><p class="mc-brief">${esc(c.description)}</p>${o?o.contractor?'<label>CONTRACTOR</label><p>'+esc(o.contractor)+'</p>'+btn('mc-chat','OPEN ENCRYPTED CHANNEL','mc-primary',`data-id="${D46_CONTACT}"`):'<p class="mc-brief">已發佈 · 等待接單</p>':btn('mc-publish-private-contract','CONFIRM PUBLISH · 確認發佈','mc-primary',nodeStatus(s,D45_PUBLISH).state==='ready'?'':'disabled')}</div>`+tabs('/bounties',s);
}
