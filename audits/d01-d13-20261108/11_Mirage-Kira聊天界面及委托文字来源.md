# 11_Mirage-Kira聊天界面及委托文字来源.md

D01-D13除微信外，还有Mirage聊天、衔尾蛇私聊、Kira委托邮件与钱包互动。此快照补齐真实App动作和内嵌台词，包括登录、消息、点击与邮件内容。**仅为诊断保留源码，不执行任何任务。**

源 main `9d8c565663570c301b0bd44e601f9108c4b92da3`。

## 1. `src/apps/mirage/ouroboros-flow.js`

原文件：[`src/apps/mirage/ouroboros-flow.js`](https://github.com/zn546612432-cloud/BBBTAI/blob/9d8c565663570c301b0bd44e601f9108c4b92da3/src/apps/mirage/ouroboros-flow.js)

````javascript
// D05 authored dialogue: ordered, explicit player sends; no AI interpolation.
import {WALLET_CHALLENGE_ID,ouroborosContact} from './contacts-seed.js';
const CONTACT='mc-ourob-d05';
const line=(id,from,text,s)=>({id,from,text,kind:'text',day:s.day,time:s.clock,actual:true,storyImported:true,ouroborosScript:true});
const contact=s=>s.content.conversations.mirage?.find(c=>c.id===CONTACT);
export function ouroborosAvailable(s){return s.day>5||(s.day===5&&s.clock>='20:00');}
export function ouroborosStage(s){return s.content.mirage?.ouroborosScript?.stage||'unaccepted';}
function notify(s,text){
 const c=contact(s);if(!c)return;
 c.unread=Math.max(0,Number(c.unread)||0)+1;
 c.lastMessageAt=Date.now();
 s.notifications.unshift({id:'ourob-story-'+(s.content.mirage.ouroborosScript.stage),title:c.name,body:text,conversationId:CONTACT,link:{appId:'mirage',route:'/chat/'+CONTACT,params:{}}});
}
export function acceptOuroborosChallenge(s){
 if(!ouroborosAvailable(s))return false;
 const order=s.content.orders.find(x=>x.id===WALLET_CHALLENGE_ID);
 if(!order||order.status!=='OPEN')return false;
 order.status='ACCEPTED';
 const conversations=s.content.conversations.mirage;
 if(!contact(s))conversations.push(structuredClone(ouroborosContact));
 const c=contact(s);
 c.unread=0;
 c.messages=c.messages.filter(m=>!m.ouroborosScript&&!/^ou-(?:0\d|d05-after-)/.test(m.id));
 s.content.mirage.ouroborosScript={stage:'accepted'};
 const message=line('ou-order-created',CONTACT,'ORDER CREATED · CONTRACT #D05 · 10 BTC WALLET CHALLENGE',s);
 c.messages.push(message);notify(s,message.text);
 return true;
}
export function markOuroborosWon(s){
 const o=s.content.orders.find(x=>x.id===WALLET_CHALLENGE_ID);
 if(!o||o.status!=='ACCEPTED'||!ouroborosAvailable(s))return false;
 o.status='COMPLETED';
 if(!contact(s))s.content.conversations.mirage.push(structuredClone(ouroborosContact));
 const story=s.content.mirage.ouroborosScript??={stage:'accepted'};
 // A player opening the chat sees their own next sentence being typed; there
 // is no premature congratulation, no fake auto-send by the player.
 if(story.stage==='accepted')story.stage='won';
 s.content.mirage.ouroborosScript=story;
 s.content.mirage.transactions??=[];
 if(!s.content.mirage.transactions.some(t=>t.id==='ou-btc10'))s.content.mirage.transactions.unshift({id:'ou-btc10',type:'REWARD',asset:'BTC',amount:10,time:s.clock,day:s.day,description:'OUROBOROS CHALLENGE'});
 if(!s.events.some(e=>e.type==='mirage_wallet_challenge_completed'))s.events.push({type:'mirage_wallet_challenge_completed',day:s.day,clock:s.clock,asset:'BTC',quantity:10});
 return true;
}
export function ouroborosDraft(s,id){if(id!==CONTACT)return '';
 const stage=ouroborosStage(s),c=contact(s);
 if(stage==='asked'&&!c?.messages.some(m=>m.id==='ou-group'&&m.delivery))return '';
 return stage==='won'?'我拿到了。':stage==='asked'?'我单干。':stage==='impressed'?'因为我是天才。':'';
}
const REPLIES={
 won:[['ou-congrats','恭喜你。'],['ou-group','你属于哪个组织？']],
 asked:[['ou-impressed','真有趣。你知道吗，你打败了全世界百分之八十的黑客。你居然说自己是单干？']],
 impressed:[['ou-cookie','真有趣。拿好你的奖励饼干，黑客天才。希望我们以后还有合作的机会。']]
};
const NEXT={won:'asked',asked:'impressed',impressed:'finished'};
export function sendOuroborosPreset(s,id,text){
 const expected=ouroborosDraft(s,id),stage=ouroborosStage(s);
 if(!expected||text.trim()!==expected.trim())return false;
 const c=contact(s);if(!c)return false;
 c.messages.push(line('ou-player-'+stage,'me',expected,s));
 const next=NEXT[stage];s.content.mirage.ouroborosScript.stage=next;
 for(const [key,reply] of REPLIES[stage])if(!c.messages.some(x=>x.id===key)){
  const m=line(key,CONTACT,reply,s);
  if(key==='ou-group')m.schedule={mode:'chat-delay',seconds:2};
  c.messages.push(m);
 }
 c.lastMessageAt=Date.now();
 return true;
}
export function isOuroborosScriptActive(s,id){return id===CONTACT&&['won','asked','impressed'].includes(ouroborosStage(s));}

````

---

## 2. `src/apps/mirage/contacts-seed.js`

原文件：[`src/apps/mirage/contacts-seed.js`](https://github.com/zn546612432-cloud/BBBTAI/blob/9d8c565663570c301b0bd44e601f9108c4b92da3/src/apps/mirage/contacts-seed.js)

````javascript
import {isStory55} from '../../services/story55/state.js';
import {markOuroborosWon} from './ouroboros-flow.js';
// Additive, player-editable MIRAGE history. No real malware instructions.
export const WALLET_CHALLENGE_ID='mirage-ouroboros-10btc-d05';
const msg=(id,from,text,day,time)=>({id,from,text,day,time,kind:'text',storyImported:true});
export const starterContacts=[
 {id:'mc-arms-partner',name:'BASILISK SUPPLY',avatar:'BS',online:false,storySeed:true,unread:0,
  messages:[
   msg('bs-01','mc-arms-partner','上一批装备的订单我已经核对过了。附件上的交接数量有没有变？',1,'09:42'),
   msg('bs-02','me','没有。你们负责运输，我只要货物如约到场。',1,'09:45'),
   msg('bs-03','mc-arms-partner','知道。你总是把责任划得很清楚。',1,'09:48'),
   msg('bs-04','me','所以合作才长久。钱的事我会按约定结。',1,'09:50')
  ]},
 {id:'mc-peer-crypt',name:'Pale Vector',avatar:'PV',online:true,storySeed:true,unread:0,
  messages:[
   msg('pv-01','mc-peer-crypt','看到昨天那个开源模型的安全评审了吗？他们又把性能基准混到一起了。',1,'11:08'),
   msg('pv-02','me','看了。曲线漂亮得有点过分，测试条件没有写清楚。',1,'11:12'),
   msg('pv-03','mc-peer-crypt','有人把旧版本直接拿来测新任务。',1,'11:14'),
   msg('pv-04','me','那就是营销材料，不是实验报告。',1,'11:16')
  ]},
 {id:'mc-support-echo',name:'ECHO-41',avatar:'E4',online:false,storySeed:true,unread:1,
  messages:[
   msg('ec-01','mc-support-echo','上个月买的那枚芯片有问题。我的测试设备识别不到授权证书。',1,'13:20'),
   msg('ec-02','me','发我订单回执和设备型号，不要发未经处理的个人数据。',1,'13:28'),
   msg('ec-03','mc-support-echo','发到加密邮箱了。能退吗？',1,'14:02'),
   msg('ec-04','me','先确认是不是批次问题。如果是硬件故障按约定更换，别在公开频道讨论细节。',1,'14:09'),
   msg('ec-05','mc-support-echo','明白，我等你的检测结果。',1,'14:12')
  ]},
 {id:'mc-done-sable',name:'SABLE ACCOUNT',avatar:'SA',online:false,storySeed:true,unread:1,
  messages:[
   msg('sa-01','mc-done-sable','交付结果已经验收。',1,'16:37'),
   msg('sa-02','mc-done-sable','支付回执已出。款项转入你留的账户，请查收。',1,'16:38'),
   msg('sa-03','me','收到了。订单关闭。',1,'16:41')
  ]}
];
export const ouroborosContact={
 id:'mc-ourob-d05',name:'Dr Ouroboros',avatar:'D',online:true,storySeed:true,unread:1,
 messages:[]
};
export const walletChallenge={
 id:WALLET_CHALLENGE_ID,title:'OUROBOROS / 10 BTC WALLET CHALLENGE',
 owner:'Dr Ouroboros',reward:'10 BTC',category:'CYBER',status:'OPEN',
 description:'10 BTC. One wallet. An open challenge to anyone who thinks they are clever enough to claim it. — Dr Ouroboros',
 storyDay:5,storySeed:true
};
export function ensureMirageStory(s){
 if(isStory55(s))return;
 s.content.conversations??={};
 const list=s.content.conversations.mirage??=[];
 for(const c of starterContacts)if(!list.some(x=>x.id===c.id))list.push(structuredClone(c));
 if(s.day>5||(s.day===5&&s.clock>='20:00')){
  if(!s.content.orders.some(o=>o.id===WALLET_CHALLENGE_ID))s.content.orders.push({...walletChallenge});
  // The anonymous founder does not message Ximeng until the challenge is WON.
  if(s.events?.some(e=>e.type==='mirage_wallet_challenge_completed')&&!list.some(c=>c.id===ouroborosContact.id))list.push(structuredClone(ouroborosContact));
 }
}
export function completeWalletChallenge(s){return markOuroborosWon(s);}

````

---

## 3. `src/apps/mirage/mission.js`

原文件：[`src/apps/mirage/mission.js`](https://github.com/zn546612432-cloud/BBBTAI/blob/9d8c565663570c301b0bd44e601f9108c4b92da3/src/apps/mirage/mission.js)

````javascript
// Fictional, local-only mission bridge. The other apps own their eventual gameplay.
export const HACKER_BOUNTY_ID='mirage-recruit-hacker';
export const HACKER_MAIL_ID='mirage-new-order';
export const HACKER_TARGET='xxx';
export const hackerBounty={id:HACKER_BOUNTY_ID,title:'招募黑客',owner:'xxx',reward:'$ 3,000,000',category:'CYBER',status:'OPEN',description:'窃取目标信息。'};
export const phishingThemes=[
 {id:'board-meeting',label:'董事会会议资料',subject:'董事会会议资料查阅',correct:true},
 {id:'entertainment',label:'娱乐新闻推送',subject:'今日娱乐快讯'},
 {id:'invoice',label:'私人账单提醒',subject:'账单提醒'}
];
export const hackerMail=()=>({id:HACKER_MAIL_ID,orderId:HACKER_BOUNTY_ID,from:'xxx · MIRAGE',subject:'【mirage】新订单',body:'xxx：hi，大名鼎鼎的 NYARLATHOTEP，我有一个三百万的大单子，你肯定感兴趣。非常简单。大人物们在打商战，其中一名主席候选人想知道自己的对手 xxx 是否有一些黑料。我相信你很擅长。\n\n任务具体步骤：\n1. 在浏览器搜索 xxx。\n2. 编辑一条与目标有关的钓鱼邮件，选择主题并亲自发送。\n3. 在 GHOST 工具箱中完成防火墙密钥重组。',read:false,missionStep:1});
export function acceptHackerBounty(store){store.update(s=>{const order=s.content.orders.find(o=>o.id===HACKER_BOUNTY_ID);if(!order||order.status==='ACCEPTED'||order.status==='COMPLETED')return;order.status='ACCEPTED';if(!s.content.mail.some(m=>m.id===HACKER_MAIL_ID))s.content.mail.unshift(hackerMail());});}
export function advanceHackerMission(store,step){store.update(s=>{const mail=s.content.mail.find(m=>m.id===HACKER_MAIL_ID);if(mail)mail.missionStep=Math.max(mail.missionStep||1,step);});}

````

---

## 4. `src/apps/mirage/linked-missions.js`

原文件：[`src/apps/mirage/linked-missions.js`](https://github.com/zn546612432-cloud/BBBTAI/blob/9d8c565663570c301b0bd44e601f9108c4b92da3/src/apps/mirage/linked-missions.js)

````javascript
// General-purpose fictional contract links. The legacy D05 and hacker story
// remain untouched; developer-authored contracts get independent progress.
const PREFIX='linked-contract-mail-';
export const linkedMailId=id=>PREFIX+id;
export const linkedReceiptId=id=>'linked-payment-receipt-'+id;
export const linkedDeliveryId=id=>'linked-delivery-mail-'+id;
export const linkedArtifactId=id=>'linked-result-'+id+'.enc';
export const linkedGameMinute=s=>(Math.max(1,s.day)-1)*1440+Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3,5));
export const linkedMissionVisible=(s,id)=>{const m=linkedMission(s,id);if(!m||s.story55?.version!==1)return true;return (!m.publishDay||s.day>=m.publishDay)&&(!m.expiryDay||s.day<=m.expiryDay||s.content.orders.some(o=>o.id===id&&o.status!=='OPEN'));};
export function recordLinkedMissionPayment(s,id,amount,at){
 const mission=linkedMission(s,id);
 if(!mission||!Number.isFinite(amount)||amount<0)return false;
 const receiptId=linkedReceiptId(id);
 if(s.content.mail.some(m=>m.id===receiptId))return false;
 const order=s.content.orders.find(o=>o.id===id);
 s.content.mail.unshift({
  id:receiptId,orderId:id,from:'MIRAGE · SETTLEMENT',
  subject:'PAYMENT CONFIRMED · '+mission.title,
  body:'ORDER: '+id+'\nSTATUS: SETTLED\nCREDITS: +'+amount.toLocaleString('en-US')+'\nTRANSACTION: '+at,
  read:false,linkedReceipt:true,day:s.day,time:s.clock
 });
 s.notifications.unshift({id:'linked-payment-notice-'+id,title:'KIRA',body:'Payment received · '+(order?.title||mission.title),day:s.day,clock:s.clock,link:{appId:'kira',route:'/mail/'+receiptId,params:{}}});
 return true;
}
export const linkedMission=(s,id)=>s.content?.mirage?.linkedMissions?.[id]||null;
export const linkedMissions=s=>Object.values(s.content?.mirage?.linkedMissions||{});
export function saveLinkedMission(s,entry){
 const id=String(entry.id||'').trim();
 if(!/^[a-z0-9][a-z0-9-]{2,62}$/i.test(id))throw Error('任务 ID 只能包含 3–63 位字母、数字或连字符');
 if(['mirage-recruit-hacker','mirage-ouroboros-10btc-d05'].includes(id))throw Error('固定剧情订单不能被通用任务覆盖');
 if(!s.content?.orders||!s.content.mirage)throw Error('MIRAGE 尚未初始化');
 const existing=s.content.mirage.linkedMissions??={};
 const before=existing[id];
 const order=s.content.orders.find(o=>o.id===id);
 if(order&&!before)throw Error('同 ID 的非任务链悬赏已存在，请换一个 ID');
 const title=String(entry.title||'').trim().slice(0,120);
 if(!title)throw Error('必须输入悬赏名称');
 const type=['cipher','route','extract','veil','strike'].includes(entry.type)?entry.type:'cipher';
 const reward=Number(entry.reward);
 if(!Number.isSafeInteger(reward)||reward<0||reward>1e9)throw Error('奖励请输入非负整数（不超过十亿）');
 const seconds=entry.seconds==null||entry.seconds===''?null:Number(entry.seconds);
 if(seconds!==null&&(!Number.isInteger(seconds)||seconds<10||seconds>600))throw Error('时限请输入 10–600 秒');
 const publishDay=entry.publishDay==null||entry.publishDay===''?1:Number(entry.publishDay);
 const expiryDay=entry.expiryDay==null||entry.expiryDay===''?55:Number(entry.expiryDay);
 const deadlineDay=entry.deadlineDay==null||entry.deadlineDay===''?null:Number(entry.deadlineDay);
 const deadlineClock=entry.deadlineClock||'23:59';
 const reviewMinutes=entry.reviewMinutes==null||entry.reviewMinutes===''?30:Number(entry.reviewMinutes);
 if(!Number.isInteger(publishDay)||publishDay<1||publishDay>55||!Number.isInteger(expiryDay)||expiryDay<publishDay||expiryDay>55)throw Error('任务发布日期或下架日期无效');
 if(deadlineDay!==null&&(!Number.isInteger(deadlineDay)||deadlineDay<publishDay||deadlineDay>55))throw Error('交付期限不能早于发布日');
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(deadlineClock)))throw Error('交付截止时间无效');
 if(!Number.isInteger(reviewMinutes)||reviewMinutes<1||reviewMinutes>10080)throw Error('审核时间须为1至10080游戏分钟');
 const linked={id,title,subject:String(entry.subject||'【MIRAGE】新订单').slice(0,140),
  body:String(entry.body||'请确认并完成任务。').slice(0,6000),
  browserQuery:String(entry.browserQuery||title).slice(0,100),
  type,reward,seconds,publishDay,expiryDay,deadlineDay,deadlineClock,reviewMinutes,stage:before?.stage||0};
 existing[id]=linked;
 const data={id,title,description:String(entry.description||'').slice(0,6000),
  reward:String(entry.rewardLabel||reward+' CREDITS').slice(0,100),owner:String(entry.owner||'ANONYMOUS').slice(0,100),category:'CYBER',status:order?.status||'OPEN'};
 if(order)Object.assign(order,data);else s.content.orders.push(data);
 s.ghost??={orders:{},history:[],balance:0,config:{}};
 s.ghost.missionTypes??={};s.ghost.missionTypes[id]=type;
 s.ghost.orderConfigs??={};s.ghost.orderConfigs[id]={...s.ghost.orderConfigs[id],seconds,reward};
 return linked;
}
export function acceptLinkedMission(s,id){
 const mission=linkedMission(s,id);
 if(!mission)return false;
 const order=s.content.orders.find(x=>x.id===id);
 if(!order||order.status!=='OPEN'||!linkedMissionVisible(s,id))return false;
 const today=linkedGameMinute(s);
 if(mission.deadlineDay&&today>=(mission.deadlineDay-1)*1440+Number(mission.deadlineClock.slice(0,2))*60+Number(mission.deadlineClock.slice(3)))return false;
 order.status='ACCEPTED';
 mission.stage=Math.max(1,mission.stage);
 const mailId=linkedMailId(id);
 if(!s.content.mail.some(m=>m.id===mailId)){
  s.content.mail.unshift({id:mailId,orderId:id,from:order.owner+' · MIRAGE',
   subject:mission.subject,body:mission.body,read:false,linkedContract:true,missionStep:1,day:s.day,time:s.clock});
  s.notifications.unshift({id:'linked-mail-notice-'+id,title:'KIRA',body:mission.subject,day:s.day,clock:s.clock,link:{appId:'kira',route:'/mail/'+mailId,params:{}}});
 }
 return true;
}
export function advanceLinkedMission(s,id,step){
 const mission=linkedMission(s,id);
 if(!mission)return false;
 const order=s.content.orders.find(o=>o.id===id);
 if(!order||order.status==='OPEN')return false;
 const next=Math.min(6,Math.max(0,Number(step)||0));
 // A cross-App action cannot skip the browser, KIRA confirmation, GHOST
 // artifact or manual-delivery prerequisite, even through a stale deep link.
 if(next!==mission.stage+1)return false;
 if(next===5&&s.ghost?.orders?.[id]?.status!=='success')return false;
 if(next===6&&(s.ghost?.orders?.[id]?.status!=='paid'||!mission.submitted))return false;
 mission.stage=next;return true;
 return false;
}
export function resetLinkedMission(s,id){
 const mission=linkedMission(s,id);if(!mission)return false;
 mission.stage=0;
 const order=s.content.orders.find(o=>o.id===id);if(order)order.status='OPEN';
 const previous=s.ghost?.orders?.[id];
 if(previous?.status==='paid'){
  // Explicit developer reset reverses the test payout before a rerun.
  // Otherwise the same mission could be collected repeatedly.
  const ledger=s.content.mirage?.digitalTransactions||[];
  const credit=ledger.filter(x=>x.orderId===id).reduce((sum,x)=>sum+(Number(x.amount)||0),0);
  if(credit>0){
   if(Number.isFinite(s.ghost.balance))s.ghost.balance-=credit;
   s.content.mirage.digitalBalance=(Number(s.content.mirage.digitalBalance)||0)-credit;
   s.events.push({type:'linked_mission_payment_reversed',orderId:id,amount:credit,day:s.day,clock:s.clock});
  }
  s.content.mirage.digitalTransactions=ledger.filter(x=>x.orderId!==id);
 }
 const mailId=linkedMailId(id);
 const receiptId=linkedReceiptId(id),deliveryId=linkedDeliveryId(id);
 s.content.mail=s.content.mail.filter(m=>m.id!==mailId&&m.id!==receiptId&&m.id!==deliveryId);
 if(s.content.missionFiles)s.content.missionFiles=s.content.missionFiles.filter(f=>f.orderId!==id);
 s.notifications=s.notifications.filter(n=>n.id!=='linked-mail-notice-'+id&&n.id!=='linked-payment-notice-'+id);
 mission.submitted=false;delete mission.deliveredAt;delete mission.failed;
 if(s.ghost?.orders)delete s.ghost.orders[id];
 if(s.ghost?.history)s.ghost.history=s.ghost.history.filter(h=>h.orderId!==id);
 return true;
}

````

---

## 5. `src/apps/mirage/data.js`

原文件：[`src/apps/mirage/data.js`](https://github.com/zn546612432-cloud/BBBTAI/blob/9d8c565663570c301b0bd44e601f9108c4b92da3/src/apps/mirage/data.js)

````javascript
import {isStory55,nodeStatus,story55Config,date55} from '../../services/story55/state.js';
import {D06_ORDER_ID} from '../../story/d06/commission.js';
import {ensureMirageStory,WALLET_CHALLENGE_ID,completeWalletChallenge} from './contacts-seed.js';
import {uid} from '../../services/id.js';
import {hackerBounty,HACKER_BOUNTY_ID} from './mission.js';
export const contactNames=['Isolde Mirage','Rookery 13','Nyx Voidwalker','Cipher-7','Vesper Nocturne','Dr. Ouroboros','Thalia Liminal','Orion Echo','Iris 404','Silas Rook','Lyra Null'];
export const MIRAGE_ACCOUNT='NYARLATHOTEP';
export const MIRAGE_PASSWORD='miragecipheraccess';
export const defaultProducts=[
 {id:'mc-p1',name:'ASSAULT RIFLE',category:'ARMS',price:12000,stock:4,description:'Unmarked inventory. Condition: excellent.',art:'rifle'},
 {id:'mc-p2',name:'TACTICAL SIDEARM',category:'ARMS',price:4200,stock:8,description:'Compact profile. Private stock.',art:'pistol'},
 {id:'mc-p3',name:'HUMAN KIDNEY',category:'ORGANS',price:85000,stock:2,description:'Restricted biological inventory. Lot K-041.',art:'kidney'},
 {id:'mc-p4',name:'HUMAN HEART',category:'ORGANS',price:160000,stock:1,description:'Restricted biological inventory. Lot H-017.',art:'heart'},
 {id:'mc-p5',name:'BALLISTIC VEST',category:'EQUIPMENT',price:2600,stock:6,description:'Lightweight protective equipment.',art:'vest'},
 {id:'mc-p6',name:'ENCRYPTED TERMINAL',category:'EQUIPMENT',price:6800,stock:3,description:'Portable private-network terminal.',art:'terminal'}
];
export function mirageData(s){return s.content.mirage||{account:MIRAGE_ACCOUNT,balance:300000,products:defaultProducts,cart:[],transactions:[],assets:[]};}
export {WALLET_CHALLENGE_ID,completeWalletChallenge};
// 55-day campaigns use the ORIGINAL MIRAGE design and complete native data
// rather than the old prototype-only story dashboard or D05 mission script.
export const STORY55_BOUNTY_ID=D06_ORDER_ID;
export const STORY55_WALLET_MAIL_ID='s55-wallet-d06-authorization';
// Player acceptance creates the missing KIRA authorization, once, without
// granting a reward or bypassing the real GHOST validation/minigame.
export function acceptStory55Wallet(s){
 if(!isStory55(s)||nodeStatus(s,'wallet').state!=='ready')return false;
 const order=s.content.orders?.find(o=>o.id===STORY55_BOUNTY_ID);
 if(!order||!['OPEN','ACCEPTED'].includes(order.status))return false;
 if(order.status==='ACCEPTED'&&s.content.mail?.some(m=>m.id===STORY55_WALLET_MAIL_ID))return false;
 order.status='ACCEPTED';
 const mail=s.content.mail??(s.content.mail=[]);
 if(!mail.some(m=>m.id===STORY55_WALLET_MAIL_ID))mail.unshift({
  id:STORY55_WALLET_MAIL_ID,from:'MIRAGE / Dr Ouroboros',
  subject:'[MIRAGE] WALLET CHALLENGE · GHOST 授权',
  body:'Nyarlathotep：\\n\\n钱包挑战已接受。\\n请打开 GHOST 中的 WALLET CHALLENGE，输入以下一次性项目授权码：\\n'+story55Config(s).projects.find(p=>p.id==='wallet').key+'\\n\\n完成数据提取程序后，系统会记录挑战结果。\\n\\n— MIRAGE',
  day:s.day,time:s.clock,date:date55(s.day),read:false,story55:true,storyWalletD06:true,project:'wallet'
 });
 const id='s55-wallet-d06-authorization-notice';
 if(!s.notifications.some(n=>n.id===id))s.notifications.unshift({
  id,title:'KIRA',body:'MIRAGE 钱包挑战授权邮件已送达',
  day:s.day,clock:s.clock,link:{appId:'kira',route:'/mail/'+STORY55_WALLET_MAIL_ID,params:{}}
 });
 return true;
}

export function ensureNativeMirage55(s){
 if(!isStory55(s))return;
 const old=s.content.mirage||{};
 const seed=old.nativeSeedVersion!==1;
 s.content.mirage={
  account:MIRAGE_ACCOUNT,balance:300000,products:structuredClone(defaultProducts),
  cart:[],transactions:[],assets:[],digitalBalance:0,digitalTransactions:[],wallets:[],
  ...old,
  products:Array.isArray(old.products)?old.products:structuredClone(defaultProducts),
  cart:Array.isArray(old.cart)?old.cart:[],
  assets:Array.isArray(old.assets)?old.assets:[],
  wallets:Array.isArray(old.wallets)?old.wallets:[],
  balance:Number.isFinite(old.balance)?old.balance:300000,
  nativeSeedVersion:1,version:3
 };
 // Contact identities are introduced by authored story triggers, never all at once.

 s.content.orders??=[];
 // D06 is seeded only by the shared daily commission runner.
 // Do not resurrect the prototype wallet order or its second KIRA email.
}

export function initializeMirage(store){
 if(isStory55(store.get()))return;
 const current=store.get();
 const missingStarter=['mc-arms-partner','mc-peer-crypt','mc-support-echo','mc-done-sable'].some(id=>!current.content.conversations.mirage.some(x=>x.id===id));
 const missingD05=(current.day>5||current.day===5&&current.clock>='20:00')&&!current.content.orders.some(x=>x.id===WALLET_CHALLENGE_ID);
 const needsUpgrade=current.content.mirage?.version!==3;
 if(!missingStarter&&!missingD05&&!needsUpgrade)return;
 store.update(s=>{
  const previousVersion=s.content.mirage?.version||0;
  s.content.mirage={...mirageData(s),version:3};
  if(previousVersion<2&&!s.content.orders.some(o=>o.id===HACKER_BOUNTY_ID))s.content.orders.push({...hackerBounty});
  ensureMirageStory(s);
 });
}
export const contacts=s=>{const done=s.events?.some(e=>e.type==='mirage_wallet_challenge_completed')||!!s.content.mirage?.ouroborosScript;const story55Unlocked=isStory55(s)&&!!s.story55?.completed?.wallet;const list=[...(s.content.conversations.mirage||[])].filter(c=>{if(isStory55(s)&&!story55Unlocked&&!c.authored&&(c.id==='s55-ouroboros'||c.id==='mc-ourob-d05'||/^Dr[. ]*Ouroboros$/i.test(c.name||'')))return false;return c.id!=='mc-ourob-d05'||done;});return list.sort((a,b)=>Math.max(Number(b.lastOpened)||0,Number(b.lastMessageAt)||0)-Math.max(Number(a.lastOpened)||0,Number(a.lastMessageAt)||0)||((b.authored===true?1:0)-(a.authored===true?1:0))||(a.name==='Isolde Mirage'?-1:b.name==='Isolde Mirage'?1:0));};
export const isCompletedBounty=order=>['COMPLETED','已完成'].includes(String(order.status||'').trim().toUpperCase());
export const bountyGroups=orders=>({open:orders.filter(o=>!isCompletedBounty(o)),completed:orders.filter(isCompletedBounty)});
export const money=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
export function cipher(text,id=''){let x=0x811c9dc5;for(const c of id+text)x=Math.imul(x^c.charCodeAt(0),16777619)>>>0;let out='';for(let i=0;i<Math.max(48,Math.min(128,text.length*4));i++){x=(Math.imul(x,1664525)+1013904223)>>>0;out+=(x>>>28).toString(16);if(i%8===7)out+=' ';}return '%%ENC BEGIN%% ['+out.trim()+'] %%ENC END%%';}
export function saveRecord(store,kind,id,record){const map={contacts:s=>s.content.conversations.mirage,bounties:s=>s.content.orders,products:s=>s.content.mirage.products};store.update(s=>{const list=map[kind](s),old=list.find(x=>x.id===id);if(old)Object.assign(old,record);else list.push({id:uid(),...(kind==='contacts'?{messages:[],online:false}:{}),...record});});}
export function purchase(store){let receipt;store.update(s=>{const d=s.content.mirage;const lines=d.cart.map(row=>({row,p:d.products.find(p=>p.id===row.id)}));if(!lines.length)throw Error('YOUR CART IS EMPTY');if(lines.some(({row,p})=>!p||row.qty>Number(p.stock)))throw Error('INSUFFICIENT STOCK');const total=lines.reduce((sum,{row,p})=>sum+row.qty*Number(p.price),0);if(total>d.balance)throw Error('INSUFFICIENT FUNDS');d.balance-=total;receipt=uid();for(const {row,p} of lines){p.stock-=row.qty;d.assets.push({id:uid(),productId:p.id,name:p.name,quantity:row.qty,price:p.price,receipt});}d.transactions.unshift({id:receipt,type:'PURCHASE',amount:-total,time:s.clock,date:s.calendar?.anchorDate});d.cart=[];});return receipt;}

````

---

## 6. `src/apps/mirage/index.js`

原文件：[`src/apps/mirage/index.js`](https://github.com/zn546612432-cloud/BBBTAI/blob/9d8c565663570c301b0bd44e601f9108c4b92da3/src/apps/mirage/index.js)

````javascript
import {walletPage} from './features/wallet/index.js';
import {bindD13Wallet,transferD13Wallet,D13_WALLET_ID} from '../../story/d13/runtime.js';
import {exchange} from '../../services/bank.js';
import {storySessionControls} from './features/story-controls/index.js';
import {D01_REPAIR,D01_CONTACT,acceptD01Repair,deliverD01Attachment,queueD01ContactReply} from '../../story/d01/runtime.js';
import {D02_S,D02_A,D02_STAGES,D02_MAIL,D02_TALIA,acceptD02,submitD02,armD02Ghost,d02StepId,d02State,d02TaliaDraft,onD02TaliaMessage} from '../../story/d02/runtime.js';
import {D03_ORDER,D03_MAIL,D03_STAGES,acceptD03Contract,submitD03Contract,armD03Ghost,d03StepId} from '../../story/d03/contract.js';
import {DAILY_CONTRACTS as D04_CONTRACTS,D04_ORDER_IDS,D04_MAIL,D04_STEP,acceptD04Contract,submitD04Contract,armD04Ghost} from '../../story/d04/contract.js';
import {mirageAIEnabled} from '../../services/ai/channel-controls.js';
import {replyToOuroboros} from './features/ai-replies/index.js';
import {currentScript55,scriptedDraft55,sendScriptedDraft55} from '../../services/story55/scripted-chat.js';
import {isStory55,nodeStatus} from '../../services/story55/state.js';
import {STORY55_BOUNTY_ID,STORY55_WALLET_MAIL_ID,acceptStory55Wallet} from './data.js';
import {mirage55} from '../../services/story55/views.js';
import {acceptOuroborosChallenge,ouroborosDraft,sendOuroborosPreset,isOuroborosScriptActive} from './ouroboros-flow.js';
import {linkedMission,linkedMissionVisible,linkedMailId,acceptLinkedMission} from './linked-missions.js';
import {isMirageAuthenticated,setMirageAuthenticated} from './session.js';
import {authorize} from '../ghost/state.js';
import {uid} from '../../services/id.js';
import {timestampLabel} from '../../services/messaging/timestamps.js';
import {esc,btn} from '../../system/ui.js';
import {rebaseBundledPublicAsset} from '../../services/public-assets.js';
import {sendMessage} from '../../services/messaging/index.js';
import {visibleMessages} from '../../services/messaging/delivery.js';
import {FLOW_CONTACT,FLOW_INVITE,openFlowTest,flowOnMirageEntry} from '../../services/story55/flow-d03.js';
import {glyph,face,web,productArt,skull} from './art.js';
import {initializeMirage,mirageData,contacts,money,cipher,saveRecord,purchase,MIRAGE_ACCOUNT,MIRAGE_PASSWORD,bountyGroups,isCompletedBounty,WALLET_CHALLENGE_ID,completeWalletChallenge} from './data.js';
import {acceptHackerBounty,HACKER_BOUNTY_ID,HACKER_MAIL_ID} from './mission.js';
export const manifest={id:'mirage',name:'MIRAGE',icon:8,defaultRoute:'/',supportsDeepLink:true,kicker:'CIPHER NETWORK'};
let decrypted=new Set(),decrypting=new Set(),pendingDelete=null,newMailNotice=false,filter='ALL',query='',draftAvatar,accountTapCount=0,lastAccountTap=0;
export function onEnter(){setMirageAuthenticated(false);decrypted.clear();decrypting.clear();pendingDelete=null;newMailNotice=false;draftAvatar=undefined;accountTapCount=0;}
export function accountTap(input){const now=Date.now();accountTapCount=now-lastAccountTap<=850?accountTapCount+1:1;lastAccountTap=now;if(accountTapCount>=3){input.value=MIRAGE_ACCOUNT;accountTapCount=0;}}
const at=(action,label,icon,attrs='')=>btn(action,glyph(icon),'mc-icon-button',`aria-label="${label}" title="${label}" ${attrs}`);
const route=(ctx,path='/',params={})=>ctx.router.open({appId:'mirage',route:path,params});
const goTab=(ctx,path)=>{ctx.store.update(s=>{s.nav.current={appId:'mirage',route:path,params:{}};});};
const codeLines=['IMPORT NUMPY AS NP','FROM DATETIME IMPORT DATETIME','INITIALIZE SELF.MODEL()','CLASS THREATLEVEL(ENUM):','  BENIGN = 0  // LOW RISK','  SUSPICIOUS = 1','  MALICIOUS = 2','  CRITICAL = 3','DEF INIT_AI_MODEL(SELF):','  SELF.BEHAVIOR_PROFILES = []','  SELF.MODEL_WEIGHTS = 0.03','  NORMAL : AVG_DURATION 120','GATEWAY : CLOUD SYNC','SELF.SUSPECTED_USERS = []','ENTROPY : 6.7','DATA EXFILTRATION DETECTED','DEF SIMULATE_LOGS(SELF):','  GENERATE SIMULATED DATA','RETURN CONNECTION(SELF)','SESSION.KEY : 8E1560D0'];
const telemetry=()=>`<div class="mc-telemetry" aria-hidden="true"><pre>${esc([...codeLines,...codeLines].join('\n'))}</pre><pre>${esc([...codeLines.slice(3),...codeLines].join('\n'))}</pre><div class="mc-circuit"></div><div class="mc-node n1"></div><div class="mc-node n2"></div><div class="mc-node n3"></div></div>`;
function login(s,binding=false){const account=MIRAGE_ACCOUNT;return `<div class="mc-screen mc-login">${telemetry()}<div class="mc-login-top"><button class="mc-login-back" type="button" data-action="${binding?'mc-wallet-back':'mc-exit'}" aria-label="${binding?'返回錢包':'返回手機'}">‹</button>MIRAGE NETWORK<span>PRIVATE RELAY / 04</span></div><form class="mc-login-panel" data-form="${binding?'mc-wallet-bind':'mc-login'}"><div class="mc-login-title"><span>MIRAGE</span>${web()}<span>CIPHER</span></div><div class="mc-login-fields"><label><b>ACCOUNT</b><input aria-label="ACCOUNT" name="account" data-mirage-account autocomplete="off" value="${esc(account)}" required maxlength="60" spellcheck="false"></label><label><b>PASSWORD</b><input aria-label="PASSWORD" name="password" type="password" autocomplete="off" value="${MIRAGE_PASSWORD}" required maxlength="100"></label><div class="mc-login-buttons"><button type="submit">${binding?'綁定':'SIGN IN'}</button><button type="button" data-action="mc-sign-up">SIGN UP</button></div></div><div class="mc-login-avatar">${skull()}</div></form><span class="mc-signup-warning" role="status" aria-live="polite">REGISTRATION IS TEMPORARILY UNAVAILABLE</span><div class="mc-login-tables" aria-hidden="true">${[0,1].map(n=>`<div><i></i>${Array.from({length:7},(_,i)=>`<span>${['Cre','Del','Mv','Cre','Cre','Op','Mv'][i]}　${i%3?'UPDATED PROXY':'CREATED PROXY'} HOST@${i+n}8E15…　<em>view details</em></span>`).join('')}</div>`).join('')}</div><div class="mc-login-footer"><span>CONNECTION ENCRYPTED</span><span>22° N / 113° E</span></div></div>`;}
function tabs(active,s){const count=mirageData(s).cart.reduce((a,b)=>a+b.qty,0);return `<nav class="mc-tabs" aria-label="MIRAGE navigation">${[['/','chat','CONTACTS'],['/bounties','money','BOUNTIES'],['/market','cart','MARKET']].map(([path,icon,label])=>btn('mc-tab',`${glyph(icon)}<span>${label}</span>${path==='/market'&&count?`<i>${count}</i>`:''}`,active===path?'is-active':'',`data-route="${path}" aria-label="${label}" ${active===path?'aria-current="page"':''}`)).join('')}</nav>`;}
function header(title,tools='',back=false){return `<header class="mc-header">${back?at('mc-contacts','BACK','back'):`${at('mc-exit','BACK TO PHONE','back')}<span class="mc-header-mark">${web()}</span>`}<div><strong>${esc(title)}</strong><small><i></i> ENCRYPTED CONNECTION</small></div><div class="mc-header-tools">${tools}</div></header>`;}
function contactsPage(s){
 const list=contacts(s);
 const row=c=>`<div class="mc-contact" data-key="contact-${esc(c.id)}">${btn('mc-chat',`${face(c)}<span><strong>${esc(c.name)}</strong><small>${Number(c.unread||0)>0?'<i class="mc-unread-green"></i> NEW MESSAGE':c.online?'ONLINE':'NO NEW MESSAGE'}</small></span><i class="mc-contact-dot ${c.online?'is-online':''}"></i>`,'mc-contact-open',`data-id="${esc(c.id)}" aria-label="Chat with ${esc(c.name)}"`)}</div>`;
 return `${header('MIRAGE CIPHER')}<div class="mc-contact-scroll mc-scroll"><div class="mc-online-list">${list.length?list.map(row).join(''):'<div class="mc-list-label">NO CONTACTS</div>'}</div><div class="mc-list-end">END OF DIRECTORY / ${list.length} IDENTITIES</div></div>${tabs('/',s)}`;
}
const flowMarkup=m=>m.id===FLOW_INVITE?esc(m.text).replace('测试','<button type="button" class="mc-flow-link" data-action="mc-flow-test">测试</button>'):esc(m.text);
function chatPage(s,id){const c=contacts(s).find(c=>c.id===id);if(!c)return `${header('CHANNEL NOT FOUND','',true)}<div class="mc-empty">THIS IDENTITY IS NO LONGER AVAILABLE.</div>`;const messages=visibleMessages(c,s).filter(m=>!(id==='s55-ouroboros'&&m.from==='system'&&/熙蒙正在開啟反追蹤|反追蹤失敗/.test(String(m.text||'')))),unlocked=decrypted.has(id)||id===FLOW_CONTACT||(id==='s55-ouroboros'&&s.story55?.d13?.phase==='chat'),busy=decrypting.has(id),sceneLine=currentScript55(s,'mirage',id),script=scriptedDraft55(s,'mirage',id),taliaDraft=d02TaliaDraft(s,id);return `${header(c.name,'',true)}<div class="mc-channel ${unlocked?'is-decrypted':''}" data-key="channel-${esc(id)}"><div class="mc-channel-status"><span>PRIVATE CHANNEL / ${esc(id)}</span><span>256-BIT</span></div><div class="mc-cipher-scroll mc-scroll" aria-label="Encrypted messages">${messages.length?messages.map(m=>['divider','system','terminal-status'].includes(m.kind)?`<div class="mc-session-divider ${m.kind==='terminal-status'?'is-terminal-status':''}" data-key="cipher-${esc(m.id)}">${esc(m.text)}</div>`:m.kind==='call-avatar'?`<div class="mc-cipher-row mc-voice-avatar" data-key="cipher-${esc(m.id)}">${face(c)}</div>`:`<div class="mc-cipher-row ${m.from==='me'?'is-mine':''}" data-key="cipher-${esc(m.id)}">${face(c,m.from==='me')}<div><small>${esc(m.from==='me'?mirageData(s).account:c.name)} · ${esc(timestampLabel(m,s))}</small><p>${esc(cipher(m.kind==='image'?'[IMAGE]':m.text,m.id))}</p></div></div>`).join(''):`<div class="mc-channel-empty">${face(c)}<p>SECURE CHANNEL ESTABLISHED</p><span>NO MESSAGES</span></div>`}</div>${unlocked?`<section class="mc-decoded" aria-label="Decrypted chat"><div class="mc-decoded-heading"><span>${glyph('unlock')} DECRYPTED</span>${at('mc-encrypt','ENCRYPT CHAT','lock',`data-id="${esc(id)}"`)}</div><div class="mc-clear-messages chat-messages" role="log" aria-label="聊天消息">${messages.map(m=>['divider','system','terminal-status'].includes(m.kind)?`<div class="mc-session-divider ${m.kind==='terminal-status'?'is-terminal-status':''}" data-key="message-${esc(m.id)}">${esc(m.text)}</div>`:m.kind==='call-avatar'?`<div class="mc-clear-row mc-voice-avatar" data-key="message-${esc(m.id)}">${face(c)}</div>`:`<div class="mc-clear-row message-row ${m.from==='me'?'is-mine mine':''}" data-key="message-${esc(m.id)}">${face(c,m.from==='me')}<div><span class="mc-clear-sender">${esc(m.from==='me'?mirageData(s).account:c.name)} <time>${esc(timestampLabel(m,s))}</time></span><div class="mc-clear-text">${m.kind==='image'?`<img class="mc-message-image" src="${esc(rebaseBundledPublicAsset(m.text))}" alt="Chat attachment">`:flowMarkup(m)}</div></div></div>`).join('')||'<div class="mc-empty">NO MESSAGES YET</div>'}</div></section>`:`<div class="mc-decrypt-bar">${btn('mc-decrypt',`${glyph(busy?'unlock':'lock')}<span>${busy?'DECRYPTING…':'DECRYPT MESSAGES'}</span>`,'mc-decrypt-button',`data-id="${esc(id)}" ${busy?'disabled':''}`)}</div>`}<div class="mc-channel-monitor" aria-hidden="true"><div class="mc-wave">${Array.from({length:60},(_,i)=>`<i style="height:${10+((i*37)%29)}px"></i>`).join('')}</div><div class="mc-identities">${face(c)}${face(null,true)}</div></div></div>${storySessionControls(s,id)}<form class="mc-composer composer" data-form="mc-send" data-id="${esc(id)}"${script?` data-story-scene="${esc(script.id)}"`:''}>${at('mc-attach','ATTACH IMAGE','plus',`data-id="${esc(id)}"`)}<input name="text" value="${script?'':esc(s.drafts[id]||'')}" ${script?`data-story-type="${esc(script.text)}" data-story-stage="${esc(script.id+':'+script.index)}"`:ouroborosDraft(s,id)?`data-story-type="${esc(ouroborosDraft(s,id))}" data-story-stage="${esc(s.content.mirage?.ouroborosScript?.stage||'')}"`:taliaDraft?`data-story-type="${esc(taliaDraft)}" data-story-stage="d02-talia-${d02State(s).taliaStage||0}"`:''} ${sceneLine&&!script?'disabled':''} aria-label="消息内容" placeholder="ENCRYPT A MESSAGE…" autocomplete="off" maxlength="6000"><button type="submit" aria-label="SEND MESSAGE">${glyph('send')}</button></form>`;}
function orderRow(o,i){return btn('mc-open-bounty',`<div class="mc-order-top"><span>MC / ${String(i+1).padStart(4,'0')}</span><i>${esc(o.status||'OPEN')}</i></div><h2>${esc(o.title)}</h2><p>${esc(o.owner||'ANONYMOUS')}</p><div class="mc-order-foot"><span>${esc(o.category||'CONTRACT')}</span><strong>${esc(o.reward||'$ 0')}</strong></div>`,'mc-order',`data-id="${esc(o.id)}"`);}
function bountyPage(s){
 const d=mirageData(s),list=(s.content.orders||[]).filter(o=>o.status==='OPEN'&&linkedMissionVisible(s,o.id));
 return `${header('BOUNTY EXCHANGE')}<div class="mc-scroll mc-board"><button class="mc-wallet-summary" data-action="mc-wallet"><span>AVAILABLE FUNDS <small>USD</small></span><strong>$ ${money(s.bankData?.balance||0)}</strong><span>VIEW LEDGER <b>↗</b></span></button>${btn('mc-my-orders','MY ORDERS · 我的订单　›','mc-my-orders')}<div class="mc-board-label"><span>OPEN CONTRACTS (${list.length})</span></div>${list.map(orderRow).join('')||'<div class="mc-empty">NO CONTRACTS AVAILABLE</div>'}</div>${tabs('/bounties',s)}`;
}
function myOrdersPage(s,view='active'){
 const all=(s.content.orders||[]).filter(o=>linkedMissionVisible(s,o.id));
 const groups={
  active:all.filter(o=>!['OPEN','COMPLETED','EXPIRED','FAILED','CANCELLED'].includes(o.status)),
  completed:all.filter(isCompletedBounty),
  expired:all.filter(o=>['EXPIRED','FAILED','CANCELLED'].includes(o.status)&&(!D02_STAGES[o.id]||o.wasAccepted===true))
 };
 const labels={active:'进行中',completed:'已完成',expired:'已失效'};
 const list=groups[view]||groups.active;
 return `${header('MY ORDERS','',true)}<div class="mc-scroll mc-board"><div class="mc-bounty-switch" role="group" aria-label="我的订单状态">${Object.entries(labels).map(([key,label])=>btn('mc-order-view',label+' <span>'+groups[key].length+'</span>',key===view?'is-active':'',`data-view="${key}"`)).join('')}</div><div class="mc-board-label"><span>${labels[view]} · ${list.length}</span></div>${list.map(orderRow).join('')||'<div class="mc-empty">暂无'+labels[view]+'订单</div>'}</div>${tabs('/bounties',s)}`;
}
function d02BountyActions(s,o){
 if(!D02_STAGES[o.id])return '';
 const progress=D02_STAGES[o.id].filter((_,i)=>s.ghost?.orders?.[d02StepId(o.id,i)]?.status==='success').length;
 if(o.status==='READY')return '<p class="mc-brief">任务 '+progress+' / '+D02_STAGES[o.id].length+' · 待提交</p>';
 if(o.status==='ACCEPTED')return '<p class="mc-brief">任务 '+progress+' / '+D02_STAGES[o.id].length+' · '+(d02State(s).deployed?.[o.id]?'已部署':'待部署')+'</p>';
 if(o.status==='EXPIRED')return '<p class="mc-brief">已失效：超过截止时间</p>';
 return '';
}
function d03BountyActions(s,o){
 if(o.id!==D03_ORDER)return '';
 const done=D03_STAGES.filter((_,i)=>s.ghost?.orders?.[d03StepId(i)]?.status==='success').length;
 if(o.status==='ACCEPTED')return '<p class="mc-brief">程序 '+done+' / '+D03_STAGES.length+' · 破譯 → 連結 → 隱匿</p>'
  +btn('mc-d03-mail','OPEN ORDER EMAIL · KIRA','mc-secondary',`data-id="${esc(o.id)}"`);
 if(o.status==='READY')return '<p class="mc-brief">程序 3 / 3 · READY TO SUBMIT</p>';
 if(o.status==='COMPLETED')return '<p class="mc-brief">✓ 文件已驗收 · 交易回執已寄送</p>';
 return '';
}
function d04BountyActions(s,o){
 const def=D04_CONTRACTS.find(x=>x.id===o.id);if(!def)return '';
 const done=def.stages.filter((_,i)=>s.ghost?.orders?.[D04_STEP(o.id,i)]?.status==='success').length;
 if(o.status==='ACCEPTED')return '<p class="mc-brief">程序 '+done+' / '+def.stages.length+' · '+def.stages.map(x=>({cipher:'破譯',veil:'隱匿',route:'連結',extract:'竊取',strike:'攻擊'})[x]||x).join(' → ')+'</p>'
  +btn('mc-d04-mail','OPEN ORDER EMAIL · KIRA','mc-secondary','data-id="'+esc(o.id)+'"');
 if(o.status==='READY')return '<p class="mc-brief">程序 '+done+' / '+def.stages.length+' · READY TO SUBMIT</p>';
 if(o.status==='COMPLETED')return '<p class="mc-brief">✓ 文件已驗收 · 交易回執已寄送</p>';
 if(o.status==='EXPIRED')return '<p class="mc-brief">委託已過期，無法再提交</p>';
 return '';
}
function bountyDetail(s,id){const o=s.content.orders.find(o=>o.id===id);if(!o||!linkedMissionVisible(s,id))return `${header('CONTRACT NOT FOUND','',true)}`;const d01Expired=id===D01_REPAIR&&isStory55(s)&&s.day!==1&&o.status==='OPEN';const d02Expired=!!D02_STAGES[id]&&o.status==='EXPIRED';return `${header('CONTRACT / DETAIL','',true)}<div class="mc-scroll mc-detail"><small>${esc(o.id)}</small><h1>${esc(o.title)}</h1><div class="mc-detail-state">${esc(o.status||'OPEN')}</div><label>CLIENT</label><p>${esc(o.owner||'ANONYMOUS')}</p><label>REWARD</label><strong class="mc-reward">${esc(o.reward)}</strong><label>BRIEF</label><p class="mc-brief">${esc(o.description||'Contract details have not been provided.')}</p>${o.d01ViewOnly?'':id===D03_ORDER&&o.status==='READY'?btn('mc-d03-submit','READY TO SUBMIT','mc-primary',`data-id="${esc(id)}"`):D04_ORDER_IDS.includes(id)&&o.status==='READY'?btn('mc-d04-submit','READY TO SUBMIT','mc-primary',`data-id="${esc(id)}"`):D02_STAGES[id]&&o.status==='READY'?btn('mc-d02-submit','READY TO SUBMIT','mc-primary',`data-id="${esc(id)}"`):btn('mc-accept-bounty',d01Expired?'D01 ONLY · UNAVAILABLE':d02Expired?'EXPIRED':o.status==='READY'?'READY TO SUBMIT':o.status==='ACCEPTED'?'CONTRACT ACCEPTED':isCompletedBounty(o)?'CONTRACT COMPLETED':'ACCEPT CONTRACT','mc-primary',`data-id="${esc(id)}" ${d01Expired||d02Expired||o.status!=='OPEN'?'disabled':''}`)}${d01Expired?'<p class="mc-brief">此委托仅限 D01 接取；使用开发者入口重建后续日期时将自动标记已完成。</p>':''}${o.status==='ACCEPTED'&&linkedMission(s,id)?btn('mc-open-linked-kira','OPEN ORDER EMAIL · KIRA','mc-secondary',`data-id="${esc(id)}"`):o.status==='REVIEWING'&&linkedMission(s,id)?'<p>UNDER REVIEW · KIRA</p>':o.status==='ACCEPTED'&&id===HACKER_BOUNTY_ID?btn('mc-open-kira-mail','OPEN ORDER EMAIL · KIRA','mc-secondary'):o.status==='ACCEPTED'&&id===D01_REPAIR?btn('mc-open-d01-mail','打開 KIRA 附件郵件','mc-secondary'):o.status==='ACCEPTED'&&isStory55(s)&&id===STORY55_BOUNTY_ID&&!D04_ORDER_IDS.includes(id)?btn('mc-open-wallet-d06-mail','OPEN KIRA AUTHORIZATION','mc-secondary'):o.status==='ACCEPTED'&&!D02_STAGES[id]&&id!==D03_ORDER&&!D04_ORDER_IDS.includes(id)?btn('mc-complete-bounty',id===WALLET_CHALLENGE_ID?'TRY THE WALLET CHALLENGE':'MARK COMPLETED','mc-secondary',`data-id="${esc(id)}"`):''}${d02BountyActions(s,o)}${d03BountyActions(s,o)}${d04BountyActions(s,o)}</div>${tabs('/bounties',s)}`;}
function market(s){const d=mirageData(s);const products=d.products.filter(p=>(filter==='ALL'||p.category===filter)&&(!query||`${p.name} ${p.category} ${p.description}`.toLowerCase().includes(query.toLowerCase())));const cats=[...new Set(['ALL',...d.products.map(p=>p.category)])];return `${header('PRIVATE MARKET',at('mc-cart','VIEW CART','cart'))}<div class="mc-market-search"><input aria-label="SEARCH INVENTORY" name="mc-search" value="${esc(query)}" placeholder="SEARCH INVENTORY…" autocomplete="off"></div><div class="mc-market-categories">${cats.map(c=>btn('mc-filter',esc(c),c===filter?'is-active':'',`data-category="${esc(c)}"`)).join('')}</div><div class="mc-scroll mc-market-scroll"><div class="mc-product-grid">${products.map(p=>btn('mc-product',`<div class="mc-product-picture"><span>${esc(p.category)}</span>${productArt(p.art)}</div><div class="mc-product-info"><strong>${esc(p.name)}</strong><small>STOCK / ${Number(p.stock)||0}</small><b>$ ${money(p.price)}</b></div>`,'mc-product',`data-id="${esc(p.id)}"`)).join('')}</div>${products.length?'':'<div class="mc-empty">NO MATCHING INVENTORY</div>'}<div class="mc-market-footer">PRIVATE INVENTORY / USD</div></div>${tabs('/market',s)}`;}
function product(s,id){const p=mirageData(s).products.find(p=>p.id===id);if(!p)return `${header('ITEM NOT FOUND','',true)}`;return `${header('INVENTORY / DETAIL','',true)}<div class="mc-scroll mc-detail"><div class="mc-product-hero">${productArt(p.art)}</div><small>${esc(p.category)} / ${esc(p.id)}</small><h1>${esc(p.name)}</h1><strong class="mc-reward">$ ${money(p.price)}</strong><p class="mc-brief">${esc(p.description)}</p><div class="mc-stock">AVAILABLE STOCK <b>${Number(p.stock)||0}</b></div>${btn('mc-add-cart',Number(p.stock)>0?'ADD TO CART':'OUT OF STOCK','mc-primary',`data-id="${esc(id)}" ${Number(p.stock)>0?'':'disabled'}`)}${btn('mc-cart','VIEW CART','mc-secondary')}</div>${tabs('/market',s)}`;}
function cart(s){const d=mirageData(s),rows=d.cart.map(row=>({row,p:d.products.find(p=>p.id===row.id)})).filter(x=>x.p),total=rows.reduce((a,{p,row})=>a+p.price*row.qty,0);return `${header('SHOPPING CART','',true)}<div class="mc-scroll mc-detail">${rows.map(({p,row})=>`<div class="mc-cart-row"><div>${productArt(p.art)}</div><section><strong>${esc(p.name)}</strong><span>$ ${money(p.price)}</span><div class="mc-qty">${btn('mc-cart-minus','−','',`data-id="${esc(p.id)}" aria-label="Decrease ${esc(p.name)}"`)}<b>${row.qty}</b>${btn('mc-add-cart','+','',`data-id="${esc(p.id)}" aria-label="Increase ${esc(p.name)}"`)}</div></section>${at('mc-cart-remove','REMOVE ITEM','trash',`data-id="${esc(p.id)}"`)}</div>`).join('')||'<div class="mc-empty">YOUR CART IS EMPTY</div>'}<div class="mc-total"><span>TOTAL / USD</span><strong>$ ${money(total)}</strong></div><p class="mc-cart-balance">AVAILABLE FUNDS / $ ${money(d.balance)}</p>${btn('mc-checkout','CONFIRM PURCHASE','mc-primary',rows.length?'':'disabled')}${d.assets.length?`<div class="mc-board-label">OWNED ASSETS (${d.assets.length})</div>${d.assets.map(a=>`<div class="mc-asset-row"><span>${esc(a.name)}</span><b>×${a.quantity}</b></div>`).join('')}`:''}</div>${tabs('/market',s)}`;}
function newMailOverlay(){return newMailNotice?`<div class="mc-overlay" role="dialog" aria-modal="true" aria-label="收到一条邮件"><section class="mc-dialog mc-mail-notice"><header>NEW MESSAGE ${at('mc-close-mail-notice','CLOSE','close')}</header><p>收到一条邮件</p><strong>【mirage】新订单</strong><div class="mc-dialog-buttons">${btn('mc-close-mail-notice','稍后查看','mc-secondary')}${btn('mc-open-kira-mail','打开 KIRA 邮件','mc-primary')}</div></section></div>`:'';}

export function render({store},loc){const s=store.get();if(!isMirageAuthenticated())return login(s);/* Original MIRAGE terminal, contacts, bounties, and market stay visible in every story version. */let body;if(loc.route.startsWith('/chat/'))body=chatPage(s,loc.route.slice(6));else if(loc.route==='/bounties')body=bountyPage(s);else if(loc.route.startsWith('/my-orders/'))body=myOrdersPage(s,loc.route.slice('/my-orders/'.length));else if(loc.route==='/bounties/completed')body=myOrdersPage(s,'completed');else if(loc.route.startsWith('/order/'))body=bountyDetail(s,loc.route.slice(7));else if(loc.route==='/market')body=market(s);else if(loc.route.startsWith('/product/'))body=product(s,loc.route.slice(9));else if(loc.route==='/cart')body=cart(s);else if(loc.route==='/wallet/bind')body=login(s,true);else if(loc.route.startsWith('/wallet'))body=walletPage(s,loc.route);else body=contactsPage(s);return `<div class="mc-screen">${telemetry()}<div class="mc-interface">${body}</div>${newMailOverlay()}</div>`;}
export function handle(action,t,ctx,loc){const id=t.dataset.id,s=ctx.store.get();
 if(action==='mc-exit'){ctx.router.back();return;}
 if(action==='mc-sign-up'&&!isMirageAuthenticated()){const message=t.closest('.mc-login')?.querySelector('.mc-signup-warning');if(message){message.classList.add('is-visible');message.style.opacity='1';clearTimeout(message._hideTimer);message._hideTimer=setTimeout(()=>{message.style.opacity='0';message.classList.remove('is-visible');},3800);}return;}
 if(!isMirageAuthenticated())return;
 if(action==='mc-flow-test'){ctx.store.update(state=>openFlowTest(state));ctx.router.open({appId:'ghost',route:'/flow-deploy',params:{}});return;}
 if(action==='mc-tab'){pendingDelete=null;goTab(ctx,t.dataset.route);}
 if(action==='mc-contacts'){if(loc.route.startsWith('/my-orders/'))goTab(ctx,'/bounties');else if(loc.route.startsWith('/chat/')||loc.route==='/manage')goTab(ctx,'/');else ctx.router.back();}
 if(action==='mc-chat'){
  ctx.store.update(s=>{
   const list=s.content.conversations.mirage||[],c=list.find(c=>c.id===id);
   if(c)c.lastOpened=Math.max(Date.now(),...list.map(x=>(Number(x.lastOpened)||0)+1));
  });
  route(ctx,'/chat/'+id);
 }
 if(action==='mc-decrypt'){decrypting.add(id);ctx.refresh();setTimeout(()=>{decrypting.delete(id);decrypted.add(id);ctx.refresh();},360);}
 if(action==='mc-encrypt'){decrypted.delete(id);ctx.refresh();}
 if(action==='mc-attach')ctx.pickImage(src=>sendMessage(ctx.store,{channel:'mirage',conversationId:id,text:src,kind:'image'}));
 if(action==='mc-my-orders')route(ctx,'/my-orders/active');
 if(action==='mc-order-view')goTab(ctx,'/my-orders/'+t.dataset.view);
 if(action==='mc-open-bounty')route(ctx,'/order/'+id);
 if(action==='mc-open-d01-mail')return ctx.router.open({appId:'kira',route:'/mail/d01-mirage001-attachment',params:{}});
 if(action==='mc-open-wallet-d06-mail')return ctx.router.open({appId:'kira',route:'/mail/'+STORY55_WALLET_MAIL_ID,params:{}});
 if(action==='mc-open-linked-kira')return ctx.router.open({appId:'kira',route:'/mail/'+linkedMailId(id),params:{}});
 if(action==='mc-d02-mail')return ctx.router.open({appId:'kira',route:'/mail/'+D02_MAIL,params:{}});
 if(action==='mc-d03-mail')return ctx.router.open({appId:'kira',route:'/mail/'+D03_MAIL,params:{}});
 if(action==='mc-d04-mail')return ctx.router.open({appId:'kira',route:'/mail/'+D04_MAIL(id),params:{}});
 // Cached old buttons follow the one approved KIRA file flow.
 if(action==='mc-d04-run')return ctx.router.open({appId:'kira',route:'/mail/'+D04_MAIL(id),params:{}});
 if(action==='mc-d03-run')return ctx.router.open({appId:'kira',route:'/mail/'+D03_MAIL,params:{}});
 if(action==='mc-d02-run'){const st=ctx.store.get(),seq=D02_STAGES[id];if(!seq)return;const nextIndex=seq.findIndex((_,i)=>st.ghost?.orders?.[d02StepId(id,i)]?.status!=='success');if(nextIndex<0)return ctx.toast('请返回 MIRAGE 提交');let step=d02StepId(id,nextIndex);ctx.store.update(n=>armD02Ghost(n,id,nextIndex));return ctx.router.open({appId:'ghost',route:'/contract',params:{orderId:step}});}
 if(action==='mc-d04-submit'){
  let ok=false;ctx.store.update(s=>{ok=submitD04Contract(s,id);});
  ctx.toast(ok?'✓ 文件已驗收 · 交易回執已寄送':'請先完成 GHOST 全部程序');
  if(ok)route(ctx,'/my-orders/completed');return;
 }
 if(action==='mc-d03-submit'){
  let ok=false;ctx.store.update(n=>{ok=submitD03Contract(n);});
  ctx.toast(ok?'✓ 文件已驗收 · 交易回執已寄送':'請先完成 GHOST 全部程序');
  if(ok)route(ctx,'/my-orders/completed');return;
 }
 if(action==='mc-d02-submit'){let ok=false;ctx.store.update(n=>{ok=submitD02(n,id);});ctx.toast(ok?'委托已提交，赏金到账':'先完成 GHOST 的所有关卡');if(ok)route(ctx,'/my-orders/completed');return;}
 if(action==='mc-accept-bounty'||action==='mc-complete-bounty'){
  if(id==='d01-hunt-view')return;
  if(action==='mc-accept-bounty'&&D04_ORDER_IDS.includes(id)){
   let ok=false;ctx.store.update(n=>{ok=acceptD04Contract(n,id);});
   ctx.toast(ok?'ORDER ACCEPTED · KIRA':'委託暫不可接取');
   if(ok)route(ctx,'/order/'+id);return;
  }
  if(action==='mc-accept-bounty'&&id===D03_ORDER){
   let ok=false;ctx.store.update(n=>{ok=acceptD03Contract(n);});
   ctx.toast(ok?'ORDER ACCEPTED · KIRA':'委託暫不可接取');
   if(ok)route(ctx,'/order/'+id);return;
  }
  if(action==='mc-accept-bounty'&&D02_STAGES[id]){let ok=false;ctx.store.update(n=>{ok=acceptD02(n,id);});if(!ok)return ctx.toast('该委托只可按 D02 规定接取');return route(ctx,'/order/'+id);}
  if(action==='mc-accept-bounty'&&id===D01_REPAIR){let ok=false;ctx.store.update(s=>{ok=acceptD01Repair(s);});ctx.toast(ok?'CONTRACT ACCEPTED · KIRA':'仅限 D01 接单，且委托必须为 OPEN');if(ok)setTimeout(()=>ctx.store.update(s=>deliverD01Attachment(s)),2000);return;}
  if(action==='mc-complete-bounty'&&linkedMission(s,id))return ctx.router.open({appId:'kira',route:'/mail/'+linkedMailId(id),params:{}});
  if(isStory55(s)&&id===STORY55_BOUNTY_ID){
   let accepted=false;
   if(action==='mc-accept-bounty')ctx.store.update(next=>{accepted=acceptStory55Wallet(next);});
   if(!accepted&&action==='mc-accept-bounty'){ctx.toast('挑战尚未开放或已接取');return;}
   ctx.router.open({appId:'kira',route:'/mail/'+STORY55_WALLET_MAIL_ID,params:{}});
   return;
  }
  if(action==='mc-complete-bounty'&&id===WALLET_CHALLENGE_ID){
   const o=ctx.store.get().content.orders.find(x=>x.id===id);
   if(o?.status!=='ACCEPTED'){ctx.toast('CONTRACT NOT ACCEPTED');return;}
   ctx.store.update(s=>{
    const g=s.ghost??={orders:{},history:[],balance:0,config:{}};
    g.orderConfigs??={};
    g.orderConfigs[id]={seconds:90,rounds:1,codeLength:3,retries:3,reward:null};
    authorize(s,{orderId:id,type:'veil',mailId:null});
   });
   ctx.router.open({appId:'ghost',route:'/contract',params:{orderId:id}});
   return;
  }else if(action==='mc-accept-bounty'&&id===WALLET_CHALLENGE_ID){
   let accepted=false;ctx.store.update(s=>{accepted=acceptOuroborosChallenge(s);});
   ctx.toast(accepted?'ORDER CREATED · 10 BTC':'ORDER NOT AVAILABLE');
  }else if(action==='mc-accept-bounty'&&linkedMission(ctx.store.get(),id)){
   let accepted=false;
   ctx.store.update(s=>{accepted=acceptLinkedMission(s,id);});
   ctx.toast(accepted?'ORDER ACCEPTED · KIRA':'ORDER ALREADY ACCEPTED');
  }else if(action==='mc-accept-bounty'&&id===HACKER_BOUNTY_ID){
   newMailNotice=true;acceptHackerBounty(ctx.store);ctx.refresh();
  }else{
   ctx.store.update(s=>{const o=s.content.orders.find(x=>x.id===id);if(o)o.status=action==='mc-accept-bounty'?'ACCEPTED':'COMPLETED';});
   ctx.toast(action==='mc-accept-bounty'?'CONTRACT ACCEPTED':'CONTRACT COMPLETED');
  }
  if(action==='mc-complete-bounty')goTab(ctx,'/bounties/completed');
 }
 if(action==='mc-close-mail-notice'){newMailNotice=false;ctx.refresh();}
 if(action==='mc-open-kira-mail'){newMailNotice=false;ctx.router.open({appId:'kira',route:'/mail/'+HACKER_MAIL_ID});}
 if(action==='mc-wallet')return route(ctx,'/wallet');
  if(action==='mc-wallet-back'||action==='mc-wallet-cancel-transfer'){ctx.router.back();return;}
 if(action==='mc-bind-wallet')return route(ctx,'/wallet/bind');
 if(action==='mc-wallet-main')return route(ctx,'/wallet/main');
 if(action==='mc-wallet-usd')return route(ctx,'/wallet/usd');
 if(action==='mc-wallet-detail')return route(ctx,'/wallet/'+D13_WALLET_ID);
 if(action==='mc-wallet-transfer')return route(ctx,'/wallet/'+D13_WALLET_ID,{confirm:'yes'});
 if(action==='mc-wallet-transfer-confirm'){
  const status=nodeStatus(ctx.store.get(),'d13-wallet-transfer');
  if(status.state!=='ready')throw Error(status.reason);
  ctx.store.update(n=>{if(!transferD13Wallet(n))throw Error('轉帳尚未完成');});
  return;
 }
 if(action==='mc-product')route(ctx,'/product/'+id);if(action==='mc-cart')route(ctx,'/cart');
 if(action==='mc-filter'){filter=t.dataset.category;ctx.refresh();}
 if(action==='mc-add-cart'){ctx.store.update(s=>{const d=s.content.mirage,p=d.products.find(x=>x.id===id),row=d.cart.find(x=>x.id===id);if(!p||Number(p.stock)<(row?.qty||0)+1)throw Error('INSUFFICIENT STOCK');if(row)row.qty++;else d.cart.push({id,qty:1});});ctx.toast('ADDED TO CART');}
 if(action==='mc-cart-minus'||action==='mc-cart-remove')ctx.store.update(s=>{const d=s.content.mirage,row=d.cart.find(x=>x.id===id);if(!row)return;if(action==='mc-cart-remove'||row.qty===1)d.cart=d.cart.filter(x=>x.id!==id);else row.qty--;});
 if(action==='mc-checkout'){purchase(ctx.store);ctx.toast('PURCHASE COMPLETE / ASSETS UPDATED');}
 if(action==='mc-export')ctx.download();
 if(action==='mc-logout'){setMirageAuthenticated(false);decrypted.clear();pendingDelete=null;goTab(ctx,'/');}
}

export function submit(form,ctx,loc){const fd=new FormData(form),f=form.dataset.form,val=n=>String(fd.get(n)||'').trim();
 if(f==='mc-login'){if(val('account')!==MIRAGE_ACCOUNT||val('password')!==MIRAGE_PASSWORD){ctx.toast('ACCOUNT OR PASSWORD INCORRECT');return;}initializeMirage(ctx.store);ctx.store.update(s=>{s.content.mirage.account=MIRAGE_ACCOUNT;flowOnMirageEntry(s);});setMirageAuthenticated(true);goTab(ctx,(loc?.route?.startsWith('/chat/')||loc?.route?.startsWith('/wallet'))?loc.route:'/');return;}
 if(!isMirageAuthenticated())return;
 if(f==='mc-send'){
  const text=val('text'),id=form.dataset.id;
  if(text){
   form.elements.text.value='';decrypted.add(id);
   const scripted=scriptedDraft55(ctx.store.get(),'mirage',id);
   if(scripted){
    // Native story55 send gate: only player action creates the green bubble.
    ctx.store.update(s=>sendScriptedDraft55(s,'mirage',id,text));
    return;
   }
   if(currentScript55(ctx.store.get(),'mirage',id)){
    ctx.toast('請等待對方的消息');
    return;
   }
   if(isOuroborosScriptActive(ctx.store.get(),id)){
    let completed=false;ctx.store.update(s=>{completed=sendOuroborosPreset(s,id,text);});
    if(!completed)ctx.toast('请先发送已经输入的内容');
    return;
   }
   const messageId=sendMessage(ctx.store,{channel:'mirage',conversationId:id,text});
   if(id===D01_CONTACT)ctx.store.update(s=>queueD01ContactReply(s,id));
   if(id===D02_TALIA)ctx.store.update(s=>onD02TaliaMessage(s,id,text));
   const contact=ctx.store.get().content.conversations.mirage?.find(c=>c.id===id);
   if(mirageAIEnabled(ctx.store.get())&&/(ouroboros|衔尾蛇)/i.test(contact?.name||''))setTimeout(()=>replyToOuroboros(ctx,id,messageId).catch(e=>ctx.toast('MIRAGE AI：'+e.message)),3200);
  }
 }
 if(f==='mc-wallet-bind'){
  if(val('account')!==MIRAGE_ACCOUNT||val('password')!==MIRAGE_PASSWORD){ctx.toast('ACCOUNT OR PASSWORD INCORRECT');return;}
  let bound=false;ctx.store.update(s=>{bound=bindD13Wallet(s);});
  if(!bound){ctx.toast('目前沒有待綁定錢包');return;}
  form.reset();return route(ctx,'/wallet');
 }
 if(f==='mc-exchange'){exchange(ctx.store,val('amount'));return;}

}
export function input(el,ctx){if(el.name==='mc-search'){query=el.value;ctx.refresh();return;}if(el.name==='text'&&el.form?.dataset.form==='mc-send')ctx.store.update(s=>{s.drafts[el.form.dataset.id]=el.value;});}
export function change(el,ctx){if(el.name==='mc-search'){query=el.value;ctx.refresh();}}

````

---

## 7. `src/apps/mirage/features/wallet/index.js`

原文件：[`src/apps/mirage/features/wallet/index.js`](https://github.com/zn546612432-cloud/BBBTAI/blob/9d8c565663570c301b0bd44e601f9108c4b92da3/src/apps/mirage/features/wallet/index.js)

````javascript
import {esc} from '../../../../system/ui.js';
import {D13_WALLET_ID} from '../../../../story/d13/definition.js';
import {completed,nodeStatus} from '../../../../services/story55/state.js';
export function walletPage(s,path='/wallet'){
 const m=s.content.mirage,usd=Number(s.bankData?.balance||0);
 const canBind=nodeStatus(s,'d13-wallet-bind').state==='ready'&&!completed(s,'d13-wallet-bind');
 const head=`<header class="mc-header mc-wallet-header"><button type="button" class="mc-wallet-back" data-action="mc-wallet-back" aria-label="返回上一頁">‹ <span>返回</span></button><strong>PRIVATE WALLETS</strong>${canBind?'<button type="button" class="mc-wallet-add" data-action="mc-bind-wallet" aria-label="綁定新錢包">＋</button>':'<span class="mc-wallet-placeholder" aria-hidden="true"></span>'}</header>`;
 if(path==='/wallet/main')return head+`<div class="mc-scroll mc-detail"><label>BTC / MIR-WLT-MAIN</label><strong class="mc-reward">${Number(m.digitalBalance||0).toFixed(8)} BTC</strong><form data-form="mc-exchange"><label>兌換 BTC<input name="amount" type="number" min="0.00000001" step="0.00000001" required></label><button class="mc-primary" type="submit">兌換至美元帳戶</button></form>${(m.digitalTransactions||[]).map(t=>`<div class="mc-ledger-row"><span>${esc(t.type||t.orderId||'BTC')}<small>${esc(t.clock||'')}</small></span><strong>${Number(t.amount).toFixed(8)} BTC</strong></div>`).join('')}</div>`;
 if(path==='/wallet/usd')return head+`<div class="mc-scroll mc-detail"><label>美元帳戶 / PACIFIC</label><strong class="mc-reward">$ ${usd.toLocaleString('en-US')}</strong>${(s.bankData?.transactions||[]).map(t=>`<div class="mc-ledger-row"><span>${esc(t.label)}<small>${esc(t.time)}</small></span><strong>$ ${Number(t.amount).toLocaleString('en-US')}</strong></div>`).join('')}</div>`;
 if(path==='/wallet/'+D13_WALLET_ID){
  const w=m.wallets?.find(w=>w.id===D13_WALLET_ID);if(!w)return head+'<div class="mc-empty">錢包尚未綁定</div>';
  return head+`<div class="mc-scroll mc-detail"><label>${esc(w.address)}</label><strong class="mc-reward">${w.balance} BTC</strong><p class="mc-wallet-state">${w.status==='frozen'?'轉帳中斷 · 已凍結':'AVAILABLE'}</p>${w.status==='available'?'<button class="mc-primary" data-action="mc-wallet-transfer">轉帳</button>':''}${s.nav.current.params?.confirm==='yes'?'<div class="mc-wallet-transfer-confirm" role="group" aria-label="確認轉帳"><p>50 BTC</p><button data-action="mc-wallet-transfer-confirm">確認轉帳</button><button type="button" data-action="mc-wallet-cancel-transfer">取消</button></div>':''}</div>`;
 }
 return head+`<div class="mc-scroll mc-detail mc-wallet-list"><label>BTC 錢包</label><button data-action="mc-wallet-main"><span>MIR-WLT-MAIN<small>BTC</small></span><strong>${Number(m.digitalBalance||0).toFixed(8)}</strong></button>${(m.wallets||[]).map(w=>`<button data-action="mc-wallet-detail"><span>${esc(w.address)}<small>${w.status==='frozen'?'FROZEN':'BTC'}</small></span><strong>${Number(w.balance).toFixed(8)}</strong></button>`).join('')}<label>美元帳戶</label><button data-action="mc-wallet-usd"><span>PACIFIC<small>USD</small></span><strong>$ ${usd.toLocaleString('en-US')}</strong></button>${nodeStatus(s,'d13-wallet-bind').state==='ready'&&!completed(s,'d13-wallet-bind')?'<p>＋ 綁定新錢包</p>':''}</div>`;
}

````

---

## 8. `src/apps/mirage/features/ai-replies/index.js`

原文件：[`src/apps/mirage/features/ai-replies/index.js`](https://github.com/zn546612432-cloud/BBBTAI/blob/9d8c565663570c301b0bd44e601f9108c4b92da3/src/apps/mirage/features/ai-replies/index.js)

````javascript
import {mirageAIEnabled,mirageAIRevision} from '../../../../services/ai/channel-controls.js';
import {askTai,aiStatus} from '../../../../services/ai/gateway.js';
import {unpackTaiReply} from '../../../../services/ai/format.js';
import {taiBehavior,replyDelayMs} from '../../../../services/ai/behavior.js';
import {anonymousPresence55} from '../../../../services/story55/runtime.js';
import {currentScript55} from '../../../../services/story55/scripted-chat.js';
import {isStory55,taiRecognized} from '../../../../services/story55/state.js';
import {visibleMessages} from '../../../../services/messaging/delivery.js';
import {dateParts} from '../../../../services/calendar.js';
import {uid} from '../../../../services/id.js';
import {isOuroborosScriptActive} from '../../ouroboros-flow.js';
import {isMirageAuthenticated} from '../../session.js';

const pending=new Set();
export async function replyToOuroboros(ctx,contactId,sourceId,{wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 const initial=ctx.store.get(),revision=mirageAIRevision(initial),key=contactId+':'+revision;
 const contact=initial.content.conversations.mirage?.find(c=>c.id===contactId);
 if(!mirageAIEnabled(initial)||!contact||!/(ouroboros|衔尾蛇)/i.test(contact.name)||pending.has(key))return 0;
 const permitted=()=>{
  const s=ctx.store.get(),c=s.content.conversations.mirage?.find(c=>c.id===contactId);
  return mirageAIEnabled(s)&&mirageAIRevision(s)===revision&&s.day===initial.day&&isMirageAuthenticated()&&
   c?.messages.filter(m=>m.from==='me').at(-1)?.id===sourceId&&
   !isOuroborosScriptActive(s,contactId)&&!currentScript55(s,'mirage',contactId)&&
   (!isStory55(s)||anonymousPresence55(s).online);
 };
 if(!permitted()||contact.messages.at(-1)?.id!==sourceId)return 0;
 pending.add(key);
 try{
  const status=await aiStatus();if(!permitted())return 0;
  if(!status.deepseek)throw Error('请在 NoApp 的 AI 设置中填写 DeepSeek Key');
  const history=visibleMessages(contact,initial).filter(m=>m.kind==='text'&&typeof m.text==='string'&&!m.demo).slice(-20).map(m=>({role:m.from==='me'?'user':'assistant',content:m.text.slice(0,2000)}));
  if(history.at(-1)?.role!=='user')return 0;
  const result=await askTai({day:initial.day,channel:'mirage',storyVersion:isStory55(initial)?'55-v1':undefined,recognized:isStory55(initial)?taiRecognized(initial):undefined,messages:history,profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories});
  const chunks=unpackTaiReply(result,'mirage');let inserted=0;
  for(const item of chunks){
   if(!permitted())break;
   const msgId=uid();
   ctx.store.update(s=>{
    const target=s.content.conversations.mirage.find(c=>c.id===contactId);
    target.messages.push({id:msgId,from:contactId,text:item.text,kind:'text',day:s.day,time:s.clock,sentDate:dateParts(s).iso,aiGenerated:true});
    if(s.nav.current.appId!=='mirage'||s.nav.current.route!=='/chat/'+contactId){
     target.unread=(Number(target.unread)||0)+1;
     s.notifications.unshift({id:'mirage-ai-'+msgId,title:'MIRAGE',body:'NEW ENCRYPTED MESSAGE',link:{appId:'mirage',route:'/chat/'+contactId,params:{}}});
    }
   });
   inserted++;
   if(inserted<chunks.length)await wait(replyDelayMs(item.text,taiBehavior(initial)));
  }
  return inserted;
 }catch(error){if(!permitted())return 0;throw error;}
 finally{pending.delete(key);}
}

````

---

## 9. `src/apps/kira/index.js`

原文件：[`src/apps/kira/index.js`](https://github.com/zn546612432-cloud/BBBTAI/blob/9d8c565663570c301b0bd44e601f9108c4b92da3/src/apps/kira/index.js)

````javascript
import {D13_MAIL_ID} from '../../story/d13/definition.js';
import {claimD01Bank,D01_ATTACHMENT} from '../../story/d01/runtime.js';
import {mail55} from '../../services/story55/views.js';
import {STORY55_WALLET_MAIL_ID} from '../mirage/data.js';
import {D02_MAIL,D02_A_MAIL} from '../../story/d02/runtime.js';
import {story55Config,completed} from '../../services/story55/state.js';
import {linkedMission,linkedMailId,linkedDeliveryId,advanceLinkedMission} from '../mirage/linked-missions.js';
import {deliverLinkedArtifact} from '../mirage/linked-contract-runtime.js';
import {linkedMailView,linkedComposeView,linkedSentView,linkedReceiptView} from './features/mission/linked.js';
import {esc,btn} from '../../system/ui.js';
import {authorize,submit as submitGhost} from '../ghost/state.js';
import {HACKER_BOUNTY_ID,HACKER_MAIL_ID,phishingThemes,advanceHackerMission} from '../mirage/mission.js';
import {kiraInbox} from './features/inbox/index.js';
import {kiraDetail} from './features/detail/index.js';
import {commissionAttachment,commissionPreviewAvailable} from '../../services/commissions/attachment-flow.js';
import {composeMission} from './features/mission/index.js';
export const manifest={id:'kira',name:'KIRA',icon:10,defaultRoute:'/',supportsDeepLink:true,kicker:'ENCRYPTED MAIL'};
export function render({store},loc){
 const s=store.get();
 if(loc.route==='/compose/'+HACKER_BOUNTY_ID)return composeMission(s);
 if(loc.route.startsWith('/compose/linked/'))return linkedComposeView(s,decodeURIComponent(loc.route.slice('/compose/linked/'.length)));
 if(loc.route==='/sent')return '<div class="kira-inbox"><div class="kira-top">'+btn('kira-back','‹　收件箱')+'</div><h1>已发送</h1><div class="kira-mail-list">'+s.content.mail.filter(m=>m.linkedDelivery).map(m=>btn('kira-mail','<span class="kira-unread"></span><span><strong>'+esc(m.to)+'</strong><b>'+esc(m.subject)+'</b><small>'+esc(m.body)+'</small></span><time>D'+esc(m.day)+'</time>','kira-mail-row','data-id="'+esc(m.id)+'"')).join('')+'</div></div>';
 if(loc.route.startsWith('/mail/')){
  const mailId=loc.route.slice(6),mail=s.content.mail.find(m=>m.id===mailId);
  if(mailId===STORY55_WALLET_MAIL_ID&&mail){
   const project=story55Config(s).projects.find(p=>p.id==='wallet'),key=project?.key||'';
   const done=completed(s,'wallet');
   return '<div class="s55"><nav><button data-action="kira-back">‹ 收件箱</button><small>KIRA / MIRAGE</small></nav>'+
    '<h1>'+esc(mail.subject)+'</h1><p>'+esc(mail.from)+' · D'+esc(mail.day)+'</p>'+
    '<article class="s55-card s55-document"><p>钱包挑战已接取。请在 GHOST 验证授权码，并完成数据提取。</p>'+
    '<p>项目授权码</p><h2>'+esc(key)+'</h2><p>完成挑战前不会获得奖励。</p></article>'+
    '<button type="button" class="s55-button" data-action="kira-wallet-d06-ghost">'+
    (done?'查看 GHOST 已完成项目':'打开 GHOST · WALLET CHALLENGE')+'</button></div>';
  }
  if(mail?.id===D13_MAIL_ID)return kiraDetail(s,mailId);
  if(mail?.story55&&mail.id!=='flow-d03-reward')return mail55(s,mail);
  return mail?.linkedReceipt?linkedReceiptView(s,mailId):mail?.linkedDelivery?linkedSentView(s,mailId):mail?.linkedContract&&linkedMission(s,mail.orderId)?linkedMailView(s,mail.orderId):kiraDetail(s,mailId);
 }
 return kiraInbox(s);
}
export function handle(a,t,c){
 if(a==='kira-d13-wallet')return c.router.open({appId:'mirage',route:'/wallet',params:{}});
 if(a==='kira-open-commission-file'){
  const mailId=t.dataset.id;
  const file=commissionAttachment(c.store.get(),mailId);
  if(!file||!['D03','D04'].includes(file.kind)||!commissionPreviewAvailable(c.store.get(),mailId))return c.toast?.('附件未授權');
  c.store.update(s=>{const mail=s.content.mail.find(m=>m.id===mailId);if(mail)mail.read=true;});
  return c.router.open({appId:'files',route:file.route,params:{mailId}});
 }

 if(a==='kira-d02-open-file'){
  const id=t.dataset.id;
  if(![D02_MAIL,D02_A_MAIL].includes(id)||!c.store.get().content.mail.some(m=>m.id===id))return;
  c.store.update(s=>{const mail=s.content.mail.find(m=>m.id===id);mail.read=true;});
  return c.router.open({appId:'files',route:'/attachment/d02/'+id,params:{mailId:id}});
 }
 if(a==='kira-wallet-d06-ghost'){
  const st=c.store.get();
  if(!st.content.mail.some(m=>m.id===STORY55_WALLET_MAIL_ID))return;
  c.store.update(s=>{const m=s.content.mail.find(m=>m.id===STORY55_WALLET_MAIL_ID);if(m)m.read=true;});
  return c.router.open({appId:'ghost',route:'/deployment',params:{project:'wallet'}});
 }

 if(a==='kira-d01-bank'){let paid=false;c.store.update(s=>{paid=claimD01Bank(s);});if(!paid)c.toast('款項已結算');return;}
 if(a==='kira-d01-open-file'){
  const s=c.store.get();
  if(!s.story55?.d01?.repairAccepted||!s.content.mail.some(m=>m.id===D01_ATTACHMENT))return;
  c.store.update(s=>{const m=s.content.mail.find(m=>m.id===D01_ATTACHMENT);if(m)m.read=true;});
  return c.router.open({appId:'files',route:'/attachment/d01-mirage001',params:{mailId:D01_ATTACHMENT}});
 }

 if(a.startsWith('kira-linked-')){
  const id=t.dataset.order,mission=linkedMission(c.store.get(),id);
  if(!mission)return;
  const mail=linkedMailId(id);
  if(a==='kira-linked-research')return c.router.open({appId:'browser',route:'/mission-search',params:{orderId:id}});
  if(a==='kira-linked-send'){
   if(mission.stage<2)return c.toast('先检索任务资料');
   c.store.update(s=>advanceLinkedMission(s,id,3));
   c.toast('任务确认已发送');return;
  }
  if(a==='kira-linked-ghost'){
   if(mission.stage<3)return c.toast('尚未发送任务确认');
   c.store.update(s=>{authorize(s,{orderId:id,mailId:mail,type:linkedMission(s,id).type});advanceLinkedMission(s,id,4);});
   return c.router.open({appId:'ghost',route:'/contract',params:{orderId:id}});
  }
  if(a==='kira-linked-settle'){
   const success=c.store.get().ghost?.orders?.[id]?.status==='success';
   if(!success)return c.toast('GHOST 尚未完成');
   return c.router.open({appId:'kira',route:'/compose/linked/'+encodeURIComponent(id),params:{}});
  }
  if(a==='kira-linked-open-files')return c.router.open({appId:'files',route:'/linked/'+encodeURIComponent(id),params:{}});
  if(a==='kira-linked-back')return c.router.open({appId:'kira',route:'/mail/'+mail,params:{}});
  if(a==='kira-linked-sent')return c.router.open({appId:'kira',route:'/mail/'+linkedDeliveryId(id),params:{}});
  return;
 }

 if(a==='kira-back')c.router.open({appId:'kira',route:'/',params:{}});
 if(a==='kira-sent-list')c.router.open({appId:'kira',route:'/sent',params:{}});
 if(a==='kira-mail'){
  c.store.update(s=>{const mail=s.content.mail.find(m=>m.id===t.dataset.id);if(mail)mail.read=true;});
  return c.router.open({appId:'kira',route:'/mail/'+t.dataset.id});
 }
 if(a==='kira-mission-browser')c.router.open({appId:'browser',route:'/mission-search',params:{orderId:HACKER_BOUNTY_ID}});
 if(a==='kira-mission-compose')c.router.open({appId:'kira',route:'/compose/'+HACKER_BOUNTY_ID});
 if(a==='kira-mission-theme'){
  const selected=phishingThemes.find(x=>x.id===t.dataset.theme);
  if(!selected?.correct){c.toast('主题与目标不符，请重新选择');return;}
  c.store.update(s=>{const mail=s.content.mail.find(m=>m.id===HACKER_MAIL_ID);if(mail)mail.selectedTheme=selected.id;});
 }
 if(a==='kira-forge-preview')return c.router.open({appId:'browser',route:'/forge-preview',params:{orderId:HACKER_BOUNTY_ID}});
 if(a==='kira-mission-send'){
  const mail=c.store.get().content.mail.find(m=>m.id===HACKER_MAIL_ID);
  if(!phishingThemes.find(x=>x.id===mail?.selectedTheme)?.correct)return;
  c.store.update(s=>{const m=s.content.mail.find(x=>x.id===HACKER_MAIL_ID);if(m)m.simulationLink='https://board.example.invalid/meeting';});
  advanceHackerMission(c.store,3);
  c.toast('邮件已发送 · 下一步：GHOST');
  c.router.open({appId:'kira',route:'/mail/'+HACKER_MAIL_ID});
 }
 if(a==='kira-mission-ghost'){const mail=c.store.get().content.mail.find(m=>m.id===HACKER_MAIL_ID);const order=c.store.get().content.orders.find(o=>o.id===HACKER_BOUNTY_ID);if(!mail||mail.missionStep<3||!order||order.status==='OPEN')return;c.store.update(s=>authorize(s,{orderId:HACKER_BOUNTY_ID,mailId:HACKER_MAIL_ID,type:s.ghost?.missionTypes?.[HACKER_BOUNTY_ID]||'cipher'}));c.router.open({appId:'ghost',route:'/contract',params:{orderId:HACKER_BOUNTY_ID}});}
 if(a==='kira-ghost-submit')c.store.update(s=>submitGhost(s,HACKER_BOUNTY_ID));
}

export function submitFormLinked(form,c){
 if(form.dataset.form!=='kira-linked-deliver')return false;
 const id=form.dataset.order,values=new FormData(form);
 const attachment=String(values.get('attachment')||''),note=String(values.get('note')||'');
 c.store.update(s=>deliverLinkedArtifact(s,id,attachment,{note}));
 c.toast?.('已发送附成果的邮件，等待雇主按游戏时间验收');
 c.router.open({appId:'kira',route:'/mail/'+linkedDeliveryId(id),params:{}});
 return true;
}
export const submitForm=submitFormLinked;
export function submit(form,c){return submitFormLinked(form,c);}

````
