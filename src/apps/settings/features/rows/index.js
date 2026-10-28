import {btn,esc} from '../../../../system/ui.js';
export const settingRow=(icon,label,detail='',route='',color='#2587ed')=>btn('settings-open',`<span class="setting-square" style="background:${color}"><img src="/assets/lucide/${icon}.svg" alt=""></span><strong>${esc(label)}</strong><small>${esc(detail)}</small><i>›</i>`,'settings-row',`data-route="${esc(route||label)}"`);
export const settingToggle=(label,key,value)=>btn('settings-toggle',`<strong>${esc(label)}</strong><span class="settings-switch ${value?'on':''}" aria-hidden="true"><i></i></span>`,'settings-row settings-toggle',`data-key="${key}" role="switch" aria-checked="${!!value}"`);
export const infoRow=(label,value)=>`<div class="settings-row"><strong>${esc(label)}</strong><small>${esc(String(value))}</small></div>`;
