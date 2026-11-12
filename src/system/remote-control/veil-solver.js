// Pure VEIL route planner over the SAME post-move scanner physics as GHOST.
// Never mutates the board, advances time, or settles an order.
import {veilNextCell,veilScanners} from '../../apps/ghost/games/arcade.js';

// Prefer real movement to WAIT when shortest paths tie.
export const VEIL_DIRECTIONS=Object.freeze(['up','left','right','down','wait']);
export function veilPlan(board){
 if(!board||board.kind!=='veil')return null;
 const {player,exit=24,phase,walls}=board;
 if(!Number.isInteger(player)||player<0||player>=25||
    !Number.isInteger(exit)||exit<0||exit>=25||
    !Number.isInteger(phase)||!Array.isArray(walls)||
    !walls.every(x=>Number.isInteger(x)&&x>=0&&x<25)||
    walls.includes(player)||walls.includes(exit))return null;
 const startPhase=((phase%3)+3)%3,startKey=player+':'+startPhase;
 if(player===exit)return [];
 const queue=[{position:player,phase:startPhase,key:startKey}];
 const seen=new Set([startKey]),previous=new Map();
 for(let i=0;i<queue.length;i++){
  const from=queue[i];
  for(const direction of VEIL_DIRECTIONS){
   const to=veilNextCell(from.position,direction,walls);
   if(to===null)continue;
   const nextPhase=(from.phase+1)%3;
   // GHOST evaluates the NEW scanner positions, including WAIT collisions.
   if(veilScanners(nextPhase).includes(to))continue;
   const key=to+':'+nextPhase;
   if(seen.has(key))continue;
   seen.add(key);previous.set(key,{from:from.key,direction});
   if(to===exit){
    const path=[];
    for(let k=key;k!==startKey;){
     const step=previous.get(k);
     if(!step)return null;
     path.push(step.direction);k=step.from;
    }
    return path.reverse();
   }
   queue.push({position:to,phase:nextPhase,key});
  }
 }
 return null;
}
