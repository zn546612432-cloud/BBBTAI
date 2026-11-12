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

/**
 * A* planner for the actual MIT sliding circuit (CIPHER V3).
 * Plans native adjacent taps only; never mutates the board or Ghost state.
 */
import {puzzleNeighbors} from '../../apps/ghost/games/vendor/puzzle-slide.js';
const slideHeuristic=tiles=>tiles.reduce((sum,t,i)=>t===8?sum:
 sum+Math.abs(Math.floor(t/3)-Math.floor(i/3))+Math.abs(t%3-i%3),0);
export function solveCipherSlideTiles(board){
 const values=board?.tiles,blank=board?.empty;
 if(board?.kind!=='cipher-slide'||!Array.isArray(values)||values.length!==9||
  !values.every(x=>Number.isInteger(x)&&x>=0&&x<9)||
  new Set(values).size!==9||!Number.isInteger(blank)||
  blank<0||blank>8||values[blank]!==8)return null;
 const start=values.join(''),goal='012345678';
 if(start===goal)return [];
 const heap=[],push=node=>{
  heap.push(node);let i=heap.length-1;
  while(i>0){const p=Math.floor((i-1)/2);
   if(heap[p].f<=node.f)break;
   heap[i]=heap[p];i=p;
  }heap[i]=node;
 },pop=()=>{
  const root=heap[0],last=heap.pop();
  if(heap.length){let i=0;
   while(i*2+1<heap.length){
    let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;
    if(heap[c].f>=last.f)break;
    heap[i]=heap[c];i=c;
   }heap[i]=last;
  }
  return root;
 };
 const scores=new Map([[start,0]]),prev=new Map();
 push({key:start,tiles:[...values],empty:blank,g:0,f:slideHeuristic(values)});
 for(let iter=0;heap.length&&iter<140000;iter++){
  const n=pop();
  if(n.g!==scores.get(n.key))continue;
  if(n.key===goal){
   const taps=[];
   for(let key=goal;key!==start;){
    const p=prev.get(key);if(!p)return null;
    taps.push(p.tap);key=p.previous;
   }
   return taps.reverse();
  }
  for(const tap of puzzleNeighbors(n.empty)){
   const next=[...n.tiles];
   [next[n.empty],next[tap]]=[next[tap],next[n.empty]];
   const key=next.join(''),cost=n.g+1;
   if(cost>=(scores.get(key)??Infinity))continue;
   scores.set(key,cost);prev.set(key,{previous:n.key,tap});
   push({key,tiles:next,empty:tap,g:cost,f:cost+slideHeuristic(next)});
  }
 }
 return null;
}
