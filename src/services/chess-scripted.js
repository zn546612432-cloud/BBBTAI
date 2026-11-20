import {Chess} from 'chess.js';
import {recordChessFeedback} from './chess-feedback.js';
import {D41_CHESS_MOVES,D41_CHESS_CUES,D41_CHESS_DRAFT,isD41Chess,d41ChessComplete} from '../story/d34-d42/d41-chess.js';

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
 if(played)script.spoken.push(ply);else (script.voiceUnavailable??=[]).push(ply);
 delete script.voiceFailed;script.pendingVoice=null;if(ply===D41_CHESS_MOVES.length&&m.result==='player-win')script.completed=true;done=true;});return done;
}
