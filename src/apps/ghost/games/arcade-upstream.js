/**
 * Open-source arcade adapters for new Ghost commissions.
 * The imported mechanics are actual locally vendored, credited MIT source
 * ports; Ghost owns state, clock, persistence, UI, rewards and session gates.
 * Legacy boards keep running with games/arcade.js and games/logic.js.
 */
import {generateOpenGamesMaze,openGamesMazeStep,openGamesMemoryDeck,
 openGamesMoleTarget,openGamesMoleLifetime} from './vendor/opengames-mechanics.js';
import {createUpstreamSlidePuzzle,moveUpstreamSlidePuzzle,
 upstreamSlideSolved} from './vendor/puzzle-slide.js';

const symbols=['A1','B7','C3','D9','E4','F2','G8','H5','J6','K0','M3','N7','P2','Q7','R4','T8'];
const choose=(random,n)=>Math.max(0,Math.min(n-1,Math.floor(random()*n)));
const directions=['up','right','down','left'];
const neighbors=(maze,index)=>directions.map(d=>openGamesMazeStep(maze,index,d)).filter(n=>n!==index);
function mazeDistances(maze,start){
 const dist=Array(maze.cells.length).fill(-1),queue=[start];
 dist[start]=0;
 for(let i=0;i<queue.length;i++)
  for(const to of neighbors(maze,queue[i]))if(dist[to]<0){
   dist[to]=dist[queue[i]]+1;queue.push(to);
  }
 return dist;
}
const pick=(items,random)=>items[choose(random,items.length)];
const scannerPos=(board,phase)=>board.scanners.map(path=>path[phase%path.length]);
export const upstreamScannerPositions=(board,phase=board.phase)=>scannerPos(board,phase);
function makeScannerPath(maze,start,exit,random){
 const candidates=Array.from({length:maze.cells.length},(_,i)=>i)
  .filter(i=>i!==start&&i!==exit);
 let cell=pick(candidates,random);
 const path=[];
 for(let turn=0;turn<5;turn++){
  path.push(cell);
  const options=[cell,...neighbors(maze,cell)]
   .filter(i=>i!==start&&i!==exit);
  cell=pick(options.length?options:[cell],random);
 }
 return path;
}
export function upstreamMazeReachable(board){
 const visited=new Set([board.start+':0']),queue=[[board.start,0,0]];
 const states=board.maze.cells.length*5;
 for(let i=0;i<queue.length&&i<states;i++){
  const [at,phase,steps]=queue[i];
  if(at===board.exit)return steps;
  for(const direction of [...directions,'wait']){
   const next=direction==='wait'?at:openGamesMazeStep(board.maze,at,direction);
   if(next===at&&direction!=='wait')continue;
   const nextPhase=(phase+1)%5;
   if(scannerPos(board,nextPhase).includes(next))continue;
   const key=next+':'+nextPhase;
   if(!visited.has(key)){visited.add(key);queue.push([next,nextPhase,steps+1]);}
  }
 }
 return -1;
}
function makeMazeBoard(random,size){
 for(let attempt=0;attempt<80;attempt++){
  const maze=generateOpenGamesMaze(size,random);
  const corners=[0,size-1,size*(size-1),size*size-1];
  const start=pick(corners,random);
  const distances=mazeDistances(maze,start);
  const max=Math.max(...distances);
  const destinations=distances.flatMap((x,i)=>x===max?[i]:[]);
  const exit=pick(destinations,random);
  const scanners=[makeScannerPath(maze,start,exit,random),makeScannerPath(maze,start,exit,random)];
  const b={upstream:true,kind:'veil-maze',size,maze,start,player:start,exit,scanners,phase:0,heat:0,steps:0};
  const steps=upstreamMazeReachable(b);
  if(steps>=size+3)return b;
 }
 // The game is guaranteed playable even with an adversarial deterministic RNG.
 const maze=generateOpenGamesMaze(size,random),start=0,exit=size*size-1;
 const b={upstream:true,kind:'veil-maze',size,maze,start,player:start,exit,scanners:[],phase:0,heat:0,steps:0};
 return b;
}
export function createUpstreamArcadeBoard(type,random=Math.random,{grade='B',now=Date.now()}={}){
 if(type==='cipher'){
  const depth={C:26,B:38,A:52,S:64}[grade]||38;
  // Refuse a trivial scramble even if random() is deterministic or unlucky.
  let board;
  for(let attempt=0;attempt<20;attempt++){
   board=createUpstreamSlidePuzzle(random,depth+attempt*2);
   if(board.tiles.filter((v,i)=>v!==i).length>=5)break;
  }
  return {...board,upstream:true};
 }
 if(type==='extract'){
  const pairs={C:4,B:6,A:8,S:10}[grade]||6;
  const indexes=openGamesMemoryDeck(pairs,random);
  const labels=Array.from({length:pairs},(_,i)=>symbols[i]);
  return {upstream:true,kind:'extract-memory',cards:indexes.map(i=>labels[i]),
   cols:pairs===10?5:4,revealed:[],matched:[],lockUntil:0,errors:0};
 }
 if(type==='veil')return makeMazeBoard(random,grade==='A'||grade==='S'?7:5);
 if(type==='strike'){
  const goal={C:5,B:6,A:8,S:10}[grade]||6;
  const dwell={C:1450,B:1150,A:970,S:800}[grade]||1150;
  const target=openGamesMoleTarget(16,-1,random);
  return {upstream:true,kind:'strike-mole',target,previous:target,hits:0,misses:0,
   goal,maxMisses:3,dwell,startedAt:now,nextSwitchAt:now+dwell};
 }
 return null;
}
export const upstreamArcadeSignature=board=>board.kind==='cipher-slide'
 ?board.tiles.join(','):board.kind==='extract-memory'
 ?board.cards.join(','):board.kind==='veil-maze'
 ?JSON.stringify([board.start,board.exit,board.maze.cells,board.scanners])
 :board.kind==='strike-mole'?String(board.target):'';
export function upstreamArcadeNeedsTick(board,now){
 return board?.kind==='extract-memory'&&board.lockUntil>0&&now>=board.lockUntil
  ||board?.kind==='strike-mole'&&now>=board.nextSwitchAt;
}
export function upstreamArcadeTick(board,now=Date.now(),random=Math.random){
 if(board.kind==='extract-memory'&&board.lockUntil&&now>=board.lockUntil){
  board.revealed=[];board.lockUntil=0;return true;
 }
 if(board.kind==='strike-mole'&&now>=board.nextSwitchAt){
  board.target=openGamesMoleTarget(16,board.previous,random);
  board.previous=board.target;
  board.nextSwitchAt=now+openGamesMoleLifetime(now-board.startedAt,board.dwell);
  return true;
 }
 return false;
}
export function upstreamArcadeAction(board,action,value,now=Date.now(),random=Math.random){
 if(board.kind==='cipher-slide'&&action==='tap'){
  const changed=moveUpstreamSlidePuzzle(board,Number(value));
  return {changed,won:changed&&upstreamSlideSolved(board)};
 }
 if(board.kind==='extract-memory'&&action==='tap'){
  upstreamArcadeTick(board,now,random);
  const i=Number(value);
  if(!Number.isInteger(i)||i<0||i>=board.cards.length||board.lockUntil
   ||board.matched.includes(i)||board.revealed.includes(i))return {changed:false};
  board.revealed.push(i);
  if(board.revealed.length===2){
   const [a,b]=board.revealed;
   if(board.cards[a]===board.cards[b]){
    board.matched.push(a,b);board.revealed=[];
   }else{board.errors++;board.lockUntil=now+850;}
  }
  return {changed:true,won:board.matched.length===board.cards.length};
 }
 if(board.kind==='veil-maze'&&action==='step'){
  const direction=String(value);
  if(!directions.includes(direction)&&direction!=='wait')return {changed:false};
  const next=direction==='wait'?board.player:openGamesMazeStep(board.maze,board.player,direction);
  if(next===board.player&&direction!=='wait')return {changed:false};
  board.phase=(board.phase+1)%5;board.steps++;
  if(scannerPos(board,board.phase).includes(next)){
   board.heat++;board.player=board.start;board.phase=0;
   return {changed:true,caught:true};
  }
  board.player=next;
  return {changed:true,won:next===board.exit};
 }
 if(board.kind==='strike-mole'&&action==='tap'){
  upstreamArcadeTick(board,now,random);
  const i=Number(value);
  if(!Number.isInteger(i)||i<0||i>=16)return {changed:false};
  if(i===board.target)board.hits++;else board.misses++;
  const won=board.hits>=board.goal,lost=board.misses>=board.maxMisses;
  if(!won&&!lost){
   board.target=openGamesMoleTarget(16,board.previous,random);
   board.previous=board.target;
   board.nextSwitchAt=now+openGamesMoleLifetime(now-board.startedAt,board.dwell);
  }
  return {changed:true,won,lost};
 }
 return {changed:false};
}
