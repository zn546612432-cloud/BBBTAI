import {batteryPercent,needsCharge,isShortCharging} from './battery.js';

export function dynamicIsland(s,{expanded=false,page='home'}={}){
 const blocked=s.deathPhase==='draining';if(blocked)expanded=true;
 const percent=batteryPercent(s),short=isShortCharging(s),charging=short||['charging','sleeping'].includes(s.powerMode),low=needsCharge(s);
 const select=!blocked&&!charging&&page==='select';
 const gained=short?Math.max(0,percent-Number(s.shortCharge?.startPercent??percent)):0;
 const title=select?'充电':short?'短充中':charging?'Charging':low?'Low Battery':`${percent}% Battery`;
 const subtitle=blocked?`${percent}%`:select?'':short?`1 分钟 → 游戏 3 小时 · 已补 ${gained}/10%`:charging?`${percent}%`:low?'Please charge.':'';
 const actions=blocked?'':short?
  '<button data-action="power-unplug" class="battery-island-option is-primary">拔线 · 结束短充</button><button data-action="power-decline" class="battery-island-option">收起</button>':
  charging?
  '<button data-action="power-sleep" class="battery-island-option">睡觉</button><button data-action="power-unplug" class="battery-island-option">拔线</button>':
  select?
  '<button type="button" data-action="power-short-start" class="battery-charge-choice">短充</button><button type="button" data-action="power-long-start" class="battery-charge-choice">长充</button>':
  '<button data-action="power-charge-select" class="battery-island-option is-primary">充电</button><button data-action="power-decline" class="battery-island-option">拒绝</button>';
 return `<div class="dynamic-island battery-island ${expanded?'is-expanded':''} ${blocked?'is-story-low':''} ${charging?'is-charging':''} ${select?'is-charge-select':''} ${short?'is-short-charge':''} ${low&&!charging?'is-low':''}" role="group" aria-label="灵动岛">
  <span class="battery-island-compact" aria-hidden="true"><span class="island-camera"></span>${charging?'<span class="battery-island-charging-dot"></span>':''}</span>
  <div class="battery-island-detail" ${expanded?'':'inert aria-hidden="true"'}>
   <div class="battery-island-heading"><div class="battery-island-words"><strong>${title}</strong>${subtitle?`<small>${subtitle}</small>`:''}</div><span class="battery-island-icon" aria-hidden="true"><i style="width:${Math.max(5,percent)}%"></i></span></div>
   <div class="battery-island-actions">${actions}</div>
  </div>
 </div>`;
}
