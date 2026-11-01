// General-purpose fictional contract links. The legacy D05 and hacker story
// remain untouched; developer-authored contracts get independent progress.
const PREFIX='linked-contract-mail-';
export const linkedMailId=id=>PREFIX+id;
export const linkedReceiptId=id=>'linked-payment-receipt-'+id;
export const linkedDeliveryId=id=>'linked-delivery-mail-'+id;
export const linkedArtifactId=id=>'linked-result-'+id+'.enc';
export const linkedGameMinute=s=>(Math.max(1,s.day)-1)*1440+Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3,5));
export const linkedMissionVisible=(s,id)=>{const m=linkedMission(s,id);if(!m||s.story55?.version!==1)return true;return (!m.publishDay||s.day>=m.publishDay)&&(!m.expiryDay||s.day<=m.expiryDay||s.content.orders.some(o=>o.id===id&&o.status!=='OPEN'));};
export function recordLinkedMissionPayment(s,id,amount,at){
 const mission=linkedMission(s,id);
 if(!mission||!Number.isFinite(amount)||amount<0)return false;
 const receiptId=linkedReceiptId(id);
 if(s.content.mail.some(m=>m.id===receiptId))return false;
 const order=s.content.orders.find(o=>o.id===id);
 s.content.mail.unshift({
  id:receiptId,orderId:id,from:'MIRAGE · SETTLEMENT',
  subject:'PAYMENT CONFIRMED · '+mission.title,
  body:'ORDER: '+id+'\nSTATUS: SETTLED\nCREDITS: +'+amount.toLocaleString('en-US')+'\nTRANSACTION: '+at,
  read:false,linkedReceipt:true,day:s.day,time:s.clock
 });
 s.notifications.unshift({id:'linked-payment-notice-'+id,title:'KIRA',body:'Payment received · '+(order?.title||mission.title),day:s.day,clock:s.clock,link:{appId:'kira',route:'/mail/'+receiptId,params:{}}});
 return true;
}
export const linkedMission=(s,id)=>s.content?.mirage?.linkedMissions?.[id]||null;
export const linkedMissions=s=>Object.values(s.content?.mirage?.linkedMissions||{});
export function saveLinkedMission(s,entry){
 const id=String(entry.id||'').trim();
 if(!/^[a-z0-9][a-z0-9-]{2,62}$/i.test(id))throw Error('任务 ID 只能包含 3–63 位字母、数字或连字符');
 if(['mirage-recruit-hacker','mirage-ouroboros-10btc-d05'].includes(id))throw Error('固定剧情订单不能被通用任务覆盖');
 if(!s.content?.orders||!s.content.mirage)throw Error('MIRAGE 尚未初始化');
 const existing=s.content.mirage.linkedMissions??={};
 const before=existing[id];
 const order=s.content.orders.find(o=>o.id===id);
 if(order&&!before)throw Error('同 ID 的非任务链悬赏已存在，请换一个 ID');
 const title=String(entry.title||'').trim().slice(0,120);
 if(!title)throw Error('必须输入悬赏名称');
 const type=['cipher','route','extract','veil','strike'].includes(entry.type)?entry.type:'cipher';
 const reward=Number(entry.reward);
 if(!Number.isSafeInteger(reward)||reward<0||reward>1e9)throw Error('奖励请输入非负整数（不超过十亿）');
 const seconds=entry.seconds==null||entry.seconds===''?null:Number(entry.seconds);
 if(seconds!==null&&(!Number.isInteger(seconds)||seconds<10||seconds>600))throw Error('时限请输入 10–600 秒');
 const publishDay=entry.publishDay==null||entry.publishDay===''?1:Number(entry.publishDay);
 const expiryDay=entry.expiryDay==null||entry.expiryDay===''?55:Number(entry.expiryDay);
 const deadlineDay=entry.deadlineDay==null||entry.deadlineDay===''?null:Number(entry.deadlineDay);
 const deadlineClock=entry.deadlineClock||'23:59';
 const reviewMinutes=entry.reviewMinutes==null||entry.reviewMinutes===''?30:Number(entry.reviewMinutes);
 if(!Number.isInteger(publishDay)||publishDay<1||publishDay>55||!Number.isInteger(expiryDay)||expiryDay<publishDay||expiryDay>55)throw Error('任务发布日期或下架日期无效');
 if(deadlineDay!==null&&(!Number.isInteger(deadlineDay)||deadlineDay<publishDay||deadlineDay>55))throw Error('交付期限不能早于发布日');
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(deadlineClock)))throw Error('交付截止时间无效');
 if(!Number.isInteger(reviewMinutes)||reviewMinutes<1||reviewMinutes>10080)throw Error('审核时间须为1至10080游戏分钟');
 const linked={id,title,subject:String(entry.subject||'【MIRAGE】新订单').slice(0,140),
  body:String(entry.body||'请确认并完成任务。').slice(0,6000),
  browserQuery:String(entry.browserQuery||title).slice(0,100),
  type,reward,seconds,publishDay,expiryDay,deadlineDay,deadlineClock,reviewMinutes,stage:before?.stage||0};
 existing[id]=linked;
 const data={id,title,description:String(entry.description||'').slice(0,6000),
  reward:String(entry.rewardLabel||reward+' CREDITS').slice(0,100),owner:String(entry.owner||'ANONYMOUS').slice(0,100),category:'CYBER',status:order?.status||'OPEN'};
 if(order)Object.assign(order,data);else s.content.orders.push(data);
 s.ghost??={orders:{},history:[],balance:0,config:{}};
 s.ghost.missionTypes??={};s.ghost.missionTypes[id]=type;
 s.ghost.orderConfigs??={};s.ghost.orderConfigs[id]={...s.ghost.orderConfigs[id],seconds,reward};
 return linked;
}
export function acceptLinkedMission(s,id){
 const mission=linkedMission(s,id);
 if(!mission)return false;
 const order=s.content.orders.find(x=>x.id===id);
 if(!order||order.status!=='OPEN'||!linkedMissionVisible(s,id))return false;
 const today=linkedGameMinute(s);
 if(mission.deadlineDay&&today>=(mission.deadlineDay-1)*1440+Number(mission.deadlineClock.slice(0,2))*60+Number(mission.deadlineClock.slice(3)))return false;
 order.status='ACCEPTED';
 mission.stage=Math.max(1,mission.stage);
 const mailId=linkedMailId(id);
 if(!s.content.mail.some(m=>m.id===mailId)){
  s.content.mail.unshift({id:mailId,orderId:id,from:order.owner+' · MIRAGE',
   subject:mission.subject,body:mission.body,read:false,linkedContract:true,missionStep:1,day:s.day,time:s.clock});
  s.notifications.unshift({id:'linked-mail-notice-'+id,title:'KIRA',body:mission.subject,day:s.day,clock:s.clock,link:{appId:'kira',route:'/mail/'+mailId,params:{}}});
 }
 return true;
}
export function advanceLinkedMission(s,id,step){
 const mission=linkedMission(s,id);
 if(!mission)return false;
 const order=s.content.orders.find(o=>o.id===id);
 if(!order||order.status==='OPEN')return false;
 const next=Math.min(6,Math.max(0,Number(step)||0));
 // A cross-App action cannot skip the browser, KIRA confirmation, GHOST
 // artifact or manual-delivery prerequisite, even through a stale deep link.
 if(next!==mission.stage+1)return false;
 if(next===5&&s.ghost?.orders?.[id]?.status!=='success')return false;
 if(next===6&&(s.ghost?.orders?.[id]?.status!=='paid'||!mission.submitted))return false;
 mission.stage=next;return true;
 return false;
}
export function resetLinkedMission(s,id){
 const mission=linkedMission(s,id);if(!mission)return false;
 mission.stage=0;
 const order=s.content.orders.find(o=>o.id===id);if(order)order.status='OPEN';
 const previous=s.ghost?.orders?.[id];
 if(previous?.status==='paid'){
  // Explicit developer reset reverses the test payout before a rerun.
  // Otherwise the same mission could be collected repeatedly.
  const ledger=s.content.mirage?.digitalTransactions||[];
  const credit=ledger.filter(x=>x.orderId===id).reduce((sum,x)=>sum+(Number(x.amount)||0),0);
  if(credit>0){
   if(Number.isFinite(s.ghost.balance))s.ghost.balance-=credit;
   s.content.mirage.digitalBalance=(Number(s.content.mirage.digitalBalance)||0)-credit;
   s.events.push({type:'linked_mission_payment_reversed',orderId:id,amount:credit,day:s.day,clock:s.clock});
  }
  s.content.mirage.digitalTransactions=ledger.filter(x=>x.orderId!==id);
 }
 const mailId=linkedMailId(id);
 const receiptId=linkedReceiptId(id),deliveryId=linkedDeliveryId(id);
 s.content.mail=s.content.mail.filter(m=>m.id!==mailId&&m.id!==receiptId&&m.id!==deliveryId);
 if(s.content.missionFiles)s.content.missionFiles=s.content.missionFiles.filter(f=>f.orderId!==id);
 s.notifications=s.notifications.filter(n=>n.id!=='linked-mail-notice-'+id&&n.id!=='linked-payment-notice-'+id);
 mission.submitted=false;delete mission.deliveredAt;delete mission.failed;
 if(s.ghost?.orders)delete s.ghost.orders[id];
 if(s.ghost?.history)s.ghost.history=s.ghost.history.filter(h=>h.orderId!==id);
 return true;
}
