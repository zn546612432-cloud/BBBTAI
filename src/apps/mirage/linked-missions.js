// General-purpose fictional contract links. The legacy D05 and hacker story
// remain untouched; developer-authored contracts get independent progress.
const PREFIX='linked-contract-mail-';
export const linkedMailId=id=>PREFIX+id;
export const linkedReceiptId=id=>'linked-payment-receipt-'+id;
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
  read:false,linkedReceipt:true
 });
 s.notifications.unshift({id:'linked-payment-notice-'+id,title:'KIRA',body:'Payment received · '+(order?.title||mission.title),link:{appId:'kira',route:'/mail/'+receiptId,params:{}}});
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
 const linked={id,title,subject:String(entry.subject||'【MIRAGE】新订单').slice(0,140),
  body:String(entry.body||'请确认并完成任务。').slice(0,6000),
  browserQuery:String(entry.browserQuery||title).slice(0,100),
  type,reward,seconds,stage:before?.stage||0};
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
 if(!order||order.status!=='OPEN')return false;
 order.status='ACCEPTED';
 mission.stage=Math.max(1,mission.stage);
 const mailId=linkedMailId(id);
 if(!s.content.mail.some(m=>m.id===mailId)){
  s.content.mail.unshift({id:mailId,orderId:id,from:order.owner+' · MIRAGE',
   subject:mission.subject,body:mission.body,read:false,linkedContract:true,missionStep:1});
  s.notifications.unshift({id:'linked-mail-notice-'+id,title:'KIRA',body:mission.subject,link:{appId:'kira',route:'/mail/'+mailId,params:{}}});
 }
 return true;
}
export function advanceLinkedMission(s,id,step){
 const mission=linkedMission(s,id);
 if(!mission)return false;
 const order=s.content.orders.find(o=>o.id===id);
 if(!order||order.status==='OPEN')return false;
 const next=Math.min(6,Math.max(0,Number(step)||0));
 if(next>mission.stage){mission.stage=next;return true;}
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
 const receiptId=linkedReceiptId(id);
 s.content.mail=s.content.mail.filter(m=>m.id!==mailId&&m.id!==receiptId);
 s.notifications=s.notifications.filter(n=>n.id!=='linked-mail-notice-'+id&&n.id!=='linked-payment-notice-'+id);
 if(s.ghost?.orders)delete s.ghost.orders[id];
 if(s.ghost?.history)s.ghost.history=s.ghost.history.filter(h=>h.orderId!==id);
 return true;
}
