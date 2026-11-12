// EXTRACT memory helper: only use card faces the existing GHOST UI has
// actually revealed or matched. Hidden cards must never be inspected.
const validIndex=(n,count)=>Number.isInteger(n)&&n>=0&&n<count;
const validSymbol=s=>typeof s==='string'&&s.length>0&&s.length<=32;
export function extractNextTap(board,previous={}){
 const count=board?.cardCount;
 if(!Number.isInteger(count)||count<8||count>20||count%2!==0||
    !Array.isArray(board.revealed)||!Array.isArray(board.matched)||
    !Array.isArray(board.visible)||!previous||typeof previous!=='object'||
    Array.isArray(previous)||board.revealed.length>2||board.matched.length>count||
    [...board.revealed,...board.matched].some(i=>!validIndex(i,count))||
    new Set(board.revealed).size!==board.revealed.length||
    new Set(board.matched).size!==board.matched.length)return null;
 const known={};
 for(const [key,symbol] of Object.entries(previous)){
  const idx=Number(key);
  if(!validIndex(idx,count)||String(idx)!==key||!validSymbol(symbol))return null;
  known[idx]=symbol;
 }
 const opened=new Set([...board.revealed,...board.matched]);
 for(const entry of board.visible){
  if(!entry||!validIndex(entry.index,count)||!opened.has(entry.index)||
     !validSymbol(entry.symbol))return null;
  known[entry.index]=entry.symbol;
 }
 const out={known};
 if(board.matched.length===count)return {...out,done:true};
 if(Number.isFinite(board.lockUntil)&&board.lockUntil>0)
  return {...out,waitUntil:board.lockUntil};
 if(board.revealed.length===2)return null; // existing GHOST must clear the pair
 const matched=new Set(board.matched),revealed=new Set(board.revealed);
 const remaining=Array.from({length:count},(_,i)=>i).filter(i=>!matched.has(i));
 if(revealed.size===1){
  const first=board.revealed[0],symbol=known[first];
  if(!symbol)return null;
  const oldMatch=remaining.find(i=>i!==first&&known[i]===symbol);
  if(oldMatch!==undefined)return {...out,index:oldMatch};
  const unknown=remaining.find(i=>i!==first&&!Object.hasOwn(known,i));
  return unknown===undefined?null:{...out,index:unknown};
 }
 // When the full pair is known, use it; otherwise reveal one unseen card.
 for(const first of remaining){
  const symbol=known[first];
  if(!symbol)continue;
  const partner=remaining.find(other=>other!==first&&known[other]===symbol);
  if(partner!==undefined)return {...out,index:first};
 }
 const unseen=remaining.find(i=>!Object.hasOwn(known,i));
 return unseen===undefined?null:{...out,index:unseen};
}
export function extractLegacyChoice(board){
 if(board?.kind!=='legacy-fingerprint'||typeof board.target!=='string'||
    !Array.isArray(board.options)||board.options.length!==4||
    board.options.some(value=>typeof value!=='string'))return null;
 const index=board.options.findIndex(value=>value===board.target);
 return index<0?null:index;
}
