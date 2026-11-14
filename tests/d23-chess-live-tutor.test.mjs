import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {offerD23ChessInvitation,startAcceptedInvitation} from '../src/services/invitations.js';
import {chessFacts,playMove,applyStockfishMove,postMatchMessage,replyToMatch,resignChessMatch,loadGame} from '../src/services/chess.js';
import {chessReplyUsesLegalMoves,prewrittenChessReply} from '../src/services/chess-lesson.js';
import {Chess} from 'chess.js';
import {render} from '../src/apps/chess/index.js';

function d23Store(){
 let state=activateStory55(initialState());
 state.day=23;state.clock='22:20';
 state.story55.completed['d23-chess']={day:23,clock:'22:20'};
 assert.equal(offerD23ChessInvitation(state),true);
 const store={get:()=>state,update(fn){state=structuredClone(state);fn(state);}};
 const matchId=startAcceptedInvitation(store,'s55-d23-chess-invite');
 return {store,matchId,match:()=>store.get().matches.find(x=>x.id===matchId)};
}
test('D23 accepted MIRAGE match is the only tutorial entry and opens with rule and win-condition copy',()=>{
 const {store,matchId,match}=d23Store();
 assert.equal(match().opponent,'tai');
 assert.equal(match().lesson.started,true);
 assert.equal(match().chat.filter(m=>m.from==='tai').length,3);
 assert.ok(match().chat.some(m=>m.text.includes('將死')));
 assert.ok(match().chat.some(m=>m.text.includes('逼和')));
 assert.equal(chessFacts(match()).legalMoves.length,20);
 assert.equal(startAcceptedInvitation(store,'s55-d23-chess-invite'),matchId);
 assert.equal(match().chat.length,3,'opening must not duplicate on reopen');
 assert.match(render({store},{route:'/match/'+matchId}),/認輸/);
 assert.doesNotMatch(render({store},{route:'/match/'+matchId}),/AI 回复失败|請先配置/);
});
test('ChessFacts reports real White and Black moves, threatened pieces and verified legal continuations',()=>{
 const {store,matchId,match}=d23Store();
 playMove(store,matchId,'e2','e4');
 assert.equal(match().lesson.seenPieces.includes('p'),true);
 assert.equal(match().chat.filter(m=>m.text.includes('第一次可以走兩格')).length,1);
 let facts=chessFacts(match());
 assert.equal(facts.lastMove.actor,'熙蒙');
 assert.equal(facts.lastMove.san,'e4');assert.equal(facts.lastMove.from,'e2');assert.equal(facts.lastMove.to,'e4');
 assert.equal(facts.turn,'b');
 const fen=facts.fen;
 assert.equal(applyStockfishMove(store,matchId,fen,'e7e5'),'e5');
 facts=chessFacts(match());
 assert.equal(facts.lastMove.actor,'Ouroboros');assert.equal(facts.lastMove.san,'e5');
 assert.equal(facts.history.length,2);
 assert.ok(facts.legalMoves.some(m=>m.san==='Nf3'));
 assert.equal(applyStockfishMove(store,matchId,fen,'b8c6'),null,'an older engine reply cannot corrupt the board');
 assert.equal(match().pgn,loadGame(match()).pgn());
});
test('first actual move of each of the six piece types has a one-time authored tutorial',()=>{
 const cases=[
  ['p','','e2','e4','兵通常只能向前'],
  ['n','','g1','f3','馬走「日」字'],
  ['b','1. e4 e5','f1','c4','象只走斜線'],
  ['r','1. a4 a5','a1','a3','車沿著橫線'],
  ['q','1. e4 e5','d1','h5','后既能直走'],
  ['k','1. e4 e5','e1','e2','王平時每次']
 ];
 for(const [type,pgn,from,to,expected] of cases){
  const {store,matchId,match}=d23Store();
  if(pgn)store.update(s=>{
   const m=s.matches.find(m=>m.id===matchId),game=new Chess();game.loadPgn(pgn);
   m.pgn=pgn;
   m.history=game.history({verbose:true}).map((x,i)=>({from:x.from,to:x.to,san:x.san,by:i%2===0?'player':'stockfish'}));
  });
  playMove(store,matchId,from,to);
  assert.equal(match().lesson.seenPieces.includes(type),true,type);
  assert.equal(match().chat.filter(m=>m.text.includes(expected)).length,1,type);
  assert.equal(match().history.at(-1).by,'player',type);
 }
});
test('the D23 Queen\'s Gambit can be explained even when the model is unavailable',()=>{
 const {match}=d23Store();
 assert.match(prewrittenChessReply(match(),'後翼棄兵是什麼？',chessFacts(match())),/爭奪中心/);
});
test('illegal model recommendations are rejected; current legal SAN is allowed',()=>{
 const {match}=d23Store(),facts=chessFacts(match());
 assert.equal(chessReplyUsesLegalMoves('建議走 e4',facts),true);
 assert.equal(chessReplyUsesLegalMoves('建議走 Qa9',facts),false);
 assert.equal(chessReplyUsesLegalMoves('先保護王，別著急',facts),true);
});
test('lecture interjection produces one authored warning; spoiler follows original Mirage send block',async()=>{
 const {store,matchId,match}=d23Store();
 const prior=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('Network must not be called for presets');};
 try{
  const before=match().chat.length;
  assert.equal(postMatchMessage(store,matchId,'陳熙泰'),false);
  assert.equal(postMatchMessage(store,matchId,'我是你哥'),false);
  assert.equal(match().chat.length,before);
  assert.equal(postMatchMessage(store,matchId,'親親'),true);
  assert.equal(await replyToMatch(store,matchId),true);
  assert.match(match().chat.at(-1).text,/上課|還沒講完|先聽|注意力|坐不住/);
  const warnings=match().chat.filter(m=>m.text.includes('上課')||m.text.includes('還沒講完')).length;
  assert.equal(postMatchMessage(store,matchId,'好累啊'),true);
  assert.equal(await replyToMatch(store,matchId),false,'same lecture segment has a warning limit');
  assert.equal(match().chat.filter(m=>m.text.includes('上課')||m.text.includes('還沒講完')).length,warnings);
  assert.equal(calls,0);
 }finally{globalThis.fetch=prior;}
});
test('offline chess question always has a correct local tutorial answer without an error',async()=>{
 const {store,matchId,match}=d23Store();
 const prior=globalThis.fetch;
 globalThis.fetch=async url=>url==='/api/ai/status'?{ok:true,text:async()=>JSON.stringify({deepseek:false})}:Promise.reject(Error('offline'));
 try{
  postMatchMessage(store,matchId,'馬怎麼走？');
  assert.equal(await replyToMatch(store,matchId),true);
  assert.match(match().chat.at(-1).text,/馬走「日」字/);
  assert.equal(match().chat.at(-1).mode,'text');
 }finally{globalThis.fetch=prior;}
});
test('off-topic chess chat uses deterministic replies once the current lecture is over',async()=>{
 const {store,matchId,match}=d23Store();
 store.update(s=>s.matches.find(m=>m.id===matchId).lesson.teaching=false);
 postMatchMessage(store,matchId,'今天吃什麼');
 assert.equal(await replyToMatch(store,matchId),true);
 assert.match(match().chat.at(-1).text,/晚餐/);
});
test('resignation is idempotent, has Tai taunts, persists result, and permanently disables replies',async()=>{
 const {store,matchId,match}=d23Store();
 assert.equal(resignChessMatch(store,matchId),true);
 assert.equal(match().status,'finished');assert.equal(match().result,'player-resigned');
 assert.equal(match().chat.filter(m=>m.from==='tai').length,6);
 assert.equal(resignChessMatch(store,matchId),false);
 assert.equal(match().chat.filter(m=>m.from==='tai').length,6);
 postMatchMessage(store,matchId,'親親');
 assert.equal(await replyToMatch(store,matchId),false);
 assert.equal(match().chat.at(-1).from,'player');
 assert.equal(store.get().events.filter(e=>e.type==='chess_resigned').length,1);
});
test('checkmate ends all further chess replies, with a chess-accurate finish',async()=>{
 const {store,matchId,match}=d23Store();
 store.update(s=>{
  const m=s.matches.find(m=>m.id===matchId);
  m.pgn='1. f3 e5 2. g4 Qh4#';
  m.status='finished';m.result='opponent-win';
 });
 const facts=chessFacts(match());
 assert.equal(facts.checkmate,true);assert.equal(facts.legalMoves.length,0);
 postMatchMessage(store,matchId,'你在嗎');
 assert.equal(await replyToMatch(store,matchId),false);
});
