import test from 'node:test';
import assert from 'node:assert/strict';
import {createArcadeBoard,arcadeAction,arcadeTick,veilScanners,veilReachable,veilNextCell} from '../src/apps/ghost/games/arcade.js';
import {renderArcade} from '../src/apps/ghost/games/arcade-ui.js';
import {authorize,begin,advanceGhost} from '../src/apps/ghost/state.js';

test('restored circuit cipher is never fully scrambled: two swaps solve every new board',async()=>{
 const {createBoard,swap,puzzleSolved}=await import('../src/apps/ghost/games/logic.js');
 for(let n=0;n<100;n++){
  const board=createBoard('cipher',{});
  assert.equal(puzzleSolved(board.tiles),false);
  const errors=board.tiles.flatMap((value,i)=>value===i?[]:[i]);
  assert.equal(errors.length,4,'exactly two misplaced pairs');
  let tiles=board.tiles;
  for(let i=0;i<9;i++){
   if(tiles[i]!==i)tiles=swap(tiles,i,tiles.indexOf(i));
  }
  assert.equal(puzzleSolved(tiles),true);
 }
 const single=createBoard('cipher',{cipherSwaps:1});
 assert.equal(single.tiles.filter((value,i)=>value!==i).length,2);
});
test('memory extraction exposes pairs, rejects double taps, and clears mismatches after 720ms',()=>{
 const b=createArcadeBoard('extract');
 assert.equal(b.cards.length,10);
 const first=0,other=b.cards.findIndex((c,i)=>i>0&&c!==b.cards[0]);
 arcadeAction(b,'tap',first,0);arcadeAction(b,'tap',other,0);
 assert.equal(b.revealed.length,2);
 assert.equal(arcadeAction(b,'tap',2,100).changed,false);
 assert.equal(arcadeTick(b,719),false);
 assert.equal(arcadeTick(b,720),true);
 for(const value of new Set(b.cards)){
  const positions=b.cards.flatMap((v,i)=>v===value?[i]:[]);
  arcadeAction(b,'tap',positions[0],1000);
  const result=arcadeAction(b,'tap',positions[1],1000);
  if(b.matched.length===10)assert.equal(result.won,true);
 }
 assert.equal(b.matched.length,10);
 assert.deepEqual(structuredClone(b).matched,b.matched);
});
test('stealth generates accessible 5x5 mazes and scanners advance by turn',()=>{
 for(let n=0;n<50;n++){
  const b=createArcadeBoard('veil');
  assert.ok(veilReachable(b)>=8);
  assert.equal(b.walls.includes(0),false);
  assert.equal(b.walls.includes(24),false);
  assert.equal(veilNextCell(0,'left',b.walls),null);
  assert.equal(veilNextCell(24,'down',b.walls),null);
 }
 assert.notDeepEqual(veilScanners(0),veilScanners(1));
});
test('strike requires six actual taps, three misses fail, timer alone never succeeds',()=>{
 const b=createArcadeBoard('strike');
 for(let i=0;i<6;i++){
  const result=arcadeAction(b,'tap',b.target,1000,()=>0.25);
  if(i<5)assert.equal(result.won,false);
  else assert.equal(result.won,true);
 }
 const failed=createArcadeBoard('strike');
 for(let i=0;i<3;i++){
  const result=arcadeAction(failed,'tap',(failed.target+1)%16,1000,()=>0.2);
  if(i===2)assert.equal(result.lost,true);
 }
 const s={};authorize(s,{orderId:'new-strike',type:'strike'});
 assert.equal(begin(s,'new-strike',1000),true);
 const o=s.ghost.orders['new-strike'];
 assert.equal(o.board.arcade.kind,'strike');
 advanceGhost(s,1000+5200);
 assert.equal(o.status,'running');
 advanceGhost(s,o.deadline);
 assert.equal(o.status,'failed');
});
test('all arcade games render touch controls; new attempts use arcade, old saved attempts are unaffected',()=>{
 for(const type of ['extract','veil','strike']){
  const b=createArcadeBoard(type);
  const html=renderArcade(b,{type},30000);
  assert.match(html,/gh-arcade/);
  assert.match(html,/data-action="gh-arcade-/);
 }
 const s={};
 authorize(s,{orderId:'new-cipher',type:'cipher'});
 begin(s,'new-cipher',1000);
 assert.equal(s.ghost.orders['new-cipher'].board.arcade,undefined,'new runs must use original circuit swap, not Lights Out');
 assert.ok(Array.isArray(s.ghost.orders['new-cipher'].board.tiles),'original board retained');
});
