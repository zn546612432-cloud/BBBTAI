import {hardwareComplete,HARDWARE_GOAL} from './hardware.js';
// D02 / 2025-05-20. All actions are fictional game state; never run external network commands.
import {seedD02Wechat} from './wechat.js';
export const D02_S='d02-chip-peace';
export const D02_A='d02-commission-a';
export const D02_MAIL='d02-talia-key-mail';
export const D02_A_MAIL='d02-anonymous-key-mail';
export const D02_KEY_FILES={[D02_S]:'talia-chip-0520.key',[D02_A]:'monitor-nodes-0520.key'};
export const D02_KIRA_BODY={
 [D02_S]:'加密芯片的项目凭证已同步，授权密钥见附件。',
 [D02_A]:'委托已确认。\n\n本次项目的授权凭证已作为加密附件送达。不要用于其他订单。\n\n期限三天。我只接受完整的结果报告。不要分批提交，也不需要发进度邮件。'
};
export const D02_KEYS={ [D02_S]:'TALIA-CHIP-0520',[D02_A]:'GHOST-A-0520' };
export const D02_TALIA='mc-talia-d02';
export const D02_NOTE='d02-new-workstation-note';
export const D02_REMINDER='d02-pc-build-reminder';
export const D02_AODONG_URL='https://aodong.shop';
export const D02_AODONG_SMS='【澳東商城】五月數碼優惠月！\n\n電腦配件專場八折，顯卡、處理器、記憶體及工作站設備限時優惠。\n\n選購請前往：\n'+D02_AODONG_URL;
export const D02_REWARDS={ [D02_S]:12000,[D02_A]:4500 };
export const D02_STAGES={
 [D02_S]:['route','veil','extract'],
 [D02_A]:['cipher','route','strike']
};
export const D02_BRIEFS={
 [D02_S]:'我需要一枚加密芯片里的完整资料。\n\n数据不能有缺失，也不要擅自修改内容。至于里面是什么，我建议你不要太好奇。\n\n今天之内交给我，报酬不会少。\n\n哦，对了，希望你手脚够快。我不太喜欢等人。\n\n—— Talia',
 [D02_A]:'有三个远程监控节点，我需要它们在指定时段内停止向主控端回传数据。\n\n我要中断记录和恢复记录。没有完整结果就不要提交。\n\n期限三天。报酬写在上面了。'
};
export const D02_DEADLINES={ [D02_S]:{day:2,clock:'23:59'},[D02_A]:{day:4,clock:'23:59'} };
const ensureD02=s=>{const d=s.story55.d02??={};d.completed??={};d.submitted??={};d.paid??={};d.deployed??={};d.taliaStage??=0;d.bonus??=false;return d;};
const gameMinute=s=>Number(s.day)*1440+Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3,5));
const expired=(s,id)=>s.day>D02_DEADLINES[id].day||s.day===D02_DEADLINES[id].day&&s.clock>D02_DEADLINES[id].clock;
export const d02ReminderId=id=>'d02-order-reminder-'+id;
const TODAY='2025-05-20';
const msg=(id,from,text,time)=>({id,from,text,kind:'text',day:2,time,sentDate:TODAY,actual:true,storyD02:true});
const onD02=s=>s.story55?.version===1&&s.day>=2;
export const d02State=s=>s.story55?.d02||{};
export const d02StepId=(id,i)=>id+'-stage-'+(i+1);
export const d02OrderOfStep=id=>[D02_S,D02_A].find(key=>String(id||'').startsWith(key+'-stage-'))||null;
export const d02NextStep=(s,id)=>{const master=d02OrderOfStep(id);if(!master)return null;const i=D02_STAGES[master].findIndex((_,index)=>d02StepId(master,index)===id);return i>=0&&i+1<D02_STAGES[master].length?d02StepId(master,i+1):null;};
function syncD02Reminder(s,id){
 const o=s.content.orders?.find(o=>o.id===id),r=s.content.reminders?.find(r=>r.id===d02ReminderId(id));
 if(!o||!r)return;
 r.done=o.status==='COMPLETED';r.failed=o.status==='EXPIRED';
 r.progress=D02_STAGES[id].filter((_,i)=>s.ghost?.orders?.[d02StepId(id,i)]?.status==='success').length;
 r.total=D02_STAGES[id].length;
 r.status=r.done?'已完成':r.failed?'已失效':o.status==='READY'?'待提交':'进行中';
}
export function tickD02Contracts(s,now=Date.now()){
 if(!onD02(s))return false;
 const d=ensureD02(s);let changed=false;
 for(const id of [D02_S,D02_A]){
  const o=s.content.orders?.find(o=>o.id===id);if(!o)continue;
  if(['OPEN','ACCEPTED'].includes(o.status)&&expired(s,id)&&!d.completed[id]){o.status='EXPIRED';changed=true;}
  syncD02Reminder(s,id);
 }
 const chat=s.content.conversations.mirage?.find(c=>c.id===D02_TALIA);
 const answer=chat?.messages.find(m=>m.id==='d02-talia-worth');
 if(d.bonusRequested&&answer?.delivery&&!d.bonusPaid&&!d.bonusDueAt&&d.submitted[D02_S]){d.bonusDueAt=now+4000;changed=true;}
 if(d.bonusDueAt&&now>=d.bonusDueAt&&!d.bonusPaid){
  d.bonusPaid=true;d.bonus=true;d.bonusDueAt=null;
  creditD02(s,D02_S,D02_REWARDS[D02_S],'-talia');changed=true;
 }
 return changed;
}
export function d02ContractDue(s,now=Date.now()){
 const d=s.story55?.d02,chat=s.content.conversations.mirage?.find(c=>c.id===D02_TALIA);
 return !!(onD02(s)&&((d?.bonusDueAt&&now>=d.bonusDueAt)||(d?.bonusRequested&&!d.bonusDueAt&&!d.bonusPaid&&chat?.messages.some(m=>m.id==='d02-talia-worth'&&m.delivery))));
}
export function deployD02(s,id,key){
 if(!onD02(s)||!D02_STAGES[id])return false;
 const order=s.content.orders?.find(o=>o.id===id),mail=s.content.mail?.find(m=>m.id===(id===D02_S?D02_MAIL:D02_A_MAIL));
 if(!order||order.status!=='ACCEPTED'||expired(s,id)||!mail||String(key||'').trim()!==D02_KEYS[id])return false;
 const d=ensureD02(s);if(id===D02_S&&!d.keyOpened)return false;
 d.deployed[id]=true;armD02Ghost(s,id,0);return true;
}
export function seedD02(s){
 if(!onD02(s))return false;
 const d=ensureD02(s);
 s.content.orders??=[];s.content.mail??=[];s.content.conversations??={};s.content.conversations.mirage??=[];
 for(const [id,owner] of [[D02_S,'Talia'],[D02_A,'ANONYMOUS']]){
  let o=s.content.orders.find(o=>o.id===id);
  if(!o){
   o={id,title:id===D02_S?'S 级委托':'A 级委托',owner,category:id===D02_S?'S':'A',reward:D02_REWARDS[id].toLocaleString('en-US')+' USD',status:'OPEN',description:D02_BRIEFS[id],deadlineDay:D02_DEADLINES[id].day,deadlineClock:'23:59',storyD02:true,storyDay:2};
   s.content.orders.push(o);
  }else if(o.storyD02){Object.assign(o,{description:D02_BRIEFS[id],deadlineDay:D02_DEADLINES[id].day,deadlineClock:'23:59',reward:D02_REWARDS[id].toLocaleString('en-US')+' USD'});if(['ACCEPTED','READY','COMPLETED'].includes(o.status))o.wasAccepted=true;}
 }
 // Older saves could have an accepted A commission from the keyless prototype.
 // Backfill its KIRA authorization once so the upgraded save is still playable.
 const legacyA=s.content.orders.find(o=>o.id===D02_A);
 if(legacyA?.status==='ACCEPTED'&&!s.content.mail.some(m=>m.id===D02_A_MAIL)){
  s.content.mail.unshift({id:D02_A_MAIL,from:'ANONYMOUS / MIRAGE',subject:'[MIRAGE] ACCESS AUTHORIZATION',body:D02_KIRA_BODY[D02_A],attachments:[D02_KEY_FILES[D02_A]],read:false,storyD02:true,day:s.day,time:s.clock});
  if(!s.notifications.some(n=>n.id==='d02-anonymous-mail-notice'))s.notifications.unshift({id:'d02-anonymous-mail-notice',title:'KIRA',body:'[MIRAGE] ACCESS AUTHORIZATION',day:s.day,clock:s.clock,link:{appId:'kira',route:'/mail/'+D02_A_MAIL,params:{}}});
 }
 // D02 .key files use KIRA native attachments, including in older saves.
 for(const [id,mailId] of [[D02_S,D02_MAIL],[D02_A,D02_A_MAIL]]){
  const mail=s.content.mail.find(m=>m.id===mailId);
  if(mail?.storyD02){mail.body=D02_KIRA_BODY[id];mail.attachments=[D02_KEY_FILES[id]];}
 }
 tickD02Contracts(s);
 // D02's private record belongs in Schedule, not Notes.
 // Remove only the old authored note; all user-created notes remain intact.
 s.content.notes=(s.content.notes||[]).filter(n=>n.id!==D02_NOTE);
 d.noteSeeded=true;
 const hardwareReminder=s.content.reminders?.find(r=>r.id===D02_REMINDER);
 if(hardwareReminder)hardwareReminder.title='机房升级：购齐工作站配置清单中的设备';
 // The Aodong advertisement remains a genuine scheduled incoming SMS.
 const sms=s.content.conversations.messages??(s.content.conversations.messages=[]);
 let shop=sms.find(c=>c.id==='sms-aodong-2025');
 if(!shop){shop={id:'sms-aodong-2025',name:'澳东商城',unread:0,messages:[]};sms.push(shop);}
 if(!shop.messages.some(m=>m.id==='d02-aodong-sale'))
  shop.messages.push({...msg('d02-aodong-sale','aodong',D02_AODONG_SMS,'09:00'),schedule:{mode:'game-time',day:2,clock:'09:00'}});
  // Repair the one existing D02 promo bubble in older saves; never append duplicates.
  const sale=shop.messages.find(m=>m.id==='d02-aodong-sale');
  if(sale?.storyD02)sale.text=D02_AODONG_SMS;
 // The new WeChat engine only inserts an NPC message when it has genuinely
 // been delivered; player lines appear only after the user presses Send.
 seedD02Wechat(s);
 return true;
}
export function acceptD02(s,id){
 if(s.story55?.version!==1||s.day<2||!D02_STAGES[id])return false;
 const o=s.content.orders?.find(o=>o.id===id),d=ensureD02(s);
 if(!o||o.status!=='OPEN'||expired(s,id))return false;
 o.status='ACCEPTED';o.wasAccepted=true;o.acceptedDay=s.day;o.acceptedClock=s.clock;
 if(id===D02_S){
  const list=s.content.conversations.mirage;
  if(!list.some(c=>c.id===D02_TALIA))list.push({id:D02_TALIA,name:'Talia',avatar:'T',online:false,unread:1,storyD02:true,lastMessageAt:Date.now(),messages:[msg('d02-talia-connected',D02_TALIA,'通信已建立',s.clock)]});
  if(!s.content.mail.some(m=>m.id===D02_MAIL))s.content.mail.unshift({id:D02_MAIL,from:'Talia · MIRAGE',subject:'[MIRAGE] CHIP ACCESS / KEY',body:D02_KIRA_BODY[D02_S],read:false,storyD02:true,day:s.day,time:s.clock,attachments:[D02_KEY_FILES[D02_S]]});
  s.notifications.unshift({id:'d02-talia-mail-notice',title:'KIRA',body:'[MIRAGE] CHIP ACCESS / KEY',day:s.day,clock:s.clock,link:{appId:'kira',route:'/mail/'+D02_MAIL,params:{}}});
 }else{
  if(!s.content.mail.some(m=>m.id===D02_A_MAIL))s.content.mail.unshift({id:D02_A_MAIL,from:'ANONYMOUS / MIRAGE',subject:'[MIRAGE] ACCESS AUTHORIZATION',body:D02_KIRA_BODY[D02_A],attachments:[D02_KEY_FILES[D02_A]],read:false,storyD02:true,day:s.day,time:s.clock});
  if(!s.notifications.some(n=>n.id==='d02-anonymous-mail-notice'))s.notifications.unshift({id:'d02-anonymous-mail-notice',title:'KIRA',body:'[MIRAGE] ACCESS AUTHORIZATION',day:s.day,clock:s.clock,link:{appId:'kira',route:'/mail/'+D02_A_MAIL,params:{}}});
 }
 const list=s.content.reminders??(s.content.reminders=[]);
 if(!list.some(r=>r.id===d02ReminderId(id)))list.push({id:d02ReminderId(id),title:'MIRAGE · '+(id===D02_S?'S 级 Talia 委托':'A 级监控系统干扰'),done:false,storyD02Order:true,orderId:id,deadlineDay:D02_DEADLINES[id].day,deadlineClock:'23:59'});
 syncD02Reminder(s,id);
 return true;
}
export function revealD02Key(s){
 if(!s.story55?.d02||!s.content.mail.some(m=>m.id===D02_MAIL)||s.content.orders.find(o=>o.id===D02_S)?.status!=='ACCEPTED')return false;
 s.story55.d02.keyOpened=true;const mail=s.content.mail.find(m=>m.id===D02_MAIL);mail.read=true;return true;
}
export function armD02Ghost(s,master,index){
 if(!D02_STAGES[master]?.[index])return null;
 if(!s.story55?.d02?.deployed?.[master]||expired(s,master)||s.content.orders?.find(o=>o.id===master)?.status!=='ACCEPTED')return null;
 const id=d02StepId(master,index),type=D02_STAGES[master][index];
 s.ghost??={orders:{},history:[],balance:0,config:{}};
 s.ghost.orders??={};
 s.ghost.orders[id]??={id,mailId:master===D02_S?D02_MAIL:D02_A_MAIL,type,key:D02_KEYS[master],status:'authorized',attempts:0,settings:{seconds:type==='strike'?30:null,rounds:1,retries:99,...(type==='route'?{pipeNetwork:true,pipeSize:5}:{})}};
 return id;
}
export function onD02GhostWin(s,stepId){
 const master=d02OrderOfStep(stepId),d=s.story55?.d02;
 if(!master||!d)return false;
 const index=D02_STAGES[master].findIndex((_,i)=>d02StepId(master,i)===stepId);
 if(index<0||expired(s,master)||s.content.orders.find(o=>o.id===master)?.status!=='ACCEPTED')return false;
 if(index+1<D02_STAGES[master].length)armD02Ghost(s,master,index+1);
 else if(!d.completed[master]){
  d.completed[master]=true;d.completedAt??={};d.completedAt[master]={day:s.day,clock:s.clock};
  const order=s.content.orders.find(o=>o.id===master);if(order)order.status='READY';
  if(master===D02_S){
   s.content.missionFiles??=[];
   s.content.missionFiles.push({id:'d02-target-intelligence.enc',orderId:master,title:'TARGET_DATA.enc',description:'Talia 芯片委托 · 已获取的虚构目标资料',source:'ghost',createdDay:2,createdTime:s.clock});
  }
  else{
   s.content.missionFiles??=[];
   if(!s.content.missionFiles.some(f=>f.id==='d02-monitor-interruption-report'))s.content.missionFiles.push({id:'d02-monitor-interruption-report',orderId:master,title:'INTERRUPTION_REPORT',description:'模拟监控节点 01/02/03 · 中断与恢复验证记录',source:'ghost',createdDay:s.day,createdTime:s.clock});
  }
 }
 syncD02Reminder(s,master);
 return true;
}
function creditD02(s,id,amount,suffix=''){
 const d=s.story55.d02;if(amount<=0)return;
 const txId='d02-payment-'+id+suffix;
 if(s.bankData.transactions?.some(t=>t.id===txId))return;
 s.bankData.balance=(Number(s.bankData.balance)||0)+amount;
 s.bankData.transactions??=[];
 s.bankData.transactions.unshift({id:txId,label:suffix?'TALIA · 追加赏金':'MIRAGE · 委托结算',amount,day:s.day,time:s.clock,date:new Date(Date.parse('2025-05-19T00:00:00Z')+(s.day-1)*86400000).toISOString().slice(0,10)});
 s.notifications.unshift({id:'d02-payment-notice-'+id+suffix,title:'太平洋銀行',body:'MIRAGE 赏金入账 '+amount.toLocaleString('en-US')+' USD',day:s.day,clock:s.clock,link:{appId:'bank',route:'/',params:{}}});
 d.paid[id]=(d.paid[id]||0)+amount;
}
export function submitD02(s,id){
 const d=s.story55?.d02,o=s.content.orders?.find(x=>x.id===id);
 if(!d?.completed?.[id]||!o||!['READY','ACCEPTED'].includes(o.status)||d.submitted[id])return false;
 o.status='COMPLETED';d.submitted[id]=true;
 creditD02(s,id,D02_REWARDS[id]);
 if(s.day===2&&d.wechat&&d.wechat.earlyAt==null)d.wechat.earlyAt=gameMinute(s);
 syncD02Reminder(s,id);return true;
}
export function d02TaliaDraft(s,id){
 const d=s.story55?.d02;if(id!==D02_TALIA||!d?.submitted?.[D02_S]||d.taliaStage>=2)return null;
 if(d.taliaStage===0)return '东西已经拿到手。';
 const c=s.content.conversations.mirage.find(x=>x.id===D02_TALIA),m=c?.messages.find(m=>m.id==='d02-talia-peace');
 return m?.delivery?'哦？这份贡献值得再加一笔赏金吗？':null;
}
export function onD02TaliaMessage(s,id,text){
 const d=s.story55?.d02;if(id!==D02_TALIA||!d?.submitted?.[D02_S])return false;
 const c=s.content.conversations.mirage.find(x=>x.id===D02_TALIA);if(!c)return false;
 const push=(messageId,body,delay)=>{if(c.messages.some(m=>m.id===messageId))return;c.messages.push({...msg(messageId,D02_TALIA,body,s.clock),schedule:{mode:'chat-delay',seconds:delay}});};
 if(d.taliaStage===0&&text.trim()==='东西已经拿到手。'){
  d.taliaStage=1;push('d02-talia-received','收到了。',1.5);push('d02-talia-peace','你不会知道自己刚刚为世界和平作出多大贡献。',4);
  return true;
 }
 if(d.taliaStage===1&&text.trim()==='哦？这份贡献值得再加一笔赏金吗？'&&c.messages.some(m=>m.id==='d02-talia-peace'&&m.delivery)){
  d.taliaStage=2;push('d02-talia-worth','当然，完全值得。',2);push('d02-talia-goodbye','希望世界和平，我们不会再有见面的机会，再见，nya。',5);
  d.bonusRequested=true; // Payment is processed after the response reaches the chat.
  return true;
 }
 return false;
}
export function createD02Reminder(s){
 if(!onD02(s))return false;
 const list=s.content.reminders??(s.content.reminders=[]);
 if(list.some(r=>r.id===D02_REMINDER))return false;
 list.push({id:D02_REMINDER,title:'机房升级：购齐工作站配置清单中的设备',done:false,storyD02:true});
 return true;
}
export const D02_PARTS=HARDWARE_GOAL.map(p=>p.category);
export function d02CompleteBuild(s){
 return hardwareComplete(s);
}
export function toggleD02Build(s){
 const r=s.content.reminders?.find(x=>x.id===D02_REMINDER);if(!r)return false;
 if(r.done){r.done=false;return true;}
 if(!d02CompleteBuild(s))return false;
 r.done=true;
 const d=s.story55.d02;
 if(d.buildCelebrated)return true;
 // Finishing the shopping list only makes a draft available. The shared
 // conversation lifecycle delivers replies after the real native Send action.
 if(!d.buildReady){d.buildReady=true;d.buildReadyClock=s.clock;}
 return true;
}
export function rebuildD02(s){
 seedD02(s);
 for(const master of [D02_S,D02_A]){
  const order=s.content.orders.find(o=>o.id===master);if(!order||order.status==='COMPLETED')continue;
  if(order.status==='OPEN'&&!acceptD02(s,master))throw Error('D02 委托重建接单失败：'+master);
  if(master===D02_S&&!revealD02Key(s))throw Error('D02 委托重建密钥失败');
  if(master===D02_A){const mail=s.content.mail.find(m=>m.id===D02_A_MAIL);if(mail)mail.read=true;}
  if(!deployD02(s,master,D02_KEYS[master]))throw Error('D02 委托重建部署失败');
  for(let i=0;i<D02_STAGES[master].length;i++){
   const step=armD02Ghost(s,master,i);
   if(!step)throw Error('D02 重建无法授权 GHOST 阶段');
   s.ghost.orders[step].status='success';
   s.ghost.orders[step].attempts=1;
   s.ghost.orders[step].test=true;
   s.ghost.history.unshift({id:step+':1',orderId:step,type:D02_STAGES[master][i],success:true,at:0,attempt:1,test:true,day:2});
   onD02GhostWin(s,step);
  }
  if(!submitD02(s,master))throw Error('D02 重建无法提交委托：'+master);
 }
}
