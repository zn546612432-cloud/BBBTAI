import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {Chess} from 'chess.js';
import {bestStockfishMove} from '../src/services/chess-stockfish.js';
import {applyStockfishMove,createSoloMatch,playMove,loadGame} from '../src/services/chess.js';
import {initialState} from '../src/services/storage.js';

const makeStore=()=>{const s=initialState();return {get:()=>s,update:fn=>fn(s)};};
const validMove=(fen,uci)=>{const game=new Chess(fen);return !!game.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]||'q'});};

test('Stockfish worker speaks UCI and returns a legal response (real package)',async()=>{
 const script='node_modules/stockfish/bin/stockfish-19-lite-single.js';
 assert.ok(existsSync(script),'Stockfish must be installed locally, not replaced by simulated chess');
 const child=spawn(process.execPath,[script],{stdio:['pipe','pipe','pipe']});
 const output=[],errors=[];
 const result=await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('Stockfish did not return a move')),20000);
  child.stderr.on('data',v=>errors.push(String(v)));
  child.on('error',reject);
  child.stdout.on('data',data=>{
   output.push(String(data));const joined=output.join('');
   if(/uciok/.test(joined)&&!joined.includes('position startpos')){output.push('position startpos');child.stdin.write('position startpos\ngo movetime 200\n');}
   const match=joined.match(/bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/);
   if(match){clearTimeout(timeout);resolve(match[1]);}
  });
  child.stdin.write('uci\n');
 }).finally(()=>{child.stdin.write('quit\n');child.kill();});
 assert.ok(validMove(new Chess().fen(),result),'Stockfish must produce a legal chess move');
 assert.ok(!errors.some(e=>/fatal error/i.test(e)),errors.join(''));
});

test('browser worker UCI request validates bestmove without simulated fallback',async()=>{
 const sent=[];
 const fakeWorker={
  onmessage:null,onerror:null,terminated:false,
  postMessage(command){
   sent.push(command);
   queueMicrotask(()=>{
    if(command==='uci')this.onmessage({data:'uciok'});
    else if(command==='isready')this.onmessage({data:'readyok'});
    else if(command.startsWith('go '))this.onmessage({data:'bestmove e7e5'});
   });
  },
  terminate(){this.terminated=true;}
 };
 const chess=new Chess();chess.move('e4');const fen=chess.fen();
 const best=await bestStockfishMove(fen,{workerFactory:()=>fakeWorker,timeoutMs:3000,thinkMs:200});
 assert.equal(best,'e7e5');assert.ok(sent.some(s=>s==='position fen '+fen));
 assert.ok(fakeWorker.terminated);
});

test('invalid or timed-out engine response rejects instead of moving a random piece',async()=>{
 const testGame=new Chess();testGame.move('e4');const fen=testGame.fen();
 const invalid={postMessage(cmd){if(cmd==='uci')queueMicrotask(()=>this.onmessage({data:'uciok'}));else if(cmd==='isready')queueMicrotask(()=>this.onmessage({data:'readyok'}));else if(cmd.startsWith('go '))queueMicrotask(()=>this.onmessage({data:'bestmove wrong'}));},terminate(){}};
 await assert.rejects(()=>bestStockfishMove(fen,{workerFactory:()=>invalid,timeoutMs:200}),/Stockfish|引擎|非法/);
 const silent={postMessage(){},terminate(){this.terminated=true;}};
 await assert.rejects(()=>bestStockfishMove(fen,{workerFactory:()=>silent,timeoutMs:30}),/超時|timeout/i);
 assert.equal(silent.terminated,true);
});

test('a black Stockfish move updates the existing legal PGN and event store',()=>{
 const store=makeStore(),id=createSoloMatch(store);
 playMove(store,id,'e2','e4');
 const original=loadGame(store.get().matches.find(m=>m.id===id)).fen();
 assert.throws(()=>applyStockfishMove(store,id,original,'e7e9'),/非法|合法/);
 assert.equal(applyStockfishMove(store,id,original,'e7e5'),'e5');
 const match=store.get().matches.find(m=>m.id===id);
 assert.equal(match.history.at(-1).by,'stockfish');
 assert.equal(match.history.length,2);
 assert.equal(loadGame(match).turn(),'w');
 assert.equal(applyStockfishMove(store,id,original,'g8f6'),null,'stale response must not overwrite a newer board');
});
