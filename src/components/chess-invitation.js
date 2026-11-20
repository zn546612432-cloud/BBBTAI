import {btn,demo,esc} from '../system/ui.js';
import {D41_CHESS_INVITATION} from '../story/d34-d42/d41-chess.js';

export function renderChessInviteCard(inv,{name='',acceptAction='accept-invite',continueAction='open-invite-match',showDefer=true}={}){
 if(!inv)return '<div class="invite-card">邀请已移除</div>';
 const label={pending:'等待接受',deferred:'稍后再说',accepted:'已接受',expired:'已过期',declined:'已拒绝'}[inv.status];
 const id=`data-id="${esc(inv.id)}"`,outgoing=inv.senderId==='player';
 return `<div class="invite-card"><div class="invite-top"><span class="invite-icon">♞</span><span><strong>国际象棋邀请</strong><small>${esc(name)} · 友谊赛</small></span></div>${inv.id===D41_CHESS_INVITATION?'':`<div class="invite-meta"><span>${outgoing&&inv.status==='pending'?'等待回应':label}</span>${outgoing?'':demo()}</div>`}${!outgoing&&['pending','deferred'].includes(inv.status)?`<div class="invite-actions">${btn(acceptAction,'接受邀请','button-primary',id)}${showDefer&&inv.status==='pending'?btn('defer-invite','稍后再说','button-quiet',id):''}</div>`:inv.status==='accepted'?btn(continueAction,'继续棋局','button-primary',id):''}</div>`;
}
