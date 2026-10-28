import {btn,card,demo,empty,esc} from '../../../../system/ui.js';
import {dateParts,dateLabel,setPreviewDate} from '../../../../services/calendar.js';
const attr=v=>esc(v);
export function assets(s){return `<div class="editor-panel">${card(`<strong>手机壁纸</strong><p>当前图片可从本机替换。</p>${btn('replace-wallpaper','更换壁纸','button-primary wide')}`)}<div class="section-heading">独立 App 图标</div><div class="surface-list">${Object.entries({wechat:'微信',noapp:'NoApp',chess:'国际象棋',mirage:'MIRAGE',photos:'照片',music:'音乐'}).map(([id,name])=>`<div class="list-row"><span class="list-copy"><strong>${name}</strong></span>${btn('replace-icon','替换','text-button',`data-id="${id}"`)}</div>`).join('')}</div><div class="section-heading">相册</div>${btn('add-photo','导入照片','button-primary wide')}</div>`;}
