import {empty,demo} from '../../system/ui.js';
export const manifest={id:'instagram',name:'Instagram',glyph:'◎',tone:'#ad648e',unlockDay:56,defaultRoute:'/',kicker:'SOCIAL'};
export const render=()=>`<div class="page-pad"><div class="large-title">Instagram</div>${empty('还没有动态','这里会在正式剧情中出现真实可见的内容。')}<div class="centered">${demo()}</div></div>`;
