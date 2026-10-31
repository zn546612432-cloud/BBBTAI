import {completed} from './state.js';
import {MINING_RATES,MINING_COSTS} from './mining.js';
import {s55Button as b} from './views.js';
export function miningView55(s){const m=s.story55.mining;return `<div class="s55 s55-dark"><small>GHOST / ASSETS</small><h1>MINING</h1>${!completed(s,'paris')?'<p>PROGRAM NOT AVAILABLE</p>':!m?`<p>LOCAL DEPLOYMENT / 100,000</p>${b('mining-install','INSTALL PROGRAM')}`:`<div class="s55-card"><h2>LEVEL ${m.level} / 10</h2><strong>${m.btc.toFixed(6)} BTC</strong><p>${MINING_RATES[m.level-1]} BTC / GAME HOUR</p><p>GAME RATE / 120,000 USD</p>${b('mining-sell','EXCHANGE AVAILABLE BTC')}${m.level<10?b('mining-upgrade','UPGRADE / '+MINING_COSTS[m.level-1].toLocaleString()):''}</div>`}${b('projects','DEPLOYMENT')}</div>`;}
