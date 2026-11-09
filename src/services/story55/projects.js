import {isStory55,projectById,nodeStatus,completed,completeNode,story55Config} from './state.js';
import {STORY55_BOUNTY_ID,STORY55_WALLET_MAIL_ID} from '../../apps/mirage/data.js';
import {postBankTransaction} from '../bank.js';
export function settleStory55Wallet(s,{test=false}={}){
 if(!isStory55(s)||!completed(s,'wallet'))return false;
 const order=s.content.orders?.find(o=>o.id===STORY55_BOUNTY_ID);
 if(order)order.status='COMPLETED';
 const wallet=s.content.mirage;
 wallet.transactions??=[];wallet.digitalTransactions??=[];
 if(wallet.transactions.some(t=>t.id==='s55-wallet-10btc'))return false;
 wallet.transactions.unshift({id:'s55-wallet-10btc',type:'REWARD',asset:'BTC',amount:10,day:s.day,time:s.clock,
  description:'WALLET CHALLENGE',...(test?{test:true}:{})});
 wallet.digitalBalance=(Number(wallet.digitalBalance)||0)+10;
 wallet.digitalTransactions.unshift({orderId:STORY55_BOUNTY_ID,amount:10,day:s.day,clock:s.clock,
  at:Date.now(),...(test?{test:true}:{})});
 return true;
}
export function deployment(s,id){return s.story55?.projects?.[id]||{authorized:false,batches:[],active:null};}
export function deploymentPercent(s,id){
 const p=projectById(s,id),r=deployment(s,id);
 if(!p)return 0;
 if(r.batches.length===p.batches&&r.batches.every(b=>b.complete))return 100;
 return Math.min(99.999,Number(r.batches.reduce((sum,b,i)=>sum+(b.complete?p.gains[i]:0),0).toFixed(3)));
}
export function projectCapacity(s,p){return Math.min(p.batches,Math.max(0,s.day-p.day+1));}
export const baseUpgradeCost=s=>projectById(s,'base')?.upgradePrice??100000;

/** Migrate only the old base-framework specification. Keep completed LINK
 * records, previously spent money and real chat bubbles; never recredit. */
export function syncBaseFrameworkRevision(s){
 if(!isStory55(s))return false;
 const p=projectById(s,'base');
 if(!p)return false;
 if(s.story55.baseUpgradeRevision===2)return false;
 let changed=false;
 const previous=p.steps.join(',')==='cipher,route,extract,veil,verify';
 if(previous||p.steps.some(type=>type!=='route')){
  p.steps=Array(5).fill('route');p.minimumHardware=1;changed=true;
 }
 if(p.minimumHardware!==1){p.minimumHardware=1;changed=true;}
 if(p.upgradePrice!==100000){p.upgradePrice=100000;changed=true;}
 if(!p.runtimeErrorCode){p.runtimeErrorCode='E-ENV-014';changed=true;}
 const r=s.story55.projects?.base;
 if(r){
  r.batches??=[];
  for(let batch=0;batch<r.batches.length;batch++){
   const b=r.batches[batch];if(!b)continue;
   b.steps??=[];
   if(b.complete||b.steps.filter(Boolean).length===5){
    b.testedDay??=b.day??(p.day+batch);
    if(batch===0&&b.complete)b.runFailed=true;
    if(batch>0&&b.complete){b.upgraded=true;b.legacyUpgraded??=true;}
   }
  }
  for(const order of Object.values(s.ghost?.orders||{})){
   if(order?.story55Project!=='base'||order.type==='route'||['success','paid'].includes(order.status))continue;
   // An unfinished old minigame is replaced by LINK, not charged or replayed.
   order.type='route';order.status='authorized';delete order.board;
   delete order.startedAt;delete order.deadline;delete order.previewUntil;changed=true;
  }
 }
 s.story55.baseUpgradeRevision=2;
 return changed;
}
// Restore the existing MIT-adapted pipe-network implementation for *future*
// base LINK attempts. An in-flight board is never replaced by migration.
export function syncBaseLinkPipeRevision(s){
 if(!isStory55(s)||s.story55.baseLinkPipeRevision===1)return false;
 let changed=false;
 for(const run of Object.values(s.ghost?.orders||{})){
  if(run?.story55Project!=='base'||run.type!=='route'||!['authorized','failed'].includes(run.status))continue;
  run.settings??={};run.settings.pipeNetwork=true;
  run.settings.pipeSize=[5,5,6,6,7][Math.min(4,run.step||0)];
  run.settings.seconds=null;changed=true;
 }
 s.story55.baseLinkPipeRevision=1;
 return changed;
}

/** A base framework is one persistent GHOST project. Its daily five LINK
 * tests use the same order runner as other commissions; upgrades are a
 * separate bank-backed action only after the D15 loan. */
export function deploymentReadiness(s,id){
 const p=projectById(s,id);
 if(!isStory55(s)||!p)return {canStart:false,reason:'本地程序不存在',batch:0};
 const r=deployment(s,id),status=nodeStatus(s,p.node);
 const unfinished=r.batches.findIndex(b=>!b?.complete);
 const batch=unfinished<0?r.batches.length:unfinished;
 if(status.state!=='ready')return {canStart:false,reason:status.reason,batch};
 if(!r.authorized)return {canStart:false,reason:'請先從 KIRA 附件部署授權密鑰',batch};
 if(batch>=p.batches)return {canStart:false,reason:'本地程序已完成',batch};
 if(id==='base'){
  if(batch>0&&!completed(s,'loan'))return {canStart:false,reason:'等待D15设备更新资金',batch};
  const b=r.batches[batch],tested=(b?.steps||[]).filter(Boolean).length>=5;
  if(tested)return {canStart:false,canUpgrade:batch>0&&completed(s,'loan'),upgradeCost:baseUpgradeCost(s),reason:'五次链接测试已完成，等待升级',batch,tests:5};
  if(r.batches.some(x=>x?.testedDay===s.day))return {canStart:false,reason:'本日已完成五次链接测试',batch,tests:0};
  if(batch>=projectCapacity(s,p))return {canStart:false,reason:'本日可執行的程序已完成',batch,tests:0};
  return {canStart:true,reason:r.active?'可繼續鏈接測試':'可開始鏈接測試',batch,tests:(b?.steps||[]).filter(Boolean).length};
 }
 if((s.story55.hardware||1)<p.minimumHardware)
  return {canStart:false,reason:`设备等级不足（目前 ${s.story55.hardware||1}，需要 ${p.minimumHardware}）`,batch};
 if(batch>=projectCapacity(s,p))return {canStart:false,reason:'本日可執行的程序已完成',batch};
 return {canStart:true,reason:r.active?'可繼續目前的工具':'程序已就緒',batch};
}
export function authorizeProject(s,id,key){
 if(id==='wallet')throw Error('請從 MIRAGE 接單並打開 KIRA 附件，使用 GHOST 執行公開錢包挑戰');
 const p=projectById(s,id);if(!p||nodeStatus(s,p.node).state!=='ready')throw Error(p?nodeStatus(s,p.node).reason:'项目不存在');
 if(id==='wallet'&&(s.content.orders?.find(o=>o.id===STORY55_BOUNTY_ID)?.status!=='ACCEPTED'
  ||!s.content.mail?.some(m=>m.id===STORY55_WALLET_MAIL_ID)))
  throw Error('请先在 MIRAGE 接受钱包挑战，并在 KIRA 收取授权邮件');
 if(String(key||'').trim()!==p.key)throw Error('授权码不匹配');
 s.story55.projects[id]??={authorized:false,batches:[],active:null};s.story55.projects[id].authorized=true;
 return true;
}
export function upgradeHardware(s){
 const c=story55Config(s),level=s.story55.hardware||1,cost=c.economics.hardwarePrices[level];
 if(cost===undefined)throw Error('设备已到最高等级');
 if(s.bankData.balance<cost)throw Error('余额不足，请先完成委托');
 s.bankData.balance-=cost;s.story55.hardware=level+1;
 s.bankData.transactions.unshift({id:'s55-hardware-'+(level+1),label:'LOCAL EQUIPMENT',amount:-cost,date:s.clock,time:s.clock});
}
export function startDeploymentStep(s,id){
 if(id==='wallet')throw Error('D06 請從 KIRA 的單一加密附件開啟 GHOST');
 const ready=deploymentReadiness(s,id);
 if(!ready.canStart)throw Error(ready.reason);
 const p=projectById(s,id),r=deployment(s,id),batch=ready.batch;
 if(r.active&&s.ghost?.orders?.[r.active]&&['authorized','running','preview-win','failed'].includes(s.ghost.orders[r.active].status))return r.active;
 const b=r.batches[batch]??={complete:false,steps:[]};r.batches[batch]=b;
 const step=p.steps.findIndex((_,i)=>!b.steps[i]);
 if(step<0)throw Error('本組工具已執行，請檢查驗收結果');
 const orderId=`s55:${id}:${batch}:${step}`;
 const g=s.ghost??={orders:{},history:[],balance:0,config:{}};g.orders??={};g.history??=[];
 g.orders[orderId]??={id:orderId,type:p.steps[step],key:p.key,status:'authorized',attempts:0,story55Project:id,batch,step,settings:{seconds:id==='base'?null:90,retries:1000,rounds:1,codeLength:4,attackMs:3500,reward:null,...(id==='base'?{pipeNetwork:true,pipeSize:[5,5,6,6,7][Math.min(4,step)]}:{})}};
 r.active=orderId;return orderId;
}
export function upgradeBaseFramework(s){
 const ready=deploymentReadiness(s,'base'),p=projectById(s,'base'),r=deployment(s,'base');
 if(!ready.canUpgrade||!p||!r.authorized)throw Error(ready.reason||'請先完成今日五次鏈接測試');
 const batch=ready.batch,b=r.batches[batch],cost=baseUpgradeCost(s);
 if(!b||b.complete||b.steps.filter(Boolean).length!==5)throw Error('請先完成五次鏈接測試');
 if(s.bankData.balance<cost)throw Error('余额不足，升级需要 US$'+cost.toLocaleString('en-US'));
 postBankTransaction(s,{id:'s55-base-upgrade-'+batch,label:'LOCAL FRAMEWORK UPGRADE',amount:-cost,
   metadata:{project:'base',upgrade:batch},
   receipt:{id:'s55-base-upgrade-'+batch+'-receipt',title:'Pacific',body:'框架設備升級支出 US$'+cost.toLocaleString('en-US',{minimumFractionDigits:2})}});
 b.complete=true;b.pendingUpgrade=false;b.upgraded=true;b.upgradeCost=cost;b.day=s.day;
 s.story55.reports['base-'+batch]={title:p.title+' / 更新記錄',project:'base',percent:deploymentPercent(s,'base'),day:s.day};
 if(deploymentPercent(s,'base')===100)completeNode(s,'base');
 return true;
}
export function completeDeploymentRun(s,run){
 if(!run?.story55Project||!isStory55(s)||run.status!=='success')return false;
 const p=projectById(s,run.story55Project),r=deployment(s,run.story55Project);
 if(!p||!r.authorized)return false;
 const b=r.batches[run.batch];if(!b||b.steps[run.step])return false;
 b.steps[run.step]={id:run.id,day:s.day};r.active=null;
 if(p.steps.every((_,i)=>!!b.steps[i])){
  b.testedDay=s.day;
  if(p.id==='base'){
   if(run.batch===0){
    b.complete=true;b.day=s.day;b.runFailed=true;r.baseRunNoticePending=true;r.baseRunNoticeShown=false;
    s.story55.reports['base-0']={title:p.title,project:'base',percent:deploymentPercent(s,'base'),
      day:s.day,errorCode:p.runtimeErrorCode||'E-ENV-014',status:'runtime-failed',message:'部署成功！运行失败！'};
   }else{
    // LINK success does not charge money or grow progress. The player must
    // explicitly press Upgrade, after the loan, to commit the next increment.
    b.pendingUpgrade=true;
   }
  }else{
   b.complete=true;b.day=s.day;
   s.story55.reports[`${p.id}-${run.batch}`]={title:`${p.title} / BATCH ${run.batch+1}`,project:p.id,percent:deploymentPercent(s,p.id),day:s.day};
   if(deploymentPercent(s,p.id)===100){completeNode(s,p.node);if(p.id==='wallet')settleStory55Wallet(s);}
  }
 }
 return true;
}
