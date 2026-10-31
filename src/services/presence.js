import {taiForcedOnline} from './ai/test-controls.js';
// Macau game clock is used for scheduling; Xitai lives in UK but the
// author chose 18:00-08:00 Macau as the principal reachable window.
// Active conversations are protected against accelerated-time disconnects.
const ENGAGED_GRACE_MS=45*60*1000;
let lastEngagedAt=0;
export function markTaiEngaged(){lastEngagedAt=Date.now();}
export function clearTaiEngagement(){lastEngagedAt=0;}
export function taiPresence(s,{now=Date.now()}={}){
 if(s.day<56)return {status:'offline',contactable:false,reason:'尚未相认'};
 if(taiForcedOnline())return {status:'online',contactable:true,reason:'在线'};
 if(lastEngagedAt&&now-lastEngagedAt<ENGAGED_GRACE_MS)
  return {status:'online',contactable:true,reason:'在线'};
 const mins=Number(s.clock?.slice(0,2)||0)*60+Number(s.clock?.slice(3,5)||0);
 const inside=mins>=18*60||mins<8*60;
 if(!inside)return {status:'away',contactable:true,reason:'离线'};
 // This is an opportunity window, not an hourly on/off switch.
 const status=(mins>=18*60&&mins<22*60)||(mins>=22*60||mins<3*60)?'online':'busy';
 return {status,contactable:true,reason:status==='online'?'在线':'忙碌'};
}
