import {isStory55} from './story55/state.js';
import {story55Presence} from './story55/runtime.js';
import {taiForcedOnline} from './ai/test-controls.js';
import {taiLife} from './ai/life-context.js';
// The old 90-day demo is frozen (its chess fixtures rely on this grace).
// Story55 never lets engagement override its London sleep gate.
let lastEngagedAt=0;
export function markTaiEngaged(){lastEngagedAt=Date.now();}
export function clearTaiEngagement(){lastEngagedAt=0;}
export function taiPresence(s,{now=Date.now()}={}){
 if(!isStory55(s)){
  if(s.day<56)return {status:'offline',contactable:false,reason:'尚未相認'};
  if(taiForcedOnline()||lastEngagedAt&&now-lastEngagedAt<45*60*1000)return {status:'online',contactable:true,reason:'在線'};
  const mins=Number(s.clock?.slice(0,2)||0)*60+Number(s.clock?.slice(3,5)||0);
  if(mins>=8*60&&mins<18*60)return {status:'away',contactable:true,reason:'離線'};
  return mins>=18*60||mins<3*60?{status:'online',contactable:true,reason:'在線'}:{status:'busy',contactable:true,reason:'忙碌'};
 }
 const gate=story55Presence(s,now);if(!gate.contactable)return gate;
 if(taiForcedOnline())return {status:'online',contactable:true,reason:'在線'};
 const life=taiLife(s);
 return {status:life.status,contactable:life.status!=='offline',reason:life.status==='offline'?'離線':life.status==='busy'?'忙碌':'在線'};
}
