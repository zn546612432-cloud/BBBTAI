import {worldMinuteRate} from './clock.js';
import {BATTERY_DRAIN_INTERVAL_MS} from '../power/battery.js';

// Fractions stay transient between visible clock/battery changes. Do not clone,
// serialize and rerender a phone full of historical messages every 800ms.
export class WorldTickBatch{
 reset(){this.elapsed=0;this.anchor=null;this.context=null;}
 constructor(){this.reset();}
 take(s,elapsed,options){
  const anchor=[s.day,s.clock,s.powerMode,s.deathPhase,s.dayChargeRemainingMs].join(':'),context=JSON.stringify(options);
  if(this.anchor!==anchor)this.elapsed=0;
  const contextChanged=this.context!==null&&this.context!==context;
  this.anchor=anchor;this.context=context;this.elapsed+=Math.max(0,elapsed);
  const clockDue=(1-(s.worldMinuteFraction||0))/worldMinuteRate(s,options);
  const batteryDue=['charging','sleeping'].includes(s.powerMode)?Infinity:BATTERY_DRAIN_INTERVAL_MS-(s.powerActiveMs||0);
  const due=s.dayChargeRemainingMs>0?Math.min(800,s.dayChargeRemainingMs):Math.min(clockDue,batteryDue);
  if(!contextChanged&&this.elapsed+1e-6<due)return 0;
  const ready=this.elapsed;this.elapsed=0;return ready;
 }
}
