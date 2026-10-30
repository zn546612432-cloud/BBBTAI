// Same presence state across MIRAGE, NoApp and chess. A conversation in
// progress gets a real-time grace period, so accelerated game time cannot
// switch the character offline in the middle of a reply.
const GRACE_MS=45*60*1000;
let lastEngagedAt=0;
export function markTaiEngaged(){lastEngagedAt=Date.now();}
export function taiPresence(s){
 if(s.day<56)return {status:'offline',contactable:false,reason:'尚未相认'};
 if(lastEngagedAt&&Date.now()-lastEngagedAt<GRACE_MS)
  return {status:'online',contactable:true,reason:'在线 · 聊天中'};
 const hour=Number(s.clock?.slice(0,2)||0);
 // An internationally based doctoral researcher can work late and keep odd hours.
 // This is a game rhythm, not a claim about the character's physical real-world presence.
 const status=(hour>=11||hour<4)?'online':hour>=9?'busy':'away';
 const reason={online:'在线',busy:'忙碌',away:'离开'}[status];
 return {status,contactable:true,reason};
}
