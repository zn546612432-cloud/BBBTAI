import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {offerD23ChessInvitation,receiveInvitation,startAcceptedInvitation} from '../src/services/invitations.js';
import {chessFacts,playMove,applyStockfishMove,postMatchMessage,replyToMatch,resignChessMatch,loadGame} from '../src/services/chess.js';
import {chessReplyUsesLegalMoves,prewrittenChessReply,tickD23ChessLesson} from '../src/services/chess-lesson.js';
import {Chess} from 'chess.js';
import {render,handle} from '../src/apps/chess/index.js';
import {CHESS_REACTIONS,chessReaction} from '../src/services/chess-dialogue.js';
import {needsChessAnalysis,predeterminedChessReply,finishD23ChessLesson} from '../src/services/chess-lesson.js';
import {recordChessFeedback} from '../src/services/chess-feedback.js';

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
 assert.equal(match().lesson.outbox.filter(m=>m.id.endsWith('piece-p')).length,1);
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
 assert.equal(match().lesson.outbox.filter(x=>x.id.includes('exposed-')&&x.text.includes('后')&&!x.text.includes('h5')).length,1);
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
  assert.equal(match().lesson.outbox.filter(m=>m.id.endsWith('piece-'+type)).length,1,type);
  assert.equal(match().history.at(-1).by,'player',type);
 }
});
test('the D23 King\'s Gambit can be explained even when the model is unavailable',()=>{
 const {match}=d23Store();
 assert.match(prewrittenChessReply(match(),'王翼棄兵是什麼？',chessFacts(match())),/f4/);
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
  assert.match(match().lesson.outbox.at(-1).text,/上課|還沒講完|先聽|注意力|坐不住/);
  assert.equal(match().chat.at(-1).from,'player','reply waits for shared heartbeat');
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
  assert.match(match().lesson.outbox.at(-1).text,/馬.*日|馬.*兩格/);
  assert.equal(match().lesson.outbox.at(-1).mode,'text');
 }finally{globalThis.fetch=prior;}
});
test('off-topic chess chat uses deterministic replies once the current lecture is over',async()=>{
 const {store,matchId,match}=d23Store();
 store.update(s=>s.matches.find(m=>m.id===matchId).lesson.teaching=false);
 postMatchMessage(store,matchId,'今天吃什麼');
 assert.equal(await replyToMatch(store,matchId),true);
 assert.match(match().lesson.outbox.at(-1).text,/晚餐|餓|填不飽/);
});
test('resignation is idempotent, has Tai taunts, persists result, and permanently disables replies',async()=>{
 const {store,matchId,match}=d23Store();
 playOpening(store,matchId);
 assert.equal(resignChessMatch(store,matchId),true);
 assert.equal(match().status,'finished');assert.equal(match().result,'player-resigned');
 assert.equal(match().chat.filter(m=>m.from==='tai').length,3,'endings do not arrive all at once');
 assert.equal(match().lesson.outbox.length,2,'two replies are queued in the existing match');
 assert.equal(resignChessMatch(store,matchId),false);
 assert.equal(match().lesson.outbox.length,2,'resignation cannot enqueue duplicates');
 store.update(s=>tickD23ChessLesson(s,10000));
 store.update(s=>tickD23ChessLesson(s,11200));
 assert.equal(match().chat.filter(m=>m.from==='tai').length,4,'first taunt only');
 store.update(s=>tickD23ChessLesson(s,14300));
 assert.equal(match().chat.filter(m=>m.from==='tai').length,5);
 store.update(s=>tickD23ChessLesson(s,17400));
 assert.equal(match().chat.filter(m=>m.from==='tai').length,5);
 assert.equal(match().lesson.outbox.length,0);
 assert.match(match().chat.at(-1).text,/放你走/);
 assert.equal(postMatchMessage(store,matchId,'親親'),false);
 assert.equal(await replyToMatch(store,matchId),false);
 assert.notEqual(match().chat.at(-1).from,'player');
 assert.equal(store.get().events.filter(e=>e.type==='chess_resigned').length,1);
 store.update(s=>tickD23ChessLesson(s,20000));
 assert.equal(store.get().nav.current.route,'/match/'+matchId,'finished game never exits automatically');
 assert.match(render({store},{route:'/match/'+matchId}),/結束對局/);
 const router={open(location){store.update(s=>s.nav.current=location);}};
 handle('end-match',{dataset:{id:matchId}},{store,router},{route:'/match/'+matchId});
 assert.equal(store.get().nav.current.route,'/chat/s55-ouroboros');
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
 assert.equal(postMatchMessage(store,matchId,'你在嗎'),false);
 assert.equal(await replyToMatch(store,matchId),false);
});

test('when a rook takes the White queen, the novice fallback explains the actual pieces without unsolicited coordinates',async()=>{
 const {store,matchId,match}=d23Store();
 store.update(s=>{
  const m=s.matches.find(x=>x.id===matchId),game=new Chess();
  game.loadPgn('1. Nc3 c5 2. Nd5 e6 3. Nc7+ Qxc7 4. c4 Nf6 5. Nf3 a5 6. Qc2 a4 7. Qxa4');
  m.pgn=game.pgn();
  m.history=game.history({verbose:true}).map((x,i)=>({from:x.from,to:x.to,san:x.san,by:i%2===0?'player':'stockfish'}));
 });
 const fen=loadGame(match()).fen();
 assert.equal(applyStockfishMove(store,matchId,fen,'a8a4'),'Rxa4');
 const line=match().lesson.outbox.find(m=>m.id.includes('capture-black-'));
 assert.ok(line,'captured queen must be named in an authored event');
 assert.match(line.text,/后/);
 assert.doesNotMatch(line.text,/[a-h][1-8]/,'ordinary capture is conversational');
 const prior=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error('gateway offline');};
 try{
  postMatchMessage(store,matchId,'看不懂');
  assert.equal(await replyToMatch(store,matchId),true);
  assert.match(match().lesson.outbox.at(-1).text,/我的車吃了你的后/);
  assert.doesNotMatch(match().lesson.outbox.at(-1).text,/[a-h][1-8]/);
  assert.doesNotMatch(match().lesson.outbox.at(-1).text,/合法選項|例如 Nd/);
  assert.equal(match().lesson.outbox.at(-1).aiGenerated,false);
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
  assert.equal(match().lesson.outbox.at(-1).aiGenerated,true);
  assert.equal(match().chat.at(-1).from,'player','AI response is queued, not injected');
 }finally{globalThis.fetch=prior;}
});
test('ordinary capture never asks the model for an extra aside',async()=>{
 const {store,matchId,match}=d23Store();
 store.update(s=>{
  const m=s.matches.find(x=>x.id===matchId),g=new Chess();g.loadPgn('1. e4 d5 2. exd5');m.pgn=g.pgn();
  m.history=g.history({verbose:true}).map((x,i)=>({from:x.from,to:x.to,san:x.san,by:i%2===0?'player':'stockfish'}));
 });
 const prior=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('capture must stay authored');};
 try{
  assert.equal(applyStockfishMove(store,matchId,loadGame(match()).fen(),'d8d5'),'Qxd5');
  assert.equal(calls,0);assert.equal(match().lesson.outbox.some(x=>x.aiGenerated===true),false);
  assert.ok(match().lesson.outbox.some(x=>x.id.includes('capture-black-')));
 }finally{globalThis.fetch=prior;}
});

test('reaction variants exhaust a saved bag before repetition and ordinary replies name no squares',()=>{
 const {match}=d23Store(),m=match();
 for(const kind of Object.keys(CHESS_REACTIONS)){
  const variants=Array.from({length:CHESS_REACTIONS[kind].length},()=>JSON.stringify(chessReaction(m,kind,{piece:'馬'})));
  assert.equal(new Set(variants).size,CHESS_REACTIONS[kind].length,kind);
  const restored=structuredClone(m);
  if(CHESS_REACTIONS[kind].length>1)assert.notEqual(JSON.stringify(chessReaction(restored,kind,{piece:'馬'})),variants.at(-1),'save/resume must not repeat the previous variant');
 }
});
test('rule questions, greetings, affection and mercy stay preset; current-board explanations use AI',async()=>{
 const {store,matchId,match}=d23Store();playOpening(store,matchId);
 const prior=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('presets cannot fetch');};
 try{
  for(const text of ['馬怎麼走？','車怎麼走？','王車易位是什麼','後翼棄兵是什麼','將軍是什麼','你好','親親','讓讓我','求你了','好厲害','知道了','為什麼不吃飯']){
   assert.equal(needsChessAnalysis(text),false,text);
   postMatchMessage(store,matchId,text);assert.equal(await replyToMatch(store,matchId),true,text);
  }
  assert.equal(calls,0);
  for(const text of ['為什麼你的車能吃我的馬？','我完全看不懂現在在下什麼','現在該怎麼走？','你剛才走了什麼','e4 能走嗎？']){
   assert.equal(needsChessAnalysis(text),true,text);
   assert.equal(predeterminedChessReply(match(),text,chessFacts(match())),null,text);
  }
 }finally{globalThis.fetch=prior;}
});
test('AI prompt contains style examples and board facts; multiple answers are paced, deduplicated and expire after a move',async()=>{
 const {store,matchId,match}=d23Store();playOpening(store,matchId);
 const prior=globalThis.fetch;let calls=0,prompt='';
 globalThis.fetch=async(url,opts)=>{
  calls++;prompt=JSON.parse(opts.body).messages[0].content;
  return {ok:true,text:async()=>JSON.stringify({text:JSON.stringify({messages:[{text:'先看你的馬。',mode:'text'},{text:'它還在起點，先別急。',mode:'text'}]})})};
 };
 try{
  postMatchMessage(store,matchId,'我看不懂現在在下什麼');
  await Promise.all([replyToMatch(store,matchId),replyToMatch(store,matchId)]);
  assert.equal(calls,1);assert.match(prompt,/語氣參考/);assert.match(prompt,/不要開口就報/);
  assert.match(prompt,/pieces/);assert.match(prompt,/legalMoves/);assert.match(prompt,/不是.*最佳|不許稱為最佳/);
  assert.equal(match().lesson.outbox.length,2);assert.equal(match().chat.at(-1).from,'player');
  assert.equal(await replyToMatch(store,matchId),false,'same player message may not queue twice');
  store.update(s=>tickD23ChessLesson(s,10000));store.update(s=>tickD23ChessLesson(s,11200));
  assert.equal(match().chat.at(-1).text,'先看你的馬。');assert.equal(match().lesson.outbox.length,1);
  store.update(s=>tickD23ChessLesson(s,11300));assert.equal(match().lesson.outbox.length,1);
  playMove(store,matchId,'e2','e4');
  store.update(s=>tickD23ChessLesson(s,14300));
  assert.equal(match().chat.some(m=>m.text==='它還在起點，先別急。'),false,'stale second analysis must not be spoken');
 }finally{globalThis.fetch=prior;}
});
test('a real final capture is named before the individually queued checkmate recap',()=>{
 const {store,matchId,match}=d23Store();playOpening(store,matchId);
 const game=new Chess();game.loadPgn('1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6');
 store.update(s=>{const m=s.matches.find(m=>m.id===matchId);m.pgn=game.pgn();m.history=game.history({verbose:true}).map((x,i)=>({from:x.from,to:x.to,san:x.san,by:i%2===0?'player':'stockfish'}));});
 const outcome=playMove(store,matchId,'h5','f7');
 assert.equal(outcome.finished,true);assert.equal(match().result,'player-win');
 assert.match(match().lesson.outbox[0].text,/兵/);assert.equal(match().lesson.outbox.length,3);
 assert.deepEqual(match().feedbackEvents.map(x=>x.kind),['capture','win']);
 store.update(s=>tickD23ChessLesson(s,10000));store.update(s=>tickD23ChessLesson(s,11200));
 assert.equal(match().lesson.outbox.length,2);assert.match(match().chat.at(-1).text,/兵/);
});
test('capture and terminal feedback are attached once to actual moves, and resign is a terminal effect',()=>{
 const {store,matchId,match}=d23Store();
 playMove(store,matchId,'e2','e4');applyStockfishMove(store,matchId,loadGame(match()).fen(),'d7d5');playMove(store,matchId,'e4','d5');
 assert.deepEqual(match().feedbackEvents.map(x=>[x.id,x.kind,x.square,x.piece,x.color]),[['capture-3','capture','d5','p','b']]);
 const restored=structuredClone(match());recordChessFeedback(restored,{captured:'p',color:'w',to:'d5'});assert.equal(restored.feedbackEvents.length,1);
 resignChessMatch(store,matchId);assert.equal(match().feedbackEvents.at(-1).kind,'loss');
 const html=render({store},{route:'/match/'+matchId});assert.doesNotMatch(html,/data-form="chess-chat"/);
 assert.doesNotMatch(html,/data-action="end-match"/,'wait for all terminal presets before exit');
});

test('saved chess replies are due in the shared message heartbeat even when game time is frozen',async()=>{
 const {chessLessonDue}=await import('../src/services/chess-lesson.js');
 const {store,matchId,match}=d23Store();playOpening(store,matchId);
 store.update(s=>{s.unlocked=true;s.story55.minutesPerSecond=0;});
 assert.equal(chessLessonDue(store.get(),9000),false);
 postMatchMessage(store,matchId,'親親');await replyToMatch(store,matchId);
 assert.equal(chessLessonDue(store.get(),9000),true,'real-time outbox schedules without world-clock activity');
 store.update(s=>tickD23ChessLesson(s,9000));
 assert.equal(chessLessonDue(store.get(),10000),false);
 assert.equal(chessLessonDue(store.get(),10200),true);
 store.update(s=>tickD23ChessLesson(s,10200));
 assert.equal(match().chat.at(-1).from,'tai');assert.equal(store.get().clock,'22:20');
 store.update(s=>s.nav.current.appId='mirage');assert.equal(chessLessonDue(store.get(),20000),false);
 store.update(s=>{s.nav.current.appId='chess';s.unlocked=false;});assert.equal(chessLessonDue(store.get(),20000),false);
});

test('a pawn tutorial arriving after Send cannot swallow the pending player reply',async()=>{
 const {store,matchId,match}=d23Store();playOpening(store,matchId);
 playMove(store,matchId,'e2','e4');
 postMatchMessage(store,matchId,'親親');
 store.update(s=>tickD23ChessLesson(s,10000));store.update(s=>tickD23ChessLesson(s,11200));
 assert.equal(match().chat.at(-1).from,'tai','scheduled piece explanation overtakes the delayed reply request');
 assert.equal(await replyToMatch(store,matchId),true,'latest unanswered player message is still handled');
 assert.equal(await replyToMatch(store,matchId),false,'one answer per outgoing message');
 assert.ok(match().lesson.outbox.some(m=>m.sourceMessageId));
});

test('typing in the chess composer suspends queued NPC text until the draft clears',async()=>{
 const {chessLessonDue}=await import('../src/services/chess-lesson.js');
 const {store,matchId,match}=d23Store();
 playOpening(store,matchId);
 store.update(s=>{
  s.unlocked=true;
  const m=s.matches.find(x=>x.id===matchId);
  m.lesson.outbox.push({id:'qa-typing',from:'tai',text:'先看清楚。',time:s.clock});
  m.lesson.outboxNextAt=4000;
 });
 const input={value:'我還沒打完'};
 const oldDocument=globalThis.document;
 try{
  globalThis.document={activeElement:input,querySelector:()=>input};
  assert.equal(chessLessonDue(store.get(),6000),false,'no interruption of an active draft');
  store.update(s=>tickD23ChessLesson(s,6000));
  assert.equal(match().lesson.outbox.length,1);
  assert.equal(match().chat.some(m=>m.id==='qa-typing'),false);
  input.value='';
  assert.equal(chessLessonDue(store.get(),6000),true);
  store.update(s=>tickD23ChessLesson(s,6000));
  assert.equal(match().lesson.outbox.length,0);
  assert.equal(match().chat.at(-1).text,'先看清楚。');
 }finally{
  if(oldDocument===undefined)delete globalThis.document;
  else globalThis.document=oldDocument;
 }
});
