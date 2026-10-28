export function shuffle(a,random=Math.random){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
export function puzzleSolved(tiles){return tiles.every((v,i)=>v===i);}
export function swap(tiles,a,b){const next=[...tiles];[next[a],next[b]]=[next[b],next[a]];return next;}
// Each mask stores N/E/S/W ports. Rotation and traversal use the same ports.
export const rotate=mask=>((mask<<1)&15)|(mask>>3);
export const routeSolution=[2,10,12,6,10,9,3,10,8];
export function connected(masks){const seen=new Set([0]),queue=[0],dirs=[[-3,1,4],[1,2,8],[3,4,1],[-1,8,2]];while(queue.length){const at=queue.shift();for(const [delta,port,back] of dirs){const next=at+delta;if(next<0||next>=9||Math.abs(next%3-at%3)>1)continue;if((masks[at]&port)&&(masks[next]&back)&&!seen.has(next)){seen.add(next);queue.push(next);}}}return seen;}
export function createBoard(type,config,random=Math.random){
 if(type==='cipher'){let tiles=shuffle([0,1,2,3,4,5,6,7,8],random);if(puzzleSolved(tiles))tiles=swap(tiles,0,1);return {tiles,selected:null};}
 if(type==='route'){const masks=routeSolution.map(m=>{for(let i=Math.floor(random()*4);i>0;i--)m=rotate(m);return m;});if(connected(masks).has(8))masks[0]=rotate(masks[0]);return {masks};}
 if(type==='extract')return {...fingerprints(random),round:0};
 if(type==='veil')return {code:newCode(config.codeLength,random),input:'',round:0};
 return {};
}
export function newCode(n,random=Math.random){return Array.from({length:n},()=>Math.floor(random()*10)).join('');}
export function fingerprints(random=Math.random){const target=newCode(6,random),correct=Math.floor(random()*4),options=Array.from({length:4},(_,i)=>{if(i===correct)return target;const pos=i%6;return target.slice(0,pos)+((Number(target[pos])+i+1)%10)+target.slice(pos+1);});return {target,options,correct};}
