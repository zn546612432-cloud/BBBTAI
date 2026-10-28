import {btn,esc} from '../../system/ui.js';
import {alarmsView} from './features/alarms/index.js';
import {stopwatchView,stopwatchAction} from './features/stopwatch/index.js';
import {timerView,timerAction} from './features/timer/index.js';
export const manifest={id:'clock',name:'时钟',glyph:'◴',tone:'#101010',defaultRoute:'/',kicker:'CLOCK'};
let tab='world',editing=false;
const nav=()=>`<nav class="clock-tabs">${[['world','globe','世界时钟'],['alarms','alarm-clock','闹钟'],['stopwatch','clock','秒表'],['timer','timer','计时器']].map(([id,ico,label])=>btn('clock-tab',`<img src="/assets/lucide/${ico}.svg" alt=""><span>${label}</span>`,tab===id?'active':'',`data-tab="${id}"`)).join('')}</nav>`;
export function render({store}){const s=store.get();const body=tab==='alarms'?alarmsView(s,editing):tab==='stopwatch'?stopwatchView():tab==='timer'?timerView():`<h1>世界时钟</h1><div class="clock-world"><span>${esc(s.clock)}</span><small>澳门</small></div>`;return `<div class="clock-app">${body}${nav()}</div>`;}
export function handle(a,t,c){if(a==='clock-tab'){tab=t.dataset.tab;editing=false;c.refresh();return;}if(a==='clock-edit'){editing=!editing;c.refresh();return;}if(a==='alarm-add'){c.store.update(s=>{(s.content.alarms ||= []).push({id:`alarm-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,time:'07:00',label:'闹钟',enabled:true,repeat:'永不'});});return;}if(a==='alarm-toggle'){c.store.update(s=>{const item=s.content.alarms?.find(x=>x.id===t.dataset.id);if(item)item.enabled=!item.enabled;});return;}if(a==='alarm-delete'){c.store.update(s=>{s.content.alarms=s.content.alarms?.filter(x=>x.id!==t.dataset.id)||[];});return;}if(a.startsWith('stopwatch-'))return stopwatchAction(a,c);if(a.startsWith('timer-'))return timerAction(a,c);}
export function change(el,c){if(el.dataset.alarmField)c.store.update(s=>{const item=s.content.alarms?.find(x=>x.id===el.dataset.id);if(item)item[el.dataset.alarmField]=el.value;});}
