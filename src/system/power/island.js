import {telephonyIsland} from '../../services/telephony/view.js';
import {batteryPercent,needsCharge,isShortCharging} from './battery.js';
import {scriptedCallCameraActive} from '../../apps/noapp/voice-call.js';
import {taiPresence} from '../../services/presence.js';
let taiWasOnline=false,taiPresenceStartedAt=0;

export function dynamicIsland(s,{expanded=false,page='home'}={}){
 const call=telephonyIsland(s);if(call)return call;
 const remote=scriptedCallCameraActive()||!!s.story55?.ghostShare?.remote?.active&&s.story55?.ghostShare?.phase==='controlling';
 const blocked=s.deathPhase==='draining';if(blocked)expanded=true;
 const percent=batteryPercent(s),short=isShortCharging(s),charging=short||['charging','sleeping'].includes(s.powerMode),low=needsCharge(s);
 const select=!blocked&&!charging&&page==='select';
 const cheat=!!s.editor?.cheatMode;
 const online=!!s.unlocked&&!!s.story55?.completed?.recognition&&!s.story55?.ended&&!call&&!blocked&&taiPresence(s).status==='online';
 if(online&&!taiWasOnline)taiPresenceStartedAt=Date.now();
 taiWasOnline=online;
 const glowClass=online?' has-tai-glow'+(Date.now()-taiPresenceStartedAt<5000?' tai-glow-enter':''):'';
 const gained=short?Math.max(0,percent-Number(s.shortCharge?.startPercent??percent)):0;
 const title=select?'充电':short?'短充中':charging?'Charging':low?'Low Battery':`${percent}% Battery`;
 const subtitle=blocked?`${percent}%`:select?'':short?`${s.nav?.current?.appId==='home'?'1 秒 → 5 分鐘':'App 時間正常流動'} · 已補 ${gained}/10%`:charging?`${percent}%`:low?'Please charge.':'';
 const actions=blocked?'':short?
  (cheat?'<button data-action="power-short-next" class="battery-island-option is-primary">下一事件</button><button data-action="power-unplug" class="battery-island-option">拔線</button>':'<button data-action="power-unplug" class="battery-island-option is-primary">拔線 · 結束短充</button><button data-action="power-decline" class="battery-island-option">收起</button>'):
  charging?
  '<button data-action="power-sleep" class="battery-island-option">睡觉</button><button data-action="power-unplug" class="battery-island-option">拔线</button>':
  select?
  (cheat?'<button type="button" data-action="power-short-next" class="battery-charge-choice">下一事件</button>':'<button type="button" data-action="power-short-start" class="battery-charge-choice">短充</button>')+'<button type="button" data-action="power-long-start" class="battery-charge-choice">長充</button>':
  '<button data-action="power-charge-select" class="battery-island-option is-primary">充电</button><button data-action="power-decline" class="battery-island-option">拒绝</button>';
 return `<div class="dynamic-island battery-island${glowClass} ${expanded?'is-expanded':''} ${blocked?'is-story-low':''} ${charging?'is-charging':''} ${select?'is-charge-select':''} ${short?'is-short-charge':''} ${low&&!charging?'is-low':''} ${remote?'island-remote':''}" role="group" aria-label="灵动岛">
  ${blocked?'<span class="battery-island-compact" aria-hidden="true">':'<button type="button" class="battery-island-compact" data-action="power-open" aria-label="靈動島">'}<span class="island-camera"></span>${charging?'<span class="battery-island-charging-dot"></span>':''}${remote?'<span class="island-remote-dot"></span>':''}${blocked?'</span>':'</button>'}
  <div class="battery-island-detail" ${expanded?'':'inert aria-hidden="true"'}>
   <div class="battery-island-heading"><div class="battery-island-words"><strong>${title}</strong>${subtitle?`<small>${subtitle}</small>`:''}</div><span class="battery-island-icon" aria-hidden="true"><i style="width:${Math.max(5,percent)}%"></i></span></div>
   <div class="battery-island-actions">${actions}</div>
  </div>
 </div>`;
}
