import {batteryPercent,needsCharge} from './battery.js';

export function dynamicIsland(s,{expanded=false}={}){
 const blocked=s.deathPhase==='draining';if(blocked)expanded=true;
 const percent=batteryPercent(s),charging=['charging','sleeping'].includes(s.powerMode),low=needsCharge(s);
 const title=charging?'Charging':low?'Low Battery':`${percent}% Battery`;
 const subtitle=blocked?`${percent}%`:charging?`${percent}%`:low?'Please charge.':'';
 const actions=blocked?'':charging?
  '<button data-action="power-sleep" class="battery-island-option">睡觉</button><button data-action="power-unplug" class="battery-island-option">拔线</button>':
  '<button data-action="power-plug" class="battery-island-option is-primary">充电</button><button data-action="power-decline" class="battery-island-option">拒绝</button>';
 return `<div class="dynamic-island battery-island ${expanded?'is-expanded':''} ${blocked?'is-story-low':''} ${charging?'is-charging':''} ${low&&!charging?'is-low':''}" role="group" aria-label="灵动岛">
  <span class="battery-island-compact" aria-hidden="true"><span class="island-camera"></span>${charging?'<span class="battery-island-charging-dot"></span>':''}</span>
  <div class="battery-island-detail" ${expanded?'':'inert aria-hidden="true"'}>
   <div class="battery-island-heading"><div class="battery-island-words"><strong>${title}</strong>${subtitle?`<small>${subtitle}</small>`:''}</div><span class="battery-island-icon" aria-hidden="true"><i style="width:${Math.max(5,percent)}%"></i></span></div>
   <div class="battery-island-actions">${actions}</div>
  </div>
 </div>`;
}
