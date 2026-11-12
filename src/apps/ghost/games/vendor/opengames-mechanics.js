/**
 * Selected source-ported, pure mechanics from OpenGames (MIT).
 * https://github.com/opengames-dev/opengames-dev.github.io
 * labyrinth/logic.js — DFS maze generator and reciprocal cell walls
 * memory/game.js — duplicate-pair deck and Fisher–Yates shuffle
 * whac-a-mole/game.js — uniform target choices, no immediate repeats and
 * shrinking target response windows.
 *
 * Copyright (c) 2026 OpenGames contributors.
 * See OPEN_SOURCE_LICENSES.md for the retained MIT license text.
 * The DOM, frame loops, audio, styling, score storage and browser globals
 * are intentionally not imported: the existing Ghost controller owns those.
 */
const directions = {
 up: {x:0,y:-1,wall:0,opposite:2},
 right: {x:1,y:0,wall:1,opposite:3},
 down: {x:0,y:1,wall:2,opposite:0},
 left: {x:-1,y:0,wall:3,opposite:1}
};
export {directions as OG_MAZE_DIRECTIONS};

// Source port of OpenGames labyrinth/logic.js generate(size, random).
export function generateOpenGamesMaze(size,random=Math.random){
 const cells=Array.from({length:size*size},()=>[true,true,true,true]);
 const visited=new Set([0]),stack=[0];
 while(stack.length){
  const current=stack[stack.length-1];
  const x=current%size,y=Math.floor(current/size);
  const neighbors=Object.values(directions).filter(d=>{
   const nx=x+d.x,ny=y+d.y;
   return nx>=0&&nx<size&&ny>=0&&ny<size&&!visited.has(ny*size+nx);
  });
  if(!neighbors.length){stack.pop();continue;}
  const next=neighbors[Math.floor(random()*neighbors.length)];
  const index=(y+next.y)*size+x+next.x;
  cells[current][next.wall]=false;
  cells[index][next.opposite]=false;
  visited.add(index);stack.push(index);
 }
 return {size,cells};
}
// Source port of OpenGames labyrinth/logic.js move().
export function openGamesMazeStep(maze,index,name){
 const d=directions[name];
 if(!d||!Number.isInteger(index)||index<0||index>=maze.cells.length||maze.cells[index][d.wall])return index;
 return index+d.y*maze.size+d.x;
}
// Source port of OpenGames memory/game.js restart(): duplicate and shuffle.
export function openGamesMemoryDeck(total,random=Math.random){
 const deck=Array.from({length:total*2},(_,i)=>i%total);
 for(let i=deck.length-1;i>0;i--){
  const j=Math.floor(random()*(i+1));
  [deck[i],deck[j]]=[deck[j],deck[i]];
 }
 return deck;
}
// Source port of OpenGames whac-a-mole/game.js spawn(): uniform among
// all other holes, with no repeated location on consecutive spawns.
export function openGamesMoleTarget(count,previous=-1,random=Math.random){
 const choices=Array.from({length:count},(_,i)=>i).filter(i=>i!==previous);
 return choices[Math.floor(random()*choices.length)];
}
// Same shrinking difficulty window as OpenGames, with customizable base.
export function openGamesMoleLifetime(elapsed,base=1150){
 return Math.max(650,base-Math.min(1,elapsed/30000)*260);
}
