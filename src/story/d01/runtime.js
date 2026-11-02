// D01 scripted order. All effects are idempotent and live in the saved phone.
export const D01_REPAIR='mirage001';
export const D01_OPENING='d01-vulnerability-paid';
export const D01_ATTACHMENT='d01-mirage001-attachment';
export const D01_DONE='d01-mirage001-completed';
export const D01_CONTACT='mc-rookery-13-d01';
const onD01=s=>s.story55?.version===1&&s.day===1;
const notify=(s,id,subject)=>{if(s.notifications.some(n=>n.id===id))return;s.notifications.unshift({id,title:'KIRA',body:subject,day:s.day,clock:s.clock,link:{appId:'kira',route:'/mail/'+id,params:{}}});};
const mail=(s,id,subject,body)=>{if(s.content.mail.some(m=>m.id===id))return false;s.content.mail.unshift({id,from:'MIRAGE',subject,body,read:false,day:s.day,time:s.clock,d01:true});notify(s,id,subject);return true;};
export function seedD01(s){
 if(!onD01(s))return;
 s.story55.d01??={};
 const orders=s.content.orders;
 if(!orders.some(o=>o.id===D01_OPENING))orders.push({id:D01_OPENING,title:'漏洞掃描',owner:'MIRAGE',category:'網絡安全',reward:'2,000 USD',status:'COMPLETED',description:'歷史漏洞掃描訂單。'});
 if(!orders.some(o=>o.id===D01_REPAIR))orders.push({id:D01_REPAIR,title:'數據修復',owner:'匿名僱主',category:'數據修復',reward:'0.04 BTC',status:'OPEN',description:'硬碟損壞，需要修復數據。'});
 if(!orders.some(o=>o.id==='d01-hunt-view'))orders.push({id:'d01-hunt-view',title:'追殺令',owner:'匿名',category:'限制閱覽',reward:'未公開',status:'OPEN',d01ViewOnly:true,description:'目標：Arthur Bellwick，虛構澳大利亞州議員。僅供閱覽。'});
 s.content.mirage.digitalBalance??=0;
 const reminders=s.content.reminders??(s.content.reminders=[]);
 for(const [id,title,done] of [['d01-reminder-bank','查收訂單結款',!!s.story55.d01.bankClaimed],['d01-reminder-repair','完成數據修復',!!s.story55.d01.rewardPaid]]){const existing=reminders.find(r=>r.id===id);if(existing)existing.done=done;else reminders.push({id,title,done,storyD01:true});}
}
export function deliverD01Opening(s){
 if(!onD01(s))return false;
 seedD01(s);
 return mail(s,D01_OPENING,'[MIRAGE] Order Completed','Dear Nyarlathotep,\\n\\nYour vulnerability scanning order has been completed. The payment has been transferred to your designated bank account. Please check your bank account for confirmation.\\n\\nBest regards,\\nMIRAGE Network');
}
const completeIntroWhenReady=s=>{if(s.story55?.d01?.bankClaimed&&s.story55.d01.rewardPaid&&!s.story55.completed?.intro){s.story55.completed??={};s.story55.completed.intro={day:1,clock:s.clock,by:'d01-mainline'};}};
export function claimD01Bank(s){
 if(!s.story55||!s.content.mail.some(m=>m.id===D01_OPENING)||s.story55.d01?.bankClaimed)return false;
 const d=s.story55.d01??={};d.bankClaimed=true;
 const reminder=s.content.reminders?.find(r=>r.id==='d01-reminder-bank');if(reminder)reminder.done=true;
 s.bankData.balance=Math.round((Number(s.bankData.balance)||0)*100+200000)/100;
 s.bankData.transactions.unshift({id:'d01-bank-1846',label:'【币速达网安系统】',amount:2000,day:s.day,time:s.clock,date:s.calendar?.anchorDate});
 completeIntroWhenReady(s);
 s.notifications.unshift({id:'d01-bank-notice',title:'太平洋銀行',body:'尾號1846卡5月19日'+s.clock+'收入2000美元',day:s.day,clock:s.clock,link:{appId:'bank',route:'/',params:{}}});
 return true;
}
export function acceptD01Repair(s){
 if(!onD01(s))return false;
 const o=s.content.orders.find(o=>o.id===D01_REPAIR);
 if(!o||o.status!=='OPEN')return false;
 o.status='ACCEPTED';const d=s.story55.d01??={};d.repairAccepted=true;d.acceptedAt=Date.now();
 const list=s.content.conversations.mirage;
 if(!list.some(c=>c.id===D01_CONTACT))list.push({id:D01_CONTACT,name:'Rookery 13',avatar:'R13',online:false,unread:1,lastMessageAt:Date.now(),storySeed:true,messages:[{id:'d01-link-established',from:D01_CONTACT,text:'通信已建立。',day:1,time:s.clock,sentDate:'2025-05-19',kind:'text',actual:true}]});
 if(!s.notifications.some(n=>n.id==='d01-mirage-link-established'))s.notifications.unshift({id:'d01-mirage-link-established',title:'MIRAGE',body:'Rookery 13：通信已建立。',conversationId:D01_CONTACT,day:1,clock:s.clock,link:{appId:'mirage',route:'/chat/'+D01_CONTACT,params:{}}});
 return true;
}
export function deliverD01Attachment(s){
 if(!s.story55?.d01?.repairAccepted)return false;
 return mail(s,D01_ATTACHMENT,'[MIRAGE] 訂單附件已送達','尊敬的 Nyarlathotep，僱主已投遞附件密鑰 mirage001，請查收。');
}
export function revealD01Key(s){const d=s.story55?.d01;if(!d?.repairAccepted||!s.content.mail.some(m=>m.id===D01_ATTACHMENT))return false;d.keyRevealed=true;return true;}
export function deployD01(s){
 if(!s.story55?.d01?.repairAccepted)return false;
 const d=s.story55.d01;d.deployed=true;d.completedRounds??=0;return true;
}
export function finishD01Round(s){
 const d=s.story55?.d01;
 if(!d?.deployed||d.rewardPaid||d.completedRounds>=5)return false;
 d.completedRounds++;return true;
}
export function submitD01Attachment(s){
 const d=s.story55?.d01;
 if(!d||d.completedRounds!==5||d.submitted)return false;
 d.submitted=true;d.submittedAt=Date.now();return true;
}
export function settleD01Repair(s){
 const d=s.story55?.d01;
 if(!d?.submitted||d.rewardPaid)return false;
 d.rewardPaid=true;
 const reminder=s.content.reminders?.find(r=>r.id==='d01-reminder-repair');if(reminder)reminder.done=true;
 const w=s.content.mirage;w.digitalBalance=(Number(w.digitalBalance)||0)+0.04;
 w.digitalTransactions??=[];w.digitalTransactions.unshift({orderId:D01_REPAIR,amount:0.04,day:s.day,clock:s.clock,at:Date.now()});
 const order=s.content.orders.find(o=>o.id===D01_REPAIR);if(order)order.status='COMPLETED';
 completeIntroWhenReady(s);
 mail(s,D01_DONE,'[MIRAGE] Order Completed','mirage001 項目訂單已完成。修復結果已驗收，0.04 BTC 已存入電子錢包。');
 return true;
}
export function tickD01(s,now=Date.now()){
 const d=s.story55?.d01;if(!d)return false;
 if(d.repairAccepted&&!s.content.mail.some(m=>m.id===D01_ATTACHMENT)&&now>=Number(d.acceptedAt||now)+2000)return deliverD01Attachment(s);
 if(d.submitted&&!d.rewardPaid&&now>=Number(d.submittedAt||now)+2000)return settleD01Repair(s);
 return false;
}
export const d01Gate=s=>s.story55?.version===1&&s.day===1&&(!s.story55.d01?.bankClaimed||!s.story55.d01?.rewardPaid);
