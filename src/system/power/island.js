import {batteryPercent,needsCharge,isShortCharging} from './battery.js';

export function dynamicIsland(s,{expanded=false,page='home'}={}){
 const blocked=s.deathPhase==='draining';if(blocked)expanded=true;
 const percent=batteryPercent(s),short=isShortCharging(s),charging=short||['charging','sleeping'].includes(s.powerMode),low=needsCharge(s);
 const select=!blocked&&!charging&&page==='select';
 const gained=short?Math.max(0,percent-Number(s.shortCharge?.startPercent??percent)):0;
 const title=select?'充电方式':short?'短充中':charging?'Charging':low?'Low Battery':`${percent}% Battery`;
 const subtitle=blocked?`${percent}%`:select?'选择一种方式，随时掌控游戏时间':short?`游戏时间 ×60 · 已补 ${gained}/10%`:charging?`${percent}%`:low?'Please charge.':'';
 const actions=blocked?'':short?
  '<button data-action="power-unplug" class="battery-island-option is-primary">拔线 · 结束短充</button><button data-action="power-decline" class="battery-island-option">收起</button>':
  charging?
  '<button data-action="power-sleep" class="battery-island-option">睡觉</button><button data-action="power-unplug" class="battery-island-option">拔线</button>':
  select?
  '<button data-action="power-short-start" class="battery-charge-choice"><strong>短充 · 玩着充</strong><small>现实 1 分钟＝游戏 3 小时 · 最多 +10%</small></button><button data-action="power-long-start" class="battery-charge-choice"><strong>长充 · 过夜</strong><small>原有模式 · 次日 08:00 · 充至 100%</small></button>':
  '<button data-action="power-charge-select" class="battery-island-option is-primary">充电</button><button data-action="power-decline" class="battery-island-option">拒绝</button>';
 return `<div class="dynamic-island battery-island ${expanded?'is-expanded':''} ${blocked?'is-story-low':''} ${charging?'is-charging':''} ${select?'is-charge-select':''} ${short?'is-short-charge':''} ${low&&!charging?'is-low':''}" role="group" aria-label="灵动岛">
  <button type="button" class="battery-island-compact" data-action="power-open" aria-label="展开灵动岛充电选项" ${expanded?'disabled':''}><span class="island-camera"></span>${charging?'<span class="battery-island-charging-dot"></span>':''}</button>
  <div class="battery-island-detail" ${expanded?'':'inert aria-hidden="true"'}>
   <div class="battery-island-heading"><div class="battery-island-words"><strong>${title}</strong>${subtitle?`<small>${subtitle}</small>`:''}</div><span class="battery-island-icon" aria-hidden="true"><i style="width:${Math.max(5,percent)}%"></i></span></div>
   <div class="battery-island-actions">${actions}</div>
  </div>
 </div>`;
}
