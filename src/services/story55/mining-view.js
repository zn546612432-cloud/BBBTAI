import {completed} from './state.js';
import {挖矿_RATES,挖矿_COSTS} from './mining.js';
import {s55Button as b} from './views.js';
export function miningView55(s){const m=s.story55.mining;return `<div class="s55 s55-dark"><small>GHOST / 资产</small><h1>挖矿</h1>${!completed(s,'paris')?'<p>程序尚未解锁</p>':!m?`<p>本地部署 / 100,000</p>${b('mining-install','安装程序')}`:`<div class="s55-card"><h2>等级 ${m.level} / 10</h2><strong>${m.btc.toFixed(6)} BTC</strong><p>${挖矿_RATES[m.level-1]} BTC / 游戏小时</p><p>兑换比例 / 120,000 USD</p>${b('mining-sell','兑换可用 BTC')}${m.level<10?b('mining-upgrade','升级 / '+挖矿_COSTS[m.level-1].toLocaleString()):''}</div>`}${b('projects','部署任务')}</div>`;}
