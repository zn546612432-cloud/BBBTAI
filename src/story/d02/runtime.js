// D02 / 2025-05-20. All actions are fictional game state; never run external network commands.
export const D02_S='d02-chip-peace';
export const D02_A='d02-commission-a';
export const D02_MAIL='d02-talia-key-mail';
export const D02_TALIA='mc-talia-d02';
export const D02_NOTE='d02-new-workstation-note';
export const D02_REMINDER='d02-pc-build-reminder';
export const D02_REWARDS={ [D02_S]:12000,[D02_A]:4500 };
export const D02_STAGES={
 [D02_S]:['route','veil','extract'],
 [D02_A]:['cipher','strike','strike','strike']
};
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
 if(!s.content.notes.some(n=>n.id===D02_NOTE))s.content.notes.unshift({
  id:D02_NOTE,title:'电脑该换了',text:'服务器又不够用了。跑个任务风扇跟要起飞似的。\n想换台新电脑。CPU、显卡、内存、硬盘一块儿配好，别再东拼西凑。\n\n【添加提醒事项：攒一台新工作站】',
  createdDay:2,updatedDay:2,updatedClock:'09:05',storyD02:true
 });
 // SMS, brother and Xin conversations are real dated chat records, not global system popups.
 const sms=s.content.conversations.messages??(s.content.conversations.messages=[]);
 let shop=sms.find(c=>c.id==='sms-aodong-2025');if(!shop){shop={id:'sms-aodong-2025',name:'澳东商城',unread:0,messages:[]};sms.push(shop);}
 if(!shop.messages.some(m=>m.id==='d02-aodong-sale')){
  shop.messages.push({...msg('d02-aodong-sale','aodong','五月澳东打折月！澳东商城电子产品全场八折。浏览器搜索「澳东商城」进入选购。','09:00'),schedule:{mode:'game-time',day:2,clock:'09:00'}});
 }
 const wc=s.content.conversations.wechat??(s.content.conversations.wechat=[]);
 const write=(id,name,lines)=>{
  let c=wc.find(x=>x.id===id||x.name===name);
  if(!c){c={id,name,avatar:name.slice(0,1),unread:0,messages:[]};wc.push(c);}
  for(const [n,from,text,time] of lines)if(!c.messages.some(m=>m.id===n))c.messages.push({...msg(n,from,text,time),schedule:{mode:'game-time',day:2,clock:time}});
 };
 write('wang','熙旺',[
  ['d02-wang-01','me','哥，我那台电脑真的该退休了。','12:16'],
  ['d02-wang-02','熙旺','上回不是才换过零件？','12:19'],
  ['d02-wang-03','me','那叫抢救。它今天一开三个程序就开始喘。','12:20'],
  ['d02-wang-04','熙旺','买新的就买新的，别又一连几天不睡觉装机器。','12:23'],
  ['d02-wang-05','me','知道啦。你怎么比系统监控还勤快。','12:24'],
  ['d02-wang-06','熙旺','系统监控会给你留饭吗？晚上回来吃。','12:27']
 ]);
 write('xin','小辛',[
  ['d02-xin-01','小辛','蒙蒙哥，澳东商城打八折诶！！！你看到没','16:08'],
  ['d02-xin-02','me','你怎么比促销短信还准时。','16:10'],
  ['d02-xin-03','小辛','你买显卡的话顺便帮我看看游戏能不能跑满帧？','16:11'],
  ['d02-xin-04','me','不如我先给你买个闹钟，让你别熬夜打游戏。','16:14'],
  ['d02-xin-05','小辛','不是吧蒙蒙哥，昨天是谁拉我打到两点的啊？？？','16:15'],
  ['d02-xin-06','me','我失忆了。','16:16']
 ]);
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
 s.bankData.transactions.unshift({id:'d02-payment-'+id+suffix,label:'MIRAGE '+id+(suffix?' BONUS':''),amount,day:s.day,time:s.clock,date:TODAY});
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
  order.status='COMPLETED';s.story55.d02.completed[master]=true;s.story55.d02.submitted[master]=true;
  creditD02(s,master,D02_REWARDS[master],'-rebuild');
 }
 s.story55.d02.keyOpened=true;
}
