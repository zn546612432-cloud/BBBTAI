import {worldMinuteRate} from './clock.js';
import {isStory55} from '../../services/story55/state.js';
import {BATTERY_DRAIN_INTERVAL_MS} from '../power/battery.js';

// Aggregate until something visible changes. Keep real milliseconds (charging)
// and already-scaled game minutes (clock/discharge) as separate quantities.
export class WorldTickBatch{
 reset(){this.elapsed=0;this.gameMinutes=0;this.anchor=null;this.context=null;}
 constructor(){this.reset();}
 take(s,elapsed,options={}){
  if(!Number.isFinite(elapsed)||elapsed<=0)return null;
  const anchor=[s.day,s.clock,s.powerMode,s.deathPhase,s.dayChargeRemainingMs].join(':');
  const rate=worldMinuteRate(s,options),context=JSON.stringify([rate,options]);
  if(this.anchor!==anchor){this.elapsed=0;this.gameMinutes=0;}
  const contextChanged=this.context!==null&&this.context!==context;
  this.anchor=anchor;this.context=context;
  this.elapsed+=elapsed;this.gameMinutes+=elapsed*rate;
  const clockDue=this.gameMinutes+(s.worldMinuteFraction||0)+1e-9>=1;
  const chargeDue=s.powerMode==='short-charging'
   &&this.elapsed+(Number(s.shortCharge?.elapsedMs)||0)%6000>=6000;
  const legacyBatteryDue=!isStory55(s)&&!['charging','sleeping','short-charging'].includes(s.powerMode)
   &&this.elapsed+(s.powerActiveMs||0)>=BATTERY_DRAIN_INTERVAL_MS;
  const transitionDue=s.dayChargeRemainingMs>0&&this.elapsed>=Math.min(800,s.dayChargeRemainingMs);
  if(!contextChanged&&!clockDue&&!chargeDue&&!legacyBatteryDue&&!transitionDue)return null;
  const frame={elapsedMs:this.elapsed,gameMinutes:this.gameMinutes};
  this.elapsed=0;this.gameMinutes=0;return frame;
 }
}
