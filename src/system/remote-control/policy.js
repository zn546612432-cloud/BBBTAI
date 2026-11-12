// Single allowlist for the existing Story55 remote controller and in-page
// MCP tool adapter. No independent story scheduler or GHOST mechanics.
import {configFor} from '../../apps/ghost/state.js';

export const TAI_REMOTE_GHOST_TYPES=Object.freeze(['route','cipher','veil','extract','strike','verify']);
export const TAI_REMOTE_SCOPED_TYPES=Object.freeze(['veil','extract','strike','verify']);

export function taiRemoteOrderAllowed(s,o){
 if(!o||!TAI_REMOTE_GHOST_TYPES.includes(o.type))return false;
 if(TAI_REMOTE_SCOPED_TYPES.includes(o.type)){
  // Never operate the separate D01 repair / D06 wallet challenge settlement.
  if(o.id==='mirage001'||o.id==='mirage-ouroboros-10btc-d05')return false;
  if(!(o.story55Project||o.story55Commission||
       s?.content?.mirage?.linkedMissions?.[o.id]))return false;
 }
 if(o.type==='strike'){
  // The old STRIKE runs to completion automatically. The phone operator
  // MUST refuse it before pressing GHOST start, not claim to be clicking.
  if(o.status==='running')return o.board?.arcade?.kind==='strike';
  return configFor(s,'strike',o.id).arcadeV2!==false;
 }
 return true;
}
export function taiRemoteCanOperateOrder(s,o){
 if(!taiRemoteOrderAllowed(s,o)||!['authorized','failed','running'].includes(o.status)||
    (o.requiresKeyEntry&&!o.keyVerified))return false;
 if(o.type==='strike'&&o.status==='running'){
  const b=o.board.arcade;
  // A midway share cannot take over a target sequence it cannot finish.
  return Number.isFinite(o.deadline)&&
   o.deadline-Date.now()>=Math.max(0,b.goal-b.hits)*900+1500;
 }
 return true;
}
export function taiRemoteUpcomingProjectStepAllowed(s,type,projectId){
 return TAI_REMOTE_GHOST_TYPES.includes(type)&&
  projectId!=='wallet'&&
  (type!=='strike'||configFor(s,'strike').arcadeV2!==false);
}
