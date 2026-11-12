// CIPHER planning is a pure, deterministic computation on the displayed
// GHOST 3x3 tile order. The original Ghost UI owns clicks, moves and finish().
import {puzzleSolved,swap} from '../../apps/ghost/games/logic.js';

export function solveCipherTiles(board){
 const tiles=board?.tiles;
 if(!Array.isArray(tiles)||tiles.length!==9||
    !tiles.every(x=>Number.isInteger(x)&&x>=0&&x<9)||
    new Set(tiles).size!==9)return null;
 const work=[...tiles],plan=[];
 for(let i=0;i<work.length;i++){
  if(work[i]===i)continue;
  const j=work.indexOf(i,i+1);
  if(j<0)return null;
  plan.push({first:i,second:j});
  const next=swap(work,i,j);
  work.splice(0,work.length,...next);
 }
 if(!puzzleSolved(work))return null;
 return plan;
}
