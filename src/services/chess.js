import {askTai,aiStatus} from './ai/gateway.js';
import {unpackTaiReply} from './ai/format.js';
import {Chess} from 'chess.js';
export function loadGame(match){const game=new Chess();if(match?.pgn)game.loadPgn(match.pgn);return game;}
export function playMove(store,matchId,from,to){let outcome=null;store.update(s=>{const match=s.matches.find(m=>m.id===matchId);if(!match||match.status!=='active')throw Error('棋局不存在');const game=loadGame(match);if(game.turn()!=='w')throw Error('请等待对手');const move=game.move({from,to,promotion:'q'});if(!move)throw Error('不合法的走法');match.pgn=game.pgn();match.history.push({from,to,san:move.san,by:'player'});match.turn=game.turn();s.events.push({type:'chess_move',matchId,move:move.san,by:'player',day:s.day,clock:s.clock});if(game.isGameOver()){match.status='finished';match.result=game.isCheckmate()?'player-win':'draw';}outcome={san:move.san,finished:game.isGameOver()};});return outcome;}
export function demoOpponentMove(store,matchId){const match=store.get().matches.find(m=>m.id===matchId);if(!match||match.status!=='active')return null;const game=loadGame(match);if(game.turn()!=='b')return null;const moves=game.moves({verbose:true});if(!moves.length)return null;const selected=moves[Math.floor(moves.length/3)];store.update(s=>{const m=s.matches.find(m=>m.id===matchId),g=loadGame(m),move=g.move(selected);m.pgn=g.pgn();m.history.push({from:move.from,to:move.to,san:move.san,by:'demo-rule-opponent'});m.turn=g.turn();s.events.push({type:'chess_move',matchId,move:move.san,by:'demo-rule-opponent',day:s.day,clock:s.clock});if(g.isGameOver()){m.status='finished';m.result=g.isCheckmate()?'opponent-win':'draw';}});return selected.san;}
export function createSoloMatch(store){const id=globalThis.crypto?.randomUUID?.()||`solo-${Date.now()}`;store.update(s=>s.matches.push({id,invitationId:null,opponent:'demo',pgn:'',status:'active',turn:'w',createdDay:s.day,history:[]}));return id;}
export function postMatchMessage(store,matchId,text){const value=String(text||'').trim();if(!value||value.length>200)throw Error('消息需为 1–200 字');store.update(s=>{const match=s.matches.find(m=>m.id===matchId);if(!match)throw Error('棋局不存在');(match.chat??=[]).push({id:globalThis.crypto?.randomUUID?.()||String(Date.now()),from:'player',text:value,time:s.clock});});}
export async function replyToMatch(store,matchId){
 const current=store.get(),match=current.matches.find(m=>m.id===matchId);
 if(!match||match.opponent!=='tai'||match.chat?.at(-1)?.from!=='player')return false;
 const status=await aiStatus();if(!status.deepseek)throw Error('请先在 NoApp 配置 DeepSeek Key');
 const lastId=match.chat.at(-1).id;
 const game=loadGame(match);
 const past=(match.chat||[]).slice(-15).map(m=>({role:m.from==='player'?'user':'assistant',content:m.text}));
 const lastMove=match.history?.at(-1)?.san||'未落子';
 const messages=[{role:'user',content:'当前棋局（仅供上下文）：FEN '+game.fen()+'；最近一步 '+lastMove+'。不要作出与棋局不符的棋力判断。'},...past];
 const response=await askTai({channel:'chess',day:current.day,messages,profile:current.aiDraft?.profile,memories:current.aiDraft?.memories});
 const parts=unpackTaiReply(response,'chess');
 let emitted=false;
 for(const part of parts){
  const now=store.get().matches.find(m=>m.id===matchId);
  if(!now||now.opponent!=='tai'||!emitted&&now.chat.at(-1)?.id!==lastId)break;
  store.update(s=>{
   const m=s.matches.find(x=>x.id===matchId);if(!m)return;
   (m.chat??=[]).push({id:globalThis.crypto?.randomUUID?.()||String(Date.now()+Math.random()),from:'tai',text:part.text,time:s.clock,aiGenerated:true});
  });
  emitted=true;
  if(parts.length>1)await new Promise(r=>setTimeout(r,380));
 }
 return emitted;
}
