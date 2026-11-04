// D02 / 2025-05-20. All actions are fictional game state; never run external network commands.
import {seedD02Wechat} from './wechat.js';
export const D02_S='d02-chip-peace';
export const D02_A='d02-commission-a';
export const D02_MAIL='d02-talia-key-mail';
export const D02_A_MAIL='d02-anonymous-key-mail';
export const D02_KEYS={ [D02_S]:'TALIA-CHIP-0520',[D02_A]:'GHOST-A-0520' };
export const D02_TALIA='mc-talia-d02';
export const D02_NOTE='d02-new-workstation-note';
export const D02_REMINDER='d02-pc-build-reminder';
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
const ensureD02=s=>{const d=s.story55.d02??={};d.completed??={};d.submitted??={};d.paid??={};d.deployed??={};return d;};
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
export function seedD02(s){
 if(!onD02(s))return false;
 const d=s.story55.d02??={completed:{},submitted:{},paid:{},taliaStage:0,bonus:false};
 s.content.orders??=[];s.content.mail??=[];s.content.conversations??={};s.content.conversations.mirage??=[];
 for(const [id,desc,owner] of [
  [D02_S,'破解芯片 → GHOST 链接、隐匿、窃取 → 获取目标资料。S 级：接单当日完成。','Talia'],
  [D02_A,'GHOST 破译 → 攻击（连续三关）。A 级：两至三天内完成。','ANONYMOUS']
 ]){
  if(!s.content.orders.some(o=>o.id===id))s.content.orders.push({id,title:id===D02_S?'S 级委托':'A 级委托',owner,category:id===D02_S?'S':'A',reward:D02_REWARDS[id].toLocaleString('en-US')+' USD',status:s.day===2?'OPEN':'EXPIRED',description:desc,storyD02:true,storyDay:2});
 }
 for(const [id,deadline] of [[D02_S,2],[D02_A,4]]){
  const order=s.content.orders.find(o=>o.id===id);
  if(s.day>deadline&&order&&['OPEN','ACCEPTED'].includes(order.status))order.status='EXPIRED';
 }
 // D02's private record belongs in Schedule, not Notes.
 // Remove only the old authored note; all user-created notes remain intact.
 s.content.notes=(s.content.notes||[]).filter(n=>n.id!==D02_NOTE);
 d.noteSeeded=true;
 // The Aodong advertisement remains a genuine scheduled incoming SMS.
 const sms=s.content.conversations.messages??(s.content.conversations.messages=[]);
 let shop=sms.find(c=>c.id==='sms-aodong-2025');
 if(!shop){shop={id:'sms-aodong-2025',name:'澳东商城',unread:0,messages:[]};sms.push(shop);}
 if(!shop.messages.some(m=>m.id==='d02-aodong-sale'))
  shop.messages.push({...msg('d02-aodong-sale','aodong','五月澳东打折月！澳东商城电子产品全场八折。浏览器搜索「澳东商城」进入选购。','09:00'),schedule:{mode:'game-time',day:2,clock:'09:00'}});
 // The new WeChat engine only inserts an NPC message when it has genuinely
 // been delivered; player lines appear only after the user presses Send.
 seedD02Wechat(s);
 return true;
}
export function acceptD02(s,id){
 if(s.story55?.version!==1||s.day!==2||!D02_STAGES[id])return false;
 const o=s.content.orders?.find(o=>o.id===id),d=s.story55.d02??={};
 if(!o||o.status!=='OPEN')return false;
 o.status='ACCEPTED';
 if(id===D02_S){
  const list=s.content.conversations.mirage;
  if(!list.some(c=>c.id===D02_TALIA))list.push({id:D02_TALIA,name:'Talia',avatar:'T',online:false,unread:1,storyD02:true,lastMessageAt:Date.now(),messages:[msg('d02-talia-connected',D02_TALIA,'[通信已建立，密钥已同步到KIRA]',s.clock)]});
  if(!s.content.mail.some(m=>m.id===D02_MAIL))s.content.mail.unshift({id:D02_MAIL,from:'Talia · MIRAGE',subject:'[MIRAGE] CHIP ACCESS / KEY',body:'加密芯片的项目凭证已同步。请打开附件读取授权密钥，随后进入 GHOST 完成链接、隐匿与窃取三个步骤。',read:false,storyD02:true,day:2,time:s.clock,attachments:['talia-chip-0520.key']});
  s.notifications.unshift({id:'d02-talia-mail-notice',title:'KIRA',body:'[MIRAGE] CHIP ACCESS / KEY',day:2,clock:s.clock,link:{appId:'kira',route:'/mail/'+D02_MAIL,params:{}}});
 }else{
  // A-grade contracts do not require a KIRA key or a contact.
  armD02Ghost(s,D02_A,0);
 }
 return true;
}
export function revealD02Key(s){
 if(!s.story55?.d02||!s.content.mail.some(m=>m.id===D02_MAIL)||s.content.orders.find(o=>o.id===D02_S)?.status!=='ACCEPTED')return false;
 s.story55.d02.keyOpened=true;return true;
}
export function armD02Ghost(s,master,index){
 if(!D02_STAGES[master]?.[index])return null;
 if(master===D02_S&&!s.story55?.d02?.keyOpened)return null;
 const id=d02StepId(master,index),type=D02_STAGES[master][index];
 s.ghost??={orders:{},history:[],balance:0,config:{}};
 s.ghost.orders??={};
 s.ghost.orders[id]??={id,mailId:master===D02_S?D02_MAIL:null,type,key:master===D02_S?'TALIA-CHIP-0520':'GHOST-A-0520',status:'authorized',attempts:0,settings:{seconds:null,rounds:1,retries:99}};
 return id;
}
export function onD02GhostWin(s,stepId){
 const master=d02OrderOfStep(stepId),d=s.story55?.d02;
 if(!master||!d)return false;
 const index=D02_STAGES[master].findIndex((_,i)=>d02StepId(master,i)===stepId);
 if(index<0||s.content.orders.find(o=>o.id===master)?.status!=='ACCEPTED')return false;
 if(index+1<D02_STAGES[master].length)armD02Ghost(s,master,index+1);
 else if(!d.completed[master]){
  d.completed[master]=true;
  if(master===D02_S){
   s.content.missionFiles??=[];
   s.content.missionFiles.push({id:'d02-target-intelligence.enc',orderId:master,title:'TARGET_DATA.enc',description:'Talia 芯片委托 · 已获取的虚构目标资料',source:'ghost',createdDay:2,createdTime:s.clock});
  }
  s.notifications.unshift({id:'d02-'+master+'-ready',title:'MIRAGE',body:'任务成果已生成 · 请返回 MIRAGE 手动提交',day:s.day,clock:s.clock,link:{appId:'mirage',route:'/order/'+master,params:{}}});
 }
 return true;
}
function creditD02(s,id,amount,suffix=''){
 const d=s.story55.d02;if(amount<=0)return;
 s.bankData.balance=(Number(s.bankData.balance)||0)+amount;
 s.bankData.transactions??=[];
 s.bankData.transactions.unshift({id:'d02-payment-'+id+suffix,label:'MIRAGE '+id+(suffix?' BONUS':''),amount,day:s.day,time:s.clock,date:new Date(Date.parse('2025-05-19T00:00:00Z')+(s.day-1)*86400000).toISOString().slice(0,10)});
 s.notifications.unshift({id:'d02-payment-notice-'+id+suffix,title:'太平洋銀行',body:'MIRAGE 赏金入账 '+amount.toLocaleString('en-US')+' USD',day:s.day,clock:s.clock,link:{appId:'bank',route:'/',params:{}}});
 d.paid[id]=(d.paid[id]||0)+amount;
}
export function submitD02(s,id){
 const d=s.story55?.d02,o=s.content.orders?.find(x=>x.id===id);
 if(!d?.completed?.[id]||!o||o.status!=='ACCEPTED')return false;
 o.status='COMPLETED';d.submitted[id]=true;
 creditD02(s,id,D02_REWARDS[id]*(id===D02_S&&d.bonus?2:1));
 return true;
}
export function d02TaliaDraft(s,id){
 const d=s.story55?.d02;if(id!==D02_TALIA||!d?.completed?.[D02_S]||d.taliaStage>=2)return null;
 if(d.taliaStage===0)return '东西已经拿到手。';
 const c=s.content.conversations.mirage.find(x=>x.id===D02_TALIA),m=c?.messages.find(m=>m.id==='d02-talia-peace');
 return m?.delivery?'哦？这份贡献值得再加一笔赏金吗？':null;
}
export function onD02TaliaMessage(s,id,text){
 const d=s.story55?.d02;if(id!==D02_TALIA||!d?.completed?.[D02_S])return false;
 const c=s.content.conversations.mirage.find(x=>x.id===D02_TALIA);if(!c)return false;
 const push=(messageId,body,delay)=>{if(c.messages.some(m=>m.id===messageId))return;c.messages.push({...msg(messageId,D02_TALIA,body,s.clock),schedule:{mode:'chat-delay',seconds:delay}});};
 if(d.taliaStage===0&&text.trim()==='东西已经拿到手。'){
  d.taliaStage=1;push('d02-talia-received','收到了。',1.5);push('d02-talia-peace','你不会知道自己刚刚为世界和平作出多大贡献。',4);
  return true;
 }
 if(d.taliaStage===1&&text.trim()==='哦？这份贡献值得再加一笔赏金吗？'&&c.messages.some(m=>m.id==='d02-talia-peace'&&m.delivery)){
  d.taliaStage=2;push('d02-talia-worth','当然，完全值得。',2);push('d02-talia-goodbye','希望世界和平，我们不会再有见面的机会，再见，nya。',5);
  d.bonus=true;
  const already=d.paid[D02_S]||0;
  if(already===D02_REWARDS[D02_S])creditD02(s,D02_S,D02_REWARDS[D02_S],'-talia');
  const order=s.content.orders.find(o=>o.id===D02_S);if(order)order.reward=(D02_REWARDS[D02_S]*2).toLocaleString('en-US')+' USD';
  return true;
 }
 return false;
}
export function createD02Reminder(s){
 if(!onD02(s))return false;
 const list=s.content.reminders??(s.content.reminders=[]);
 if(list.some(r=>r.id===D02_REMINDER))return false;
 list.push({id:D02_REMINDER,title:'配齐新工作站：CPU / 主板 / 显卡 / 内存 / SSD / 电源 / 散热 / 机箱',done:false,storyD02:true});
 return true;
}
export const D02_PARTS=['cpu','motherboard','gpu','ram','ssd','psu','cooler','case'];
export function d02CompleteBuild(s){
 const purchased=new Set((s.story55?.d02?.purchased||[]).map(x=>x.category));
 return D02_PARTS.every(cat=>purchased.has(cat));
}
export function toggleD02Build(s){
 const r=s.content.reminders?.find(x=>x.id===D02_REMINDER);if(!r)return false;
 if(r.done){r.done=false;return true;}
 if(!d02CompleteBuild(s))return false;
 r.done=true;
 const d=s.story55.d02;
 if(d.buildCelebrated)return true;
 d.buildCelebrated=true;
 const list=s.content.conversations.wechat??[],c=list.find(c=>c.id==='group');
 if(c){
  const lines=[
   ['me','新电脑终于装好了，跑起来舒服多了。'],
   ['小辛','？？？蒙蒙哥！新的显卡什么型号？快给我看看！'],
   ['胡枫','难怪你刚才传文件这么快。'],
   ['熙旺','能快点完成工作是好事。晚上记得关机睡觉。'],
   ['me','哥，你就不能先夸我一下吗？'],
   ['仔仔','我夸，显卡记得借我测试一下。'],
   ['小辛','不对啊怎么还要排队？？']
  ];
  lines.forEach(([from,text],i)=>c.messages.push({...msg('d02-newpc-group-'+i,from,text,s.clock),day:s.day,sentDate:new Date(Date.parse('2025-05-19T00:00:00Z')+(s.day-1)*86400000).toISOString().slice(0,10),schedule:from==='me'?undefined:{mode:'chat-delay',seconds:2+i*3}}));
 }
 return true;
}
export function rebuildD02(s){
 seedD02(s);
 for(const master of [D02_S,D02_A]){
  const order=s.content.orders.find(o=>o.id===master);if(!order||order.status==='COMPLETED')continue;
  if(order.status==='OPEN'&&!acceptD02(s,master))throw Error('D02 委托重建接单失败：'+master);
  if(master===D02_S&&!revealD02Key(s))throw Error('D02 委托重建密钥失败');
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
