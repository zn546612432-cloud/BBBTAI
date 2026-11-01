// Shared fictional cross-App contract runtime. GHOST produces an artifact;
// only an explicit KIRA delivery can start employer review and payment.
import {
 linkedMission,linkedDeliveryId,linkedArtifactId,linkedGameMinute,
 advanceLinkedMission,recordLinkedMissionPayment
} from './linked-missions.js';

export const linkedArtifacts=s=>Array.isArray(s.content?.missionFiles)?s.content.missionFiles:[];
const currentOrder=(s,id)=>s.content.orders?.find(o=>o.id===id);
const timeLabel=s=>({day:s.day,clock:s.clock});
const validMission=(s,id)=>!!linkedMission(s,id)&&!!currentOrder(s,id);
const deadlineAt=m=>m.deadlineDay==null?null:(m.deadlineDay-1)*1440+Number(String(m.deadlineClock||'23:59').slice(0,2))*60+Number(String(m.deadlineClock||'23:59').slice(3));
export function linkedDeliveryExpired(s,id){
 const m=linkedMission(s,id);
 return !!m&&deadlineAt(m)!==null&&linkedGameMinute(s)>deadlineAt(m);
}
export function createLinkedArtifact(s,id,{test=false}={}){
 const m=linkedMission(s,id),o=currentOrder(s,id),run=s.ghost?.orders?.[id];
 if(!m||!o||o.status!=='ACCEPTED'||m.stage<4||run?.status!=='success'||linkedDeliveryExpired(s,id))return null;
 const artifactId=linkedArtifactId(id);
 s.content.missionFiles??=[];
 const existing=s.content.missionFiles.find(f=>f.id===artifactId);
 if(existing)return existing;
 const file={
  id:artifactId,orderId:id,title:'GH-'+id.toUpperCase()+'.enc',
  kind:'encrypted-result',mime:'application/octet-stream',
  description:'GHOST / '+m.title+' · 虚构的加密任务成果，等待在 KIRA 中提交',
  createdDay:s.day,createdTime:s.clock,source:'ghost',test:!!test
 };
 s.content.missionFiles.push(file);
 advanceLinkedMission(s,id,5);
 s.events.push({type:'linked_artifact_created',orderId:id,artifactId,...timeLabel(s),test:!!test});
 return file;
}
export function deliverLinkedArtifact(s,id,attachmentId,{test=false,note=''}={}){
 if(!validMission(s,id))throw Error('找不到对应的 MIRAGE 委托');
 const m=linkedMission(s,id),o=currentOrder(s,id),run=s.ghost?.orders?.[id];
 if(o.status!=='ACCEPTED'||m.stage<5||run?.status!=='success')throw Error('请先完成 GHOST 并生成任务成果');
 if(linkedDeliveryExpired(s,id))throw Error('委托已经超过交付期限，不能提交');
 const file=linkedArtifacts(s).find(f=>f.id===attachmentId&&f.orderId===id&&f.source==='ghost');
 if(!file)throw Error('请在 KIRA 选择这份委托实际生成的成果附件');
 if(m.submitted||s.content.mail.some(x=>x.id===linkedDeliveryId(id)))throw Error('这份成果已经提交过');
 const reviewMinutes=Number.isInteger(m.reviewMinutes)&&m.reviewMinutes>0?m.reviewMinutes:30;
 const mail={
  id:linkedDeliveryId(id),orderId:id,from:'熙蒙',to:o.owner||'ANONYMOUS',
  subject:'RE: '+m.subject,body:(String(note||'').trim().slice(0,1500)||'任务已经完成，请查收加密成果。')+'\n附件：'+file.title,
  attachments:[file.id],read:true,linkedDelivery:true,day:s.day,time:s.clock,test:!!test
 };
 s.content.mail.unshift(mail);
 m.submitted=true;m.deliveredAt={day:s.day,clock:s.clock};
 run.status='settling';run.submittedAtGameMinute=linkedGameMinute(s);run.reviewAtGameMinute=linkedGameMinute(s)+reviewMinutes;
 run.rewardAtSubmission=m.reward;
 o.status='REVIEWING';
 s.events.push({type:'linked_artifact_delivered',orderId:id,artifactId:file.id,...timeLabel(s),test:!!test});
 return mail;
}
export function tickLinkedContracts(s){
 const missions=s.content?.mirage?.linkedMissions||{};
 if(!Object.keys(missions).length)return false;
 const now=linkedGameMinute(s);
 let updated=false;
 for(const [id,m] of Object.entries(missions)){
  const order=currentOrder(s,id);if(!order)continue;
  const run=s.ghost?.orders?.[id];
  if(order.status==='ACCEPTED'&&linkedDeliveryExpired(s,id)){
   order.status='FAILED';m.failed=true;
   if(run&&run.status!=='paid')run.status='expired';
   s.events.push({type:'linked_contract_deadline_missed',orderId:id,...timeLabel(s)});
   updated=true;continue;
  }
  if(order.status!=='REVIEWING'||!m.submitted||run?.status!=='settling')continue;
  if(!Number.isFinite(run.reviewAtGameMinute)||now<run.reviewAtGameMinute)continue;
  const value=Number(run.rewardAtSubmission);
  if(!Number.isSafeInteger(value)||value<0)throw Error('任务结算金额无效：'+id);
  const ledger=s.content.mirage.digitalTransactions??(s.content.mirage.digitalTransactions=[]);
  if(ledger.some(t=>t.orderId===id))throw Error('任务重复结算：'+id);
  ledger.unshift({id:'linked-payment-'+id,orderId:id,amount:value,at:Date.now(),day:s.day,clock:s.clock});
  s.content.mirage.digitalBalance=(Number(s.content.mirage.digitalBalance)||0)+value;
  s.ghost.balance=(Number(s.ghost.balance)||0)+value;
  run.status='paid';run.paidGameMinute=now;run.paidAt=Date.now();
  order.status='COMPLETED';
  advanceLinkedMission(s,id,6);
  recordLinkedMissionPayment(s,id,value,run.paidAt);
  s.events.push({type:'linked_contract_payment',orderId:id,amount:value,...timeLabel(s)});
  updated=true;
 }
 return updated;
}
export function linkedNeedsWorldTick(s){
 const missions=s.content?.mirage?.linkedMissions||{};
 return Object.entries(missions).some(([id,m])=>{
  const order=currentOrder(s,id),run=s.ghost?.orders?.[id];
  return order?.status==='ACCEPTED'&&linkedDeliveryExpired(s,id)
   ||order?.status==='REVIEWING'&&m.submitted&&run?.status==='settling'
     &&Number.isFinite(run.reviewAtGameMinute)&&linkedGameMinute(s)>=run.reviewAtGameMinute;
 });
}
