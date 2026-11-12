import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateOpenGamesMaze,openGamesMazeStep,openGamesMemoryDeck,openGamesMoleTarget} from '../src/apps/ghost/games/vendor/opengames-mechanics.js';
import {createUpstreamSlidePuzzle,puzzleNeighbors,moveUpstreamSlidePuzzle,upstreamSlideSolved} from '../src/apps/ghost/games/vendor/puzzle-slide.js';
import {createArcadeBoard,arcadeAction,arcadeTick,arcadeNeedsTick} from '../src/apps/ghost/games/arcade.js';
import {createUpstreamArcadeBoard,upstreamMazeReachable,upstreamScannerPositions,upstreamArcadeSignature} from '../src/apps/ghost/games/arcade-upstream.js';
import {renderArcade} from '../src/apps/ghost/games/arcade-ui.js';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {seedD04Contracts,acceptD04Contract,submitD04Contract,D04_MAIL,D04_STEP} from '../src/story/d04/contract.js';
import {openCommissionWithGhost} from '../src/services/commissions/attachment-flow.js';
import {authorize,begin,finish} from '../src/apps/ghost/state.js';
import {veilPlan} from '../src/system/remote-control/veil-solver.js';
import {render as renderGhost,handle as handleGhost} from '../src/apps/ghost/index.js';

const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
test('MIT upstream source ports and license notices are retained',()=>{
 const root=new URL('../src/apps/ghost/games/vendor/',import.meta.url);
 const lic=readFileSync(new URL('OPEN_SOURCE_LICENSES.md',root),'utf8');
 assert.match(lic,/Copyright \(c\) 2026 OpenGames contributors/);
 assert.match(lic,/Copyright \(c\) 2024 Krish Lalwani/);
 const m=readFileSync(new URL('opengames-mechanics.js',root),'utf8');
 assert.match(m,/labyrinth\/logic\.js/);
 assert.match(m,/memory\/game\.js/);
 assert.match(m,/whac-a-mole\/game\.js/);
});
test('upstream maze spanning tree connects every cell, with reciprocal walls',()=>{
 for(let seed=1;seed<=25;seed++){
  const maze=generateOpenGamesMaze(seed%2?5:7,rng(seed));
  const visited=new Set([0]),queue=[0];
  for(let i=0;i<queue.length;i++){
   const p=queue[i];
   for(const name of ['up','right','down','left']){
    const n=openGamesMazeStep(maze,p,name);
    if(n!==p&&!visited.has(n)){visited.add(n);queue.push(n);}
   }
  }
  assert.equal(visited.size,maze.size*maze.size);
  assert.equal(maze.cells.length,maze.size*maze.size);
 }
});
test('sliding shuffle performs legal moves, keeps even inversion parity and never starts solved',()=>{
 const unique=new Set();
 for(let seed=1;seed<=100;seed++){
  const b=createUpstreamSlidePuzzle(rng(seed),42);
  assert.deepEqual([...b.tiles].sort((a,b)=>a-b),[0,1,2,3,4,5,6,7,8]);
  assert.equal(b.tiles[b.empty],8);
  assert.equal(upstreamSlideSolved(b),false);
  const values=b.tiles.filter(x=>x!==8);
  const inversions=values.reduce((sum,x,i)=>sum+values.slice(i+1).filter(y=>x>y).length,0);
  assert.equal(inversions%2,0);
  unique.add(b.tiles.join(','));
  const nb=puzzleNeighbors(b.empty);
  assert.equal(moveUpstreamSlidePuzzle(b,nb[0]),true);
  assert.equal(b.steps,1);
 }
 assert.ok(unique.size>85,'boards must not repeat noticeably');
});
test('source-ported memory deck creates varied 4, 8, 10 pair boards',()=>{
 for(const pairs of [4,8,10]){
  const seen=new Set();
  for(let seed=1;seed<=30;seed++){
   const deck=openGamesMemoryDeck(pairs,rng(seed));
   assert.equal(deck.length,pairs*2);
   for(let i=0;i<pairs;i++)assert.equal(deck.filter(x=>x===i).length,2);
   seen.add(deck.join(','));
  }
  assert.ok(seen.size>=25);
 }
});
test('new upstream arcade changes grid size and checks actual displayed signatures',()=>{
 const layouts=new Set();
 for(let seed=1;seed<=50;seed++){
  const b=createUpstreamArcadeBoard('veil',rng(seed),{grade:seed%2?'B':'S'});
  assert.ok([5,7].includes(b.size));
  assert.equal(upstreamMazeReachable(b)>=b.size+3,true);
  assert.ok(!upstreamScannerPositions(b).includes(b.start));
  layouts.add(upstreamArcadeSignature(b));
 }
 assert.ok(layouts.size>=48,'maze geometry should be meaningfully varied');
});
test('a scanner-aware solver can complete many different upstream mazes',()=>{
 for(let seed=1;seed<=15;seed++){
  const b=createUpstreamArcadeBoard('veil',rng(seed),{grade:seed%2?'S':'C'});
  const transitions=['up','right','down','left','wait'];
  const seen=new Set([b.start+':0']);
  const queue=[{at:b.start,phase:0,path:[]}];
  let path=null;
  for(let i=0;i<queue.length;i++){
   const v=queue[i];
   if(v.at===b.exit){path=v.path;break;}
   for(const direction of transitions){
    const next=direction==='wait'?v.at:openGamesMazeStep(b.maze,v.at,direction);
    if(next===v.at&&direction!=='wait')continue;
    const phase=(v.phase+1)%5;
    if(upstreamScannerPositions(b,phase).includes(next))continue;
    const key=next+':'+phase;
    if(seen.has(key))continue;
    seen.add(key);queue.push({at:next,phase,path:[...v.path,direction]});
   }
  }
  assert.ok(path,'maze has a scanner-safe exit path');
  let final;
  for(const direction of path){final=arcadeAction(b,'step',direction,1000);assert.notEqual(final.caught,true);}
  assert.equal(final.won,true);
 }
});
test('new EXTRACT handles variable cards, mismatch timeout, and five pairs data no longer fixed',()=>{
 const b=createArcadeBoard('extract',rng(13),{upstream:true,grade:'A'});
 assert.equal(b.kind,'extract-memory');assert.equal(b.cards.length,16);
 const i=b.cards.findIndex((x,index)=>index>0&&x!==b.cards[0]);
 arcadeAction(b,'tap',0,0);arcadeAction(b,'tap',i,0);
 assert.equal(arcadeNeedsTick(b,850),true);
 assert.equal(arcadeTick(b,850),true);
 assert.equal(b.revealed.length,0);
 let last=null;
 for(const value of new Set(b.cards)){
  const [a,c]=b.cards.map((x,j)=>x===value?j:-1).filter(x=>x>=0);
  arcadeAction(b,'tap',a,1000);
  last=arcadeAction(b,'tap',c,1000);
 }
 assert.equal(last.won,true);
});
test('new STRIKE changes active target on its original Ghost clock even without tapping',()=>{
 const b=createArcadeBoard('strike',rng(24),{upstream:true,grade:'S',now:1000});
 assert.equal(b.kind,'strike-mole');assert.equal(b.goal,10);
 const old=b.target;
 assert.equal(arcadeNeedsTick(b,b.nextSwitchAt),true);
 assert.equal(arcadeTick(b,b.nextSwitchAt,rng(34)),true);
 assert.notEqual(b.target,old);
 let result;
 for(let i=0;i<b.goal;i++){
  result=arcadeAction(b,'tap',b.target,b.nextSwitchAt-10,rng(40+i));
 }
 assert.equal(result.won,true);
 const lost=createArcadeBoard('strike',rng(10),{upstream:true,grade:'B',now:0});
 for(let i=0;i<3;i++)result=arcadeAction(lost,'tap',(lost.target+1)%16,i*10,rng(i+30));
 assert.equal(result.lost,true);
});
test('new games render inside Ghost without remote frames or game-like contract copy',()=>{
 for(const type of ['cipher','extract','veil','strike']){
  const b=createArcadeBoard(type,rng(7),{upstream:true,grade:'B',now:1000});
  assert.ok(b?.upstream,type);
  const markup=renderArcade(b,{},20000);
  assert.match(markup,/data-action="gh-arcade-/);
  assert.doesNotMatch(markup,/iframe|https?:\/\//i);
  if(type==='veil')assert.ok(markup.includes('--maze-columns'));
  if(type==='cipher')assert.ok(markup.includes('gh-arcade-slide'));
 }
});
test('existing D01–D14 and persisted legacy Ghost boards keep the old engine',()=>{
 const s={};authorize(s,{orderId:'old-cipher',type:'cipher'});
 assert.equal(begin(s,'old-cipher',1000),true);
 assert.equal(s.ghost.orders['old-cipher'].board.arcade,undefined);
 assert.ok(Array.isArray(s.ghost.orders['old-cipher'].board.tiles));
 const extract=createArcadeBoard('extract',rng(5));
 const veil=createArcadeBoard('veil',rng(5));
 assert.equal(extract.kind,'extract');assert.equal(veil.kind,'veil');
});
test('real D15 CIPHER passes through KIRA, new arcade tap, READY, manual bank payout once',()=>{
 const s=activateStory55(initialState());
 s.day=15;s.clock='12:00';seedD04Contracts(s);
 const id='M-001';
 assert.equal(acceptD04Contract(s,id),true);
 const step=openCommissionWithGhost(s,D04_MAIL(id));
 assert.equal(step,D04_STEP(id,0));
 const now=Date.now();
 assert.equal(begin(s,step,now),true);
 const run=s.ghost.orders[step];
 assert.equal(run.board.arcade?.kind,'cipher-slide');
 const ctx={store:{get:()=>s,update:fn=>fn(s)},router:{open:()=>{}},refresh:()=>{},toast:()=>{}};
 const loc={appId:'ghost',route:'/run',params:{orderId:step}};
 const html=renderGhost(ctx,loc);
 assert.match(html,/gh-arcade-slide/);
 assert.ok(!html.includes('data-action="gh-tile"'));
 run.board.arcade.tiles=[0,1,2,3,4,5,6,8,7];run.board.arcade.empty=7;
 const balance=s.bankData.balance;
 handleGhost('gh-arcade-tap',{dataset:{value:'8'}},ctx,loc);
 assert.equal(s.content.orders.find(o=>o.id===id).status,'READY');
 assert.equal(s.bankData.balance,balance,'no early $20k grant');
 assert.equal(submitD04Contract(s,id),true);
 assert.equal(s.bankData.balance,balance+650);
 assert.equal(submitD04Contract(s,id),false);
});

test('D16 A-tier progresses original LINK into OSS CIPHER and scanner maze, pays only after Mirage submission',()=>{
 const s=activateStory55(initialState());s.day=16;s.clock='12:00';
 seedD04Contracts(s);
 const orderId='M-007';
 assert.equal(acceptD04Contract(s,orderId),true);
 const first=openCommissionWithGhost(s,D04_MAIL(orderId));
 assert.equal(first,D04_STEP(orderId,0));
 const now=Date.now();
 assert.equal(begin(s,first,now),true);
 assert.equal(s.ghost.orders[first].type,'route');
 assert.equal(s.ghost.orders[first].board?.size,5,'original pipe generator must remain active');
 finish(s,first,true,now+100);
 const cipher=D04_STEP(orderId,1);
 assert.equal(s.ghost.orders[cipher].type,'cipher');
 assert.equal(begin(s,cipher,now+200),true);
 assert.equal(s.ghost.orders[cipher].board.arcade?.kind,'cipher-slide');
 s.ghost.orders[cipher].board.arcade.tiles=[0,1,2,3,4,5,6,8,7];
 s.ghost.orders[cipher].board.arcade.empty=7;
 const ctx={store:{get:()=>s,update:fn=>fn(s)},router:{open:()=>{}},refresh:()=>{},toast:()=>{}};
 let loc={appId:'ghost',route:'/run',params:{orderId:cipher}};
 handleGhost('gh-arcade-tap',{dataset:{value:'8'}},ctx,loc);
 assert.equal(s.ghost.orders[cipher].status,'success');
 const veil=D04_STEP(orderId,2);
 assert.equal(s.ghost.orders[veil].type,'veil');
 assert.equal(begin(s,veil,Date.now()),true);
 const board=s.ghost.orders[veil].board.arcade;
 assert.equal(board.kind,'veil-maze');
 assert.equal(board.size,7);
 const path=veilPlan(board);
 assert.ok(Array.isArray(path)&&path.length>0);
 loc={appId:'ghost',route:'/run',params:{orderId:veil}};
 const startingBalance=s.bankData.balance;
 for(const direction of path){
  handleGhost('gh-arcade-step',{dataset:{value:direction}},ctx,loc);
 }
 assert.equal(s.ghost.orders[veil].status,'success');
 assert.equal(s.content.orders.find(x=>x.id===orderId).status,'READY');
 assert.equal(s.bankData.balance,startingBalance,'no early bank payouts');
 assert.equal(submitD04Contract(s,orderId),true);
 assert.equal(s.bankData.balance,startingBalance+6800);
 assert.equal(submitD04Contract(s,orderId),false);
 assert.equal(s.bankData.transactions.filter(x=>x.id.endsWith(orderId)).length,1);
});
