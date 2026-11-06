// One state machine for optional Reminders -> Bank -> delivery -> WeChat rewards.
// All functions accept the existing PhoneStore state. No new storage or clock.
import {WISH_CATALOG,wishDefinition} from './catalog.js';
import {appendAuthoredPhoneMessage} from '../messaging/phone-messages.js';
import {completed,date55} from '../story55/state.js';

const today=s=>date55(s.day);
const perDay=s=>s.story55?.version===1&&!s.story55?.ended;
const ledger=s=>s.story55.wishes??=( {records:{},story:{started:false,lines:[],nextAt:null,serial:0,d07Started:false}} );
const record=(s,id)=>ledger(s).records[id]||null;
const hasPhrase=(s,id)=>Object.values(s.content?.conversations||{}).some(list=>list.some(c=>c.messages?.some(m=>m.wishId===id)));
export const getWish=(s,id)=>s.story55?.wishes?.records?.[id]||null;
export function wishExpired(s,id){
 const w=wishDefinition(id);
 return !!(w?.expires&&(s.day>w.expires.day||(s.day===w.expires.day&&s.clock>=w.expires.clock)));
}
export function canAddWish(s,id){
 return perDay(s)&&!!wishDefinition(id)&&hasPhrase(s,id)&&!wishExpired(s,id);
}
export function addWish(s,id){
 const w=wishDefinition(id);
 if(!w||!canAddWish(s,id))throw Error('这条心愿目前无法添加');
 if(record(s,id))return false;
 ledger(s).records[id]={id,status:'saved',foundDay:s.day,foundClock:s.clock};
 s.content.reminders??=[];
 if(!s.content.reminders.some(r=>r.id==='wish-'+id))
   s.content.reminders.push({id:'wish-'+id,wishId:id,title:w.title,done:false,createdDay:s.day});
 s.events.push({type:'wish_saved',wishId:id,day:s.day,clock:s.clock});
 return true;
}
export function purchaseWish(s,id){
 const w=wishDefinition(id),r=record(s,id);
 if(!w||!r||r.status!=='saved')throw Error('请先把心愿加入提醒事项');
 if(wishExpired(s,id))throw Error('这项聚餐安排已经过期了');
 const balance=Number(s.bankData?.balance);
 if(!Number.isFinite(balance)||balance<w.price)throw Error('银行余额不足，请先兑换资产或积攒资金');
 const txid='wish-purchase-'+id;
 s.bankData.transactions??=[];
 if(s.bankData.transactions.some(t=>t.id===txid))throw Error('这项心愿已经购买');
 s.bankData.balance=Math.round((balance-w.price)*100)/100;
 s.bankData.transactions.unshift({id:txid,label:w.title,amount:-w.price,date:today(s),time:s.clock,wishId:id});
 Object.assign(r,{status:w.kind==='event'?'delivered':'ordered',purchasedDay:s.day,purchasedClock:s.clock,
   deliveryDay:w.kind==='event'?s.day:s.day+w.deliveryDays,
   deliveryClock:w.kind==='event'?s.clock:'15:00'});
 const reminder=s.content.reminders.find(x=>x.wishId===id);
 if(reminder){reminder.done=w.kind==='event';reminder.wishStatus=r.status;}
 s.events.push({type:'wish_purchased',wishId:id,day:s.day,clock:s.clock});
 // Queue follow-ups; never immediately force-send NPC chat inside a bank action.
 queueReward(s,id,w.kind==='event');
 return true;
}
function queue(s,entry){
 const st=ledger(s).story;
 if(st.lines.some(x=>x.id===entry.id))return false;
 st.lines.push(entry);return true;
}
function group(id,from,text,opts={}){return {id,channel:'wechat',chat:'group',from,text,...opts};}
function dm(id,chat,from,text,opts={}){return {id,channel:'wechat',chat,from,text,...opts};}
const celebration=[
 group('d06-celebrate-01','小辛','？？？？'),
 group('d06-celebrate-02','小辛','十个？！我去搜一下值多少钱'),
 group('d06-celebrate-03','胡枫','你先说清楚是发财了还是发癫了哈哈哈哈'),
 group('d06-celebrate-04','仔仔','真的假的，阿蒙？'),
 group('d06-celebrate-05','阿威','已经到账了？'),
 group('d06-celebrate-06','熙旺','阿蒙，先把资产保管好。别一下全换了。'),
 group('d06-celebrate-07','小辛','蒙哥我是不是可以申请一把机械键盘哈哈哈哈！我那个空格键都快坏了', {wishId:'d06-keyboard',wishText:'机械键盘'}),
 group('d06-celebrate-08','胡枫','小辛，你上一把不还说能用十年'),
 group('d06-celebrate-09','小辛','现在不能了！！'),
 group('d06-celebrate-10','仔仔','那晚上一起出去吃饭？大家好久没一起出去吃了', {wishId:'d06-dinner',wishText:'一起出去吃饭'}),
 group('d06-celebrate-11','熙旺','我今天收车后再看，不用为了庆祝乱花钱。')
];
const privateScenes=[
 dm('d06-shoes-01','hufeng','胡枫','说起来，我那双鞋底都快磨平了，准备过两天去看看新的。',{wishId:'d06-shoes',wishText:'新的'}),
 dm('d06-shoes-02','hufeng','胡枫','不用你给我买啊，刚才大家起哄闹着玩呢。')
];
const nextDay=[
 group('d07-chat-01','胡枫','今天谁有空？'),
 group('d07-chat-02','小辛','干嘛'),
 group('d07-chat-03','胡枫','出去走走啊'),
 group('d07-chat-04','小辛','昨天玩到三点了，饶了我吧'),
 group('d07-chat-05','熙旺','你们下午要是出去，顺路帮我买点东西回来'),
 group('d07-chat-06','仔仔','买什么？'),
 group('d07-chat-07','熙旺','我晚点发你清单。')
];
const extraDay=[
 dm('d07-awei-01','awei','阿威','我那副耳机接触不良，昨天开会又断了。准备换副无线耳机。',{wishId:'d07-headphones',wishText:'无线耳机'}),
 dm('d07-wang-01','wang','熙旺','家里吃饭的碗有几只都磕了口，过两天我去添一套新餐具。',{wishId:'d07-tableware',wishText:'新餐具'})
];
const rewardSets={
 'd06-keyboard':[
  dm('wish-keyboard-thanks-1','xiaoxin','小辛','蒙哥！！！！键盘到啦哈哈哈哈'),
  dm('wish-keyboard-photo','xiaoxin','小辛','/assets/d06-wishes/keyboard-received.jpg',{kind:'image'}),
  dm('wish-keyboard-thanks-2','xiaoxin','小辛','你下次打游戏可不许再说我设备差了！')
 ],
 'd06-shoes':[
  dm('wish-shoes-thanks-1','hufeng','胡枫','阿蒙，你真给我买了？我刚才还以为快递送错了。'),
  dm('wish-shoes-photo','hufeng','胡枫','/assets/d06-wishes/shoes-received.jpg',{kind:'image'}),
  dm('wish-shoes-thanks-2','hufeng','胡枫','这鞋穿着还挺舒服。谢了啊，改天请你喝东西。')
 ],
 'd07-headphones':[
  dm('wish-headphones-thanks-1','awei','阿威','耳机收到了。'),
  dm('wish-headphones-thanks-2','awei','试过了，声音没问题。谢谢。')
 ],
 'd07-tableware':[
  dm('wish-tableware-thanks-1','wang','熙旺','阿蒙，家里送来一套餐具。你买的？'),
  dm('wish-tableware-thanks-2','wang','原来那些还能用，不过这套也挺好。晚上回来吃饭。')
 ],
 'd06-dinner':[
  group('wish-dinner-01','仔仔','地方我联系好了，今晚七点半。阿蒙你付款了？'),
  group('wish-dinner-02','小辛','我宣布今天不减肥了！！'),
  group('wish-dinner-03','胡枫','你什么时候减过哈哈哈哈'),
  group('wish-dinner-photo','仔仔','/assets/d06-wishes/celebration-dinner.jpg',{kind:'image'})
 ]
};
function queueReward(s,id,isEvent){
 const r=record(s,id);
 if(!r||r.rewardQueued)return;
 r.rewardQueued=true;
 for(const item of rewardSets[id]||[])queue(s,{...item,
   dueDay:isEvent?s.day:r.deliveryDay,
   dueClock:isEvent?'19:30':'16:00',
   silentAfterDay:!isEvent,
   wishRewardId:id});
}
export function beginD06Celebration(s,now=Date.now()){
 if(!perDay(s)||s.day!==6||!completed(s,'wallet'))throw Error('请先完成 D06 钱包挑战');
 const story=ledger(s).story;
 if(story.started)return false;
 const msg=appendAuthoredPhoneMessage(s,{channel:'wechat',conversationId:'group',
  messageId:'d06-celebration-player',from:'me',text:'兄弟们！我真的拿到 10 BTC 了！',
  day:6,clock:s.clock,sentDate:today(s),storyTag:'storyD06'});
 if(!msg)return false;
 story.started=true;
 for(const line of celebration)queue(s,{...line,dueDay:6,dueClock:s.clock,silentAfterDay:true});
 for(const line of privateScenes)queue(s,{...line,dueDay:6,dueClock:s.clock,afterId:'d06-celebrate-11',silentAfterDay:true});
 story.nextAt=now+1800;
 s.events.push({type:'d06_celebration_started',day:s.day,clock:s.clock});
 return true;
}
function eligibleLine(s,line){
 if(s.day<line.dueDay||s.day===line.dueDay&&s.clock<line.dueClock)return false;
 if(line.afterId&&!ledger(s).story.delivered?.includes(line.afterId))return false;
 if(line.wishRewardId){
   const r=record(s,line.wishRewardId);
   if(!r||r.status!=='delivered'&&r.status!=='completed')return false;
 }
 return true;
}
export function wishEventsDue(s,now=Date.now()){
 if(!perDay(s))return false;
 const st=s.story55?.wishes?.story;
 if(st?.started&&s.day>=7&&!st.d07Started&&s.clock>='09:00')return true;
 if(st?.lines?.some(x=>!st.delivered?.includes(x.id)&&eligibleLine(s,x))&&now>=(st.nextAt||0))return true;
 return Object.values(s.story55?.wishes?.records||{}).some(r=>r.status==='ordered'&&s.day>=r.deliveryDay&&(s.day>r.deliveryDay||s.clock>='15:00'));
}
export function tickWishes(s,now=Date.now()){
 if(!perDay(s))return false;
 const w=s.story55?.wishes;
 if(!w)return false;
 let changed=false;
 for(const r of Object.values(w.records)){
  if(r.status==='saved'&&wishExpired(s,r.id)){
   r.status='expired';const item=s.content.reminders?.find(x=>x.wishId===r.id);
   if(item)item.wishStatus='expired';changed=true;
  }
  if(r.status!=='ordered'||s.day<r.deliveryDay||s.day===r.deliveryDay&&s.clock<'15:00')continue;
  r.status='delivered';
  const reminder=s.content.reminders?.find(x=>x.wishId===r.id);
  if(reminder){reminder.done=true;reminder.wishStatus='delivered';}
  queueReward(s,r.id,false);changed=true;
 }
 const st=w.story;
 if(st.started&&!st.d07Started&&s.day>=7&&s.clock>='09:00'){
  st.d07Started=true;
  for(const line of nextDay)queue(s,{...line,dueDay:7,dueClock:'09:00',silentAfterDay:true});
  for(const line of extraDay)queue(s,{...line,dueDay:7,dueClock:'11:00',silentAfterDay:true});
  if(record(s,'d06-dinner')?.status==='delivered')
   queue(s,{...group('d07-dinner-after','小辛','昨天吃得太撑了，我今天真的不想看见肉了'),dueDay:7,dueClock:'09:00'});
  changed=true;
 }
 st.delivered??=[];
 if(now<(st.nextAt||0))return changed;
 const line=st.lines.find(x=>!st.delivered.includes(x.id)&&eligibleLine(s,x));
 if(!line)return changed;
 const m=appendAuthoredPhoneMessage(s,{channel:'wechat',conversationId:line.chat,
  messageId:line.id,from:line.from,text:line.text,kind:line.kind||'text',
  day:s.day>line.dueDay?line.dueDay:s.day,clock:s.day>line.dueDay?line.dueClock:s.clock,
  sentDate:date55(Math.min(s.day,line.dueDay)),storyTag:'storyWish',
  silent:!!(line.silentAfterDay&&s.day>line.dueDay)});
 if(m&&line.wishId){m.wishId=line.wishId;m.wishText=line.wishText;}
 st.delivered.push(line.id);st.nextAt=now+2000;changed=true;
 return changed;
}
