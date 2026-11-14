import {askTai,aiStatus} from './ai/gateway.js';
import {unpackTaiReply} from './ai/format.js';
import {blocksAnonymousMirageInput} from './story55/mirage-input.js';
import {taiRecognized} from './story55/state.js';
import {
 isD23ChessLesson,beginD23ChessLesson,noteD23PlayerMove,noteD23OpponentMove,
 finishD23ChessLesson,resignD23ChessLesson,predeterminedChessReply,isChessRelated,
 prewrittenChessReply,chessReplyUsesLegalMoves
} from './chess-lesson.js';
import {Chess} from 'chess.js';

export function loadGame(match){const game=new Chess();if(match?.pgn)game.loadPgn(match.pgn);return game;}

// ChessFacts is derived ONLY from the recorded legal PGN and the current game.
// The LLM never owns the board, never chooses Black's move and never guesses
// the legal continuation from a screenshot or stale narrative.
export function chessFacts(match){
 const game=loadGame(match),moves=game.history({verbose:true});
 const history=moves.map((m,i)=>({ply:i+1,actor:i%2===0?'熙蒙':'Ouroboros',san:m.san,from:m.from,to:m.to,piece:m.piece,captured:m.captured||null}));
 const lastMove=history.at(-1)||null;
 const legalMoves=game.moves({verbose:true}).map(m=>({san:m.san,from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,flags:m.flags}));
 const threatened=[];
 for(let ri=0;ri<8;ri++)for(let ci=0;ci<8;ci++){
  const piece=game.board()[ri][ci];
  if(!piece)continue;
  const square='abcdefgh'[ci]+(8-ri);
  if(typeof game.isAttacked==='function'&&game.isAttacked(square,piece.color==='w'?'b':'w'))
   threatened.push({square,piece:piece.type,owner:piece.color==='w'?'熙蒙':'Ouroboros'});
 }
 return {fen:game.fen(),pgn:game.pgn(),turn:game.turn(),history,lastMove,legalMoves,
  threatened,check:game.isCheck(),checkmate:game.isCheckmate(),stalemate:game.isStalemate(),
  draw:game.isDraw(),over:game.isGameOver(),result:match?.result||null};
}
export function playMove(store,matchId,from,to,promotion='q'){
 let outcome=null;
 store.update(s=>{
  const match=s.matches.find(m=>m.id===matchId);
  if(!match||match.status!=='active')throw Error('棋局不存在');
  const game=loadGame(match);
  if(game.turn()!=='w')throw Error('请等待对手');
  const move=game.move({from,to,promotion});
  if(!move)throw Error('不合法的走法');
  match.pgn=game.pgn();
  match.history.push({from,to,san:move.san,by:'player'});
  match.turn=game.turn();
  s.events.push({type:'chess_move',matchId,move:move.san,by:'player',day:s.day,clock:s.clock});
  if(isD23ChessLesson(match))noteD23PlayerMove(match,move,s.clock,game);
  if(game.isGameOver()){
   match.status='finished';match.result=game.isCheckmate()?'player-win':'draw';
   finishD23ChessLesson(match,s.clock,game);
  }
  outcome={san:move.san,finished:game.isGameOver()};
 });
 return outcome;
}
export function demoOpponentMove(store,matchId){
 const match=store.get().matches.find(m=>m.id===matchId);
 if(!match||match.status!=='active')return null;
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
  if(!match||match.status!=='active')return;
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
  if(game.isGameOver()){
   match.status='finished';match.result=game.isCheckmate()?'opponent-win':'draw';
   finishD23ChessLesson(match,s.clock,game);
  }else if(isD23ChessLesson(match))noteD23OpponentMove(match,move,s.clock,game);
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
  if(!match||match.status!=='active')return;
  match.status='finished';match.result='player-resigned';
  match.turn=loadGame(match).turn();
  s.events.push({type:'chess_resigned',matchId,by:'player',day:s.day,clock:s.clock});
  resignD23ChessLesson(match,s.clock);
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
  (match.chat??=[]).push({id:globalThis.crypto?.randomUUID?.()||String(Date.now()),from:'player',text:value,time:s.clock});
  accepted=true;
 });
 return accepted;
}
const pendingMatchReplies=new WeakMap();
export function replyToMatch(store,matchId){
 const match=store.get().matches.find(m=>m.id===matchId);
 if(!match||match.opponent!=='tai'||match.status!=='active'||match.chat?.at(-1)?.from!=='player')return Promise.resolve(false);
 let pending=pendingMatchReplies.get(store);
 if(!pending){pending=new Map();pendingMatchReplies.set(store,pending);}
 const key=JSON.stringify([matchId,match.chat.at(-1).id]);
 if(pending.has(key))return pending.get(key);
 const reply=generateMatchReply(store,matchId).finally(()=>pending.delete(key));
 pending.set(key,reply);
 return reply;
}
const FALLBACK='先看清棋盤再動。別只顧著聊天。';
async function boundedAI(promise,ms){
 let timeout;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('chess AI timeout')),ms);})]);}
 finally{clearTimeout(timeout);}
}
async function generateMatchReply(store,matchId){
 let current=store.get(),match=current.matches.find(m=>m.id===matchId);
 if(!match||match.status!=='active'||match.opponent!=='tai'||match.chat?.at(-1)?.from!=='player')return false;
 const lastId=match.chat.at(-1).id,lastText=match.chat.at(-1).text;
 const initialFacts=chessFacts(match),originalFen=initialFacts.fen;
 let canned=null;
 if(isD23ChessLesson(match)){
  store.update(s=>{
   const m=s.matches.find(x=>x.id===matchId);
   if(m?.status==='active')canned=predeterminedChessReply(m,lastText,initialFacts);
  });
  // A second interjection during the same lesson move receives no duplicate
  // scolding; chess-related questions remain answerable.
  if(canned===null&&!isChessRelated(lastText))return false;
 }
 let parts=[];
 if(canned!==null)parts=canned?[{text:canned}]:[];
 else{
  try{
   const status=await boundedAI(aiStatus(),3500);
   if(status?.deepseek){
    current=store.get();match=current.matches.find(m=>m.id===matchId);
    if(!match||match.status!=='active')return false;
    const nowFacts=chessFacts(match);
    const factPacket={
     fen:nowFacts.fen,turn:nowFacts.turn,history:nowFacts.history.slice(-24),
     lastMove:nowFacts.lastMove,legalSAN:nowFacts.legalMoves.map(m=>m.san),
     threatened:nowFacts.threatened,check:nowFacts.check,checkmate:nowFacts.checkmate,
     stalemate:nowFacts.stalemate,draw:nowFacts.draw
    };
    const messages=[
     {role:'system',content:'你正在與熙蒙真實下國際象棋。黑棋由現有 Stockfish 引擎落子，你只能以 Ouroboros 的身份用繁體中文解釋已發生的棋局；不要自稱AI。是否已相認依照現有世界狀態，未相認時不得透漏本名、血緣或未發生的劇情。以下為引擎驗證的 ChessFacts，絕不可捏造棋子位置、著法或將死，也不要自稱已替對手落子。只推薦 legalSAN 中真實合法的著法，沒有資料就詢問對方或按規則解釋。回答自然、簡短、一兩句。不要語音。\n'+JSON.stringify(factPacket)},
     ...(match.chat||[]).slice(-12).map(m=>({role:m.from==='player'?'user':'assistant',content:m.text}))
    ];
    const response=await boundedAI(askTai({channel:'chess',day:current.day,messages,profile:current.aiDraft?.profile,
     memories:current.aiDraft?.memories,recognized:taiRecognized(current),storyVersion:55,outputMode:'text',allowVoice:false,
     scene:isD23ChessLesson(match)?'正在進行的 D23 匿名真實棋局；只回答當前棋局，不得劇透。':'正在進行的真實棋局；只回答現場已發生的棋局。'}),9000);
    parts=unpackTaiReply(response,'chess').slice(0,3);
    if(!parts.every(p=>chessReplyUsesLegalMoves(p.text,nowFacts)))parts=[];
   }
  }catch{parts=[];}
  if(!parts.length){
   const latest=store.get().matches.find(m=>m.id===matchId);
   if(!latest||latest.status!=='active')return false;
   parts=[{text:isD23ChessLesson(latest)?prewrittenChessReply(latest,lastText,chessFacts(latest)):FALLBACK}];
  }
 }
 if(!parts.length)return false;
 let emitted=false;
 for(const [i,part] of parts.entries()){
  let didWrite=false;
  store.update(s=>{
   const m=s.matches.find(x=>x.id===matchId);
   if(!m||m.opponent!=='tai'||m.status!=='active')return;
   if(!emitted&&m.chat.at(-1)?.id!==lastId)return;
   const freshFen=chessFacts(m).fen;
   const text=freshFen!==originalFen&&isD23ChessLesson(m)?'棋盤已經變了。先看眼前這步，別急。':part.text;
   (m.chat??=[]).push({id:'chess-reply-'+lastId+'-'+i,from:'tai',text,time:s.clock,aiGenerated:canned===null,mode:'text'});
   didWrite=true;
  });
  if(!didWrite)break;
  emitted=true;
  if(i<parts.length-1)await new Promise(r=>setTimeout(r,380));
 }
 return emitted;
}
