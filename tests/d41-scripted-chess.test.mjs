import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
import {D41_CHESS_MOVES,D41_CHESS_CUES,D41_CHESS_DRAFT,D41_CHESS_INVITATION,d41ChessComplete} from '../src/story/d34-d42/d41-chess.js';
import {advanceD41Chess,completeD41ChessCue,sendD41ChessDraft,d41ChessDraft,initializeD41Chess} from '../src/services/chess-scripted.js';
import {render,submit} from '../src/apps/chess/index.js';
import {playMove,applyStockfishMove,resignChessMatch,loadGame} from '../src/services/chess.js';

const make=()=>{let s={day:41,clock:'23:40',matches:[{id:'d41',invitationId:D41_CHESS_INVITATION,opponent:'tai',status:'active',pgn:'',history:[],chat:[],turn:'w'}],events:[]};initializeD41Chess(s.matches[0]);return {get:()=>s,update:fn=>fn(s),reload(){s=JSON.parse(JSON.stringify(s));}};};
test('37 legal plies, six cue points and a genuine white mate',()=>{
 const game=new Chess(),moves=D41_CHESS_MOVES.map(m=>game.move(m));
 assert.equal(moves.length,37);assert.equal(game.isCheckmate(),true);assert.equal(game.turn(),'b');
 assert.equal(moves[0].piece,'p');assert.equal(moves[5].captured,'p');assert.equal(moves[12].piece,'n');assert.equal(moves[18].piece,'b');assert.equal(moves[24].piece,'q');assert.equal(moves[30].piece,'k');
 assert.deepEqual(Object.keys(D41_CHESS_CUES).map(Number),[1,7,13,19,25,31,37]);
});
test('automatic D41 sequence is resumable, refuses manual moves, stops at each cue and waits for native Send and final voice',()=>{
 const store=make(),id='d41',match=()=>store.get().matches[0];
 assert.equal(playMove(store,id,'e2','e4'),null);assert.equal(resignChessMatch(store,id),false);
 for(let ply=1;ply<37;ply++){
  assert.equal(advanceD41Chess(store,id),true);assert.equal(match().history.length,ply);
  if(D41_CHESS_CUES[ply]){
   assert.equal(match().chat.at(-1).text,D41_CHESS_CUES[ply]);assert.equal(advanceD41Chess(store,id),false);
   assert.equal(applyStockfishMove(store,id,loadGame(match()).fen(),'a7a6'),null);
   store.reload();assert.equal(match().d41Script.pendingVoice,ply);
   assert.equal(completeD41ChessCue(store,id,ply),true);assert.equal(completeD41ChessCue(store,id,ply),false);
  }
 }
 assert.equal(d41ChessDraft(match()),D41_CHESS_DRAFT);assert.equal(advanceD41Chess(store,id),false);
 assert.equal(sendD41ChessDraft(store,id,'anything else'),false);
 match().d41Script.draftStartedAt=0;
 const ctx={store};const html=render(ctx,{route:'/match/'+id});assert.match(html,/value="Checkmate\." readonly/);assert.doesNotMatch(html,/data-action="resign-match"/);
 const old=globalThis.FormData;try{globalThis.FormData=class{get(){return D41_CHESS_DRAFT;}};submit({dataset:{form:'chess-chat',id}},ctx);}finally{globalThis.FormData=old;}
 assert.equal(match().status,'finished');assert.equal(match().result,'player-win');assert.equal(loadGame(match()).isCheckmate(),true);
 assert.equal(match().chat.at(-2).from,'player');assert.equal(match().chat.at(-2).text,D41_CHESS_DRAFT);
 assert.equal(match().chat.at(-1).text,D41_CHESS_CUES[37]);assert.equal(d41ChessComplete(match()),false);
 assert.equal(sendD41ChessDraft(store,id,D41_CHESS_DRAFT),false);store.reload();
 assert.equal(completeD41ChessCue(store,id,37),true);assert.equal(d41ChessComplete(match()),true);assert.equal(match().chat.length,8);
});
test('old active D41 history is retained on migration, completed legacy games remain complete',()=>{
 const old={invitationId:D41_CHESS_INVITATION,status:'active',history:[{san:'e4'}],pgn:'1. e4',chat:[]};
 assert.equal(initializeD41Chess(old),true);assert.equal(old.legacyBeforeD41Script.pgn,'1. e4');assert.equal(old.history.length,0);assert.equal(initializeD41Chess(old),false);
 assert.equal(d41ChessComplete({invitationId:D41_CHESS_INVITATION,status:'finished'}),true);
});
