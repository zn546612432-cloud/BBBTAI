// Developer-only dry run; it operates on a cloned phone, never on a player's save.
import {
 linkedMission,linkedArtifactId,linkedMailId,linkedReceiptId,
 acceptLinkedMission,advanceLinkedMission,resetLinkedMission
} from './linked-missions.js';
import {createLinkedArtifact,deliverLinkedArtifact,tickLinkedContracts} from './linked-contract-runtime.js';
import {authorize,begin,finish} from '../ghost/state.js';

function at(s,minute){
 if(minute<0||!Number.isFinite(minute))throw Error('无效的审核时间');
 s.day=Math.floor(minute/1440)+1;
 const n=minute%1440;
 s.clock=String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
}
const check=(cond,message)=>{if(!cond)throw Error(message);};

/** @returns {{id:string,ok:boolean,steps:Array<{app:string,ok:boolean,detail:string}>,error?:string}} */
export function validateLinkedContract(s,id){
 const steps=[],push=(app,detail)=>steps.push({app,ok:true,detail});
 const report={id,ok:false,steps};
 const original=linkedMission(s,id);
 if(!original)return {...report,error:'不存在的委托配置'};
 const copy=structuredClone(s);
 if(!copy.content.orders?.some(o=>o?.id===id))return {...report,error:'MIRAGE 悬赏订单不存在：'+id};
 const m=linkedMission(copy,id);
 try{
  resetLinkedMission(copy,id);
  copy.day=m.publishDay||1;copy.clock='00:00';
  check(acceptLinkedMission(copy,id),'MIRAGE 无法在预设发布日期接单');
  check(copy.content.mail.some(mail=>mail.id===linkedMailId(id)),'KIRA 未生成委托邮件');
  push('MIRAGE → KIRA','发布、接取及新订单邮件已关联');

  check(advanceLinkedMission(copy,id,2),'浏览器未能关联任务检索进度');
  check(advanceLinkedMission(copy,id,3),'KIRA 任务确认步骤无法完成');
  push('浏览器 → KIRA','检索与任务确认按依赖顺序触发');

  const run=authorize(copy,{orderId:id,mailId:linkedMailId(id),type:m.type});
  check(!!run&&advanceLinkedMission(copy,id,4),'GHOST 未能获得正确的委托授权');
  check(begin(copy,id,1000),'GHOST 关卡无法启动');
  finish(copy,id,true,1100);
  const file=copy.content.missionFiles?.find(f=>f.id===linkedArtifactId(id));
  check(run.status==='success'&&!!file,'GHOST 成功后未生成成果文件');
  push('GHOST → 文件','小游戏模拟通关，成果文件编号一致');

  // Validate KIRA submission via the SAME runtime command used by the user.
  check(!copy.content.mail.some(x=>x.id==='linked-delivery-mail-'+id),'成果没有手动提交却出现寄件记录');
  deliverLinkedArtifact(copy,id,file.id,{note:'开发者验证',test:true});
  check(copy.content.orders.find(o=>o.id===id).status==='REVIEWING','发送附成果邮件后未进入审核');
  push('文件 → KIRA','附件显式选择、寄件记录与审核状态正确');

  const due=copy.ghost.orders[id].reviewAtGameMinute;
  check(due<55*1440,'审核时间超出 D55 终点，无法在第一视角内结算');
  at(copy,due);
  check(tickLinkedContracts(copy),'达到审核时间后没有完成付款');
  check(copy.content.mail.some(x=>x.id===linkedReceiptId(id)),'付款后 KIRA 缺少回执邮件');
  check(copy.content.mirage.digitalTransactions.filter(x=>x.orderId===id).length===1,'交易流水缺失或重复');
  check(copy.content.orders.find(o=>o.id===id).status==='COMPLETED','MIRAGE 状态未变为已完成');
  push('MIRAGE 钱包','游戏时间审核、一次性入账及收据一致');
  report.ok=true;
 }catch(error){
  report.error=error?.message||String(error);
  steps.push({app:'检查中断',ok:false,detail:report.error});
 }
 return report;
}
