// D23-specific content lives inside the existing Story55 graph, native Mirage
// conversation and shared message heartbeat. No extra clock or chat database.
import {askTai} from '../ai/gateway.js';
import {unpackTaiReply} from '../ai/format.js';
import {chessFacts} from '../chess.js';
import {buildChessPostgamePrompt} from '../chess-dialogue.js';
import {appendAuthoredPhoneMessage} from '../messaging/phone-messages.js';
import {CHAT_LIFECYCLE_POLICY} from '../messaging/lifecycle/engine.js';
import {isStory55,completed,date55,taiRecognized} from './state.js';

export const D23_MIRAGE_CONTACT='s55-ouroboros';
export const D23_MIRAGE_MATCH='s55-d23-chess-invite';
const MAX_TURNS=3;
const waitingAI=new WeakMap();
const validChat=s=>s?.nav?.current?.appId==='mirage'&&s.nav.current.route==='/chat/'+D23_MIRAGE_CONTACT;

export function d23MiragePostgame(s,id=D23_MIRAGE_CONTACT){
 if(!isStory55(s)||id!==D23_MIRAGE_CONTACT||!s.story55?.d23Postgame)return null;
 const pg=s.story55.d23Postgame;
 const m=s.matches?.find(m=>m.id===pg.matchId&&m.invitationId===D23_MIRAGE_MATCH);
 return m&&m.status==='finished'?pg:null;
}
export function beginD23MiragePostgame(s,matchId){
 const match=s.matches?.find(m=>m.id===matchId);
 if(!isStory55(s)||!match||match.invitationId!==D23_MIRAGE_MATCH||
    match.status!=='finished'||!match.lesson?.finishedNotified||match.lesson?.outbox?.length)return false;
 const existing=s.story55.d23Postgame;
 if(existing){
  if(existing.matchId!==matchId)return false;
  match.closedAt??=Date.now();
  return true;
 }
 match.closedAt=Date.now();
 s.story55.d23Postgame={matchId,phase:'intro',rounds:0,lastPlayerId:null,
  aiOutbox:[],nextAt:null,closed:false};
 return true;
}
export function canSendD23Mirage(s,id=D23_MIRAGE_CONTACT){
 const pg=d23MiragePostgame(s,id);
 return !!pg&&!completed(s,'d23-chess-finish')&&pg.phase==='chat'&&pg.rounds<MAX_TURNS;
}
export function acceptD23MirageSend(s,messageId){
 const pg=d23MiragePostgame(s);
 if(!canSendD23Mirage(s)||!messageId)return false;
 const c=s.content.conversations.mirage?.find(c=>c.id===D23_MIRAGE_CONTACT);
 if(!c?.messages?.some(m=>m.id===messageId&&m.from==='me'&&m.actual===true))return false;
 pg.rounds++;pg.lastPlayerId=messageId;pg.phase='awaiting';
 return true;
}
// The authored farewell temporarily holds the ONE active Story55 scene slot.
// Any earlier unfinished scene resumes after the goodbye without losing progress.
function prepareD23FarewellScene(s,pg){
 if(pg.phase!=='closing')return false;
 if(pg.farewellPrepared)return false;
 pg.previousActiveScene=s.story55.activeScene&&s.story55.activeScene!=='d23-chess-finish'?s.story55.activeScene:null;
 pg.farewellPrepared=true;s.story55.activeScene='d23-chess-finish';
 return true;
}
export function endD23MirageConversation(s){
 const pg=d23MiragePostgame(s);
 if(!pg||pg.closed||!(pg.phase==='chat'||pg.phase==='awaiting'&&pg.replyFailed))return false;
 delete pg.replyFailed;
 pg.phase='closing';prepareD23FarewellScene(s,pg);return true;
}
// The existing Story55 tick commits one message per heartbeat, with the same
// 450ms first-bubble and 1900ms subsequent-bubble policy as other native chats.
export function tickD23MiragePostgame(s,now=Date.now()){
 const pg=d23MiragePostgame(s);
 if(!pg||!validChat(s))return false;
 if(pg.phase==='closing')return prepareD23FarewellScene(s,pg);
 if(!['intro-delivering','reply-delivering'].includes(pg.phase))return false;
 if(!pg.aiOutbox?.length)return false;
 if(!Number.isFinite(pg.nextAt)){pg.nextAt=now+CHAT_LIFECYCLE_POLICY.initialDelayMs;return true;}
 if(now<pg.nextAt)return false;
 const line=pg.aiOutbox.shift();
 const delivered=appendAuthoredPhoneMessage(s,{channel:'mirage',conversationId:D23_MIRAGE_CONTACT,
  messageId:line.id,from:D23_MIRAGE_CONTACT,text:line.text,day:s.day,clock:s.clock,
  sentDate:date55(s.day+(s.day===23&&s.story55?.d23?.nightAfterMidnight?1:0)),storyTag:'story55'});
 if(delivered)delivered.aiGenerated=line.aiGenerated===true;
 pg.nextAt=pg.aiOutbox.length?now+CHAT_LIFECYCLE_POLICY.pauseMs:null;
 if(!pg.aiOutbox.length){
  pg.phase=pg.rounds>=MAX_TURNS?'closing':'chat';
  if(pg.phase==='closing')prepareD23FarewellScene(s,pg);
 }
 return true;
}
export function d23MiragePostgameDue(s,now=Date.now()){
 const pg=d23MiragePostgame(s);
 if(!pg||!validChat(s)||completed(s,'d23-chess-finish'))return false;
 if(['intro-delivering','reply-delivering'].includes(pg.phase)&&pg.aiOutbox?.length)
  return !Number.isFinite(pg.nextAt)||now>=pg.nextAt;
 if(pg.phase==='closing'){
  const q=s.story55.scenes?.['d23-chess-finish'];
  return !Number.isFinite(q?.nextAt)||now>=q.nextAt;
 }
 return false;
}
const introByResult={
 'player-win':['贏一盤，回來都慢了。','忙著高興？'],
 'opponent-win':['還在想剛才那盤？'],
 'player-resigned':['累了，還是不想跟我下？'],
 draw:['下次可沒這麼容易收場。']
};
const noSpoilers=/熙泰|xitai|三胞胎|親兄弟|亲兄弟|我是你(?:的)?哥|你是我(?:的)?哥/i;
async function bounded(promise,ms){
 let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(Error('D23 Mirage AI timeout')),ms);
 })]);}finally{clearTimeout(timer);}
}
// This is the only authorized Mirage AI exception. Global ordinary Mirage AI
// remains disabled; real sends, history and permissions use its original path.
// Pure commit path shared by real AI and deterministic regression tests.
export function commitD23MirageResponse(s,{intro,round,sourceId,replies,ai=false}){
 const pg=d23MiragePostgame(s);
 if(!pg||pg.phase!==(intro?'intro':'awaiting')||pg.rounds!==round||
    (!intro&&pg.lastPlayerId!==sourceId))return false;
 if(!Array.isArray(replies)||!replies.length||replies.length>2)return false;
 const c=s.content.conversations.mirage?.find(c=>c.id===D23_MIRAGE_CONTACT);
 if(!c)return false;
 delete pg.replyFailed;
 pg.aiOutbox=replies.map((text,index)=>({id:'s55-d23-mirage-'+(intro?'intro':'reply-'+round)+'-'+index,
  text,aiGenerated:ai,sourceMessageId:sourceId}));
 pg.nextAt=null;pg.phase=intro?'intro-delivering':'reply-delivering';
 return true;
}
export function replyToD23Mirage(store,{retry=false}={}){
 const first=store.get(),pg=d23MiragePostgame(first);
 if(!pg||!validChat(first)||!['intro','awaiting'].includes(pg.phase))return Promise.resolve(false);
 if(pg.replyFailed&&!retry)return Promise.resolve(false);
 const intro=pg.phase==='intro',round=pg.rounds,sourceId=pg.lastPlayerId,matchId=pg.matchId;
 const current=waitingAI.get(store);if(current)return current;
 const job=(async()=>{
  // The authored intro must commit after the current render returns. Otherwise
  // reentrant rendering can enter MIRAGE twice and consume its one-use return.
  await Promise.resolve();
  if(retry&&pg.replyFailed)store.update(s=>{const live=d23MiragePostgame(s);if(live?.matchId===matchId&&live.lastPlayerId===sourceId)delete live.replyFailed;});
  const match=first.matches.find(m=>m.id===matchId),facts=chessFacts(match);
  const mirage=first.content.conversations.mirage?.find(c=>c.id===D23_MIRAGE_CONTACT);
  const boardEnd=(match.chat||[]).filter(m=>m.from==='tai').slice(-3).map(m=>m.text);
  const history=(mirage?.messages||[]).filter(m=>m.kind==='text'&&typeof m.text==='string'&&!m.demo)
   .slice(-12).map(m=>({role:m.from==='me'?'user':'assistant',content:m.text.slice(0,900)}));
  const system=buildChessPostgamePrompt(facts,match.result,round)+
   '\n你現在是在 MIRAGE 私聊，不在棋盤 App。棋盤剛才已說過的終局預設：'+JSON.stringify(boardEnd)+
   '\n不要重複宣布勝負；順著剛才的對話延伸。不得自行道別，稍後由固定預設下線。';
  let replies=intro?(introByResult[match.result]||introByResult.draw):[],ai=false;
  if(!intro)try{
   // askTai already supplies the one system message; scenario instructions
   // belong in scene, not a second system role rejected by the cloud gateway.
   const response=await bounded(askTai({channel:'mirage',day:first.day,messages:history,
    profile:first.aiDraft?.profile,memories:first.aiDraft?.memories,
    recognized:taiRecognized(first),storyVersion:55,outputMode:'text',allowVoice:false,
    scene:system+'\n可以自由回應任何當前私人話題，包括與棋局無關的問題。不要把一般疑問自動解讀成棋局問題。'}),65000);
   replies=unpackTaiReply(response,'mirage').map(p=>String(p.text||'').trim()).filter(Boolean).slice(0,2);
   if(!replies.length||replies.some(p=>noSpoilers.test(p)))throw Error('D23 reply unavailable or premature identity reveal');
   ai=true;
  }catch(error){
   console.warn('D23 Mirage AI reply unavailable:',error?.message);
   store.update(s=>{const live=d23MiragePostgame(s);if(live?.matchId===matchId&&live.phase==='awaiting'&&live.rounds===round&&live.lastPlayerId===sourceId)live.replyFailed=true;});
   return false;
  }
  let changed=false;
  store.update(s=>{
   const live=d23MiragePostgame(s);
   if(live?.matchId!==matchId)return;
   changed=commitD23MirageResponse(s,{intro,round,sourceId,replies,ai});
  });
  return changed;
 })().finally(()=>waitingAI.delete(store));
 waitingAI.set(store,job);
 return job;
}
