// One KIRA → Files → GHOST commission-attachment contract.
// An accepted MIRAGE commission always produces exactly one real encrypted
// attachment. D01 and D02 retain their established key/deploy semantics;
// D03 and D04 use the same native card and open-with-GHOST viewer.
import {D01_ATTACHMENT,D01_REPAIR} from '../../story/d01/runtime.js';
import {D02_MAIL,D02_A_MAIL,D02_S,D02_A,D02_KEY_FILES} from '../../story/d02/runtime.js';
import {D03_ORDER,D03_MAIL,D03_STAGES,d03StepId,armD03Ghost,markD03AttachmentOpened} from '../../story/d03/contract.js';
import {DAILY_CONTRACTS as D04_CONTRACTS,D04_MAIL,D04_STEP,armD04Ghost,markD04AttachmentOpened} from '../../story/d04/contract.js';

const D01_KEY='mirage001.key';
export const D03_KEY_FILE='dataset_0521.enc';
const d04ByMail=mailId=>D04_CONTRACTS.find(c=>D04_MAIL(c.id)===mailId);
export function commissionAttachment(s,mailId){
 const m=s.content?.mail?.find(x=>x.id===mailId);
 if(!m)return null;
 if(mailId===D01_ATTACHMENT)return {
  mailId,orderId:D01_REPAIR,name:D01_KEY,route:'/attachment/d01-mirage001',
  status:s.story55?.d01?.rewardPaid?'COMPLETED':s.story55?.d01?.deployed?'RUNNING':'ENCRYPTED',
  kind:'D01'
 };
 const d02Id=mailId===D02_MAIL?D02_S:mailId===D02_A_MAIL?D02_A:null;
 if(d02Id){
  const o=s.content?.orders?.find(x=>x.id===d02Id);
  return {mailId,orderId:d02Id,name:D02_KEY_FILES[d02Id],
   route:'/attachment/d02/'+encodeURIComponent(mailId),kind:'D02',
   status:o?.status==='COMPLETED'?'COMPLETED':s.story55?.d02?.deployed?.[d02Id]?'RUNNING':'ENCRYPTED'};
 }
 if(mailId===D03_MAIL){
  const o=s.content?.orders?.find(x=>x.id===D03_ORDER);
  return {mailId,orderId:D03_ORDER,name:D03_KEY_FILE,
   route:'/attachment/commission/'+encodeURIComponent(mailId),kind:'D03',
   status:o?.status==='COMPLETED'?'COMPLETED':o?.status==='EXPIRED'?'EXPIRED'
    :s.story55?.d03Contract?.attachmentOpened?'RUNNING':'ENCRYPTED'};
 }
 const d04=d04ByMail(mailId);
 if(d04){
  const o=s.content?.orders?.find(x=>x.id===d04.id);
  return {mailId,orderId:d04.id,name:d04.attachment,
   route:'/attachment/commission/'+encodeURIComponent(mailId),kind:'D04',
   status:o?.status==='COMPLETED'?'COMPLETED':o?.status==='EXPIRED'?'EXPIRED'
    :s.story55?.d04Attachments?.[d04.id]?'RUNNING':'ENCRYPTED'};
 }
 return null;
}
export function commissionPreviewAvailable(s,mailId){
 const file=commissionAttachment(s,mailId);
 if(!file)return false;
 const order=s.content?.orders?.find(o=>o.id===file.orderId);
 return !!order&&['ACCEPTED','READY','COMPLETED','EXPIRED'].includes(order.status);
}
export function commissionPendingGhostStep(s,mailId){
 const file=commissionAttachment(s,mailId);
 if(!file||!commissionPreviewAvailable(s,mailId))return null;
 const order=s.content.orders.find(o=>o.id===file.orderId);
 if(order.status!=='ACCEPTED')return null;
 if(file.kind==='D03'){
  const step=D03_STAGES.findIndex((_,i)=>s.ghost?.orders?.[d03StepId(i)]?.status!=='success');
  return step<0?null:d03StepId(step);
 }
 if(file.kind==='D04'){
  const config=d04ByMail(mailId);
  if(!config)return null;
  const step=config.stages.findIndex((_,i)=>s.ghost?.orders?.[D04_STEP(config.id,i)]?.status!=='success');
  return step<0?null:D04_STEP(config.id,step);
 }
 return null;
}
export function openCommissionWithGhost(s,mailId){
 const target=commissionPendingGhostStep(s,mailId);
 if(!target)return null;
 if(mailId===D03_MAIL){
  const index=D03_STAGES.findIndex((_,i)=>d03StepId(i)===target);
  markD03AttachmentOpened(s);
  return armD03Ghost(s,index);
 }
 const config=d04ByMail(mailId);
 if(config){
  const index=config.stages.findIndex((_,i)=>D04_STEP(config.id,i)===target);
  markD04AttachmentOpened(s,config.id);
  return armD04Ghost(s,config.id,index);
 }
 return null;
}
export function normalizeCommissionMail(s,mailId){
 const mail=s.content?.mail?.find(m=>m.id===mailId);
 const file=commissionAttachment(s,mailId);
 if(!mail||!file||!['D03','D04'].includes(file.kind))return false;
 if(mail.attachments?.length===1&&mail.attachments[0]===file.name)return false;
 mail.attachments=[file.name];
 if(mailId===D03_MAIL)mail.body=mail.body.replace(
  '附件：dataset_0521.enc、manifest.json','附件：dataset_0521.enc（內含 manifest.json）');
 return true;
}
