import {askTai} from './ai/gateway.js';
import {captureTaiWorldbook} from './ai/worldbook/index.js';
import {unpackTaiReply} from './ai/format.js';
import {blocksAnonymousMirageInput} from './story55/mirage-input.js';
import {taiRecognized} from './story55/state.js';
import {D41_CHESS_INVITATION} from './invitations.js';
import {
 isD23ChessLesson,beginD23ChessLesson,noteD23PlayerMove,noteD23OpponentMove,noteD23HangingPiece,
 finishD23ChessLesson,resignD23ChessLesson,predeterminedChessReply,needsChessAnalysis,enqueueChessTaiReply,
 prewrittenChessReply,chessReplyUsesLegalMoves
} from './chess-lesson.js';
import {Chess} from 'chess.js';
import {recordChessFeedback} from './chess-feedback.js';
import {buildChessTutorPrompt} from './chess-dialogue.js';

export function loadGame(match){const game=new Chess();if(match?.pgn)game.loadPgn(match.pgn);return game;}

// ChessFacts is derived ONLY from the recorded legal PGN and the current game.
// The LLM never owns the board, never chooses Black's move and never guesses
// the legal continuation from a screenshot or stale narrative.
export function chessFacts(match){
 const game=loadGame(match),moves=game.history({verbose:true});
 const history=moves.map((m,i)=>({ply:i+1,actor:i%2===0?'熙蒙':'Ouroboros',san:m.san,from:m.from,to:m.to,piece:m.piece,captured:m.captured||null}));
 const lastMove=history.at(-1)||null;
 const legalMoves=game.moves({verbose:true}).map(m=>({san:m.san,from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,flags:m.flags,promotion:m.promotion||null}));
 const board=game.board(),threatened=[],hanging=[];
 for(let ri=0;ri<8;ri++)for(let ci=0;ci<8;ci++){
  const piece=board[ri][ci];
  if(!piece||typeof game.isAttacked!=='function')continue;
  const square='abcdefgh'[ci]+(8-ri);
  if(!game.isAttacked(square,piece.color==='w'?'b':'w'))continue;
  const fact={square,piece:piece.type,owner:piece.color==='w'?'熙蒙':'Ouroboros'};
  threatened.push(fact);
  if(piece.type!=='k'&&!game.isAttacked(square,piece.color))hanging.push(fact);
 }
 const pieceValue={q:9,r:5,b:3,n:3,p:1};
 const score=m=>(m.san.endsWith('#')?100:0)+(m.san.endsWith('+')?8:0)+
  (m.captured?3+(pieceValue[m.captured]||0):0)+(m.promotion?15:0)+
  (['d4','e4','d5','e5'].includes(m.to)?2:0)+
  (['n','b'].includes(m.piece)&&/[18]$/.test(m.from)?1:0);
 const reason=m=>m.san.endsWith('#')?'形成將死':m.san.endsWith('+')?'形成將軍':
  m.promotion?'可以升變':m.captured?'可以吃子':
  ['d4','e4','d5','e5'].includes(m.to)?'爭奪中心':
  ['n','b'].includes(m.piece)&&/[18]$/.test(m.from)?'發展子力':'合法候選';
 const recommendations=legalMoves.slice().sort((a,b)=>score(b)-score(a)).slice(0,3).map(m=>({san:m.san,reason:reason(m)}));
 const tactics=legalMoves.filter(m=>m.captured||m.promotion||m.san.endsWith('+')||m.san.endsWith('#'))
  .slice(0,8).map(m=>({san:m.san,reason:reason(m)}));
 return {fen:game.fen(),pgn:game.pgn(),turn:game.turn(),history,lastMove,legalMoves,
  threatened,hanging,recommendations,tactics,check:game.isCheck(),checkmate:game.isCheckmate(),stalemate:game.isStalemate(),
  draw:game.isDraw(),over:game.isGameOver(),result:match?.result||null};
}
export function playMove(store,matchId,from,to,promotion='q'){
 let outcome=null;
 store.update(s=>{
  const match=s.matches.find(m=>m.id===matchId);
  if(!match||match.status!=='active')throw Error('棋局不存在');
  if(match.invitationId===D41_CHESS_INVITATION)return;
  const game=loadGame(match);
  if(game.turn()!=='w')throw Error('请等待对手');
  const move=game.move({from,to,promotion});
  if(!move)throw Error('不合法的走法');
  match.pgn=game.pgn();
  match.history.push({from,to,san:move.san,by:'player'});
  match.turn=game.turn();
  s.events.push({type:'chess_move',matchId,move:move.san,by:'player',day:s.day,clock:s.clock});
  if(isD23ChessLesson(match)){
   noteD23PlayerMove(match,move,s.clock,game);
   if(!game.isGameOver())noteD23HangingPiece(match,chessFacts(match).hanging,s.clock);
  }
  if(game.isGameOver()){
   match.status='finished';match.result=game.isCheckmate()?'player-win':'draw';
   finishD23ChessLesson(match,s.clock,game);
  }
  recordChessFeedback(match,move);
  outcome={san:move.san,finished:game.isGameOver()};
 });
 return outcome;
}
export function demoOpponentMove(store,matchId){
 const match=store.get().matches.find(m=>m.id===matchId);
 if(!match||match.status!=='active'||match.invitationId===D41_CHESS_INVITATION)return null;
 const game=loadGame(match);
 if(game.turn()!=='b')return null;
 const moves=game.moves({verbose:true});
 if(!moves.length)return null;
 const selected=moves[Math.floor(moves.length/3)];
 store.update(s=>{
  const m=s.matches.find(m=>m.id===matchId),g=loadGame(m),move=g.move(selected);
  m.pgn=g.pgn();m.history.push({from:move.from,to:move.to,san:move.san,by:'demo-rule-opponent'});
  m.turn=g.turn();
  s.events.push({type:'chess_move',matchId,move:move.san,by:'demo-rule-opponent',day:s.day,clock:s.clock});
  if(g.isGameOver()){m.status='finished';m.result=g.isCheckmate()?'opponent-win':'draw';}
 });
 return selected.san;
}
// Stale Stockfish results cannot overwrite a changed board, resigned match or
// completed game. The Black move is persisted before any Tai commentary.
export function applyStockfishMove(store,matchId,expectedFen,uci){
 if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(String(uci||'')))throw Error('國際象棋引擎返回非法走法');
 let played=null;
 store.update(s=>{
  const match=s.matches.find(m=>m.id===matchId);
  if(!match||match.status!=='active'||match.invitationId===D41_CHESS_INVITATION)return;
  const game=loadGame(match);
  if(game.turn()!=='b'||game.fen()!==expectedFen)return;
  let move;
  try{move=game.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]||'q'});}
  catch{throw Error('國際象棋引擎返回非法走法');}
  if(!move)throw Error('國際象棋引擎返回非法走法');
  match.pgn=game.pgn();
  match.history.push({from:move.from,to:move.to,san:move.san,by:'stockfish'});
  match.turn=game.turn();
  delete match.engineError;
  s.events.push({type:'chess_move',matchId,move:move.san,by:'stockfish',day:s.day,clock:s.clock});
  if(isD23ChessLesson(match))noteD23OpponentMove(match,move,s.clock,game);
  if(game.isGameOver()){
   match.status='finished';match.result=game.isCheckmate()?'opponent-win':'draw';
   finishD23ChessLesson(match,s.clock,game);
  }
  recordChessFeedback(match,move);
  played=move.san;
 });
 return played;
}
export function createSoloMatch(store){
 const id=globalThis.crypto?.randomUUID?.()||`solo-${Date.now()}`;
 store.update(s=>s.matches.push({id,invitationId:null,opponent:'demo',pgn:'',status:'active',turn:'w',createdDay:s.day,history:[]}));
 return id;
}
export function resignChessMatch(store,matchId){
 let resigned=false;
 store.update(s=>{
  const match=s.matches.find(m=>m.id===matchId);
  if(!match||match.status!=='active'||match.invitationId===D41_CHESS_INVITATION)return;
  match.status='finished';match.result='player-resigned';
  match.turn=loadGame(match).turn();
  s.events.push({type:'chess_resigned',matchId,by:'player',day:s.day,clock:s.clock});
  resignD23ChessLesson(match,s.clock);
  recordChessFeedback(match);
  resigned=true;
 });
 return resigned;
}
export function postMatchMessage(store,matchId,text){
 const value=String(text||'').trim();
 if(!value||value.length>200)throw Error('消息需为 1–200 字');
 let accepted=false;
 store.update(s=>{
  const match=s.matches.find(m=>m.id===matchId);
  if(!match)throw Error('棋局不存在');
  // Exactly the original MIRAGE Send gate: no ghost bubble, no persisted
  // record and no model call for a pre-recognition spoiler.
  if(isD23ChessLesson(match)&&blocksAnonymousMirageInput(s,'s55-ouroboros',value))return;
  if(match.status!=='active'||match.invitationId===D41_CHESS_INVITATION)return;
  (match.chat??=[]).push({id:globalThis.crypto?.randomUUID?.()||String(Date.now()),from:'player',text:value,time:s.clock});
  accepted=true;
 });
 return accepted;
}
const pendingMatchReplies=new WeakMap();
function playerAwaitingChessReply(match){
 const player=isD23ChessLesson(match)?match.chat?.filter(m=>m.from==='player').at(-1):match.chat?.at(-1);
 if(player?.from!=='player')return null;
 if([...(match.chat||[]),...(match.lesson?.outbox||[])].some(m=>m.sourceMessageId===player.id))return null;
 return player;
}
export function replyToMatch(store,matchId){
 const match=store.get().matches.find(m=>m.id===matchId);
 if(!match||match.opponent!=='tai'||match.status!=='active'||match.invitationId===D41_CHESS_INVITATION)return Promise.resolve(false);
 const player=playerAwaitingChessReply(match);
 if(!player)return Promise.resolve(false);
 let pending=pendingMatchReplies.get(store);
 if(!pending){pending=new Map();pendingMatchReplies.set(store,pending);}
 const key=JSON.stringify([matchId,player.id]);
 if(pending.has(key))return pending.get(key);
 const reply=generateMatchReply(store,matchId).finally(()=>pending.delete(key));
 pending.set(key,reply);
 return reply;
}

const FALLBACK='等我一下。';
async function boundedAI(promise,ms){
 let timeout;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('chess AI timeout')),ms);})]);}
 finally{clearTimeout(timeout);}
}
async function generateMatchReply(store,matchId){
 let current=store.get(),match=current.matches.find(m=>m.id===matchId);
 if(!match||match.status!=='active'||match.opponent!=='tai')return false;
 const player=playerAwaitingChessReply(match);
 if(!player)return false;
 const lastId=player.id,lastText=player.text;
 const initialFacts=chessFacts(match),originalFen=initialFacts.fen;
 let canned=null;
 if(isD23ChessLesson(match)){
  store.update(s=>{
   const m=s.matches.find(x=>x.id===matchId);
   if(m?.status==='active')canned=predeterminedChessReply(m,lastText,initialFacts);
  });
  // A second interjection during the same lesson move receives no duplicate
  // scolding; chess-related questions remain answerable.
  if(canned===null&&!needsChessAnalysis(lastText))return false;
 }
 let parts=[],fromModel=false;
 if(canned!==null)parts=canned?[{text:canned}]:[];
 else{
  try{
   {
    current=store.get();match=current.matches.find(m=>m.id===matchId);
    if(!match||match.status!=='active')return false;
    const nowFacts=chessFacts(match);
    const factPacket={
     fen:nowFacts.fen,turn:nowFacts.turn,history:nowFacts.history.slice(-24),
     lastMove:nowFacts.lastMove,legalMoves:nowFacts.legalMoves,legalSAN:nowFacts.legalMoves.map(m=>m.san),
     pieces:loadGame(match).board().flat().filter(Boolean).map(p=>({square:p.square,piece:p.type,owner:p.color==='w'?'熙蒙':'Ouroboros'})),
     threatened:nowFacts.threatened,hanging:nowFacts.hanging,tactics:nowFacts.tactics,recommendations:nowFacts.recommendations,
     check:nowFacts.check,checkmate:nowFacts.checkmate,
     stalemate:nowFacts.stalemate,draw:nowFacts.draw
    };
    const messages=(match.chat||[]).slice(-12).map(m=>({role:m.from==='player'?'user':'assistant',content:m.text}));
    const worldbookSnapshot=captureTaiWorldbook(store,{channel:'chess',day:current.day,recognized:taiRecognized(current),messages,outputMode:'text',turnId:'chess:'+matchId+':'+(match.chat||[]).length,messageIndex:(match.chat||[]).length});
    const response=await boundedAI(askTai({channel:'chess',day:current.day,messages,worldbookSnapshot,profile:current.aiDraft?.profile,
     memories:current.aiDraft?.memories,recognized:taiRecognized(current),storyVersion:55,outputMode:'text',allowVoice:false,
     scene:buildChessTutorPrompt(factPacket,{casual:!isD23ChessLesson(match)})+'\n'+(isD23ChessLesson(match)?'正在進行的 D23 匿名真實棋局；只回答當前棋局，不得劇透。':'正在進行的真實棋局；可自然閒聊，以棋局為主，不得捏造盤面。')}),65000);
    parts=unpackTaiReply(response,'chess').slice(0,3);
    if(!parts.every(p=>chessReplyUsesLegalMoves(p.text,nowFacts)))parts=[];
    // Anonymous D23 chess must never leak the hidden name or family relation.
    if(isD23ChessLesson(match)&&!taiRecognized(current)&&parts.some(p=>/熙泰|xitai|三胞胎|親兄弟|亲兄弟|我是你(?:的)?哥|你是我(?:的)?哥/i.test(p.text)))parts=[];
    if(parts.length)fromModel=true;
   }
  }catch{parts=[];}
  if(!parts.length){
   const latest=store.get().matches.find(m=>m.id===matchId);
   if(!latest||latest.status!=='active')return false;
   parts=[{text:isD23ChessLesson(latest)?prewrittenChessReply(latest,lastText,chessFacts(latest)):FALLBACK}];
   fromModel=false;
  }
 }
 if(!parts.length)return false;
 let emitted=false;
 for(const [i,part] of parts.entries()){
  let didWrite=false;
  store.update(s=>{
   const m=s.matches.find(x=>x.id===matchId);
   if(!m||m.opponent!=='tai'||m.status!=='active')return;
   if(!emitted&&m.chat.filter(x=>x.from==='player').at(-1)?.id!==lastId)return;
   const freshFen=chessFacts(m).fen;
   // Never present analysis of a board that has changed while the model ran.
   if(isD23ChessLesson(m)){
    if(needsChessAnalysis(lastText)&&freshFen!==originalFen)return;
    didWrite=enqueueChessTaiReply(m,part.text,s.clock,'reply-'+lastId+'-'+i,{
     source:fromModel?'ai':'preset',boardPgn:needsChessAnalysis(lastText)?m.pgn:null,sourceMessageId:lastId
    });
   }else{
    (m.chat??=[]).push({id:'chess-reply-'+lastId+'-'+i,from:'tai',text:part.text,time:s.clock,aiGenerated:fromModel,mode:'text'});
    didWrite=true;
   }
  });
  if(!didWrite)break;
  emitted=true;
  if(!isD23ChessLesson(match)&&i<parts.length-1)await new Promise(r=>setTimeout(r,380));
 }
 return emitted;
}
