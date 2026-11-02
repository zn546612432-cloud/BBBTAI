/**
 * GHOST's self-contained, original-UI adaptation of the MIT Pipe Puzzle maze
 * generator and flow idea from https://github.com/GameHelix/pipe_puzzle
 * (MIT © 2024, described in upstream README).
 *
 * Unlike the old fixed 3x3 link board, this uses a size-variable spanning tree,
 * selects distinct, maximally separated terminals, rotates all intermediate pipes,
 * and verifies connectivity by traversing reciprocal N/E/S/W port bits.
 * No Next.js, CSS, sounds or third-party packages are bundled.
 */
const EDGES=[
  {bit:1,back:4,dr:-1,dc:0},
  {bit:2,back:8,dr:0,dc:1},
  {bit:4,back:1,dr:1,dc:0},
  {bit:8,back:2,dr:0,dc:-1}
];
const rotateMask=m=>((m<<1)&15)|(m>>3);
const int=(random,max)=>Math.min(max-1,Math.max(0,Math.floor(random()*max)));
const neighbors=(at,size)=>{const row=Math.floor(at/size),col=at%size;return EDGES.flatMap(({bit,back,dr,dc})=>{
 const r=row+dr,c=col+dc;
 return r<0||r>=size||c<0||c>=size?[]:[{at:r*size+c,bit,back}];
});};
function makeTree(size,random){
 const masks=Array(size*size).fill(0),seen=new Set(),from=int(random,masks.length),stack=[from];
 seen.add(from);
 while(stack.length){
  const at=stack[stack.length-1],options=neighbors(at,size).filter(n=>!seen.has(n.at));
  if(!options.length){stack.pop();continue;}
  const next=options[int(random,options.length)];
  masks[at]|=next.bit;masks[next.at]|=next.back;
  seen.add(next.at);stack.push(next.at);
 }
 return masks;
}
function farthest(masks,size,start){
 const queue=[start],dist=Array(masks.length).fill(-1),prev=Array(masks.length).fill(-1);
 dist[start]=0;
 let far=start;
 for(let atIndex=0;atIndex<queue.length;atIndex++){
  const at=queue[atIndex];
  if(dist[at]>dist[far])far=at;
  for(const edge of neighbors(at,size)){
   if(!(masks[at]&edge.bit)||!(masks[edge.at]&edge.back)||dist[edge.at]!==-1)continue;
   dist[edge.at]=dist[at]+1;prev[edge.at]=at;queue.push(edge.at);
  }
 }
 return {at:far,length:dist[far],prev};
}
export function pipeFlow(masks,source=0,size=Math.round(Math.sqrt(masks?.length||0))){
 if(!Array.isArray(masks)||size<1||size*size!==masks.length||source<0||source>=masks.length)return new Set();
 const seen=new Set([source]),queue=[source];
 for(let i=0;i<queue.length;i++){
  const at=queue[i];
  for(const e of neighbors(at,size)){
   if((masks[at]&e.bit)&&(masks[e.at]&e.back)&&!seen.has(e.at)){
    seen.add(e.at);queue.push(e.at);
   }
  }
 }
 return seen;
}
// Players win when the highlighted source really reaches the highlighted sink.
// Requiring an arbitrary number of connected tiles caused "終點已接通" to
// display for valid short paths while the victory handler refused to run.
export function pipeSolved(board){
 if(!board?.size||board.source===board.sink)return false;
 return pipeFlow(board.masks,board.source,board.size).has(board.sink);
}
export function generatePipeNetwork({size=5,random=Math.random}={}){
 const n=Math.max(5,Math.min(7,Math.floor(Number(size)||5)));
 let best=null;
 // Prefer a long, interesting solved route rather than two neighbouring dots.
 for(let tries=0;tries<18;tries++){
  const solved=makeTree(n,random);
  const first=farthest(solved,n,int(random,n*n));
  const second=farthest(solved,n,first.at);
  const sinkEdge=neighbors(second.at,n).find(e=>(solved[second.at]&e.bit)!==0);
  const viable=!!sinkEdge&&solved[sinkEdge.at]!==15;
  const candidate={solved,source:first.at,sink:second.at,steps:second.length,viable};
  if(!best||viable&&!best.viable||(viable===best.viable&&candidate.steps>best.steps))best=candidate;
  if(viable&&candidate.steps>=Math.max(n*2+2,Math.floor(n*n*.48))){best=candidate;break;}
 }
 const {solved,source,sink,steps}=best;
 const masks=solved.slice();
 let changed=0;
 for(let i=0;i<masks.length;i++){
  if(i===source||i===sink)continue; // terminals are fixed and clearly marked
  const turns=int(random,4);
  for(let t=0;t<turns;t++)masks[i]=rotateMask(masks[i]);
  if(masks[i]!==solved[i])changed++;
 }
 // Ensure a playable, not pre-solved board (also robust for deterministic RNG).
 for(let retries=0;retries<64&&(pipeFlow(masks,source,n).has(sink)||changed<Math.floor(n*n*.38));retries++){
  let pos=(retries*11+3)%(n*n);
  if(pos===source||pos===sink)pos=(pos+1)%(n*n);
  if(pos===source||pos===sink)continue;
  const next=rotateMask(masks[pos]);
  if(next!==masks[pos])masks[pos]=next;
  changed=masks.reduce((sum,m,i)=>sum+(i!==source&&i!==sink&&m!==solved[i]?1:0),0);
 }
 // Because the destination is a leaf of the generated tree, its solved
 // mask has exactly one inbound port. Misalign that neighbouring pipe on
 // purpose: the destination is provably disconnected at the first frame,
 // even if other randomized rotations accidentally created shortcuts.
 const terminal=neighbors(sink,n).find(e=>(solved[sink]&e.bit)!==0);
 if(terminal&&solved[terminal.at]!==15){
  for(let turns=0;turns<4&&(masks[terminal.at]&terminal.back);turns++)masks[terminal.at]=rotateMask(masks[terminal.at]);
 }
 if(pipeFlow(masks,source,n).has(sink)){
  // Extremely rare backup if the picked terminal's neighbour is a cross.
  // Re-scramble intermediates, not the two fixed endpoint tiles.
  for(let attempt=0;attempt<160&&pipeFlow(masks,source,n).has(sink);attempt++){
   const i=(attempt*11+1)%(n*n);
   if(i!==source&&i!==sink)masks[i]=rotateMask(masks[i]);
  }
 }
 if(pipeFlow(masks,source,n).has(sink))throw Error('無法產生未連通的線路，請重新生成');
 // Preserve the verified solution for deterministic tests and test snapshots.
 return {size:n,source,sink,masks,solvedMasks:solved,solutionSteps:steps};
}
