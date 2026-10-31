import {isStory55,story55Config,completed,nodeById,nodeStatus,completeNode,date55,final55} from './state.js';
import {defaultStory55Config} from './config.js';
const actors={me:'熙蒙',wang:'熙旺',tai:'陈熙泰',ouroboros:'衔尾蛇博士',father:'傅隆生',xin:'小辛',zai:'仔仔',hacker:'熟悉的黑客',mercenary:'雇佣兵'};
export const actor55=id=>actors[id]||id;
export function activateStory55(s){
 const c=defaultStory55Config();
 s.story55={version:1,config:c,completed:{},projects:{},reports:{},scenes:{},hardware:1,liabilities:0,livingDebt:0,expenseDays:[],questions:0,ended:false};
 Object.assign(s,{day:1,clock:'08:00',calendar:{anchorDay:1,anchorDate:c.startDate},deathPhase:null,powerMode:'idle',poweredOff:false,emergencyCharge:false,batteryPercent:100,dayChargeRemainingMs:0,worldMinuteFraction:0,powerActiveMs:0,chargeFraction:0,sleepWakeAt:null,alarmRinging:null,events:[],notifications:[],invitations:[],matches:[],storyChargeGates:[]});
 s.nav={current:{appId:'home',route:'/',params:{}},stack:[]};
 for(const [channel,list] of Object.entries(s.content.conversations))for(const chat of list){chat.messages=channel==='wechat'?chat.messages.filter(m=>m.sentDate&&m.sentDate<c.startDate&&!m.demo):[];chat.unread=0;}
 s.content.orders=[];s.content.mail=[];s.content.reminders=[];s.content.calendarEvents=[];
 s.content.photos=[];s.content.notes=[];s.content.notesSeedVersion=1;
 s.content.alarms=[];if(s.content.phone)s.content.phone.calls=[];s.content.moments={posts:[],editedPosts:{},deletedIds:[],profiles:{},likes:{},comments:{}}; // Previous 90-day posts are not part of the 55-day campaign.
 s.content.mirage={...s.content.mirage,digitalBalance:0,digitalTransactions:[],transactions:[]};delete s.content.mirage.ouroborosScript;
 s.storyPresets={rules:[],flags:[],usedIds:[],usedGroups:[],deletedRuleIds:[],firedProactiveDays:[]};
 s.ghost={orders:{},history:[],balance:0,config:{}};s.bankData={...s.bankData,balance:c.economics.openingBalance,transactions:[]};
 tickStory55(s);return s;
}
export function scene55(s,id){return s.story55?.scenes?.[id]||{index:0,accepted:false};}
export function sceneLines(s,id){return story55Config(s).scenes[id]||[];}
export function finishScene55(s,id){
 const n=nodeById(s,id),r=scene55(s,id);
 if(!n||n.kind!=='scene'||r.index<sceneLines(s,id).length)throw Error('请先完成本场对话');
 if(id==='ending'&&!s.story55.finalAudioHeard)throw Error('最后的语音尚未同步；请先配置并播放终局音频');
 if(!completeNode(s,id))return false;
 s.story55.activeScene=null;
 if(n.credit){s.bankData.balance+=n.credit;if(n.liability)s.story55.liabilities+=n.credit;s.bankData.transactions.unshift({id:'s55-'+id,label:n.liability?'ANONYMOUS LOAN':'STORY CREDIT',amount:n.credit,time:s.clock,date:date55(s.day)});}
 if(id==='ending'){s.story55.ended=true;s.batteryPercent=1;s.deathPhase='off';s.unlocked=false;}
 tickStory55(s);return true;
}
export function advanceScene55(s,id,{acceptCall=false}={}){
 const n=nodeById(s,id);if(n?.kind!=='scene'||nodeStatus(s,id).state!=='ready')throw Error(nodeStatus(s,id).reason);
 s.story55.activeScene=id;
 const lines=sceneLines(s,id);const r=s.story55.scenes[id]??={index:0,accepted:false};
 const line=lines[r.index];if(!line)return finishScene55(s,id);
 if(line[0]==='call'&&!acceptCall)throw Error('请接听未知来电');
 if(line[0]==='watch'&&!s.story55.finalAudioHeard)throw Error('请先播放最后的语音');
 if(line[0]==='call')r.accepted=true;
 if(!['system','call','watch'].includes(line[0])){
  const channel=id==='recognition'?'noapp':['intro','return','move','show','target','confide','failure','ready'].includes(id)?'wechat':completed(s,'recognition')?'noapp':'mirage';
  const cid=channel==='wechat'?'group':channel==='noapp'?'tai':'s55-ouroboros';
  const list=s.content.conversations[channel]??=[];
  let c=list.find(c=>c.id===cid);if(!c){c={id:cid,name:channel==='mirage'?'Dr Ouroboros':channel==='noapp'?'陈熙泰':'狼崽团',members:Object.keys(actors),messages:[],unread:0};list.push(c);}
  c.messages.push({id:`s55-${id}-${r.index}`,from:line[0]==='me'?'me':channel==='wechat'?line[0]:cid,text:line[1],day:s.day,time:s.clock,sentDate:date55(s.day),actual:true,story55:true});
 }
 r.index++;
 if(r.index===lines.length)finishScene55(s,id);
 return r;
}
export function payNode55(s,id){
 const n=nodeById(s,id);if(n?.kind!=='payment'||nodeStatus(s,id).state!=='ready')throw Error(nodeStatus(s,id).reason);
 if(s.bankData.balance<n.cost)throw Error('余额不足，定金尚未支付');
 s.bankData.balance-=n.cost;s.bankData.transactions.unshift({id:'s55-payment-'+id,label:n.title,amount:-n.cost,time:s.clock,date:date55(s.day)});completeNode(s,id);tickStory55(s);
}
const mailDefs=s=>story55Config(s).mails.map(m=>({...m,body:m.body.replaceAll('{{projectKey}}',story55Config(s).projects.find(p=>p.id===m.project)?.key||'')}));
export function markMail55(s,id){const m=s.content.mail.find(m=>m.id===id&&m.story55);if(!m)throw Error('邮件不存在');if(nodeStatus(s,m.storyNode).state==='ready')completeNode(s,m.storyNode);m.read=true;tickStory55(s);}
export function readEvidence55(s,kind,id){
 const table={file:'documents',page:'pages',map:'locations'}[kind],item=story55Config(s)[table]?.find(x=>x.id===id);
 if(!item)throw Error('资料不存在');
 const n=nodeById(s,item.node);if(n.kind!==kind)throw Error('此地点不触发任务');
 if(nodeStatus(s,n.id).state!=='ready'&&!completed(s,n.id))throw Error(nodeStatus(s,n.id).reason);
 if(!completed(s,n.id))completeNode(s,n.id);tickStory55(s);return item;
}
export const questions55=['你为什么和我长得一模一样？','那是我的照片吗？','还是你用AI做的？','这样玩弄我有什么好处？','你到底是谁？'];
export function sendQuestion55(s){
 if(nodeStatus(s,'questions').state!=='ready')throw Error(nodeStatus(s,'questions').reason);
 const i=s.story55.questions,chat=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
 if(!chat)throw Error('MIRAGE联络记录尚未建立');
 chat.messages.push({id:'s55-question-'+i,from:'me',text:questions55[i],day:s.day,time:s.clock,sentDate:date55(s.day),actual:true,story55:true});
 s.story55.questions=Math.min(5,i+1);
 if(s.story55.questions===5){
  const reply='你已经找到了我留下的线索，最后一个文件夹里还有一份孤儿院档案；破译它，你就会知道为什么我们的面孔如此相似。';
  chat.messages.push({id:'s55-questions-answer',from:chat.id,text:reply,day:s.day,time:s.clock,sentDate:date55(s.day),actual:true,story55:true});
  completeNode(s,'questions');
 }
 tickStory55(s);
}
export function nodeLink55(s,id){if(id==='recognition')return {appId:'noapp',route:'/story55/recognition',params:{node:id}};const n=nodeById(s,id);if(!n)return {appId:'reminders',route:'/',params:{}};
 const map={project:{appId:'ghost',route:'/deployment',params:{project:n.project}},mail:{appId:'kira',route:'/mail/'+n.mail,params:{}},file:{appId:'files',route:'/story55',params:{document:n.document}},page:{appId:'browser',route:'/story55',params:{page:n.page}},map:{appId:'maps',route:'/place',params:{id:n.location}},questions:{appId:'mirage',route:'/story55/questions',params:{}},payment:{appId:'mirage',route:'/story55/payment',params:{node:id}},scene:{appId:'calendar',route:'/story55/scene',params:{node:id}}};return map[n.kind];}
export function tickStory55(s){
 if(!isStory55(s)||final55(s))return;
 const c=story55Config(s);if(completed(s,'wallet')&&!s.content.conversations.mirage.some(x=>x.id==='s55-ouroboros'))s.content.conversations.mirage.push({id:'s55-ouroboros',name:'Dr Ouroboros',avatar:'D',online:false,messages:[],unread:0});s.calendar={anchorDay:1,anchorDate:c.startDate};s.day=Math.min(55,Math.max(1,s.day));
 for(const m of mailDefs(s)){const existing=s.content.mail.find(x=>x.id===m.id);if(existing)Object.assign(existing,{subject:m.subject,body:m.body});if(['ready','done'].includes(nodeStatus(s,m.node).state)&&!s.content.mail.some(x=>x.id===m.id)){
  s.content.mail.unshift({...m,from:'Dr Ouroboros',story55:true,storyNode:m.node,read:false,date:date55(s.day)});
  s.notifications.unshift({id:'s55-mail-'+m.id,title:'KIRA',body:m.subject,link:{appId:'kira',route:'/mail/'+m.id,params:{}}});
 }}
 for(const n of c.nodes){
  if(s.day<n.day)continue;
  if(!s.content.calendarEvents.some(e=>e.id==='s55-event-'+n.id)&&n.kind==='scene')s.content.calendarEvents.push({id:'s55-event-'+n.id,title:n.title,startDate:date55(n.day),endDate:date55(n.day),startTime:'20:00',endTime:'21:00',notes:n.title,color:'mint',storyNode:n.id});
 }
 // Daily cost uses plot dates, not wall-clock time. Insufficient cash becomes a visible liability.
 for(let day=14;day<=s.day;day++)if(!s.story55.expenseDays.includes(day)){
  const cost=c.economics.dailyExpense,paid=Math.min(Math.max(0,s.bankData.balance),cost);s.bankData.balance-=paid;s.story55.livingDebt+=cost-paid;s.story55.expenseDays.push(day);
  s.bankData.transactions.unshift({id:'s55-expense-'+day,label:'DAILY EXPENSE',amount:-paid,unpaid:cost-paid,time:'08:00',date:date55(day)});
 }
}
export function story55Presence(s,now=Date.now()){
 if(final55(s))return {status:'offline',contactable:false,reason:'连接中断'};
 if(s.story55.activeScene)return {status:'busy',contactable:false,reason:'正在通话或事件中'};
 if(!completed(s,'recognition'))return {status:'offline',contactable:false,reason:'尚未相认'};
 if(s.day===42&&!completed(s,'paris'))return {status:'offline',contactable:false,reason:'暂时无法联系'};
 return {status:'online',contactable:true,reason:'在线'};
}

export function anonymousPresence55(s,now=Date.now()){
 if(final55(s)||s.story55.activeScene)return {online:false,reason:'当前无法联系'};
 if(completed(s,'recognition'))return {online:story55Presence(s,now).contactable,reason:story55Presence(s,now).reason};
 if(s.day>=15&&s.day<=24){const start=s.story55.anonymousWindows?.[s.day];const remaining=start?Math.max(0,1500000-(now-start)):1500000;return {online:!!start&&remaining>0,remaining,reason:remaining>0?'每日25分钟联络窗口':'本日已离线'};}
 if(s.day>=25&&s.day<=29)return {online:true,reason:'在线'};
 return {online:false,reason:s.day>=30?'正在调查，等待剧情联络':'尚未开放自由联络'};
}
