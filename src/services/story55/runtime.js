import {syncD13} from '../../story/d13/runtime.js';
import {syncD14D24Content} from '../../story/d14-d24/migrate.js';
import {syncD10D13Content} from '../../story/d10-d13/continuity.js';
import {postBankTransaction} from '../bank.js';
import {syncBaseFrameworkRevision,syncBaseLinkPipeRevision,deployment} from './projects.js';
import {PHONE_RUNTIME_POLICY} from '../../system/runtime/policy.js';
import {tickWishes} from '../wishes/index.js';
import {seedD01,tickD01} from '../../story/d01/runtime.js';
import {seedD02,tickD02Contracts} from '../../story/d02/runtime.js';
import {tickPhoneStoryMessages} from '../messaging/phone-story-scheduler.js';
import {restoreDeveloperChatArchive} from './developer-chat-archive.js';
import {appendAuthoredPhoneMessage} from '../messaging/phone-messages.js';
import {CHAT_LIFECYCLE_POLICY} from '../messaging/lifecycle/engine.js';
import {tickD04Contracts} from '../../story/d04/contract.js';
import {tickD03Contract} from '../../story/d03/contract.js';
import {tickD03MomentReply} from '../../story/d03/moments.js';
import {tickD02Diary} from '../../story/diary/entries.js';
import {isStory55,story55Config,completed,nodeById,nodeStatus,completeNode,date55,final55} from './state.js';
import {defaultStory55Config,normalizeStory55AudioAssets} from './config.js';
import {ensureNativeMirage55,STORY55_BOUNTY_ID} from '../../apps/mirage/data.js';
import {ensureAuthoredNotes} from '../../apps/notes/data/seed.js';
import {tickFlowD03,tickFlowD06} from './flow-d03.js';
import {stampEnding55,startFinale55,ENDING_FINAL_REPLY,revealEndingVoice55} from './finale.js';
const actors={me:'熙蒙',wang:'熙旺',tai:'陈熙泰',ouroboros:'衔尾蛇博士',father:'傅隆生',xin:'小辛',zai:'仔仔',hacker:'熟悉的黑客',mercenary:'雇佣兵'};
export const actor55=id=>actors[id]||id;
export function activateStory55(s){
 const c=defaultStory55Config();
 const imported={legacyHistoryImported:s.story55?.legacyHistoryImported,legacyContentImported:s.story55?.legacyContentImported,legacySMSImported:s.story55?.legacySMSImported,
  // Author-edited source dialogue survives a new run; gameplay progress does not.
  ...(s.story55?.chatSceneEdits?{chatSceneEdits:structuredClone(s.story55.chatSceneEdits)}:{}),
  ...(typeof s.story55?.minutesPerSecond==='number'&&Number.isFinite(s.story55.minutesPerSecond)&&s.story55.minutesPerSecond>=0&&s.story55.minutesPerSecond<=10?{minutesPerSecond:s.story55.minutesPerSecond}:{})};
 s.story55={version:1,config:c,completed:{},projects:{},reports:{},scenes:{},hardware:1,liabilities:0,livingDebt:0,expenseDays:[],questions:0,ended:false};
 Object.assign(s.story55,imported);
 Object.assign(s,{day:1,clock:'08:00',calendar:{anchorDay:1,anchorDate:c.startDate},deathPhase:null,powerMode:'idle',shortCharge:null,shortChargeGains:{},poweredOff:false,emergencyCharge:false,batteryPercent:100,dayChargeRemainingMs:0,worldMinuteFraction:0,powerActiveMs:0,powerGameMinuteFraction:0,powerClockVersion:PHONE_RUNTIME_POLICY.version,chargeFraction:0,sleepWakeAt:null,alarmRinging:null,events:[],notifications:[],invitations:[],matches:[],storyChargeGates:[]});
 s.nav={current:{appId:'home',route:'/',params:{}},stack:[]};
 for(const [channel,list] of Object.entries(s.content.conversations))for(const chat of list){chat.messages=channel==='wechat'?chat.messages.filter(m=>m.sentDate&&m.sentDate<c.startDate&&!m.demo):[];chat.unread=0;}
 s.content.orders=[];s.content.mail=[];s.content.missionFiles=[];s.content.reminders=[];s.content.calendarEvents=[];
 s.content.photos=[];
 // Preserve authored notes; reset only player-created runtime notes.
 s.content.notes=(s.content.notes||[]).filter(n=>n.authored===true).map(n=>structuredClone(n));
 s.content.notesSeedVersion=0;
 ensureAuthoredNotes(s);
 s.content.alarms=[];
 // A new story run must keep authored pre-D01 phone history, just as it keeps
 // old WeChat bubbles; clear only calls created during the previous run.
 if(s.content.phone)s.content.phone.calls=(s.content.phone.calls||[]).filter(call=>call.authored===true||/^macau-call-[1-5]$/.test(call.id||''));
 // Reset player interactions, while retaining the author's photos and posts.
 const moments=s.content.moments||{};
 s.content.moments={posts:structuredClone(moments.posts||[]),editedPosts:structuredClone(moments.editedPosts||{}),deletedIds:[...(moments.deletedIds||[])],profiles:structuredClone(moments.profiles||{}),likes:{},comments:{}};
 s.content.mirage={...s.content.mirage,digitalBalance:0,digitalTransactions:[],transactions:[],wallets:[]};delete s.content.mirage.ouroborosScript;
 s.storyPresets={rules:[],flags:[],usedIds:[],usedGroups:[],deletedRuleIds:[],firedProactiveDays:[]};
 s.ghost={orders:{},history:[],balance:0,config:{}};s.bankData={...s.bankData,balance:0,transactions:[]};
 delete s.phoneCall;
 tickStory55(s);return s;
}
export function scene55(s,id){return s.story55?.scenes?.[id]||{index:0,accepted:false};}
export function sceneLines(s,id){return story55Config(s).scenes[id]||[];}
export function finishScene55(s,id){
 const n=nodeById(s,id),r=scene55(s,id);
 if(!n||n.kind!=='scene'||r.index<sceneLines(s,id).length)throw Error('请先完成本场对话');
 if(id==='ending'&&!s.story55.finalAudioHeard)throw Error('最后的语音尚未同步；请先配置并播放终局音频');
 if(!completeNode(s,id))return false;
 s.story55.activeScene=null;
 if(n.credit)creditScene55(s,n);
 if(id==='ending')startFinale55(s);
 if(id==='intrusion'&&s.story55.d13)s.story55.d13.phase='complete';
 if(id==='loan')s.story55.loanOfflineDay=s.day;
 tickStory55(s);return true;
}
// The ledger and its loan annotation are committed in the same PhoneStore update.
function creditScene55(s,n){
 const id='s55-'+n.id;
 if(s.bankData.transactions.some(t=>t.id===id))return false;
 postBankTransaction(s,{id,label:n.liability?'ANONYMOUS LOAN':'STORY CREDIT',amount:n.credit,
   metadata:n.liability?{liabilityId:id,liabilityAmount:n.credit,kind:'loan'}:{},
   receipt:{id:id+'-receipt',title:'Pacific',
    body:'帳戶入帳 US$'+Number(n.credit).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),
    link:{appId:'bank',route:'/receipt/'+encodeURIComponent(id)}}});
 if(n.liability){
  s.story55.liabilities=(s.story55.liabilities||0)+n.credit;
  s.story55.loanReceiptDeliveryRevision=1;
 }
 return true;
}
// Upgrade ONLY the outstanding D15 loan receipt from older saved phones.
 // Do not replay the loan, alter the balance, or delete already-read notices.
 export function syncLegacyLoanReceipt55(s){
  if(!isStory55(s)||s.story55.loanReceiptDeliveryRevision===1)return false;
  const tx=s.bankData?.transactions?.find(t=>t.id==='s55-loan');
  if(!tx)return false;
  s.notifications??=[];
  const id='s55-loan-receipt',existing=s.notifications.find(n=>n.id===id);
  if(existing){
   if(existing.bannerShown!==true)existing.bannerPending=true;
   existing.link={appId:'bank',route:'/receipt/s55-loan'};
  }else s.notifications.unshift({
   id,title:'Pacific',body:'帳戶入帳 US$1,000,000.00',
   day:s.story55.completed?.loan?.day||s.day,clock:s.story55.completed?.loan?.clock||s.clock,
   link:{appId:'bank',route:'/receipt/s55-loan'},bannerPending:true
  });
  s.story55.loanReceiptDeliveryRevision=1;
  return true;
 }
 export function advanceScene55(s,id,{disconnect=false,now=Date.now()}={}){
 const n=nodeById(s,id);if(n?.kind!=='scene'||nodeStatus(s,id).state!=='ready')throw Error(nodeStatus(s,id).reason);
 s.story55.activeScene=id;
 const lines=sceneLines(s,id);const r=s.story55.scenes[id]??={index:0,accepted:false};
 const line=lines[r.index];if(!line)return finishScene55(s,id);
 if(id==='ending'&&r.index===6&&(!s.story55.endingVoiceSent||s.clock<'22:49'))throw Error('三分钟尚未过去');
 const authoredTime=id==='ending'?stampEnding55(s,r.index):null;
 if(disconnect&&line[0]!=='disconnect')throw Error('目前沒有等待切斷的連線');
 if(line[0]==='disconnect'&&!disconnect)throw Error('請先切斷連線');
 if(line[0]==='camera')s.story55.sceneCamera={node:id,active:true,disconnected:false};
 if(line[0]==='disconnect')s.story55.sceneCamera={node:id,active:false,disconnected:true};
 if(line[0]==='credit')creditScene55(s,n);
 if(line[0]==='offline'&&id==='loan')s.story55.loanOfflineDay=s.day;
 // D13 stage directions describe internal device activity; never send them as chat bubbles.
 if(id==='intrusion'&&line[0]==='system'&&(r.index===15||r.index===19)){
  s.story55.d13??={phase:'chat'};
  s.story55.d13.traceStatus=r.index===15?'running':'failed';
 }
 if(line[0]==='call'&&(s.phoneCall?.node!==id||s.phoneCall.state!=='connected'))throw Error('請接聽系統來電');
 if(line[0]==='watch'&&!s.story55.finalAudioHeard)throw Error('请先播放最后的语音');
 if(line[0]==='call')r.accepted=true;
 if(line[0]==='watch'&&id==='ending'){
  // Already in the actual 22:46 chat log; never create a second voice bubble.
  revealEndingVoice55(s,Date.now(),{force:true});
  s.story55.endingVoiceSent=true;
  const chat=s.content.conversations.noapp?.find(c=>c.id==='tai');
  if(chat)appendAuthoredPhoneMessage(s,{channel:'noapp',conversationId:'tai',messageId:'s55-ending-final-voice',from:'me',kind:'story55_final_audio',text:'手表同步 · 最后的密钥录音',day:s.day,clock:authoredTime||s.clock,sentDate:date55(s.day),storyTag:'story55'});
 }
 appendSceneMessage55(s,id,r.index,{authoredTime});
 r.index++;
 // One shared pacing contract for queued native messaging scenes.
 // The player must explicitly send their own line before any next NPC line.
 if(n.delivery==='queued'&&r.index<lines.length)r.nextAt=now+CHAT_LIFECYCLE_POLICY.pauseMs;
 if(id==='ending'&&r.index===5){s.story55.endingVoiceQueuedAt=Date.now();s.worldMinuteFraction=0;}
 if(r.index===lines.length)finishScene55(s,id);
 return r;
}
export function appendSceneMessage55(s,id,index,{authoredTime=null}={}){
 const n=nodeById(s,id),line=sceneLines(s,id)[index];if(!n||!line)return;
 if(id==='intrusion'&&line[0]==='system'&&(index===15||index===19)){
  appendAuthoredPhoneMessage(s,{channel:'mirage',conversationId:'s55-ouroboros',messageId:`s55-intrusion-v2-${index}`,from:'system',text:line[1],kind:'terminal-status',notify:false,day:s.day,clock:s.clock,sentDate:date55(s.day),storyTag:'story55'});
  return;
 }
 if(line[0]==='system'&&index>0&&n.systemMessages){
  appendAuthoredPhoneMessage(s,{channel:n.channel,conversationId:n.conversationId,messageId:`${n.messagePrefix}-${index}`,from:'system',text:line[1],kind:'system',notify:false,day:s.day,clock:s.clock,sentDate:date55(s.day),storyTag:'story55'});
  return;
 }
 if(!['system','call','watch','camera','disconnect','credit','offline'].includes(line[0])){
  const channel=n.channel||(['intro','return','move','show','target','confide','failure','ready'].includes(id)?'wechat':['recognition','paris','ending'].includes(id)?'noapp':'mirage');
  const cid=n.conversationId||(channel==='wechat'?'group':channel==='noapp'?'tai':'s55-ouroboros');
  const list=s.content.conversations[channel]??=[];
  let c=list.find(c=>c.id===cid);if(!c){c={id:cid,name:channel==='mirage'?'Dr Ouroboros':channel==='noapp'?'陈熙泰':'狼崽团',...(channel==='wechat'?{group:true,members:['me','wang','胡枫','小辛','阿威','仔仔']}:{}),messages:[],unread:0};list.push(c);}
  appendAuthoredPhoneMessage(s,{channel,conversationId:cid,messageId:`${n.messagePrefix||'s55-'+id}-${index}`,from:line[0]==='me'?'me':channel==='wechat'?(line[0]==='xin'?'小辛':line[0]==='zai'?'仔仔':line[0]):cid,text:id==='intrusion'&&index>=8&&line[0]==='ouroboros'?'':id==='ending'&&index===6?ENDING_FINAL_REPLY:line[1],kind:id==='intrusion'&&index>=8&&line[0]==='ouroboros'?'call-avatar':'text',notify:!(id==='intrusion'&&index>=8&&line[0]==='ouroboros'),day:s.day,clock:authoredTime||s.clock,sentDate:date55(s.day),storyTag:'story55'});
 }
}
export function payNode55(s,id){
 const n=nodeById(s,id);if(n?.kind!=='payment'||nodeStatus(s,id).state!=='ready')throw Error(nodeStatus(s,id).reason);
 if(s.bankData.balance<n.cost)throw Error('余额不足，定金尚未支付');
 s.bankData.balance-=n.cost;s.bankData.transactions.unshift({id:'s55-payment-'+id,label:n.title,amount:-n.cost,time:s.clock,date:date55(s.day)});completeNode(s,id);tickStory55(s);
}
const mailDefs=s=>story55Config(s).mails.map(m=>({...m,body:m.body.replaceAll('{{projectKey}}',story55Config(s).projects.find(p=>p.id===m.project)?.key||'')}));
export function markMail55(s,id){const m=s.content.mail.find(m=>m.id===id&&m.story55);if(!m)throw Error('邮件不存在');if(nodeStatus(s,m.storyNode).state==='ready')completeNode(s,m.storyNode);m.read=true;tickStory55(s);}
export function readEvidence55(s,kind,id){
 const table={file:'documents',page:'pages',map:'locations'}[kind],item=story55Config(s)[table]?.find(x=>x.id===id);
 if(!item)throw Error('资料不存在');
 const n=nodeById(s,item.node);if(n.kind!==kind)throw Error('此地点不触发任务');
 if(nodeStatus(s,n.id).state!=='ready'&&!completed(s,n.id))throw Error(nodeStatus(s,n.id).reason);
 if(!completed(s,n.id))completeNode(s,n.id);tickStory55(s);return item;
}
export const questions55=['你为什么和我长得一模一样？','那是我的照片吗？','还是你用AI做的？','这样玩弄我有什么好处？','你到底是谁？'];
export function sendQuestion55(s){
 if(nodeStatus(s,'questions').state!=='ready')throw Error(nodeStatus(s,'questions').reason);
 const i=s.story55.questions,chat=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
 if(!chat)throw Error('MIRAGE联络记录尚未建立');
 appendAuthoredPhoneMessage(s,{channel:'mirage',conversationId:'s55-ouroboros',messageId:'s55-question-'+i,from:'me',text:questions55[i],day:s.day,clock:s.clock,sentDate:date55(s.day),storyTag:'story55'});
 s.story55.questions=Math.min(5,i+1);
 if(s.story55.questions===5){
  const reply='你已经找到了我留下的线索，最后一个文件夹里还有一份孤儿院档案；破译它，你就会知道为什么我们的面孔如此相似。';
  appendAuthoredPhoneMessage(s,{channel:'mirage',conversationId:'s55-ouroboros',messageId:'s55-questions-answer',from:chat.id,text:reply,day:s.day,clock:s.clock,sentDate:date55(s.day),storyTag:'story55'});
  completeNode(s,'questions');
 }
 tickStory55(s);
}
// Scripted conversations navigate to the existing messaging apps, not Calendar.
export function chatNodeLink55(s,id){
 const node=nodeById(s,id);
 if(node?.channel&&node.conversationId)return {appId:node.channel,route:'/chat/'+node.conversationId,params:{node:id}};
 const channel=['intro','return','move','show','target','confide','failure','ready'].includes(id)?'wechat':['recognition','paris','ending'].includes(id)?'noapp':'mirage';
 const conversation=channel==='wechat'?'group':channel==='noapp'?'tai':'s55-ouroboros';
 return {appId:channel,route:'/chat/'+conversation,params:{node:id}};
}
export function nodeLink55(s,id){if(id.startsWith('d13-wallet'))return {appId:'mirage',route:'/wallet',params:{}};if(id==='intrusion'&&s.story55?.d13?.phase!=='chat'&&!completed(s,id))return {appId:'kira',route:'/mail/s55-d13-wallet-mail',params:{}};if(id==='wallet')return {appId:'mirage',route:'/order/'+STORY55_BOUNTY_ID,params:{}};if(id==='recognition'||id==='ending')return {appId:'noapp',route:'/chat/tai',params:{node:id}};const n=nodeById(s,id);if(!n)return {appId:'reminders',route:'/',params:{}};
 if(n.kind==='project'&&n.project==='base')return {appId:'ghost',route:deployment(s,'base').authorized?'/deployment':'/flow-deploy',params:{project:'base'}};
 const map={flow:{appId:'mirage',route:'/chat/mc-flow-d03',params:{}},project:{appId:'ghost',route:'/deployment',params:{project:n.project}},mail:{appId:'kira',route:'/mail/'+n.mail,params:{}},file:{appId:'files',route:'/story55',params:{document:n.document}},page:{appId:'browser',route:'/story55',params:{page:n.page}},map:{appId:'maps',route:'/place',params:{id:n.location}},questions:{appId:'mirage',route:'/chat/s55-ouroboros',params:{node:'questions'}},payment:{appId:'mirage',route:'/story55/payment',params:{node:id}},scene:chatNodeLink55(s,id)};return map[n.kind];}
// Every scene with delivery:"queued" uses this common messaging scheduler.
// Story content only supplies lines and node prerequisites: no D06-specific
// timer, duplicate dialogue list, or automatic player-sent message.
export function tickQueuedStoryScenes55(s,now=Date.now()){
 if(!isStory55(s)||s.story55.ended)return false;
 for(const n of story55Config(s).nodes){
  if(n.kind!=='scene'||n.delivery!=='queued'||nodeStatus(s,n.id).state!=='ready')continue;
  if(s.story55.activeScene&&s.story55.activeScene!==n.id)continue;
  const lines=sceneLines(s,n.id),q=s.story55.scenes[n.id]??={index:0,accepted:false};
  const next=lines[q.index];if(!next)continue;
  // Do not enqueue NPC replies while the player owes a preset line.
  if(['me','disconnect','call'].includes(next[0]))continue;
  if(n.id==='intrusion'&&(s.story55.d13?.phase!=='chat'||q.accepted))continue;
  if(!Number.isFinite(q.nextAt)){
   q.nextAt=now+CHAT_LIFECYCLE_POLICY.initialDelayMs;
   return true;
  }
  if(now<q.nextAt)continue;
  advanceScene55(s,n.id,{now});
  return true; // One incoming NPC bubble per scheduler tick.
 }
 return false;
}
export function tickStory55(s){
 if(!isStory55(s))return;
 // Repair old persisted build URLs without resetting the day or story progress.
 normalizeStory55AudioAssets(story55Config(s));
 syncD10D13Content(s);
 syncD14D24Content(s);
 syncBaseFrameworkRevision(s);
 syncBaseLinkPipeRevision(s);
 syncLegacyLoanReceipt55(s);
 syncD13(s);
 ensureNativeMirage55(s);
 // Legacy D06 accepted saves are repaired by the shared commission runner.
 // Do not create a second prototype authorization email.
 // Migrate 55-day saves created before the D03 plot node existed.
 if(!story55Config(s).nodes.some(n=>n.id==='flow-d03'))s.story55.config.nodes.splice(1,0,defaultStory55Config().nodes.find(n=>n.id==='flow-d03'));
 tickFlowD03(s);
 tickFlowD06(s);
 tickWishes(s);
 seedD01(s);
 seedD02(s);
 tickD02Contracts(s);
 tickPhoneStoryMessages(s);
 // The existing story tick silently rehydrates saved real chats as game time
 // reaches their original timestamps. No extra event queue or notifications.
 restoreDeveloperChatArchive(s);
 tickD03Contract(s);
 tickD04Contracts(s);
 tickD03MomentReply(s);
 tickD02Diary(s);
 tickD01(s);
 // Update only the former default line; never overwrite author-edited dialogue.
 const finalLines=story55Config(s).scenes?.ending;
 if(finalLines?.[6]?.[1]==='熙蒙？熙蒙？')finalLines[6][1]=ENDING_FINAL_REPLY;
 if(final55(s))return;
 const c=story55Config(s);
 if(completed(s,'recognition')){const chat=s.content.conversations.noapp?.find(c=>c.id==='tai');if(chat)chat.name='陈熙泰';}
 s.content.calendarEvents=(s.content.calendarEvents||[]).filter(e=>!['s55-event-recognition','s55-event-ending'].includes(e.id));if(completed(s,'wallet')&&!s.content.conversations.mirage.some(x=>x.id==='s55-ouroboros'))s.content.conversations.mirage.push({id:'s55-ouroboros',name:'Dr Ouroboros',avatar:'D',online:false,messages:[],unread:0});s.calendar={anchorDay:1,anchorDate:c.startDate};s.day=Math.min(55,Math.max(1,s.day));
 tickQueuedStoryScenes55(s);
 for(const m of mailDefs(s)){const existing=s.content.mail.find(x=>x.id===m.id);if(m.id==='s55-d13-wallet-mail'&&completed(s,'intrusion')&&!existing)continue;if(existing)Object.assign(existing,{subject:m.subject,body:m.body,from:m.from||existing.from,...(m.attachmentName?{attachmentName:m.attachmentName}:{}),...(m.project?{project:m.project}:{})});if(['ready','done'].includes(nodeStatus(s,m.node).state)&&!s.content.mail.some(x=>x.id===m.id)){
  // Clock-authored mail keeps its original send date/time even if a foreground
  // tick jumps over the exact minute, or a saved phone resumes after midnight.
  // The existing mail ID is the idempotency key; no second queue or scheduler.
  const node=nodeById(s,m.node);
  const arrivalDay=node?.at?node.day:s.day,arrivalClock=node?.at||s.clock;
  s.content.mail.unshift({...m,from:m.from||'Dr Ouroboros',story55:true,storyNode:m.node,read:false,date:date55(arrivalDay)});
  s.notifications.unshift({id:'s55-mail-'+m.id,title:'KIRA',body:m.subject,day:arrivalDay,clock:arrivalClock,link:{appId:'kira',route:'/mail/'+m.id,params:{}}});
 }}
 // Previous prototype inserted every scene as a Calendar event. Never do that.
 s.content.calendarEvents=(s.content.calendarEvents||[]).filter(e=>!String(e.id||'').startsWith('s55-event-'));
 // Daily cost uses plot dates, not wall-clock time. Insufficient cash becomes a visible liability.
 for(let day=14;day<=s.day;day++)if(!s.story55.expenseDays.includes(day)){
  const cost=c.economics.dailyExpense,paid=Math.min(Math.max(0,s.bankData.balance),cost);s.bankData.balance-=paid;s.story55.livingDebt+=cost-paid;s.story55.expenseDays.push(day);
  s.bankData.transactions.unshift({id:'s55-expense-'+day,label:'DAILY EXPENSE',amount:-paid,unpaid:cost-paid,time:'08:00',date:date55(day)});
 }
}
export function story55Presence(s,now=Date.now()){
 if(final55(s))return {status:'offline',contactable:false,reason:'连接中断'};
 if(s.story55.activeScene)return {status:'busy',contactable:false,reason:'正在通话或事件中'};
 if(!completed(s,'recognition'))return {status:'offline',contactable:false,reason:'尚未相认'};
 if(s.day===42&&!completed(s,'paris'))return {status:'offline',contactable:false,reason:'暂时无法联系'};
 return {status:'online',contactable:true,reason:'在线'};
}

export function anonymousPresence55(s,now=Date.now()){
 if(final55(s)||s.story55.activeScene)return {online:false,reason:'当前无法联系'};
 if(completed(s,'recognition'))return {online:story55Presence(s,now).contactable,reason:story55Presence(s,now).reason};
 if(s.story55.loanOfflineDay===s.day)return {online:false,reason:'已下线'};
 if(s.day>=15&&s.day<=24){const start=s.story55.anonymousWindows?.[s.day];const remaining=start?Math.max(0,1500000-(now-start)):1500000;return {online:!!start&&remaining>0,remaining,reason:remaining>0?'每日25分钟联络窗口':'本日已离线'};}
 if(s.day>=25&&s.day<=29)return {online:true,reason:'在线'};
 return {online:false,reason:s.day>=30?'正在调查，等待剧情联络':'尚未开放自由联络'};
}
