// GHOST project cards and Xi Tai's authored MIRAGE share dialogue.
// This is an adapter to the existing Story55 / native-message pipeline, NOT
// another clock, chat queue, minigame runner, or phone-control transport.
import {isStory55,projectById,date55} from './state.js';
import {anonymousPresence55} from './runtime.js';
import {deployment,deploymentPercent} from './projects.js';
import {appendAuthoredPhoneMessage} from '../messaging/phone-messages.js';

export const TAI_GHOST_THREAD='s55-ouroboros';
const WAIT_MS=1900;
const dialogues={
 first:[
  ['tai','？'],
  ['me','我想驗證一下你是不是azathoth'],
  ['tai','用這樣低級的任務驗證嗎？'],
  ['me','嫌低級，那倒是做做看'],
  ['tai','你只是想讓我給你幹活對吧'],
  ['me','為了部署你給我的程序，我得努力賺錢才行，還是說你打算再給我一百萬？']
 ],
 second:[
  ['tai','又來？'],
  ['me','你的千面之神在召喚你'],
  ['tai','你想通了，要加入我了？'],
  ['me','你還沒有證明自己是不是azathoth，我還不信任你，我反而好奇，你為什麼對我感興趣'],
  ['tai','總有一天你會知道，在那之前，記得我為你做過的每一件事，都有價格']
 ],
 dailyYes:[
  ['tai','⋯⋯'],
  ['tai','你很走運，我有十分鐘休息時間。'],
  ['me','謝囉']
 ],
 dailyNo:[
  ['tai','你真的會寫代碼嗎？'],
  ['tai','我很忙，你自己處理']
 ]
};
const active=p=>p&&['dialogue','ready-control','controlling'].includes(p.phase);
const chat=s=>s.content?.conversations?.mirage?.find(c=>c.id===TAI_GHOST_THREAD);
const pendingDelivered=(s,p)=>!(p?.pendingIds||[]).some(id=>!chat(s)?.messages?.find(m=>m.id===id)?.delivery);
const noAccess=()=>({ok:false,error:'目前無法分享此項目'});

// Only a real authorized GHOST project or existing order can be shared.
export function ghostShareSource(s,{projectId,orderId}={}){
 if(!isStory55(s)||s.day<15||s.day>24||!chat(s))return null;
 if(typeof projectId==='string'){
  const p=projectById(s,projectId),r=deployment(s,projectId);
  if(!p||!r.authorized)return null;
  return {type:'ghost-project',projectId:p.id,title:String(p.title||p.id).slice(0,120),
   percent:Math.max(0,Math.min(100,Math.round(deploymentPercent(s,p.id)))),route:'/deployment'};
 }
 if(typeof orderId==='string'){
  const o=s.ghost?.orders?.[orderId];
  if(!o||!['authorized','running','preview-win','failed'].includes(o.status))return null;
  return {type:'ghost-order',orderId:o.id,title:String(o.title||o.type||'GHOST').slice(0,120),
   status:o.status,route:'/contract'};
 }
 return null;
}

function queueNpc(s,p){
 const lines=dialogues[p.script]||[];
 p.pendingIds=[];
 let pause=0;
 while(p.index<lines.length&&lines[p.index][0]==='tai'){
  const index=p.index++,messageId=`${p.cardId}-tai-${index}`;
  // The canonical MessageDelivery owns delay, unread and notification.
  appendAuthoredPhoneMessage(s,{channel:'mirage',conversationId:TAI_GHOST_THREAD,
   messageId,from:TAI_GHOST_THREAD,text:lines[index][1],storyTag:'story55',
   day:s.day,clock:s.clock,sentDate:date55(s.day),
   schedule:{mode:'chat-delay',seconds:.45+pause*WAIT_MS/1000}});
  p.pendingIds.push(messageId);pause++;
 }
 if(p.index>=lines.length)p.phase=p.script==='dailyNo'?'refused':'ready-control';
}

export function shareGhostToTai(s,source,{random=Math.random,now=Date.now()}={}){
 const item=ghostShareSource(s,source);
 if(!item||s.story55?.activeScene)return noAccess();
 const prior=s.story55?.ghostShare;
 if(active(prior))return {ok:false,error:'當前對話尚未結束'};
 if(prior?.lastShareDay===s.day&&prior.lastSource===JSON.stringify(item)&&
  Number.isFinite(prior.lastShareAt)&&now-prior.lastShareAt>=0&&now-prior.lastShareAt<2000)
  return {ok:true,duplicate:true,cardId:prior.lastCardId};
 const serial=(Number(s.story55.ghostShareSerial)||0)+1;
 s.story55.ghostShareSerial=serial;
 const cardId=`s55-ghost-share-${s.day}-${serial}`;
 const message=appendAuthoredPhoneMessage(s,{channel:'mirage',conversationId:TAI_GHOST_THREAD,
  messageId:cardId,from:'me',text:'[GHOST PROJECT]',kind:'ghost-project',
  day:s.day,clock:s.clock,sentDate:date55(s.day),storyTag:'story55',notify:false,
  attachment:item});
 if(!message)return noAccess();
 const takeovers=Number(s.story55.ghostShareTakeovers)||0;
 const daily=s.story55.ghostShareDaily;
 const eligible=takeovers<2||daily?.day!==s.day;
 const online=anonymousPresence55(s).online;
 const accepted=online&&eligible&&random()<0.5;
 const script=accepted?(takeovers===0?'first':takeovers===1?'second':'dailyYes'):
  online&&eligible&&takeovers>=2?'dailyNo':null;
 const p={phase:script?'dialogue':'idle',script,index:0,pendingIds:[],cardId,source:item,
  lastShareDay:s.day,lastShareAt:now,lastSource:JSON.stringify(item),lastCardId:cardId};
 s.story55.ghostShare=p;
 if(takeovers>=2&&eligible&&online)s.story55.ghostShareDaily={day:s.day,accepted,cardId};
 if(script)queueNpc(s,p);
 return {ok:true,cardId,accepted,script,online};
}

// Plug this into the existing Mirage native scripted composer. NPC lines
// cannot be skipped, and player lines are never sent from an automatic tick.
export function ghostShareScriptLine(s){
 const p=s.story55?.ghostShare;
 if(!active(p)||!p.script)return null;
 if(!pendingDelivered(s,p))return {id:'ghost-share',kind:'wait',index:p.index,text:''};
 const lines=dialogues[p.script]||[];
 if(p.phase==='dialogue'&&lines[p.index]?.[0]==='me')
  return {id:'ghost-share',kind:'me',index:p.index,text:lines[p.index][1]};
 return {id:'ghost-share',kind:'wait',index:p.index,text:''};
}
export function sendGhostShareDraft(s,text){
 const line=ghostShareScriptLine(s),p=s.story55?.ghostShare;
 if(line?.kind!=='me'||String(text||'').trim()!==line.text.trim())
  throw Error('請先發送輸入框內的預設訊息');
 appendAuthoredPhoneMessage(s,{channel:'mirage',conversationId:TAI_GHOST_THREAD,
  messageId:`${p.cardId}-me-${p.index}`,from:'me',text:line.text,storyTag:'story55',
  day:s.day,clock:s.clock,sentDate:date55(s.day),notify:false});
 p.index++;
 queueNpc(s,p);
 if(s.drafts)delete s.drafts[TAI_GHOST_THREAD];
 return 'ghost-share';
}
// Tai is controlling Xi Meng's phone and sends from Xi Meng's account.
// Only the real MIRAGE composer submit path may call this during the authored
// first takeover. It cannot trigger free-chat AI or NPC scripted replies.
export const TAI_REMOTE_TYPED_LINE='閉嘴吧，熙蒙，現在我來操控你的手機';
export function canSendGhostShareRemoteText(s,text){
 const p=s.story55?.ghostShare;
 return !!(p?.phase==='controlling'&&p.script==='first'&&p.remote?.active===true&&
  p.remote.stage==='typing'&&s.nav?.current?.appId==='mirage'&&
  s.nav.current.route==='/chat/'+TAI_GHOST_THREAD&&
  String(text||'').trim()===TAI_REMOTE_TYPED_LINE);
}
export function sendGhostShareRemoteText(s,text){
 if(!canSendGhostShareRemoteText(s,text))return false;
 const p=s.story55.ghostShare;
 const message=appendAuthoredPhoneMessage(s,{
  channel:'mirage',conversationId:TAI_GHOST_THREAD,
  messageId:p.cardId+'-remote-typing',from:'me',text:TAI_REMOTE_TYPED_LINE,
  storyTag:'story55',day:s.day,clock:s.clock,sentDate:date55(s.day),notify:false
 });
 if(!message)return false;
 // Record the real outgoing message once. The controller waits for this
 // acknowledgement before it switches Apps and starts operating GHOST.
 p.remote.stage='sent';
 if(s.drafts)delete s.drafts[TAI_GHOST_THREAD];
 return true;
}

// Stage 3 must drive the REAL phone operator before calling this handoff.
// A random win or a scripted text reply alone cannot consume this counter.
export function ghostShareReadyForControl(s){
 const p=s.story55?.ghostShare;
 return !!(p?.phase==='ready-control'&&pendingDelivered(s,p));
}
export function beginGhostShareControl(s){
 if(!ghostShareReadyForControl(s))return false;
 const p=s.story55.ghostShare;p.phase='controlling';
 s.story55.ghostShareTakeovers=(Number(s.story55.ghostShareTakeovers)||0)+1;
 return true;
}
export function finishGhostShareControl(s){
 if(s.story55?.ghostShare?.phase!=='controlling')return false;
 s.story55.ghostShare.phase='complete';return true;
}
