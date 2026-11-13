import {Chess} from 'chess.js';

// Stockfish runs locally in a Web Worker. The build copies both upstream files
// without reimplementing any of the chess engine or its search algorithms.
export const STOCKFISH_WORKER_URL='/vendor/stockfish-19-lite-single.js';
const DEFAULT_TIMEOUT_MS=15000;
const DEFAULT_THINK_MS=450;

export function bestStockfishMove(fen,{
 workerFactory=()=>new Worker(STOCKFISH_WORKER_URL),
 timeoutMs=DEFAULT_TIMEOUT_MS,
 thinkMs=DEFAULT_THINK_MS
}={}){
 if(typeof fen!=='string')return Promise.reject(Error('棋局資料無效'));
 let game;
 try{game=new Chess(fen);}catch{return Promise.reject(Error('棋局資料無效'));}
 if(game.isGameOver())return Promise.reject(Error('棋局已結束'));
 if(game.turn()!=='b')return Promise.reject(Error('尚未輪到對方'));
 return new Promise((resolve,reject)=>{
  let worker,finished=false,stage='boot';
  let timeout;
  const done=(error,move)=>{
   if(finished)return;
   finished=true;clearTimeout(timeout);
   try{worker?.terminate();}catch{}
   if(error)reject(error);else resolve(move);
  };
  try{worker=workerFactory();}catch(error){done(Error('國際象棋引擎無法啟動：'+error.message));return;}
  if(!worker||typeof worker.postMessage!=='function'){done(Error('國際象棋引擎無法啟動'));return;}
  worker.onerror=e=>done(Error('國際象棋引擎載入失敗'+(e?.message?'：'+e.message:'')));
  worker.onmessage=e=>{
   const text=String(e.data||'').trim();
   for(const line of text.split(/\r?\n/)){
    if(stage==='boot'&&line==='uciok'){stage='ready';worker.postMessage('isready');continue;}
    if(stage==='ready'&&line==='readyok'){
     stage='search';worker.postMessage('position fen '+fen);worker.postMessage('go movetime '+Math.max(100,Math.min(1500,Number(thinkMs)||DEFAULT_THINK_MS)));continue;
    }
    if(stage==='search'&&/^bestmove\s+/.test(line)){
     const move=line.split(/\s+/)[1];
     if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))return done(Error('國際象棋引擎返回非法走法'));
     const copy=new Chess(fen);
     try{if(!copy.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]||'q'}))throw Error('invalid');}
     catch{return done(Error('國際象棋引擎返回非法走法'));}
     done(null,move);
    }
   }
  };
  timeout=setTimeout(()=>done(Error('國際象棋引擎回應超時，請重試')),Math.max(10,Number(timeoutMs)||DEFAULT_TIMEOUT_MS));
  worker.postMessage('uci');
 });
}
