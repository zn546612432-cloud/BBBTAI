import {momentPeople,momentProfiles} from '../../../wechat/features/moments/model.js';
import {TAI_PORTRAIT} from '../../../noapp/portrait.js';
import {btn,card,demo,empty,esc} from '../../../../system/ui.js';
import {dateParts,dateLabel,setPreviewDate} from '../../../../services/calendar.js';
const attr=v=>esc(v);
export function assets(s){return `<div class="editor-panel">${card(`<strong>手机壁纸</strong><p>当前图片可从本机替换。</p>${btn('replace-wallpaper','更换壁纸','button-primary wide')}`)}<div class="section-heading">人物头像与朋友圈背景</div>
<div class="surface-list">${[...new Set(['熙泰',...momentPeople])].map(name=>{
 const tai=name==='熙泰',avatar=s.characterAvatars?.[name]||(tai?TAI_PORTRAIT:momentProfiles(s)[name]?.avatar||'');
 const cover=momentProfiles(s)[name]?.cover||'';
 return `<div class="list-row character-asset-row"><span class="list-copy"><strong>${esc(name)}</strong><small>头像 · 朋友圈封面</small></span>${avatar?'<img src="'+esc(avatar)+'" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:12px">':''}${btn('character-upload-avatar','换头像','text-button',`data-name="${esc(name)}"`)}${!tai?btn('character-upload-cover','换封面','text-button',`data-name="${esc(name)}"`):''}</div>`;
 }).join('')}</div>
${marker}<div class="surface-list">${Object.entries({wechat:'微信',noapp:'NoApp',chess:'国际象棋',mirage:'MIRAGE',photos:'照片',music:'音乐'}).map(([id,name])=>`<div class="list-row"><span class="list-copy"><strong>${name}</strong></span>${btn('replace-icon','替换','text-button',`data-id="${id}"`)}</div>`).join('')}</div><div class="section-heading">相册</div>${btn('add-photo','导入照片','button-primary wide')}</div>`;}
