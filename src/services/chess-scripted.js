import {Chess} from 'chess.js';
import {recordChessFeedback} from './chess-feedback.js';
import {D41_CHESS_MOVES,D41_CHESS_CUES,D41_CHESS_DRAFT,isD41Chess,d41ChessComplete} from '../story/d34-d42/d41-chess.js';

// Recover previously skipped recordings in the current day's saved match.
export function reconcileD41ChessCues(store,id){
 const m=store.get().matches.find(x=>x.id===id),script=m?.d41Script;
 if(!isD41Chess(m)||!script)return false;
 const missed=(script.voiceUnavailable||[]).filter(p=>D41_CHESS_CUES[p]&&!script.spoken.includes(p));
 if(script.pendingVoice!==13&&!script.spoken.includes(13)&&!(script.voiceUnavailable||[]).includes(13)&&(!missed.length||script.pendingVoice))return false;
 store.update(s=>{
  const match=s.matches.find(x=>x.id===id),a=match.d41Script;
  a.spoken=a.spoken.filter(p=>p!==13);match.chat=match.chat.filter(c=>c.id!==match.id+'-d41-cue-13');
  if(missed.length)a.voiceUnavailable=missed;else delete a.voiceUnavailable;
  if(a.pendingVoice===13)a.pendingVoice=null;
  if(!a.pendingVoice)a.pendingVoice=missed[0]??null;
  if(a.pendingVoice)a.completed=false;
  else if(match.result==='player-win'&&Object.keys(D41_CHESS_CUES).every(p=>a.spoken.includes(Number(p))))a.completed=true;
 });
 return true;
}
export {isD41Chess,d41ChessComplete};
export function initializeD41Chess(match){
 if(!isD41Chess(match)||match.d41Script||match.status!=='active')return false;
 // Retain pre-update unscripted history without mixing incompatible positions.
 if(match.history?.length)match.legacyBeforeD41Script={pgn:match.pgn,history:match.history,chat:match.chat};
 Object.assign(match,{pgn:'',history:[],chat:[],turn:'w',d41Script:{spoken:[],pendingVoice:null,completed:false}});
 delete match.engineError;delete match.feedbackEvents;
 return true;
}
export const d41ChessDraft=match=>isD41Chess(match)&&match.status==='active'&&match.d41Script&&!match.d41Script.pendingVoice&&match.history.length===D41_CHESS_MOVES.length-1?D41_CHESS_DRAFT:null;
function moveOne(s,match){
 const script=match.d41Script,game=new Chess();if(match.pgn)game.loadPgn(match.pgn);
 const ply=match.history.length+1,move=game.move(D41_CHESS_MOVES[ply-1]);
 match.pgn=game.pgn();match.turn=game.turn();match.history.push({from:move.from,to:move.to,san:move.san,by:move.color==='w'?'player':'tai-script'});
 s.events.push({type:'chess_move',matchId:match.id,move:move.san,by:move.color==='w'?'player':'tai-script',day:s.day,clock:s.clock});
 if(game.isGameOver()){if(!game.isCheckmate()||ply!==D41_CHESS_MOVES.length)throw Error('劇情棋譜終局不一致');match.status='finished';match.result='player-win';}
 recordChessFeedback(match,move);
 const text=D41_CHESS_CUES[ply];
 if(text){script.pendingVoice=ply;match.chat.push({id:`${match.id}-d41-cue-${ply}`,from:'tai',text,time:s.clock});}
 if(ply===D41_CHESS_MOVES.length-1)script.draftStartedAt=Date.now();
 return move;
}
export function advanceD41Chess(store,id){
 let moved=false;store.update(s=>{const m=s.matches.find(x=>x.id===id);if(!isD41Chess(m)||m.status!=='active')return;
 initializeD41Chess(m);if(m.d41Script.pendingVoice||d41ChessDraft(m))return;
 moveOne(s,m);moved=true;});return moved;
}
export function sendD41ChessDraft(store,id,text){
 let sent=false;store.update(s=>{const m=s.matches.find(x=>x.id===id);if(!d41ChessDraft(m)||text!==D41_CHESS_DRAFT)return;
 m.chat.push({id:`${m.id}-d41-checkmate`,from:'player',text,time:s.clock});moveOne(s,m);sent=true;});return sent;
}
export function completeD41ChessCue(store,id,ply,{played=true}={}){
 let done=false;store.update(s=>{const m=s.matches.find(x=>x.id===id);const script=m?.d41Script;
 if(!isD41Chess(m)||script?.pendingVoice!==ply)return;
 if(!played)return;
 if(!script.spoken.includes(ply))script.spoken.push(ply);
 if(script.voiceUnavailable){script.voiceUnavailable=script.voiceUnavailable.filter(p=>p!==ply);if(!script.voiceUnavailable.length)delete script.voiceUnavailable;}
 delete script.voiceFailed;script.pendingVoice=script.voiceUnavailable?.find(p=>D41_CHESS_CUES[p]&&!script.spoken.includes(p))??null;
 if(m.result==='player-win'&&!script.pendingVoice&&Object.keys(D41_CHESS_CUES).every(p=>script.spoken.includes(Number(p))))script.completed=true;done=true;});return done;
}
