// D03 / 2025-05-21. Fictional B-class intelligence commission.
// Separate from Flow's no-minigame deployment. Rewards are paid only on submission.
export const D03_ORDER='d03-intelligence-analysis';
export const D03_MAIL='d03-intelligence-documents';
export const D03_SETTLEMENT='d03-intelligence-settlement';
export const D03_STAGES=['cipher','route','veil'];
export const D03_REWARD=4800;
export const D03_DEADLINE={day:5,clock:'13:40'};
const DATE='2025-05-21',KEY='D03-INTEL-0521';
const minute=s=>Number(s.day)*1440+Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3,5));
const deadlineMinute=D03_DEADLINE.day*1440+13*60+40;
const expired=s=>minute(s)>deadlineMinute;
const allowed=s=>s.story55?.version===1;
export const d03StepId=(index)=>D03_ORDER+'-stage-'+(index+1);
export const d03OrderOfStep=(id)=>/^d03-intelligence-analysis-stage-[123]$/.test(String(id||''))?D03_ORDER:null;
const indexOfStep=id=>D03_STAGES.findIndex((_,i)=>d03StepId(i)===id);
export const d03NextStep=(s,id)=>{const i=indexOfStep(id);return i>=0&&i<D03_STAGES.length-1?d03StepId(i+1):null;};
const order=s=>s.content?.orders?.find(o=>o.id===D03_ORDER);
const progress=s=>s.story55.d03Contract??(s.story55.d03Contract={});
export function seedD03Contract(s){
 if(!allowed(s)||s.day<3||s.day===3&&s.clock<'13:40')return false;
 const list=s.content.orders??(s.content.orders=[]);
 if(list.some(o=>o.id===D03_ORDER))return false;
 list.push({
  id:D03_ORDER,title:'B 級委託',owner:'ANONYMOUS',category:'B',reward:'4,800 USD',
  status:'OPEN',storyD03:true,storyDay:3,deadlineDay:5,deadlineClock:'13:40',
  description:'需對一批來源不明的資料進行交叉比對及有效性驗證。\n\n資料包含通訊紀錄、交易時間戳及多組識別碼，部分內容存在缺失及重複。\n\n請排除無效記錄，整理可確認的關聯資訊，並提交分析結果。\n\n交付要求：有效資料索引、異常記錄清單、關聯分析結果。\n期限：48 小時。'
 });
 return true;
}
export function tickD03Contract(s){
 if(!allowed(s))return false;
 let changed=seedD03Contract(s);
 const existing=s.content.mail?.find(m=>m.id===D03_MAIL);
 if(existing?.storyD03){
  if(existing.attachments?.length!==1||existing.attachments?.[0]!=='dataset_0521.enc'){
   existing.attachments=['dataset_0521.enc'];changed=true;
  }
  const old='附件：dataset_0521.enc、manifest.json';
  if(existing.body.includes(old)){existing.body=existing.body.replace(old,'附件：dataset_0521.enc（內含 manifest.json）');changed=true;}
 }
 const o=order(s);
 if(o&&expired(s)&&['OPEN','ACCEPTED','READY'].includes(o.status)){
  o.status='EXPIRED';progress(s).expired=true;changed=true;
 }
 return changed;
}
export function acceptD03Contract(s){
 if(!allowed(s)||expired(s)||!order(s)||order(s).status!=='OPEN')return false;
 const o=order(s);o.status='ACCEPTED';o.wasAccepted=true;
 o.acceptedDay=s.day;o.acceptedClock=s.clock;
 const p=progress(s);p.accepted=true;
 const mail=s.content.mail??(s.content.mail=[]);
 if(!mail.some(m=>m.id===D03_MAIL))mail.unshift({
  id:D03_MAIL,orderId:D03_ORDER,from:'ANONYMOUS / MIRAGE',
  subject:'【mirage】委託資料已發送',
  body:'您已接受委託。\n\n資料來源不需要你確認。我只要能用的結果。重複的刪掉，缺失的標記出來。不要問其他問題。\n\n所需資料已加密封裝，請於期限內完成分析並提交結果。\n\n附件：dataset_0521.enc（內含 manifest.json）\n\n執行程序：破譯 → 連結 → 隱匿。\n\n提交成功後，驗收結果及交易回執將寄送至此郵箱。',
  attachments:['dataset_0521.enc'],read:false,storyD03:true,
  day:s.day,time:s.clock,date:DATE
 });
 const nid='d03-intel-kira-notice';
 if(!s.notifications.some(n=>n.id===nid))s.notifications.unshift({
  id:nid,title:'KIRA',body:'【mirage】委託資料已發送',
  day:s.day,clock:s.clock,link:{appId:'kira',route:'/mail/'+D03_MAIL,params:{}}
 });
 // GHOST is entered by opening KIRA's encrypted file; do not authorize
 // a second shortcut in MIRAGE on acceptance.
 return true;
}
export function markD03AttachmentOpened(s){
 if(!allowed(s)||!order(s)||order(s).status!=='ACCEPTED'||expired(s))return false;
 progress(s).attachmentOpened=true;return true;
}
export function d03CanRun(s,stepId){
 const i=indexOfStep(stepId),o=order(s);
 return i>=0&&allowed(s)&&!expired(s)&&o?.status==='ACCEPTED'
  &&(!!progress(s).attachmentOpened||D03_STAGES.some((_,j)=>s.ghost?.orders?.[d03StepId(j)]?.status==='success'))
  &&(i===0||s.ghost?.orders?.[d03StepId(i-1)]?.status==='success');
}
export function armD03Ghost(s,index){
 if(index<0||index>=D03_STAGES.length||!d03CanRun(s,d03StepId(index)))return null;
 s.ghost??={orders:{},history:[],balance:0,config:{}};
 s.ghost.orders??={};
 const id=d03StepId(index),type=D03_STAGES[index];
 s.ghost.orders[id]??={
  id,mailId:D03_MAIL,type,key:KEY,status:'authorized',attempts:0,
  settings:{seconds:null,rounds:1,retries:99,...(type==='route'?{pipeNetwork:true,pipeSize:5}:{})}
 };
 return id;
}
export function onD03GhostWin(s,stepId){
 const i=indexOfStep(stepId);
 if(i<0)return false;
 const o=order(s);
 if(!o||o.status!=='ACCEPTED'||expired(s))return false;
 if(i<D03_STAGES.length-1){armD03Ghost(s,i+1);return true;}
 if(s.ghost.orders[d03StepId(i)]?.status!=='success')return false;
 o.status='READY';progress(s).ready=true;
 const files=s.content.missionFiles??(s.content.missionFiles=[]);
 if(!files.some(f=>f.id==='d03-intel-analysis-result'))files.push({
  id:'d03-intel-analysis-result',orderId:D03_ORDER,
  title:'ANALYSIS_RESULT.enc',description:'模擬情報資料 · 有效索引、異常記錄與關聯分析報告',
  source:'ghost',createdDay:s.day,createdTime:s.clock
 });
 return true;
}
export function submitD03Contract(s){
 const o=order(s);
 if(!allowed(s)||!o||o.status!=='READY'||expired(s)
   ||D03_STAGES.some((_,i)=>s.ghost?.orders?.[d03StepId(i)]?.status!=='success'))return false;
 o.status='COMPLETED';progress(s).submitted=true;
 const tx=s.bankData.transactions??(s.bankData.transactions=[]);
 if(!tx.some(t=>t.id===D03_SETTLEMENT)){
  s.bankData.balance=(Number(s.bankData.balance)||0)+D03_REWARD;
  tx.unshift({id:D03_SETTLEMENT,label:'MIRAGE · 情報分析委託',amount:D03_REWARD,
   time:s.clock,date:new Date(Date.UTC(2025,4,19)+(s.day-1)*86400000).toISOString().slice(0,10),storyD03:true});
 }
 const mail=s.content.mail??(s.content.mail=[]);
 if(!mail.some(m=>m.id===D03_SETTLEMENT))mail.unshift({
  id:D03_SETTLEMENT,orderId:D03_ORDER,from:'MIRAGE / SETTLEMENT',
  subject:'【mirage】委託已完成',
  body:'分析結果已通過驗收。\n\n✓ 文件已驗收 · 交易回執已寄送\n\n報酬 US$ 4,800 已轉入您的指定帳戶。',
  read:false,storyD03:true,day:s.day,time:s.clock
 });
 if(!s.notifications.some(n=>n.id==='d03-intel-payment-notice'))s.notifications.unshift({
  id:'d03-intel-payment-notice',title:'KIRA',
  body:'【mirage】委託已完成 · US$ 4,800',
  day:s.day,clock:s.clock,link:{appId:'kira',route:'/mail/'+D03_SETTLEMENT,params:{}}
 });
 return true;
}
