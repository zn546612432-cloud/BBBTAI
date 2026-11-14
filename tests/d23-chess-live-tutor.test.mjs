import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {offerD23ChessInvitation,receiveInvitation,startAcceptedInvitation} from '../src/services/invitations.js';
import {chessFacts,playMove,applyStockfishMove,postMatchMessage,replyToMatch,resignChessMatch,loadGame,maybeTaiChessAside} from '../src/services/chess.js';
import {chessReplyUsesLegalMoves,prewrittenChessReply,tickD23ChessLesson} from '../src/services/chess-lesson.js';
import {Chess} from 'chess.js';
import {render} from '../src/apps/chess/index.js';

function d23Store(){
 let state=activateStory55(initialState());
 state.day=23;state.clock='22:20';
 state.story55.completed['d23-chess']={day:23,clock:'22:20'};
 assert.equal(offerD23ChessInvitation(state),true);
 const store={get:()=>state,update(fn){state=structuredClone(state);fn(state);}};
 const matchId=receiveInvitation(store,'s55-d23-chess-invite');
 return {store,matchId,match:()=>store.get().matches.find(x=>x.id===matchId)};
}
function playOpening(store,id){
 store.update(s=>{s.nav.current={appId:'chess',route:'/match/'+id,params:{}};tickD23ChessLesson(s,1000);});
 store.update(s=>tickD23ChessLesson(s,2200));
 store.update(s=>tickD23ChessLesson(s,5400));
 store.update(s=>tickD23ChessLesson(s,8600));
}
test('D23 rules appear only inside the entered chess board and are paced one at a time',()=>{
 const {store,matchId,match}=d23Store();
 assert.equal(match().opponent,'tai');
 assert.equal(match().lesson.started,true);
 assert.equal(match().chat.length,0,'not a single tutorial line is injected before entry');
 store.update(s=>tickD23ChessLesson(s,1000));
 assert.equal(match().chat.length,0,'leaving match unopened may not deliver anything');
 store.update(s=>{s.nav.current={appId:'chess',route:'/match/'+matchId,params:{}};tickD23ChessLesson(s,1000);});
 assert.equal(match().chat.length,0,'first line is scheduled on entry, not instantly injected');
 store.update(s=>tickD23ChessLesson(s,2200));
 assert.equal(match().chat.length,1);
 assert.equal(match().lesson.openingDone,false);
 store.update(s=>tickD23ChessLesson(s,2400));
 assert.equal(match().chat.length,1,'do not batch remaining lines in one heartbeat');
 store.update(s=>{s.nav.current={appId:'mirage',route:'/chat/s55-ouroboros',params:{}};tickD23ChessLesson(s,5400);});
 assert.equal(match().chat.length,1,'pauses when the user leaves chess');
 store.update(s=>{s.nav.current={appId:'chess',route:'/match/'+matchId,params:{}};tickD23ChessLesson(s,5400);});
 assert.equal(match().chat.length,2);
 store.update(s=>tickD23ChessLesson(s,8600));
 assert.equal(match().chat.length,3);
 assert.equal(match().lesson.openingDone,true);
 assert.ok(match().chat.some(m=>m.text.includes('將死')));
 assert.ok(match().chat.some(m=>m.text.includes('逼和')));
 assert.equal(chessFacts(match()).legalMoves.length,20);
 assert.equal(startAcceptedInvitation(store,'s55-d23-chess-invite'),matchId);
 assert.equal(match().chat.length,3,'opening must not duplicate on reopen');
 assert.match(render({store},{route:'/match/'+matchId}),/認輸/);
 assert.doesNotMatch(render({store},{route:'/match/'+matchId}),/AI 回复失败|請先配置/);
});
test('D23 accepted MIRAGE match is the only tutorial entry and opens with rule and win-condition copy',()=>{
 const {store,matchId,match}=d23Store();
 playOpening(store,matchId);
 assert.equal(match().lesson.openingDone,true);
 assert.equal(match().chat.filter(m=>m.from==='tai').length,3);
 assert.equal(match().chat.filter(m=>/opening-/.test(m.id)).length,3);
 assert.equal(startAcceptedInvitation(store,'s55-d23-chess-invite'),matchId);
 assert.equal(match().chat.length,3,'resuming the accepted invitation never duplicates the lesson');
});
test('ChessFacts reports real White and Black moves, threatened pieces and verified legal continuations',()=>{
 const {store,matchId,match}=d23Store();
 playMove(store,matchId,'e2','e4');
 assert.equal(match().lesson.seenPieces.includes('p'),true);
 assert.equal(match().lesson.outbox.filter(m=>m.text.includes('第一次可以走兩格')).length,1);
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
test('threatened, hanging, tactical and 3 candidate moves come from a verifiable PGN',()=>{
 const {store,matchId,match}=d23Store();
 store.update(s=>{
  const m=s.matches.find(m=>m.id===matchId);
  m.pgn='1. e4 e5 2. Qh5 Nf6';
 });
 const facts=chessFacts(match());
 assert.equal(facts.turn,'w');
 assert.ok(facts.threatened.some(x=>x.square==='h5'&&x.owner==='熙蒙'));
 assert.ok(facts.hanging.some(x=>x.square==='h5'&&x.owner==='熙蒙'));
 assert.equal(facts.recommendations.length,3);
 for(const candidate of facts.recommendations)assert.ok(facts.legalMoves.some(m=>m.san===candidate.san));
 for(const tactic of facts.tactics)assert.ok(facts.legalMoves.some(m=>m.san===tactic.san));
});
test('a genuinely hanging major piece triggers a concrete one-time Tai warning',()=>{
 const {store,matchId,match}=d23Store();
 store.update(s=>{
  const m=s.matches.find(m=>m.id===matchId),g=new Chess();
  g.loadPgn('1. e4 e5 2. Qh5 Nf6');
  m.pgn=g.pgn();
  m.history=g.history({verbose:true}).map((x,i)=>({from:x.from,to:x.to,san:x.san,by:i%2===0?'player':'stockfish'}));
 });
 playMove(store,matchId,'f2','f4');
 assert.equal(match().lesson.outbox.filter(x=>x.text.includes('你的后')&&x.text.includes('h5')).length,1);
 assert.equal(match().lesson.warnedThreats.filter(x=>x==='h5:q').length,1);
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
  assert.equal(match().lesson.outbox.filter(m=>m.text.includes(expected)).length,1,type);
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
 playOpening(store,matchId);
 assert.equal(resignChessMatch(store,matchId),true);
 assert.equal(match().status,'finished');assert.equal(match().result,'player-resigned');
 assert.equal(match().chat.filter(m=>m.from==='tai').length,3,'endings do not arrive all at once');
 assert.equal(match().lesson.outbox.length,3,'three taunts are queued in the existing match');
 assert.equal(resignChessMatch(store,matchId),false);
 assert.equal(match().lesson.outbox.length,3,'resignation cannot enqueue duplicates');
 store.update(s=>tickD23ChessLesson(s,10000));
 store.update(s=>tickD23ChessLesson(s,11200));
 assert.equal(match().chat.filter(m=>m.from==='tai').length,4,'first taunt only');
 store.update(s=>tickD23ChessLesson(s,14300));
 assert.equal(match().chat.filter(m=>m.from==='tai').length,5);
 store.update(s=>tickD23ChessLesson(s,17400));
 assert.equal(match().chat.filter(m=>m.from==='tai').length,6);
 assert.equal(match().lesson.outbox.length,0);
 assert.match(match().chat.at(-1).text,/下課/);
 postMatchMessage(store,matchId,'親親');
 assert.equal(await replyToMatch(store,matchId),false);
 assert.equal(match().chat.at(-1).from,'player');
 assert.equal(store.get().events.filter(e=>e.type==='chess_resigned').length,1);
 store.update(s=>tickD23ChessLesson(s,20000));
 assert.equal(store.get().nav.current.route,'/','leave the board only after the final taunt is delivered');
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

test('when a rook takes the White queen, the fallback says the actual pieces and capture square',async()=>{
 const {store,matchId,match}=d23Store();
 store.update(s=>{
  const m=s.matches.find(x=>x.id===matchId),game=new Chess();
  game.loadPgn('1. Nc3 c5 2. Nd5 e6 3. Nc7+ Qxc7 4. c4 Nf6 5. Nf3 a5 6. Qc2 a4 7. Qxa4');
  m.pgn=game.pgn();
  m.history=game.history({verbose:true}).map((x,i)=>({from:x.from,to:x.to,san:x.san,by:i%2===0?'player':'stockfish'}));
 });
 const fen=loadGame(match()).fen();
 assert.equal(applyStockfishMove(store,matchId,fen,'a8a4'),'Rxa4');
 const line=match().lesson.outbox.find(m=>m.text.includes('吃掉了你的后'));
 assert.ok(line,'captured queen must be named in an authored event');
 assert.match(line.text,/車.*a4.*后/);
 const prior=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error('gateway offline');};
 try{
  postMatchMessage(store,matchId,'看不懂');
  assert.equal(await replyToMatch(store,matchId),true);
  assert.match(match().chat.at(-1).text,/后.*車.*a4/);
  assert.doesNotMatch(match().chat.at(-1).text,/合法選項|例如 Nd/);
  assert.equal(match().chat.at(-1).aiGenerated,false);
 }finally{globalThis.fetch=prior;}
});
test('an available gateway is used directly for chess understanding, not short-circuited by an AI status probe',async()=>{
 const {store,matchId,match}=d23Store();
 const requests=[],prior=globalThis.fetch;
 globalThis.fetch=async(url,opts)=>{
  requests.push({url,body:opts?.body?JSON.parse(opts.body):null});
  return {ok:true,text:async()=>JSON.stringify({text:JSON.stringify({messages:[{text:'我剛剛走的是兵。看清楚 e5，下一步輪到你。',mode:'text'}]})})};
 };
 try{
  postMatchMessage(store,matchId,'看不懂');
  assert.equal(await replyToMatch(store,matchId),true);
  assert.equal(requests.length,1);
  assert.match(requests[0].body.messages[0].content,/ChessFacts/);
  assert.match(requests[0].body.messages[0].content,/legalSAN/);
  assert.equal(match().chat.at(-1).aiGenerated,true);
 }finally{globalThis.fetch=prior;}
});
test('important capture can add an optional model-written Tai aside without bypassing the shared outbox',async()=>{
 const {store,matchId,match}=d23Store();
 store.update(s=>{
  const m=s.matches.find(x=>x.id===matchId),g=new Chess();
  g.loadPgn('1. e4 d5 2. exd5');
  m.pgn=g.pgn();
  m.history=g.history({verbose:true}).map((x,i)=>({from:x.from,to:x.to,san:x.san,by:i%2===0?'player':'stockfish'}));
 });
 const fen=loadGame(match()).fen();
 assert.equal(applyStockfishMove(store,matchId,fen,'d8d5'),'Qxd5');
 const prior=globalThis.fetch;
 globalThis.fetch=async()=>({ok:true,text:async()=>JSON.stringify({text:JSON.stringify({messages:[{text:'你是只看自己想走的那步？',mode:'text'}]})})});
 try{
  assert.equal(await maybeTaiChessAside(store,matchId),true);
  assert.equal(await maybeTaiChessAside(store,matchId),false);
  assert.ok(match().lesson.outbox.some(x=>x.aiGenerated===true&&x.text.includes('你是只看')));
 }finally{globalThis.fetch=prior;}
});
