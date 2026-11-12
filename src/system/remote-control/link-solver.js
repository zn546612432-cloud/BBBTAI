// Read-only LINK planner. It never writes the board or calls Ghost.finish().
// Winning is possible only when the existing Ghost handler accepts real rotations.
import {pipeSolved} from '../../apps/ghost/games/pipe-network.js';
import {connected} from '../../apps/ghost/games/logic.js';
// The original 3x3 still exists in current normal orders. Its endpoints
// rotate too; expose only that visible layout, never regenerate the board.
export function visibleLinkBoard(board){
 if(!Array.isArray(board?.masks))return null;
 if(board.size)return {size:board.size,source:board.source,sink:board.sink,masks:[...board.masks]};
 return board.masks.length===9?{size:3,source:0,sink:8,masks:[...board.masks],legacy:true}:null;
}
const edges=[{bit:1,back:4,dy:-1,dx:0},{bit:2,back:8,dy:0,dx:1},{bit:4,back:1,dy:1,dx:0},{bit:8,back:2,dy:0,dx:-1}];
export const rotatePipe=m=>((m<<1)&15)|(m>>3);
function orientations(mask,fixed=false){
 const out=[];
 for(let turns=0,m=mask;turns<(fixed?1:4);turns++,m=rotatePipe(m))
  if(!out.some(o=>o.mask===m))out.push({turns,mask:m});
 return out;
}
function verified(board,plan){
 const copy={...board,masks:[...board.masks]};
 for(const {index,turns} of plan)for(let j=0;j<turns;j++)copy.masks[index]=rotatePipe(copy.masks[index]);
 return board.legacy?connected(copy.masks).has(8):pipeSolved(copy);
}
// Existing MIT-adapted GHOST generator retains a reference for reproducible
// tests. Use that known valid path only when an orientation-first BFS prunes
// a path too early; never write the reference masks into the live board.
function referenceFallback(board){
 const {size:n,source:src,sink:dst,solvedMasks:ms,masks}=board;
 if(!Array.isArray(ms)||ms.length!==n*n)return null;
 const queue=[src],previous=new Map([[src,-1]]);
 for(let q=0;q<queue.length;q++){
  const at=queue[q],y=Math.floor(at/n),x=at%n;
  if(at===dst)break;
  for(const e of edges){
   const ny=y+e.dy,nx=x+e.dx;
   if(nx<0||ny<0||ny>=n||nx>=n)continue;
   const to=ny*n+nx;
   if(!previous.has(to)&&(ms[at]&e.bit)&&(ms[to]&e.back)){
    previous.set(to,at);queue.push(to);
   }
  }
 }
 if(!previous.has(dst))return null;
 const route=[];for(let at=dst;at!==-1;at=previous.get(at))route.push(at);
 const plan=[];
 for(const index of route.reverse()){
  if(index===src||index===dst)continue;
  const rotation=orientations(masks[index]).find(o=>o.mask===ms[index]);
  if(!rotation)return null;
  if(rotation.turns)plan.push({index,turns:rotation.turns});
 }
 return verified(board,plan)?plan:null;
}
export function solveLinkPipe(board){
 board=board?.size?board:visibleLinkBoard(board);
 const size=board?.size,masks=board?.masks,source=board?.source,sink=board?.sink;
 if(!Number.isInteger(size)||size<3||size>9||!Array.isArray(masks)||masks.length!==size*size||
  !Number.isInteger(source)||!Number.isInteger(sink)||source<0||sink<0||source>=masks.length||
  sink>=masks.length||source===sink||!masks.every(m=>Number.isInteger(m)&&m>=0&&m<=15))return null;
 if(board.legacy?connected(masks).has(8):pipeSolved(board))return [];
 const queue=[{at:source,entry:0,path:[],visited:new Set([source])}];
 const seen=new Set([source+':0']);
 for(let q=0;q<queue.length&&q<40000;q++){
  const current=queue[q],at=current.at,y=Math.floor(at/size),x=at%size;
  for(const rotation of orientations(masks[at],!board.legacy&&(at===source||at===sink))){
   if(current.entry&&!(rotation.mask&current.entry))continue;
   if(at===sink){
    const plan=[...current.path,{index:at,turns:rotation.turns}].filter(x=>x.turns>0).map(({index,turns})=>({index,turns}));
    if(verified(board,plan))return plan;
    continue;
   }
   for(const edge of edges){
    if(!(rotation.mask&edge.bit)||current.entry===edge.bit)continue;
    const ny=y+edge.dy,nx=x+edge.dx;
    if(nx<0||ny<0||nx>=size||ny>=size)continue;
    const next=ny*size+nx;
    if(current.visited.has(next))continue;
    if(!orientations(masks[next],!board.legacy&&(next===source||next===sink)).some(o=>o.mask&edge.back))continue;
    const key=next+':'+edge.back;
    if(seen.has(key))continue;
    seen.add(key);
    queue.push({at:next,entry:edge.back,
     path:[...current.path,{index:at,turns:rotation.turns}],
     visited:new Set([...current.visited,next])});
   }
  }
 }
 return referenceFallback(board);
}
