import {mirageAIEnabled,mirageAIRevision} from '../../../../services/ai/channel-controls.js';
import {askTai,aiStatus} from '../../../../services/ai/gateway.js';
import {unpackTaiReply} from '../../../../services/ai/format.js';
import {taiBehavior,replyDelayMs} from '../../../../services/ai/behavior.js';
import {captureTaiWorldbook} from '../../../../services/ai/worldbook/index.js';
import {anonymousPresence55} from '../../../../services/story55/runtime.js';
import {currentScript55} from '../../../../services/story55/scripted-chat.js';
import {d23MiragePostgame} from '../../../../services/story55/d23-postgame.js';
import {isStory55,taiRecognized} from '../../../../services/story55/state.js';
import {visibleMessages} from '../../../../services/messaging/delivery.js';
import {dateParts} from '../../../../services/calendar.js';
import {uid} from '../../../../services/id.js';
import {isOuroborosScriptActive} from '../../ouroboros-flow.js';
import {isMirageAuthenticated} from '../../session.js';
import {mirageTaiReplyGuidance,mirageTaiForbiddenLine} from './presets.js';

const pending=new Set();
const findContact=(s,id)=>s.content?.conversations?.mirage?.find(c=>c.id===id);
const anonymousContact=(id,c)=>id==='s55-ouroboros'||/^(?:Dr[.\s]*Ouroboros|[銜衔]尾蛇(?:博士)?)$/i.test(String(c?.name||'').trim());
const isAuthored=m=>m?.storyTag==='story55'||m?.authoredPending===true||m?.demo===true;

function freeTurnAllowed(s,id,sourceId,revision,day){
 const chat=findContact(s,id),postgame=d23MiragePostgame(s,id);
 if(!mirageAIEnabled(s)||mirageAIRevision(s)!==revision||s.day!==day||!isMirageAuthenticated()||
   !chat||!anonymousContact(id,chat)||!isStory55(s)||taiRecognized(s)||
   !anonymousPresence55(s).online||isOuroborosScriptActive(s,id)||
   currentScript55(s,'mirage',id)||postgame&&!postgame.closed)return false;
 const source=chat.messages.find(m=>m.id===sourceId);
 return !!source&&source.from==='me'&&source.kind==='text'&&!isAuthored(source)&&
  chat.messages.at(-1)?.id===sourceId&&
  !chat.messages.some(m=>m.replySourceId===sourceId);
}

// Called on a player SEND. A short debounce coalesces rapid consecutive
// messages; a newer player message supersedes the older in-flight model turn.
// Only the shared MIRAGE message store actually commits the generated bubbles.
export async function replyToOuroboros(ctx,contactId,sourceId,{wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 const initial=ctx.store.get(),revision=mirageAIRevision(initial),key=contactId+':'+sourceId;
 if(pending.has(key)||!freeTurnAllowed(initial,contactId,sourceId,revision,initial.day))return 0;
 pending.add(key);
 const permitted=()=>freeTurnAllowed(ctx.store.get(),contactId,sourceId,revision,initial.day);
 try{
  await wait(650);
  if(!permitted())return 0;
  const status=await aiStatus();
  if(!permitted())return 0;
  if(!status.deepseek)throw Error('DeepSeek 尚未連接，請檢查 AI 設定');
  const contact=findContact(ctx.store.get(),contactId);
  const history=visibleMessages(contact,ctx.store.get())
   .filter(m=>m.kind==='text'&&typeof m.text==='string'&&!m.demo&&!m.authoredPending)
   .slice(-30).map(m=>({role:m.from==='me'?'user':'assistant',content:m.text.slice(0,1800)}));
  if(history.at(-1)?.role!=='user')return 0;
  const scene=mirageTaiReplyGuidance({text:history.at(-1).content,day:initial.day})+
   '\n如果此前有多條尚未回覆的留言，連起來理解。不要逐條機械重複回應，也不要無故忽略真正的問題。';
  const snapshot=captureTaiWorldbook(ctx.store,{
   channel:'mirage',recognized:false,day:initial.day,messages:history,
   sourceMessageId:sourceId,turnId:sourceId
  });
  if(!permitted())return 0;
  const request={day:initial.day,channel:'mirage',storyVersion:'55-v1',recognized:false,
   messages:history,profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories,
   worldbookSnapshot:snapshot,scene,outputMode:'text'};
  let result=await askTai(request);
  if(!permitted())return 0;
  let chunks=unpackTaiReply(result,'mirage').slice(0,4);
  if(chunks.some(m=>mirageTaiForbiddenLine(m.text))){
   result=await askTai({...request,scene:scene+
    '\n上一稿出現了作者明令禁止的道歉或上線報備句式。整輪重新回答玩家真正問的事情。不要使用那些句式。'});
   if(!permitted())return 0;
   chunks=unpackTaiReply(result,'mirage').slice(0,4);
   if(chunks.some(m=>mirageTaiForbiddenLine(m.text)))throw Error('台詞未通過人物語氣檢查，沒有發送');
  }
  let inserted=0;
  for(const item of chunks){
   if(!permitted()&&inserted===0)break;
   // A continuation may follow Tai's own first bubble. A newer PLAYER
   // bubble or authored scene still cancels the remaining model segments.
   if(inserted>0){
    const now=ctx.store.get(),chat=findContact(now,contactId);
    const postgame=d23MiragePostgame(now,contactId);
    if(!chat||now.day!==initial.day||!isMirageAuthenticated()||
      mirageAIRevision(now)!==revision||!mirageAIEnabled(now)||!anonymousPresence55(now).online||
      currentScript55(now,'mirage',contactId)||isOuroborosScriptActive(now,contactId)||
      postgame&&!postgame.closed||
      chat.messages.filter(m=>m.from==='me').at(-1)?.id!==sourceId)break;
   }
   const msgId=uid();
   ctx.store.update(s=>{
    const target=findContact(s,contactId);
    if(!target)return;
    target.messages.push({id:msgId,from:contactId,text:item.text,kind:'text',
     day:s.day,time:s.clock,sentDate:dateParts(s).iso,aiGenerated:true,actual:true,replySourceId:sourceId});
    if(s.nav.current.appId!=='mirage'||s.nav.current.route!=='/chat/'+contactId){
     target.unread=(Number(target.unread)||0)+1;
     s.notifications.unshift({id:'mirage-ai-'+msgId,title:'MIRAGE',body:'NEW ENCRYPTED MESSAGE',
      link:{appId:'mirage',route:'/chat/'+contactId,params:{}}});
    }
   });
   inserted++;
   if(inserted<chunks.length)await wait(replyDelayMs(item.text,taiBehavior(initial)));
  }
  return inserted;
 }finally{pending.delete(key);}
}

// Offline messages stay in the same conversation and can be answered when
// the player next opens the thread during a real anonymous online window.
// Never resume an authored player line or generate a second reply to one turn.
export function resumeOuroborosReply(ctx,contactId){
 const s=ctx.store.get(),chat=findContact(s,contactId);
 if(!chat||!anonymousContact(contactId,chat))return Promise.resolve(0);
 const last=chat.messages.filter(m=>m.kind==='text'&&!m.demo).at(-1);
 if(!last||last.from!=='me'||isAuthored(last))return Promise.resolve(0);
 return replyToOuroboros(ctx,contactId,last.id);
}
