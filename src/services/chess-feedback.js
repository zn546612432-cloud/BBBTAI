// Visual feedback is an attribute of the existing move/result, never a clock.
export function recordChessFeedback(match,move=null){
 const events=[];
 const ply=match.history.length;
 if(move?.captured)events.push({id:`capture-${ply}`,kind:'capture',square:move.flags?.includes('e')?move.to[0]+move.from[1]:move.to,
  piece:move.captured,color:move.color==='w'?'b':'w'});
 if(match.status==='finished')events.push({id:'finish',result:match.result,kind:match.result==='player-win'?'win':match.result==='draw'?'draw':'loss'});
 if(!events.length)return false;
 const seen=match.feedbackEvents??=[];
 for(const event of events)if(!seen.some(x=>x.id===event.id))seen.push({...event,createdAt:Date.now(),consumed:false});
 // Old captures are never needed for replay; history/PGN retains the moves.
 match.feedbackEvents=seen.slice(-4);
 return true;
}
