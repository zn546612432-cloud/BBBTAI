// Pure VEIL route planner over the SAME post-move scanner physics as GHOST.
// Never mutates the board, advances time, or settles an order.
import {veilNextCell,veilScanners} from '../../apps/ghost/games/arcade.js';
import {openGamesMazeStep} from '../../apps/ghost/games/vendor/opengames-mechanics.js';
import {upstreamScannerPositions} from '../../apps/ghost/games/arcade-upstream.js';

// Prefer real movement to WAIT when shortest paths tie.
export const VEIL_DIRECTIONS=Object.freeze(['up','left','right','down','wait']);
export function veilPlan(board){
 if(board?.kind==='veil-maze')return upstreamVeilPlan(board);
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

/**
 * Time-phase route planner for MIT OpenGames labyrinth with scanner cycles.
 * Uses only the shared scoped board snapshot; taps are sent through GHOST.
 */
function upstreamVeilPlan(board){
 const size=board?.size,maze=board?.maze;
 if(!Number.isInteger(size)||![5,7].includes(size)||
  !maze||maze.size!==size||!Array.isArray(maze.cells)||maze.cells.length!==size*size||
  maze.cells.some(c=>!Array.isArray(c)||c.length!==4||c.some(w=>typeof w!=='boolean'))||
  !Number.isInteger(board.player)||board.player<0||board.player>=size*size||
  !Number.isInteger(board.exit)||board.exit<0||board.exit>=size*size||
  !Number.isInteger(board.phase)||!Array.isArray(board.scanners)||
  board.scanners.some(path=>!Array.isArray(path)||path.length!==5||
   path.some(cell=>!Number.isInteger(cell)||cell<0||cell>=size*size)))return null;
 if(board.player===board.exit)return [];
 const phase=((board.phase%5)+5)%5,firstKey=board.player+':'+phase;
 const queue=[{cell:board.player,phase,key:firstKey}],
  prev=new Map(),seen=new Set([firstKey]);
 for(let i=0;i<queue.length;i++){
  const from=queue[i];
  for(const direction of VEIL_DIRECTIONS){
   const to=direction==='wait'?from.cell:openGamesMazeStep(maze,from.cell,direction);
   if(to===from.cell&&direction!=='wait')continue;
   const nextPhase=(from.phase+1)%5;
   if(upstreamScannerPositions(board,nextPhase).includes(to))continue;
   const key=to+':'+nextPhase;
   if(seen.has(key))continue;
   seen.add(key);prev.set(key,{from:from.key,direction});
   if(to===board.exit){
    const path=[];
    for(let k=key;k!==firstKey;){
     const step=prev.get(k);if(!step)return null;
     path.push(step.direction);k=step.from;
    }
    return path.reverse();
   }
   queue.push({cell:to,phase:nextPhase,key});
  }
 }
 return null;
}
