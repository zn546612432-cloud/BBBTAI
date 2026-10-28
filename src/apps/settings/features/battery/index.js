import {settingRow as row} from '../rows/index.js';
export const batteryPage=s=>`<div class="settings-page settings-detail"><h1>电池</h1><section>${row('▣','电池电量',`${s.batteryPercent??82}%`)}${row('↯','低电量模式',s.lowPower?'打开':'关闭','settings-low-power','#f5b119')}</section></div>`;
