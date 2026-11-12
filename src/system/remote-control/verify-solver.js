// VERIFY is a visible, ordered-module puzzle in the existing GHOST game.
// Plan exactly the NEXT native button press; never mutate the board or win state.
export function verifyNextToken(board){
 if(!board||!Array.isArray(board.target)||!Array.isArray(board.tokens)||
    !Array.isArray(board.input)||!Array.isArray(board.used)||
    board.target.length!==4||board.tokens.length!==4||
    board.input.length>4||board.used.length!==board.input.length||
    new Set(board.target).size!==4||new Set(board.tokens).size!==4||
    board.target.some(t=>typeof t!=='string'||!t.trim())||
    board.tokens.some(t=>typeof t!=='string'||!t.trim())||
    board.target.some(t=>!board.tokens.includes(t))||
    new Set(board.used).size!==board.used.length||
    board.used.some(i=>!Number.isInteger(i)||i<0||i>=4))return null;
 // The current saved state must be a valid prefix of the target, including
 // native GHOST button indices used to reach it. Reject stale/corrupt saves.
 for(let i=0;i<board.input.length;i++){
  if(board.input[i]!==board.target[i]||
     board.tokens[board.used[i]]!==board.input[i])return null;
 }
 if(board.input.length===4)return {done:true,progress:4};
 const next=board.target[board.input.length];
 const index=board.tokens.indexOf(next);
 if(index<0||board.used.includes(index))return null;
 return {done:false,index,expected:next,progress:board.input.length};
}
