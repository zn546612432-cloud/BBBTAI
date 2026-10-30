// Additive, player-editable MIRAGE history. No real malware instructions.
export const WALLET_CHALLENGE_ID='mirage-ouroboros-10btc-d05';
const msg=(id,from,text,day,time)=>({id,from,text,day,time,kind:'text',storyImported:true});
export const starterContacts=[
 {id:'mc-arms-partner',name:'BASILISK SUPPLY',avatar:'BS',online:false,storySeed:true,
  messages:[
   msg('bs-01','mc-arms-partner','上一批装备的订单我已经核对过了。附件上的交接数量有没有变？',1,'09:42'),
   msg('bs-02','me','没有。你们负责运输，我只要货物如约到场。',1,'09:45'),
   msg('bs-03','mc-arms-partner','知道。你总是把责任划得很清楚。',1,'09:48'),
   msg('bs-04','me','所以合作才长久。钱的事我会按约定结。',1,'09:50')
  ]},
 {id:'mc-peer-crypt',name:'Pale Vector',avatar:'PV',online:true,storySeed:true,
  messages:[
   msg('pv-01','mc-peer-crypt','看到昨天那个开源模型的安全评审了吗？他们又把性能基准混到一起了。',1,'11:08'),
   msg('pv-02','me','看了。曲线漂亮得有点过分，测试条件没有写清楚。',1,'11:12'),
   msg('pv-03','mc-peer-crypt','有人把旧版本直接拿来测新任务。',1,'11:14'),
   msg('pv-04','me','那就是营销材料，不是实验报告。',1,'11:16')
  ]},
 {id:'mc-support-echo',name:'ECHO-41',avatar:'E4',online:false,storySeed:true,
  messages:[
   msg('ec-01','mc-support-echo','上个月买的那枚芯片有问题。我的测试设备识别不到授权证书。',1,'13:20'),
   msg('ec-02','me','发我订单回执和设备型号，不要发未经处理的个人数据。',1,'13:28'),
   msg('ec-03','mc-support-echo','发到加密邮箱了。能退吗？',1,'14:02'),
   msg('ec-04','me','先确认是不是批次问题。如果是硬件故障按约定更换，别在公开频道讨论细节。',1,'14:09'),
   msg('ec-05','mc-support-echo','明白，我等你的检测结果。',1,'14:12')
  ]},
 {id:'mc-done-sable',name:'SABLE ACCOUNT',avatar:'SA',online:false,storySeed:true,
  messages:[
   msg('sa-01','mc-done-sable','交付结果已经验收。',1,'16:37'),
   msg('sa-02','mc-done-sable','支付回执已出。款项转入你留的账户，请查收。',1,'16:38'),
   msg('sa-03','me','收到了。订单关闭。',1,'16:41')
  ]}
];
export const ouroborosContact={
 id:'mc-ourob-d05',name:'Dr Ouroboros',avatar:'D',online:true,storySeed:true,
 messages:[
  msg('ou-01','mc-ourob-d05','各位，放了一个有十枚比特币的电子钱包在站上。谁拿得到，就是谁的。',5,'21:06'),
  msg('ou-02','me','十枚？口气不小。',5,'21:12'),
  msg('ou-03','mc-ourob-d05','总有人觉得自己配得上这个机会。',5,'21:15')
 ]
};
export const walletChallenge={
 id:WALLET_CHALLENGE_ID,title:'OUROBOROS / 10 BTC WALLET CHALLENGE',
 owner:'Dr Ouroboros',reward:'10 BTC',category:'CYBER',status:'OPEN',
 description:'匿名技术挑战：衔尾蛇博士放出装有十枚比特币的虚构测试钱包，公开邀请高手挑战。完成后由剧情系统判定，非现实加密钱包入侵操作。',
 storyDay:5,storySeed:true
};
export function ensureMirageStory(s){
 s.content.conversations??={};
 const list=s.content.conversations.mirage??=[];
 for(const c of starterContacts)if(!list.some(x=>x.id===c.id))list.push(structuredClone(c));
 if(s.day>=5){
  if(!list.some(x=>x.id===ouroborosContact.id))list.push(structuredClone(ouroborosContact));
  if(!s.content.orders.some(o=>o.id===WALLET_CHALLENGE_ID))s.content.orders.push({...walletChallenge});
 }
}
export function completeWalletChallenge(s){
 if(s.day<5)throw Error('悬赏在 D05 才出现');
 const o=s.content.orders.find(x=>x.id===WALLET_CHALLENGE_ID);
 if(!o||o.status==='COMPLETED')return false;
 o.status='COMPLETED';
 const c=s.content.conversations.mirage.find(x=>x.id===ouroborosContact.id);
 if(c){
  for(const m of [
   msg('ou-04','me','我拿到了。',s.day,s.clock),
   msg('ou-05','mc-ourob-d05','Congratulations. 比我预期的快。',s.day,s.clock),
   msg('ou-06','mc-ourob-d05','未来我们还会有机会合作。',s.day,s.clock)
  ])if(!c.messages.some(x=>x.id===m.id))c.messages.push(m);
 }
 s.content.mirage??={};s.content.mirage.transactions??=[];
 if(!s.content.mirage.transactions.some(x=>x.id==='ou-btc10')){
  s.content.mirage.transactions.unshift({id:'ou-btc10',type:'REWARD',asset:'BTC',amount:10,time:s.clock,day:s.day,description:'OUROBOROS CHALLENGE'});
 }
 s.events.push({type:'mirage_wallet_challenge_completed',day:s.day,clock:s.clock,asset:'BTC',quantity:10});
 return true;
}
