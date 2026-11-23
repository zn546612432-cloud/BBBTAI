// Read-only projection of the existing story, order and agent ledgers.
// Reminders do not persist a second copy of task progress.
import {isStory55,story55Config,nodeStatus,completed,date55,storyDayMinute} from '../../../../services/story55/state.js';
import {nodeLink55,scene55,sceneLines} from '../../../../services/story55/runtime.js';
import {D01_OPENING,D01_REPAIR,D01_ATTACHMENT} from '../../../../story/d01/runtime.js';
import {d02CompleteBuild,D02_AODONG_CHAT_ID} from '../../../../story/d02/runtime.js';
import {visibleMessages} from '../../../../services/messaging/delivery.js';
import {D06_ORDER_ID,D06_FLOW_AT} from '../../../../story/d06/commission.js';
import {STORY55_WALLET_MAIL_ID} from '../../../mirage/data.js';
import {FLOW_CONTACT,flowState} from '../../../../services/story55/flow-d03.js';
import {agent,agentFiles,storyFileStage,stageReady} from '../../../ghost/deployment/tear-agent/state.js';

const destination=(appId,route,params={})=>({appId,route,params});
const name={group:'狼崽團',wang:'熙旺',xiaoxin:'小辛',hufeng:'胡楓',fulongsheng:'傅隆生',tai:'熙泰','s55-ouroboros':'Dr Ouroboros','mc-flow-d03':'Flow','mc-isolde-mirage':'Isolde'};
const appLabel={wechat:'微信',mirage:'MIRAGE',noapp:'NoApp',kira:'KIRA',ghost:'GHOST',files:'檔案',bank:'PACIFIC',browser:'瀏覽器',chess:'國際象棋',reminders:'提醒事項',aomi:'澳東商城',maps:'地圖'};
const task=(id,title,link,detail,done=false,at='')=>({
 id:'mainline:'+id,storyNode:id,mainline:true,title,detail,link,done,at,
 destinationName:link?appLabel[link.appId]||'':''
});
// The canonical story clock counts past midnight as the preceding story day.
// D23 03:00/1% chess holds must not hide already-due reminders.
const clockMinute=value=>Number(value.slice(0,2))*60+Number(value.slice(3,5));
const hasReached=(s,n)=>n.day<s.day||!n.at||
 storyDayMinute(s)>=clockMinute(n.at)+(n.afterMidnight?1440:0);
function mandatoryIds(s){
 const byId=new Map(story55Config(s).nodes.map(n=>[n.id,n])),required=new Set();
 function visit(id){if(required.has(id))return;const n=byId.get(id);if(!n||n.authoredPending)return;required.add(id);for(const parent of n.requires||[])visit(parent);}
 for(const n of byId.values())if(!n.authoredPending&&!n.optional&&(Number.isInteger(n.gateDay)||n.pauseTimeUntilComplete===true||n.id==='ending'))visit(n.id);
 return required;
}
function d01Tasks(s){
 if(s.day!==1)return [];
 const d=s.story55?.d01||{},out=[];
 const claimed=!!d.bankClaimed,paid=!!d.rewardPaid,accepted=!!d.repairAccepted;
 if(!claimed){
  const mail=s.content.mail?.some(m=>m.id===D01_OPENING);
  if(mail)out.push(task('d01-bank','查收第一筆結款',destination('kira','/mail/'+D01_OPENING),'KIRA · 結款郵件'));
 }
 const order=s.content.orders?.find(o=>o.id===D01_REPAIR);
 let link,title='完成數據修復委託',detail='';
 if(!accepted){link=destination('mirage','/bounties/hall');detail='MIRAGE · 訂單大廳';}
 else if(!s.content.mail?.some(m=>m.id===D01_ATTACHMENT)){link=null;detail='等待 KIRA 傳送附件';}
 else if(!d.keyRevealed){link=destination('kira','/mail/'+D01_ATTACHMENT);detail='KIRA · 打開密鑰附件';}
 else if(!d.deployed){link=destination('files','/attachment/d01-mirage001');detail='檔案 · 使用 GHOST 打開';}
 else if((d.completedRounds||0)<5){
  link=destination('ghost','/contract',{orderId:D01_REPAIR});
  detail='GHOST · 已修復 '+(d.completedRounds||0)+'/5';
 }else if(!d.submitted){link=destination('kira','/mail/'+D01_ATTACHMENT);detail='KIRA · 提交修復結果';}
 else if(!paid){link=null;detail='等待委託結算';}
 if(order&&!paid)out.push(task('d01-repair',title,link,detail));
 if(claimed)out.push(task('d01-bank','查收第一筆結款',null,'已完成',true));
 if(paid)out.push(task('d01-repair','完成數據修復委託',null,'已完成',true));
 return out;
}
function flowDestination(s){
 const p=flowState(s);
 if(p.linkOpened&&!p.submitted)return {
  link:destination('ghost','/flow-deploy'),detail:'GHOST · 完成工具測試'
 };
 if(p.submitted&&!completed(s,'flow-d03'))return {
  link:destination('mirage','/chat/'+FLOW_CONTACT),detail:'MIRAGE · 回覆 Flow'
 };
 return {link:destination('mirage','/chat/'+FLOW_CONTACT),detail:'MIRAGE · Flow'};
}
function nodeTask(s,n){
 const done=completed(s,n.id),status=nodeStatus(s,n.id);
 if(n.id==='intro')return null;
 // The last recording is delivered by NoApp, not by the to-do list.
 if(n.id==='ending')return null;
 if(!done&&status.state!=='ready'&&!['d29-chess','d23-chess-finish','plan'].includes(n.id))return null;
 let link=done?null:nodeLink55(s,n.id);
 let title=n.title,detail=link?(appLabel[link.appId]||link.appId):'已完成';
 if(n.kind==='scene'){
  const lines=sceneLines(s,n.id),progress=scene55(s,n.id);
  const first=lines[progress?.index||0]?.[0];
  const person=name[n.conversationId];
  const display=person?' · '+person:'';
  title=first==='me'?(person?'回覆'+person:'繼續目前的對話'):
   (person?'查看'+person+'的訊息':'查看'+(appLabel[n.channel]||'')+'訊息');

  detail=(appLabel[n.channel]||'訊息')+display;
 }
 if(n.id==='d41-opening')title=(n.at?n.at+' ':'')+n.title;
 if(n.kind==='mail'){title=n.manualSend?'發送目標資料':'查看 KIRA 郵件';detail='KIRA · '+(n.manualSend?'發送郵件':'收件箱');}
 if(n.id==='ready')title='給傅隆生發信息';
 if(n.id==='d53-isolde-deal')title='Isolde｜確認第二筆委託';
 if(n.kind==='project'){title=n.id==='prep'?'檢查鬼車行動準備':n.id==='identity'?'繼續調查線索':'繼續部署程序';}
 if(n.kind==='payment')title='支付委託訂金';
 if(n.kind==='private-contract')title='發佈私人委託';
 if(n.kind==='file')title='查看已取得的檔案';
 if(n.kind==='page')title='查看搜尋結果';
 if(n.kind==='map')title='核對地圖上的位置';
 if(n.kind==='flow'){title='完成 Flow 的測試委託';const d=flowDestination(s);link=d.link;detail=d.detail;}
 if(n.id==='d51-private-contract-mail'){link=destination('kira','/compose/private-contract');title='發送目標資料';detail='KIRA · 撰寫郵件';}
 if(n.id==='wallet'){
  title='完成錢包挑戰';
  const o=s.content.orders?.find(o=>o.id===D06_ORDER_ID),mail=s.content.mail?.find(m=>m.id===STORY55_WALLET_MAIL_ID);
  if(o?.status==='OPEN'){link=destination('mirage','/bounties/hall');detail='MIRAGE · 訂單大廳';}
  else if(o?.status==='READY'){link=destination('mirage','/order/'+D06_ORDER_ID);detail='MIRAGE · 提交驗收';}
  else if(o?.status==='ACCEPTED'&&!mail?.read){link=destination('kira','/mail/'+STORY55_WALLET_MAIL_ID);detail='KIRA · 打開授權郵件';}
  else if(o?.status==='ACCEPTED'){link=destination('ghost','/deployment',{project:'wallet'});detail='GHOST · 繼續錢包挑戰';}
 }

 if(n.id==='d13-wallet-mail'){link=destination('kira','/mail/s55-d13-wallet-mail');detail='KIRA · 收件箱';}
 if(n.id==='d29-chess'&&status.state==='locked'){link=destination('chess','/');title='打開國際象棋';detail='國際象棋 · 完成棋局';}
 if(n.id==='d23-chess-finish'&&status.state==='locked'){title='完成棋局後的對話';detail='MIRAGE · Dr Ouroboros';link=destination('mirage','/chat/s55-ouroboros');}
 if(n.id==='plan'&&status.state==='locked'){title='完成國際象棋';detail='國際象棋';link=destination('chess','/');}

 if(n.id==='base'&&s.day>=14&&s.day<=24){
  const batch=s.story55?.projects?.base?.batches?.[s.day-14];
  title='完成今日程序部署';
  detail='GHOST · '+(batch?.complete?'已完成':'五輪測試與升級');
  if(batch?.complete||done)return task(n.id,title,null,'已完成',true,n.at);
 }
 return task(n.id,title,link,done?'已完成':detail,done,n.at);
}
function researchTasks(s){
 const config=[
  {id:'survey',day:25,node:'d25-survey',name:'監控系統資料',chat:'group'},
  {id:'maintenance',day:26,node:'d26-records',name:'維保記錄',chat:'group'},
  {id:'staff',day:27,node:'d27-staff',name:'安保人員資料',chat:'hufeng'},
  {id:'validation',day:28,node:'d28-arrival',name:'設備驗證',chat:'group'},
  {id:'program',day:28,node:'d28-meeting',name:'控制程序',chat:'group'}
 ];
 const a=agent(s),files=agentFiles(s);
 return config.filter(entry=>s.day>=entry.day&&completed(s,entry.node)).map(entry=>{
  const job=a.jobs?.[entry.id],done=!!job?.done,upload=['survey','maintenance','staff'].includes(entry.id);
  if(done&&s.day!==entry.day)return null;
  if(!job&&!stageReady(s,entry.id))return null;
  // A retroactively completed scene is not proof an old agent attachment was saved.
  // Keep real overdue jobs and saved attachments, not phantom assignments.
  if(s.day>entry.day&&!job&&(!upload||!files.some(f=>storyFileStage(f)===entry.id)))return null;
  const file=upload?files.find(f=>storyFileStage(f)===entry.id):true;
  const waiting=!file&&!done;
  const link=done?null:waiting?destination('wechat','/chat/'+entry.chat):destination('ghost','/tear');
  const detail=done?'已完成':job?'TAI · 處理中':waiting?'微信 · 保存附件':'GHOST · Ouroboros’ Tear';
  return task('research-'+entry.id,'交給 TAI 處理'+entry.name,link,detail,done);
 }).filter(Boolean);
}
export function mainlineTasks(s){
 if(!isStory55(s)||s.story55?.ended)return [];
 const items=d01Tasks(s);
 const aodongChat=s.content.conversations.messages?.find(c=>c.id===D02_AODONG_CHAT_ID);
 const aodongSmsReady=visibleMessages(aodongChat,s).some(m=>m.id==='d02-aodong-sale');
 if(s.day>=2&&s.day<=14&&aodongSmsReady&&!d02CompleteBuild(s))
  items.push(task('workstation','準備工作站配件',destination('messages','/chat/'+D02_AODONG_CHAT_ID),'短信 · 澳東商城優惠資訊'));
 const required=mandatoryIds(s);
 for(const n of story55Config(s).nodes){
  if(!required.has(n.id)||n.day>s.day||!hasReached(s,n))continue;
  if(n.autoComplete===true)continue;
  if(n.id==='flow-d03'&&s.day===3&&s.clock<'08:15')continue;
  if(n.id==='wallet'&&s.day===6&&s.clock<D06_FLOW_AT)continue;
  // Nothing has happened to disclose this node until its predecessors finish.
  if((n.requires||[]).some(id=>!completed(s,id)))continue;
  const view=nodeTask(s,n);if(view&&(!view.done||n.day===s.day))items.push(view);
 }
 items.push(...researchTasks(s));
 const unique=[...new Map(items.map(t=>[t.id,t])).values()];
 const today=new Set(story55Config(s).nodes.filter(n=>n.day===s.day).map(n=>'mainline:'+n.id));
 const rank=t=>today.has(t.id)||s.day===1&&t.id.startsWith('mainline:d01-')?0:
   t.id.startsWith('mainline:research-')?1:t.id==='mainline:workstation'?2:3;
 return unique.sort((a,b)=>Number(a.done)-Number(b.done)||rank(a)-rank(b)||
  ((a.at||'00:00').localeCompare(b.at||'00:00')));
}
export function mainlineTask(s,id){return mainlineTasks(s).find(t=>t.id===id)||null;}
export function mainlineDayLabel(s){
 const iso=date55(s.day),m=Number(iso.slice(5,7)),d=Number(iso.slice(8,10));
 return m+'月'+d+'日';
}
