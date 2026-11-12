// Single allowlist for the existing Story55 remote controller and in-page
// MCP tool adapter. No independent story scheduler or GHOST mechanics.
import {configFor} from '../../apps/ghost/state.js';
import {D06_ORDER_ID} from '../../story/d06/commission.js';
import {d04OrderOfStep,d04CanRun} from '../../story/d04/contract.js';
import {d03OrderOfStep,d03CanRun} from '../../story/d03/contract.js';
import {d02OrderOfStep,D02_DEADLINES} from '../../story/d02/runtime.js';
import {D01_REPAIR} from '../../story/d01/runtime.js';
import {WALLET_CHALLENGE_ID} from '../../apps/mirage/contacts-seed.js';

export const TAI_REMOTE_GHOST_TYPES=Object.freeze(['route','cipher','veil','extract','strike','verify']);
export const TAI_REMOTE_SCOPED_TYPES=Object.freeze(['veil','extract','strike','verify']);

export function taiRemoteOrderAllowed(s,o){
 if(!o||!TAI_REMOTE_GHOST_TYPES.includes(o.type))return false;
 if([D01_REPAIR,D06_ORDER_ID,WALLET_CHALLENGE_ID].includes(o.id)||
    d04OrderOfStep(o.id)===D06_ORDER_ID)return false;
 // Early accepted commissions can leave an authorized/failed GHOST child
 // after the parent expires. Apply the existing runner's gates only inside
 // the sharing window; never change D01–D14 gameplay or ban whole types.
 if(s?.day>=15&&s.day<=24){
  const d02=d02OrderOfStep(o.id),deadline=D02_DEADLINES[d02];
  if(d02&&(!s.story55?.d02?.deployed?.[d02]||
   s.content?.orders?.find(x=>x.id===d02)?.status!=='ACCEPTED'||
   s.day>deadline.day||s.day===deadline.day&&s.clock>deadline.clock))return false;
  if(d03OrderOfStep(o.id)&&!d03CanRun(s,o.id))return false;
  if(d04OrderOfStep(o.id)&&!d04CanRun(s,o.id))return false;
 }
 if(TAI_REMOTE_SCOPED_TYPES.includes(o.type)){
  // Never operate the separate D01 repair / D06 wallet challenge settlement.
  if(!(o.story55Project||o.story55Commission||
       s?.content?.mirage?.linkedMissions?.[o.id]||
       s?.content?.orders?.some(parent=>parent.id===d04OrderOfStep(o.id)&&parent.marketDaily)))return false;
 }
 if(o.type==='strike'){
  // The old STRIKE runs to completion automatically. The phone operator
  // MUST refuse it before pressing GHOST start, not claim to be clicking.
  if(o.status==='running')return ['strike','strike-mole'].includes(o.board?.arcade?.kind);
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
