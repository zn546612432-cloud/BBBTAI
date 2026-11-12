/**
 * GHOST arcade mini-games. Original vanilla-JS implementations inspired by
 * MIT-licensed Memory, maze and reaction arcade examples.
 * CIPHER retains the older circuit-swap game in logic.js.
 * No external runtime, network access, or upstream visual assets.
 */
import {createUpstreamArcadeBoard,upstreamArcadeAction,upstreamArcadeTick,upstreamArcadeNeedsTick} from './arcade-upstream.js';
const draw=(random,max)=>Math.max(0,Math.min(max-1,Math.floor(random()*max)));
const mix=(values,random)=>{const a=[...values];for(let i=a.length-1;i>0;i--){const j=draw(random,i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const targetSymbols=['A1','B7','C3','D9','E4','F2','G8','H5','J6','K0','M3','N7'];
const exits={up:-5,down:5,left:-1,right:1,wait:0};
export function veilScanners(phase){return [5*(1+((phase+0)%3))+1,5*(1+((phase+1)%3))+3];}
export function veilNextCell(position,direction,walls=[]){
 if(!Object.hasOwn(exits,direction))return null;
 const next=position+exits[direction];
 if(next<0||next>=25||direction==='left'&&position%5===0||direction==='right'&&position%5===4||walls.includes(next))return null;
 return next;
}
export function veilReachable(board){
 const seen=new Set(['0:0']),queue=[[0,0,0]];
 for(let q=0;q<queue.length;q++){
  const [position,phase,steps]=queue[q];if(position===24)return steps;
  for(const direction of Object.keys(exits)){
   const next=veilNextCell(position,direction,board.walls);if(next===null)continue;
   const newPhase=(phase+1)%3;
   if(veilScanners(newPhase).includes(next))continue;
   const key=next+':'+newPhase;
   if(!seen.has(key)){seen.add(key);queue.push([next,newPhase,steps+1]);}
  }
 }
 return -1;
}
function createVeil(random){
 for(let n=0;n<80;n++){
  const walls=mix(Array.from({length:23},(_,i)=>i+1).filter(i=>i!==24),random).slice(0,5);
  const board={kind:'veil',size:5,walls,player:0,phase:0,heat:0,steps:0,exit:24};
  const length=veilReachable(board);
  if(length>=8&&length<=35)return board;
 }
 return {kind:'veil',size:5,walls:[],player:0,phase:0,heat:0,steps:0,exit:24};
}
export function createArcadeBoard(type,random=Math.random,options={}){
 if(options.upstream)return createUpstreamArcadeBoard(type,random,options);
 if(type==='extract'){
  const symbols=mix(targetSymbols,random).slice(0,5);
  return {kind:'extract',cards:mix([...symbols,...symbols],random),revealed:[],matched:[],lockUntil:0,errors:0};
 }
 if(type==='veil')return createVeil(random);
 if(type==='strike')return {kind:'strike',target:draw(random,16),hits:0,misses:0,goal:6,maxMisses:3,started:0};
 return null;
}
export function arcadeTick(board,now=Date.now(),random=Math.random){
 if(board?.upstream)return upstreamArcadeTick(board,now,random);
 if(board?.kind==='extract'&&board.lockUntil&&now>=board.lockUntil){board.revealed=[];board.lockUntil=0;return true;}
 return false;
}
/** Updates a serializable board. Caller owns the success/failure transitions. */
export function arcadeAction(board,action,value,now=Date.now(),random=Math.random){
 if(!board)return {changed:false};
 if(board.upstream)return upstreamArcadeAction(board,action,value,now,random);
 if(board.kind==='extract'&&action==='tap'){
  arcadeTick(board,now);
  const i=Number(value);
  if(!Number.isInteger(i)||i<0||i>=board.cards.length||board.lockUntil||board.matched.includes(i)||board.revealed.includes(i))return {changed:false};
  board.revealed.push(i);
  if(board.revealed.length===2){
   const [a,b]=board.revealed;
   if(board.cards[a]===board.cards[b]){board.matched.push(a,b);board.revealed=[];}
   else {board.errors++;board.lockUntil=now+720;}
  }
  return {changed:true,won:board.matched.length===board.cards.length};
 }
 if(board.kind==='veil'&&action==='step'){
  const next=veilNextCell(board.player,String(value),board.walls);
  if(next===null)return {changed:false};
  board.phase=(board.phase+1)%3;board.steps++;
  if(veilScanners(board.phase).includes(next)){
   board.player=0;board.phase=0;board.heat++;
   return {changed:true,caught:true};
  }
  board.player=next;
  return {changed:true,won:next===board.exit};
 }
 if(board.kind==='strike'&&action==='tap'){
  const index=Number(value);
  if(!Number.isInteger(index)||index<0||index>15)return {changed:false};
  if(index===board.target)board.hits++;else board.misses++;
  const won=board.hits>=board.goal,lost=board.misses>=board.maxMisses;
  if(!won&&!lost){const offset=1+draw(random,15);board.target=(board.target+offset)%16;}
  return {changed:true,won,lost};
 }
 return {changed:false};
}

export const arcadeNeedsTick=(board,now)=>board?.upstream?upstreamArcadeNeedsTick(board,now):board?.kind==='extract'&&board.lockUntil&&now>=board.lockUntil;
