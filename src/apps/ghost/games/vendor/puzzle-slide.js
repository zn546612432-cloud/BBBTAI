/**
 * Pure state adapter of Classic Puzzle Maker's legal-move shuffle.
 * Upstream MIT: https://github.com/krishealty/puzzle/blob/main/fifteen_puzzle.js
 * Copyright (c) 2024 Krish Lalwani.
 * Source method stir_slots() shuffles by moving the free slot rather than
 * permuting image pieces, guaranteeing a solvable state; move_slot() only
 * allows blocks aligned with the free slot. Ghost uses the adjacent variant
 * because the board is a 3×3 touch target.
 * See OPEN_SOURCE_LICENSES.md (MIT). No original DOM/timer is imported.
 */
const adj=(i,size=3)=>[
 ...(i>=size?[i-size]:[]),
 ...(i<size*(size-1)?[i+size]:[]),
 ...(i%size>0?[i-1]:[]),
 ...(i%size<size-1?[i+1]:[])
];
export const puzzleNeighbors=(i,size=3)=>adj(i,size);
export function createUpstreamSlidePuzzle(random=Math.random,moves=42,size=3){
 const emptyTile=size*size-1;
 const tiles=Array.from({length:size*size},(_,i)=>i);
 let empty=emptyTile,prev=-1;
 const count=Math.max(18,Math.floor(moves));
 // Legal shuffling through the free slot is the source project's key rule.
 for(let i=0;i<count;i++){
  const options=adj(empty,size).filter(n=>n!==prev);
  const target=options[Math.min(options.length-1,Math.floor(random()*options.length))];
  [tiles[empty],tiles[target]]=[tiles[target],tiles[empty]];
  prev=empty;empty=target;
 }
 if(tiles.every((x,i)=>x===i)){
  const target=adj(empty,size)[0];
  [tiles[empty],tiles[target]]=[tiles[target],tiles[empty]];
  empty=target;
 }
 return {kind:'cipher-slide',size,tiles,empty,steps:0};
}
export function moveUpstreamSlidePuzzle(board,index){
 if(!Number.isInteger(index)||!adj(board.empty,board.size).includes(index))return false;
 [board.tiles[board.empty],board.tiles[index]]=[board.tiles[index],board.tiles[board.empty]];
 board.empty=index;board.steps++;
 return true;
}
export const upstreamSlideSolved=board=>board.tiles.every((value,index)=>value===index);
