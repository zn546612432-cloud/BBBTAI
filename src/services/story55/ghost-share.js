// GHOST project cards and Xi Tai's authored MIRAGE share dialogue.
// This is an adapter to the existing Story55 / native-message pipeline, NOT
// another clock, chat queue, minigame runner, or phone-control transport.
import {isStory55,projectById,date55} from './state.js';
import {anonymousPresence55} from './runtime.js';
import {deployment,deploymentPercent} from './projects.js';
import {appendAuthoredPhoneMessage} from '../messaging/phone-messages.js';
import {taiRemoteOrderAllowed} from '../../system/remote-control/policy.js';
import {settleTaiRemotePause} from '../../system/remote-control/visibility.js';

export const TAI_GHOST_THREAD='s55-ouroboros';
const WAIT_MS=2200;
const responseSeconds=text=>Math.min(5,2.5+Array.from(text).length*.045);
export const GHOST_SHARE_DIALOGUES={
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
export function ghostShareDialogue(s,script){
 const base=GHOST_SHARE_DIALOGUES[script]||[],edit=s.story55?.chatSceneEdits?.['ghost-share:'+script]?.lines;
 return edit?.length===base.length?base.map(([who,text],i)=>[who,edit[i].who===who&&typeof edit[i].text==='string'?edit[i].text:text]):base;
}
export function ghostShareScriptStarted(s,script){
 if(!Object.hasOwn(GHOST_SHARE_DIALOGUES,script))return false;
 const flags=s.story55?.ghostShareScriptsStarted,p=s.story55?.ghostShare;
 if(flags&&Object.hasOwn(flags,script))return flags[script]===true;
 if(p?.script===script)return true;
 // Current #133 saves already have authored chat IDs, but no per-script
 // marker yet. Their first NPC line is identifiable in the same source
 // (including its saved author override). No generic share card locks a script.
 return !!chat(s)?.messages?.some(m=>{
  if(m.ghostShareScript)return m.ghostShareScript===script;
  if(!/^s55-ghost-share-\d+-\d+-tai-0$/.test(m.id||'')||m.from!==TAI_GHOST_THREAD)return false;
  if(p?.cardId&&m.id.startsWith(p.cardId+'-'))return p.script===script;
  const candidates=Object.keys(GHOST_SHARE_DIALOGUES).filter(name=>ghostShareDialogue(s,name)[0]?.[1]===m.text);
  return candidates.length===1&&candidates[0]===script;
 });
}
const shareDay=s=>isStory55(s)&&s.day>=15&&s.day<=24&&!s.story55.ended;
export function expireGhostShare(s){
 const p=s?.story55?.ghostShare;
 if(shareDay(s)||!['awaiting-online','dialogue','ready-control'].includes(p?.phase))return false;
 p.phase='expired';return true;
}
const active=p=>p&&['awaiting-online','dialogue','ready-control','controlling'].includes(p.phase);
const chat=s=>s.content?.conversations?.mirage?.find(c=>c.id===TAI_GHOST_THREAD);
const pendingDelivered=(s,p)=>!(p?.pendingIds||[]).some(id=>!chat(s)?.messages?.find(m=>m.id===id)?.delivery);
const noAccess=()=>({ok:false,error:'目前無法分享此項目'});

// Only a real authorized GHOST project or existing order can be shared.
export function ghostShareSource(s,{projectId,orderId}={}){
 if(!shareDay(s)||!chat(s))return null;
 if(typeof projectId==='string'){
  const p=projectById(s,projectId),r=deployment(s,projectId);
  if(!p||!r.authorized||p.id==='wallet')return null;
  return {type:'ghost-project',projectId:p.id,title:String(p.title||p.id).slice(0,120),
   percent:Math.max(0,Math.min(100,Math.round(deploymentPercent(s,p.id)))),route:'/deployment'};
 }
 if(typeof orderId==='string'){
  const o=s.ghost?.orders?.[orderId];
  if(!o||!taiRemoteOrderAllowed(s,o)||!['authorized','running','preview-win','failed'].includes(o.status))return null;
  return {type:'ghost-order',orderId:o.id,title:String(o.title||o.type||'GHOST').slice(0,120),
   status:o.status,route:'/contract'};
 }
 return null;
}

function queueNpc(s,p){
 const lines=ghostShareDialogue(s,p.script);
 p.pendingIds=[];
 let pause=0;
 while(p.index<lines.length&&lines[p.index][0]==='tai'){
  const index=p.index++,messageId=`${p.cardId}-tai-${index}`;
  // The canonical MessageDelivery owns delay, unread and notification.
  if(!p.pendingIds.length)pause=responseSeconds(lines[index][1]);
  const message=appendAuthoredPhoneMessage(s,{channel:'mirage',conversationId:TAI_GHOST_THREAD,
   messageId,from:TAI_GHOST_THREAD,text:lines[index][1],storyTag:'story55',
   day:s.day,clock:s.clock,sentDate:date55(s.day),
   schedule:{mode:'chat-delay',seconds:pause}});
  if(message)message.ghostShareScript=p.script;
  p.pendingIds.push(messageId);pause+=WAIT_MS/1000;
 }
 if(p.index>=lines.length)p.phase=p.script==='dailyNo'?'refused':'ready-control';
}

export function shareGhostToTai(s,source,{random=Math.random,now=Date.now()}={}){
 const item=ghostShareSource(s,source);
 if(!item||s.story55?.activeScene)return noAccess();
 const prior=s.story55?.ghostShare;
 if(prior?.lastShareDay===s.day&&prior.lastSource===JSON.stringify(item)&&
  Number.isFinite(prior.lastShareAt)&&now-prior.lastShareAt>=0&&now-prior.lastShareAt<2000)
  return {ok:true,duplicate:true,cardId:prior.lastCardId};
 if(active(prior)||prior?.lastShareDay===s.day&&!pendingDelivered(s,prior))return {ok:false,error:'當前對話尚未結束'};
 const serial=(Number(s.story55.ghostShareSerial)||0)+1;
 s.story55.ghostShareSerial=serial;
 const cardId=`s55-ghost-share-${s.day}-${serial}`;
 const message=appendAuthoredPhoneMessage(s,{channel:'mirage',conversationId:TAI_GHOST_THREAD,
  messageId:cardId,from:'me',text:'[GHOST PROJECT]',kind:'ghost-project',
  day:s.day,clock:s.clock,sentDate:date55(s.day),storyTag:'story55',notify:false,
  attachment:item});
 if(!message)return noAccess();
 const p={phase:'awaiting-online',script:null,index:0,pendingIds:[],cardId,source:item,
  lastShareDay:s.day,lastShareAt:now,lastSource:JSON.stringify(item),lastCardId:cardId};
 s.story55.ghostShare=p;
 const result=resolveGhostShare(s,{random});
 return {ok:true,cardId,...(result||{accepted:false,script:null,online:false,pending:true})};
}

// Called by the existing Story55 tick: an offline share survives reload and
// waits for the same anonymous-presence window. Never add another timer/queue.
export function resolveGhostShare(s,{random=Math.random}={}){
 const p=s.story55?.ghostShare;
 // Repair the last unanswered card from older saves, without replaying cards
 // or overwriting any dialogue that already started.
 if(shareDay(s)&&p?.phase==='idle'&&!p.script&&p.cardId&&
    chat(s)?.messages?.some(m=>m.id===p.cardId&&m.from==='me'&&m.kind==='ghost-project'))
  p.phase='awaiting-online';
 if(!shareDay(s)||p?.phase!=='awaiting-online'||s.story55.activeScene||!chat(s))return null;
 if(!anonymousPresence55(s).online)return null;
 const takeovers=Number(s.story55.ghostShareTakeovers)||0;
 const daily=s.story55.ghostShareDaily;
 const eligible=takeovers<2||daily?.day!==s.day;
 const sourceAvailable=!!ghostShareSource(s,p.source);
 const accepted=sourceAvailable&&eligible&&(takeovers<2||random()<0.5);
 // The first two takeovers are guaranteed for valid sources; later shares
 // retain the daily decision and use the existing authored refusal text.
 const script=accepted?(takeovers===0?'first':takeovers===1?'second':'dailyYes'):'dailyNo';
 const started=Object.fromEntries(Object.keys(GHOST_SHARE_DIALOGUES).map(name=>[name,ghostShareScriptStarted(s,name)]));
 p.script=script;p.phase='dialogue';
 if(takeovers>=2&&eligible)s.story55.ghostShareDaily={day:s.day,accepted,cardId:p.cardId};
 s.story55.ghostShareScriptsStarted=started;
 s.story55.ghostShareScriptsStarted[script]=true;
 queueNpc(s,p);
 return {accepted,script,online:true};
}

// Plug this into the existing Mirage native scripted composer. NPC lines
// cannot be skipped, and player lines are never sent from an automatic tick.
export function ghostShareScriptLine(s){
 const p=s.story55?.ghostShare;
 // The native composer is reserved for Tai's controlled typing once remote
 // ownership begins. Real player events are blocked by the phone operator.
 // Returning a 'wait' line here would DISABLE the form input, and FormData
 // deliberately omits disabled fields, losing the remotely typed sentence.
 if(p?.phase==='controlling')return null;
 if(!shareDay(s)||!active(p)||!p.script)return null;
 if(!pendingDelivered(s,p))return {id:'ghost-share',kind:'wait',index:p.index,text:''};
 const lines=ghostShareDialogue(s,p.script);
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
 return !!(shareDay(s)&&p?.phase==='ready-control'&&pendingDelivered(s,p));
}
export function beginGhostShareControl(s){
 if(!ghostShareReadyForControl(s))return false;
 const p=s.story55.ghostShare;p.phase='controlling';
 s.story55.ghostShareTakeovers=(Number(s.story55.ghostShareTakeovers)||0)+1;
 return true;
}
export function finishGhostShareControl(s,now=Date.now()){
 if(s.story55?.ghostShare?.phase!=='controlling')return false;
 settleTaiRemotePause(s,now);
 s.story55.ghostShare.phase='complete';return true;
}
