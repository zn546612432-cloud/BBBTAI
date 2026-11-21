import {btn,esc} from '../../../../system/ui.js';
export const wifiNetworks=['专线网络不准拿来打游戏_5G','user_hdkei_5G','NETXIAOXIN_5G'];
export const connectedWifi=s=>wifiNetworks.includes(s.wifiNetwork)?s.wifiNetwork:wifiNetworks[0];
const lock='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="11" width="12" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const wifi='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 4a4 4 0 0 1 6 0"/><circle cx="12" cy="20" r=".8" fill="currentColor"/></svg>';
export const wifiRows=s=>wifiNetworks.map(n=>btn('settings-wifi-network',`<span class="wifi-check">${n===connectedWifi(s)?'✓':''}</span><strong>${esc(n)}</strong><span class="wifi-icons">${lock}${wifi}<b>ⓘ</b></span>`,'settings-row wifi-row',`data-network="${esc(n)}" aria-pressed="${n===connectedWifi(s)}"`)).join('');
