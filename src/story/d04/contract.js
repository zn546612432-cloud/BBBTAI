import {D05_CONTRACTS} from '../d05/commissions.js';
import {D08_CONTRACTS} from '../d08/commissions.js';
import {D09_CONTRACTS} from '../d09/commissions.js';
import {D10_CONTRACTS} from '../d10/commissions.js';
import {D15_D55_CONTRACTS,D15_D55_RESTRICTED} from '../d15-d55/commissions.js';
import {D06_CONTRACT,D06_ORDER_ID} from '../d06/commission.js';
import {completeNode,completed} from '../../services/story55/state.js';
import {settleStory55Wallet} from '../../services/story55/projects.js';
// Two original fictional D04 MIRAGE commissions. Published at 00:00 on
// 2025-05-22, not when the player opens the app. Never auto-accept or pay.
export const D04_CONTRACTS=[
 {id:'d04-archive-recovery',title:'C 級委託',owner:'ARCHIVE / 07',grade:'C',
  amount:1600,reward:'1,600 USD',deadline:{day:6,clock:'00:00'},stages:['extract','veil'],
  key:'ARCHIVE-D04-0522',attachment:'archive_0522.enc',
  description:'一批封存的帳戶日誌需要重新整理。資料包含部分缺失的操作記錄和加密備份。\n\n請恢復可用資料，排除無效記錄，並提交完整索引。\n\n交付：有效索引、異常記錄清單。\n限期：48小時。',
  letter:'資料已封裝。把能用的記錄找回來，丟掉重複條目，缺失部分如實標記。\n不要補造不存在的資料。\n\n附件：archive_0522.enc\n執行程序：竊取 → 隱匿。'},
 {id:'d04-secure-channel-audit',title:'B 級委託',owner:'CIPHER / 22',grade:'B',
  amount:3600,reward:'3,600 USD',deadline:{day:7,clock:'00:00'},stages:['cipher','route','veil'],
  key:'CHANNEL-D04-0522',attachment:'relay_0522.log',
  description:'對一套加密通信系統進行授權測試，檢查傳輸鏈路與異常資料。\n\n交付完整的鏈路檢查記錄及異常項目清單。\n\n限期：72小時。',
  letter:'這套通信系統最近在固定時段出現鏈路異常。授權檢查已批准。\n我需要完整的測試記錄，不接受口頭描述。\n\n附件：relay_0522.log\n執行程序：破譯 → 連結 → 隱匿。'}
];
const DAY=4;
// Register daily definitions in the existing commission runner, with no new UI/steps.
export const DAILY_CONTRACTS=[...D04_CONTRACTS,...D05_CONTRACTS,D06_CONTRACT,...D08_CONTRACTS,...D09_CONTRACTS,...D10_CONTRACTS,...D15_D55_CONTRACTS];
const publishDay=c=>c.day??DAY;
const storyTag=c=>'storyD'+String(publishDay(c)).padStart(2,'0');
const dateOf=day=>new Date(Date.UTC(2025,4,19)+(day-1)*86400000).toISOString().slice(0,10);
export const D04_ORDER_IDS=DAILY_CONTRACTS.map(x=>x.id);
export const D04_MAIL=id=>'d04-commission-'+id;
export const D04_RECEIPT=id=>'d04-receipt-'+id;
export const D04_STEP=(id,i)=>id+'-stage-'+(i+1);
export const d04OrderOfStep=step=>DAILY_CONTRACTS.find(c=>c.stages.some((_,i)=>D04_STEP(c.id,i)===step))?.id||null;
export const d04NextStep=(s,step)=>{
 const id=d04OrderOfStep(step),c=DAILY_CONTRACTS.find(c=>c.id===id);
 const i=c?.stages.findIndex((_,j)=>D04_STEP(id,j)===step)??-1;
 return i>=0&&i<c.stages.length-1?D04_STEP(id,i+1):null;
};
const order=(s,id)=>s.content?.orders?.find(x=>x.id===id);
const story=s=>s.story55?.version===1;
const after=(s,at)=>s.day>at.day||s.day===at.day&&s.clock>at.clock;
const expired=(s,c)=>!!c.deadline&&after(s,c.deadline);
const cOf=id=>DAILY_CONTRACTS.find(c=>c.id===id);
const issueMail=(s,c)=>{
 const mail=s.content.mail??(s.content.mail=[]),mailId=D04_MAIL(c.id);
 if(mail.some(m=>m.id===mailId))return false;
 mail.unshift({id:mailId,orderId:c.id,from:c.owner+' / MIRAGE',
  subject:'【mirage】委託資料已發送',
  body:c.marketDaily?c.letter:'您已接取委託。\n\n'+c.letter+'\n\n完成後請在 MIRAGE 手動提交驗收。',
  attachments:[c.attachment],read:false,[storyTag(c)]:true,
  day:s.day,time:s.clock,date:dateOf(s.day)});
 const nid='d04-order-mail-'+c.id;
 if(!s.notifications.some(n=>n.id===nid))s.notifications.unshift({
  id:nid,title:'KIRA',body:'【mirage】委託資料已發送',day:s.day,clock:s.clock,
  link:{appId:'kira',route:'/mail/'+mailId,params:{}}
 });
 return true;
};
export function seedD04Contracts(s){
 if(!story(s)||s.day<DAY)return false;
 let changed=false;
 s.content.orders??=[];
 for(const c of DAILY_CONTRACTS){
  if(s.day<publishDay(c))continue;
  const previous=s.content.orders.find(o=>o.id===c.id);
  if(previous){
   // Migrate the old prototype wallet listing without resetting saved progress.
   if(c.id===D06_ORDER_ID&&previous.title==='10 BTC / WALLET CHALLENGE'){
    Object.assign(previous,{title:c.title,owner:c.owner,category:c.grade,reward:c.reward,
     description:c.description,storyD06:true,storyDay:6});changed=true;
   }
   if(c.id===D06_ORDER_ID&&completed(s,'wallet')&&previous.status!=='COMPLETED'){
    previous.status='COMPLETED';changed=true;
   }
   continue;
  }
  s.content.orders.push({id:c.id,title:c.title,owner:c.owner,category:c.grade,reward:c.reward,
   status:completed(s,'wallet')&&c.id===D06_ORDER_ID?'COMPLETED':'OPEN',
   description:c.description,[storyTag(c)]:true,storyDay:publishDay(c),publishedClock:'00:00',
    ...(c.marketDaily?{marketDaily:true}:{}),
   ...(c.deadline?{deadlineDay:c.deadline.day,deadlineClock:c.deadline.clock}:{})});
  changed=true;
 }
 // Restricted listings use the same market store and daily world clock, but
 // never enter the playable commission, mail or Ghost settlement pipeline.
 for(const c of D15_D55_RESTRICTED){
  if(s.day<c.day||s.content.orders.some(o=>o.id===c.id))continue;
  s.content.orders.push({id:c.id,title:c.title,owner:c.owner,category:c.grade,
   reward:c.reward,status:'RESTRICTED',description:c.description,
   marketRestricted:true,restrictedReason:c.restrictedReason,
   storyDay:c.day,endDay:c.endDay,publishedClock:'00:00'});
  changed=true;
 }
 return changed;
}
export function markD04AttachmentOpened(s,id){
 const c=cOf(id),o=order(s,id);
 if(!c||!story(s)||o?.status!=='ACCEPTED'||expired(s,c))return false;
 s.story55.d04Attachments??={};
 s.story55.d04Attachments[id]=true;
 return true;
}
export function tickD04Contracts(s){
 if(!story(s)||s.day<DAY)return false;
 let changed=seedD04Contracts(s);
 for(const c of DAILY_CONTRACTS){
  const mail=s.content.mail?.find(m=>m.id===D04_MAIL(c.id));
  if(mail?.[storyTag(c)]&&(mail.attachments?.length!==1||mail.attachments?.[0]!==c.attachment)){
   mail.attachments=[c.attachment];changed=true;
  }
  const o=order(s,c.id);
  // Legacy accepted wallet saves had an authorization mail with no real file.
  // Replace that obsolete mail with the canonical single attachment.
  if(c.id===D06_ORDER_ID&&o?.status==='ACCEPTED'){
   const before=s.content.mail.length;
   s.content.mail=s.content.mail.filter(m=>m.id!=='s55-wallet-d06-authorization');
   if(s.content.mail.length!==before)changed=true;
   const notices=s.notifications.length;
   s.notifications=s.notifications.filter(n=>n.id!=='s55-wallet-d06-authorization-notice');
   if(s.notifications.length!==notices)changed=true;
  }
  if(o?.status==='ACCEPTED'&&!s.content.mail?.some(m=>m.id===D04_MAIL(c.id)))
   changed=issueMail(s,c)||changed;
  if(o&&expired(s,c)&&['OPEN','ACCEPTED',...(c.marketDaily?[]:['READY'])].includes(o.status)){
   o.status='EXPIRED';changed=true;
  }
 }
 return changed;
}
export function acceptD04Contract(s,id){
 const c=cOf(id),o=order(s,id);
 if(!story(s)||!c||!o||o.status!=='OPEN'||s.day<publishDay(c)||expired(s,c))return false;
 o.status='ACCEPTED';o.wasAccepted=true;o.acceptedDay=s.day;o.acceptedClock=s.clock;
 issueMail(s,c);
 // Only the single encrypted KIRA attachment may activate GHOST.
 return true;
}
export function d04CanRun(s,step){
 const id=d04OrderOfStep(step),c=cOf(id),o=order(s,id);
 if(!c||!story(s)||!o||o.status!=='ACCEPTED'||expired(s,c))return false;
 const i=c.stages.findIndex((_,n)=>D04_STEP(id,n)===step);
 return i>=0&&(!!s.story55?.d04Attachments?.[id]
  ||c.stages.some((_,j)=>s.ghost?.orders?.[D04_STEP(id,j)]?.status==='success'))
  &&(i===0||s.ghost?.orders?.[D04_STEP(id,i-1)]?.status==='success');
}
export function armD04Ghost(s,id,index){
 const c=cOf(id),step=c&&D04_STEP(id,index);
 if(!c||index<0||index>=c.stages.length||!d04CanRun(s,step))return null;
 s.ghost??={orders:{},history:[],balance:0,config:{}};
 s.ghost.orders??={};
 s.ghost.orders[step]??={
  id:step,mailId:D04_MAIL(id),type:c.stages[index],key:c.key,
  status:'authorized',attempts:0,story55Commission:!!c.marketDaily,
  requiresKeyEntry:c.id===D06_ORDER_ID&&index===0,keyVerified:c.id!==D06_ORDER_ID||index>0,
  settings:{seconds:null,rounds:1,retries:99,...(c.stages[index]==='route'?{pipeNetwork:true,pipeSize:5}:{})}
 };
 return step;
}
export function onD04GhostWin(s,step){
 const id=d04OrderOfStep(step),c=cOf(id);
 if(!c||!d04CanRun(s,step))return false;
 const i=c.stages.findIndex((_,j)=>D04_STEP(id,j)===step);
 if(i<0||s.ghost?.orders?.[step]?.status!=='success')return false;
 if(i<c.stages.length-1){armD04Ghost(s,id,i+1);return true;}
 const o=order(s,id);o.status='READY';
 if(c.marketDaily){o.completedDay=s.day;o.completedClock=s.clock;}
 const files=s.content.missionFiles??(s.content.missionFiles=[]);
 if(!files.some(f=>f.id==='d04-artifact-'+id))files.push({
  id:'d04-artifact-'+id,orderId:id,title:'ANALYSIS_'+id.toUpperCase()+'.enc',
  description:'MIRAGE 授權委託成果',source:'ghost',createdDay:s.day,createdTime:s.clock
 });
 return true;
}
export function submitD04Contract(s,id){
 const c=cOf(id),o=order(s,id);
 if(!c||!story(s)||!o||o.status!=='READY'||(expired(s,c)&&!c.marketDaily)
   ||c.stages.some((_,i)=>s.ghost?.orders?.[D04_STEP(id,i)]?.status!=='success'))return false;
 o.status='COMPLETED';
 const receiptId=D04_RECEIPT(id);
 if(c.id===D06_ORDER_ID){
  if(!completed(s,'wallet'))completeNode(s,'wallet');
  settleStory55Wallet(s); // BTC ledger; do not credit fictitious USD.
 }else{
  const tx=s.bankData.transactions??(s.bankData.transactions=[]);
  if(!tx.some(t=>t.id===receiptId)){
   s.bankData.balance=(Number(s.bankData.balance)||0)+c.amount;
   tx.unshift({id:receiptId,label:c.marketDaily?'MIRAGE / '+id:'MIRAGE · '+c.grade+' 級委託',amount:c.amount,
    time:s.clock,date:dateOf(s.day),[storyTag(c)]:true});
  }
 }
 const mail=s.content.mail??(s.content.mail=[]);
 if(!mail.some(m=>m.id===receiptId))mail.unshift({
  id:receiptId,orderId:id,from:'MIRAGE / SETTLEMENT',
  subject:'【mirage】委託已完成',
  body:'分析結果已通過驗收。\n\n✓ 文件已驗收 · 交易回執已寄送\n\n'+(c.asset==='BTC'?'獎池 10 BTC 已轉入 MIRAGE 數位資產帳戶。':'報酬 US$ '+c.amount.toLocaleString('en-US')+' 已轉入您的指定帳戶。'),
  day:s.day,time:s.clock,read:false,[storyTag(c)]:true
 });
 const nid='d04-order-paid-'+id;
 if(!s.notifications.some(n=>n.id===nid))s.notifications.unshift({
  id:nid,title:'KIRA',body:'【mirage】委託已完成 · '+(c.asset==='BTC'?'10 BTC':'US$ '+c.amount.toLocaleString('en-US')),
  day:s.day,clock:s.clock,link:{appId:'kira',route:'/mail/'+receiptId,params:{}}
 });
 return true;
}
