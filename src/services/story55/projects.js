import {isStory55,projectById,nodeStatus,completed,completeNode,story55Config} from './state.js';
import {STORY55_BOUNTY_ID,STORY55_WALLET_MAIL_ID} from '../../apps/mirage/data.js';
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
export function deploymentPercent(s,id){const p=projectById(s,id),r=deployment(s,id);if(!p)return 0;if(r.batches.length===p.batches&&r.batches.every(b=>b.complete))return 100;return Math.min(99.999,Number(r.batches.reduce((sum,b,i)=>sum+(b.complete?p.gains[i]:0),0).toFixed(3)));}
export function projectCapacity(s,p){return Math.min(p.batches,Math.max(0,s.day-p.day+1));}
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
 if(!isStory55(s))throw Error('不是55天周目');
 const p=projectById(s,id),r=deployment(s,id);
 if(!p||nodeStatus(s,p.node).state!=='ready')throw Error(p?nodeStatus(s,p.node).reason:'项目不存在');
 if(!r.authorized)throw Error('请先输入邮件或文件中的授权码');
 if((s.story55.hardware||1)<p.minimumHardware)throw Error('设备性能不足，请升级本地设备');
 const index=r.batches.findIndex(b=>!b.complete),batch=index<0?r.batches.length:index;
 if(batch>=p.batches)throw Error('项目已完成');
 if(batch>=projectCapacity(s,p))throw Error('本日可执行批次已完成');
 const b=r.batches[batch]??={complete:false,steps:[]};r.batches[batch]=b;
 const step=p.steps.findIndex((_,i)=>!b.steps[i]);
 const orderId=`s55:${id}:${batch}:${step}`;
 const g=s.ghost??={orders:{},history:[],balance:0,config:{}};g.orders??={};g.history??=[];
 g.orders[orderId]??={id:orderId,type:p.steps[step],key:p.key,status:'authorized',attempts:0,story55Project:id,batch,step,settings:{seconds:90,retries:1000,rounds:1,codeLength:4,attackMs:3500,reward:null}};
 r.active=orderId;return orderId;
}
export function completeDeploymentRun(s,run){
 if(!run?.story55Project||!isStory55(s)||run.status!=='success')return false;
 const p=projectById(s,run.story55Project),r=deployment(s,run.story55Project);
 if(!p||!r.authorized)return false;
 const b=r.batches[run.batch];if(!b||b.steps[run.step])return false;
 b.steps[run.step]={id:run.id,day:s.day};r.active=null;
 if(p.steps.every((_,i)=>!!b.steps[i])){
  b.complete=true;b.day=s.day;
  s.story55.reports[`${p.id}-${run.batch}`]={title:`${p.title} / BATCH ${run.batch+1}`,project:p.id,percent:deploymentPercent(s,p.id),day:s.day};
  if(deploymentPercent(s,p.id)===100){completeNode(s,p.node);if(p.id==='wallet')settleStory55Wallet(s);}
 }
 return true;
}
