import {voicePreview} from '../../services/ai/gateway.js';
import {createGestureAudio,primeAudio} from '../../services/voice/playback.js';
import {advanceD41Chess,completeD41ChessCue,isD41Chess,initializeD41Chess,d41ChessDraft} from '../../services/chess-scripted.js';
import {D41_CHESS_CUES,D41_CHESS_DRAFT} from '../../story/d34-d42/d41-chess.js';
import {D41_CALL} from '../../story/d34-d42/definition.js';
import {scriptedCallPlayed} from '../../services/story55/state.js';

let audio;
const running=new WeakSet();
export function unlockD41Voice(){audio??=createGestureAudio();if(audio)primeAudio(audio);}
const visible=(s,id)=>s.unlocked&&s.nav?.current?.appId==='chess'&&s.nav.current.route==='/match/'+id&&globalThis.document?.visibilityState!=='hidden';
const matchFor=(s,id)=>s.matches.find(m=>m.id===id);
export function d41DraftDisplay(match){
 const draft=d41ChessDraft(match);if(!draft)return {text:'',ready:false};
 const length=Math.min(draft.length,Math.max(0,Math.floor((Date.now()-(match.d41Script.draftStartedAt??0))/95)));
 return {text:draft.slice(0,length),ready:length===D41_CHESS_DRAFT.length};
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function bounded(promise,ms){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('語音逾時')),ms);})]);}finally{clearTimeout(timer);}}
async function speak(text,current){
 const blob=await bounded(voicePreview({text,tone:'neutral',directed:true}),15000);
 if(!current())return false;
 audio??=createGestureAudio();if(!audio)throw Error('無法播放語音');
 const url=URL.createObjectURL(blob);audio.pause();audio.src=url;
 let clean=()=>{};
 try{return await bounded(new Promise((resolve,reject)=>{
  const end=()=>{clean();resolve(true);},error=()=>{clean();reject(Error('語音播放失敗'));};
  const poll=setInterval(()=>{if(!current()){clean();resolve(false);}},200);
  clean=()=>{clearInterval(poll);audio.removeEventListener('ended',end);audio.removeEventListener('error',error);};
  audio.addEventListener('ended',end,{once:true});audio.addEventListener('error',error,{once:true});
  Promise.resolve(audio.play()).catch(error);
 }),20000);}finally{clean();audio.pause();URL.revokeObjectURL(url);}
}
// The regular chess app renders and persists every move. The runner only
// advances while that board is open, never while the app is in the background.
export function scheduleD41Chess(ctx,id){
 const {store}=ctx,s=store.get(),m=matchFor(s,id);
 if(!globalThis.document||!isD41Chess(m)||!visible(s,id)||!scriptedCallPlayed(s,D41_CALL)||running.has(store))return;
 if(m.status==='finished'&&!m.d41Script?.pendingVoice||m.d41Script?.voiceFailed||d41DraftDisplay(m).ready)return;
 running.add(store);
 void (async()=>{
  try{
   if(d41ChessDraft(m)){await delay(95);return;}
   if(!m.d41Script){await delay(0);if(visible(store.get(),id))store.update(state=>initializeD41Chess(matchFor(state,id)));return;}
   const ply=m.d41Script.pendingVoice;
   if(ply){
    const current=()=>matchFor(store.get(),id)?.d41Script?.pendingVoice===ply;
    try{if(await speak(D41_CHESS_CUES[ply],()=>current()&&visible(store.get(),id))&&current())completeD41ChessCue(store,id,ply);}
    catch{if(current())store.update(state=>{matchFor(state,id).d41Script.voiceFailed=true;});}
    return;
   }
   await delay(1500);
   if(visible(store.get(),id))advanceD41Chess(store,id);
  }finally{running.delete(store);ctx.refresh?.();}
 })();
}
export function recoverD41Voice(ctx,id,skip=false){
 const m=matchFor(ctx.store.get(),id),ply=m?.d41Script?.pendingVoice;
 if(!isD41Chess(m)||!ply||!m.d41Script.voiceFailed)return;
 unlockD41Voice();
 ctx.store.update(s=>{delete matchFor(s,id).d41Script.voiceFailed;});
 if(skip)completeD41ChessCue(ctx.store,id,ply);
 ctx.refresh?.();
}
