// D01 (2025-05-19) cross-app story. All progress lives in the phone save.
// Real seconds schedule mail/UI bubbles; game minutes schedule Wang's reply.
import {isStory55,date55,completed,completeNode} from './state.js';

export const D01_HISTORY='d01-vulnerability-archive';
export const D01_ORDER='mirage001';
export const D01_HUNT='d01-australian-pursuit';
export const D01_OPENING_MAIL='d01-mirage-history-paid';
export const D01_ORDER_MAIL='d01-mirage001-attachment';
export const D01_DONE_MAIL='d01-mirage001-completed';
export const D01_CONTACT='d01-cipher-7';
export const D01_BANK_TX='d01-bank-vulnerability-2000';
export const D01_BTC_TX='d01-mirage001-btc-credit';

export const activeD01=s=>isStory55(s)&&s.day===1;
export const d01=s=>s.story55?.d01||null;
export const d01Ready=s=>!!(d01(s)?.bankPaid&&d01(s)?.order?.paid);
const nowMinute=s=>(s.story55?.d01?.nightPhase?1440:0)+Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3));
const own=(s,id)=>s.nav?.current?.appId==='wechat'&&s.nav.current.route==='/chat/'+id&&s.unlocked;
const links=(appId,route)=>({appId,route,params:{}});
const moment=s=>({day:s.day,time:s.clock,sentDate:date55(s.day),actual:true,story55:true});
function pushMail(s,mail,notice=true){
 const list=s.content.mail??(s.content.mail=[]);
 if(list.some(x=>x.id===mail.id))return false;
 list.unshift({...mail,date:date55(s.day),day:s.day,time:s.clock,read:false,story55D01:true});
 if(notice)s.notifications.unshift({id:'notice-'+mail.id,title:'KIRA',body:mail.subject,day:s.day,clock:s.clock,link:links('kira','/mail/'+mail.id)});
 return true;
}
function pushChat(s,id,name,from,text,key,delayNotice=true){
 const c=s.content.conversations.wechat?.find(c=>c.id===id);
 if(!c||c.messages.some(m=>m.id===key))return false;
 c.messages.push({id:key,from,text,kind:'text',...moment(s)});
 if(!own(s,id)&&delayNotice){
  c.unread=(Number(c.unread)||0)+1;
  s.notifications.unshift({id:'notice-'+key,title:'微信',body:name+'：'+text,conversationId:id,day:s.day,clock:s.clock,link:links('wechat','/chat/'+id)});
 }
 return true;
}
const groupLines=[
 ['小辛','小辛','还不是我们太菜了，哈哈。'],
 ['熙旺','wang','好']
];
const reminder=(id,title,done=false)=>({id,title,done,story55D01:true,auto:true});

export function ensureD01(s){
 if(!isStory55(s))return null;
 const root=s.story55.d01??(s.story55.d01={version:1,unlockAt:null,openingDelivered:false,bankPaid:false,nightPhase:false,atGate:false,
  group:{stage:'idle',dueAt:null},brother:{stage:'idle',sent:0,replyAt:null,dueAt:null},
  order:{accepted:false,mailAt:null,mailDelivered:false,keyOpened:false,deployed:false,completed:0,board:null,boardSaved:false,exitPrompt:false,leaveApproved:false,submitAt:null,paid:false}});
 root.group??={stage:'idle'};
 root.brother??={stage:'idle',sent:0};
 root.order??={accepted:false,completed:0,paid:false};
 s.content.orders??=[];
 const seed=[
  {id:D01_HISTORY,title:'漏洞掃描',owner:'幣速達網安系統',reward:'2,000 USD',category:'技術',status:'COMPLETED',description:'歷史漏洞掃描訂單，於2025年5月19日結算。',story55D01:true},
  {id:D01_ORDER,title:'數據修復',owner:'匿名僱主',reward:'0.04 BTC',category:'技術',status:root.order.paid?'COMPLETED':root.order.accepted?'ACCEPTED':'OPEN',description:'硬碟損壞，需要修復資料。',story55D01:true},
  {id:D01_HUNT,title:'追殺令',owner:'匿名委託',reward:'權限受限',category:'僅供查閱',status:'OPEN',description:'目標：Arthur Bellwick（亞瑟·貝爾維克），虛構澳大利亞州議員，涉及海外資金爭議。\n本身份無接取權限。',story55D01:true,viewOnly:true}
 ];
 for(const entry of seed)if(!s.content.orders.some(x=>x.id===entry.id))s.content.orders.push(entry);
 const items=s.content.reminders??(s.content.reminders=[]);
 for(const item of [reminder('d01-bank-reminder','查收訂單結款',root.bankPaid),reminder('d01-repair-reminder','完成數據修復',root.order.paid)]){
  const found=items.find(r=>r.id===item.id);
  if(found){found.done=item.done;found.auto=true;}else items.push(item);
 }
 return root;
}

export function tickD01(s,now=Date.now()){
 if(!activeD01(s))return false;
 const p=ensureD01(s);let changed=false;
 if(s.unlocked&&!p.openingDelivered&&p.unlockAt===null){p.unlockAt=now;changed=true;}
 if(p.unlockAt!==null&&!p.openingDelivered&&now>=p.unlockAt+3000){
  p.openingDelivered=true;
  pushMail(s,{id:D01_OPENING_MAIL,orderId:D01_HISTORY,from:'MIRAGE Network',subject:'[MIRAGE] Order Completed',
   body:'Dear Nyarlathotep,\n\nYour vulnerability scanning order has been completed. The payment has been transferred to your designated bank account. Please check your bank account for confirmation.\n\nBest regards,\nMIRAGE Network'});
  changed=true;
 }
 const o=p.order;
 if(o.accepted&&!o.mailDelivered&&Number.isFinite(o.mailAt)&&now>=o.mailAt){
  o.mailDelivered=true;
  pushMail(s,{id:D01_ORDER_MAIL,orderId:D01_ORDER,from:'MIRAGE Network',subject:'[MIRAGE] Order Attachment',
   body:'Dear Nyarlathotep,\n\nThe client has delivered the attachment access key: mirage001. Please confirm receipt and deploy the recovery tool through GHOST.\n\nMIRAGE Network'});
  changed=true;
 }
 if(Number.isFinite(o.submitAt)&&!o.paid&&now>=o.submitAt){
  o.paid=true;
  const record=s.content.orders.find(x=>x.id===D01_ORDER);
  if(record)record.status='COMPLETED';
  const wallet=s.content.mirage;
  wallet.digitalTransactions??=[];
  if(!wallet.digitalTransactions.some(x=>x.id===D01_BTC_TX)){
   wallet.digitalBalance=Math.round((Number(wallet.digitalBalance)||0)*100000000+4000000)/100000000;
   wallet.digitalTransactions.unshift({id:D01_BTC_TX,orderId:D01_ORDER,amount:0.04,asset:'BTC',day:s.day,clock:s.clock,at:now});
  }
  pushMail(s,{id:D01_DONE_MAIL,orderId:D01_ORDER,from:'MIRAGE Network',subject:'[MIRAGE] Order Completed',
   body:'Dear Nyarlathotep,\n\nThe mirage001 data recovery order has been completed. Your payment of 0.04 BTC has been credited to your MIRAGE wallet.\n\nMIRAGE Network'});
  changed=true;
 }
 // Only the day-one dialogue engine may deliver these authored bubbles.
 if(p.group.dueAt!==null&&Number.isFinite(p.group.dueAt)&&now>=p.group.dueAt){
  const g=p.group;
  const afternoon=g.afternoon;
  const steps={
   xin1:['xin2','小辛','小辛',afternoon?'蒙蒙哥，你不会现在才起吧？':'嗯？蒙蒙哥怎么今天起得那么早？',1000],
   xin2:['wang1','小辛','小辛',afternoon?'昨天和我打游戏打得那么晚，果然起不来床了，哈哈':'昨天和我打游戏打到那么晚…今天不到12点居然就醒了。',3000],
   wang1:['wang2','熙旺','wang','怎么又熬夜打游戏？你的眼睛度数已经很深了，阿蒙。',2000],
   wang2:['player1','熙旺','wang','今天不忙的话，就再去睡会，我中午收车回来给你带午餐。',2000],
   xinEnd:['wangEnd','小辛','小辛',groupLines[0][2],2000],
   wangEnd:['done','熙旺','wang',groupLines[1][2],0]
  };
  const step=steps[g.stage];
  if(step){
   pushChat(s,'group',step[2],step[2],step[3],'d01-group-'+g.stage);
   g.stage=step[0];g.dueAt=step[4]?now+step[4]:null;
   if(g.stage.startsWith('player'))g.dueAt=null;
   changed=true;
  }else if(/^player[23]Wait$/.test(g.stage)){
   g.stage='player'+(g.stage==='player2Wait'?'2':'3');g.dueAt=null;changed=true;
  }
 }
 const b=p.brother;
 if(b.stage==='hello'&&b.dueAt!==null&&now>=b.dueAt){
  pushChat(s,'wang','熙旺','wang','嗯？','d01-wang-hello');b.stage='waiting';b.dueAt=null;changed=true;
 }
 if(b.stage==='reply1'&&b.dueAt!==null&&now>=b.dueAt){
  pushChat(s,'wang','熙旺','wang','刚才在开车','d01-wang-reply1');b.stage='reply2';b.dueAt=now+2000;changed=true;
 }
 if(b.stage==='reply2'&&b.dueAt!==null&&now>=b.dueAt){
  pushChat(s,'wang','熙旺','wang','怎么发了那么多消息？现在看不及时，不重要的话，有什么话等我回家当面跟我讲吧。','d01-wang-reply2');
  b.stage='done';b.dueAt=null;changed=true;
 }
 if(b.stage==='waiting'&&b.sent>=3&&b.replyAt!==null&&nowMinute(s)>=b.replyAt){
  b.stage='reply1';b.dueAt=now;changed=true;
 }
 for(const [id,value] of [['d01-bank-reminder',p.bankPaid],['d01-repair-reminder',o.paid]]){
  const r=s.content.reminders?.find(x=>x.id===id);
  if(r&&r.done!==value){r.done=value;changed=true;}
 }
 if(d01Ready(s)&&!completed(s,'intro')){completeNode(s,'intro');changed=true;}
 return changed;
}
export function dueD01(s,now=Date.now()){
 if(!activeD01(s))return false;
 const p=d01(s);if(!p)return true;
 if(s.unlocked&&!p.openingDelivered&&p.unlockAt===null)return true;
 return Boolean(p.unlockAt!==null&&!p.openingDelivered&&now>=p.unlockAt+3000
  ||p.order.accepted&&!p.order.mailDelivered&&p.order.mailAt!==null&&now>=p.order.mailAt
  ||p.order.submitAt!==null&&!p.order.paid&&now>=p.order.submitAt
  ||p.group.dueAt!==null&&now>=p.group.dueAt
  ||['hello','reply1','reply2'].includes(p.brother.stage)&&p.brother.dueAt!==null&&now>=p.brother.dueAt
  ||p.brother.stage==='waiting'&&p.brother.sent>=3&&p.brother.replyAt!==null&&nowMinute(s)>=p.brother.replyAt);
}
export function claimD01Bank(s){
 if(!activeD01(s))return false;
 const p=ensureD01(s);
 if(!p.openingDelivered)throw Error('訂單郵件尚未送達');
 if(p.bankPaid)return false;
 p.bankPaid=true;
 const tx=s.bankData.transactions??(s.bankData.transactions=[]);
 if(!tx.some(x=>x.id===D01_BANK_TX)){
  s.bankData.balance=Number(s.bankData.balance||0)+2000;
  tx.unshift({id:D01_BANK_TX,label:'【幣速達網安系統】轉入',amount:2000,time:s.clock,date:date55(s.day),story55D01:true});
 }
 s.notifications.unshift({id:'notice-'+D01_BANK_TX,title:'太平洋銀行',body:'尾號1846卡5月19日'+s.clock.replace(':','時')+'分收入2,000美元',day:s.day,clock:s.clock,link:links('bank','/')});
 tickD01(s);
 return true;
}
export function acceptD01Order(s,now=Date.now()){
 if(!activeD01(s))return false;
 const p=ensureD01(s),o=p.order;
 if(o.accepted)return false;
 o.accepted=true;o.mailAt=now+2000;
 const order=s.content.orders.find(x=>x.id===D01_ORDER);if(order)order.status='ACCEPTED';
 // An independent Easter egg; do not link this conversation to order progress.
 const list=s.content.conversations.mirage??(s.content.conversations.mirage=[]);
 if(!list.some(x=>x.id===D01_CONTACT)){
  list.push({id:D01_CONTACT,name:'Cipher-7',avatar:'C7',online:false,unread:1,story55D01:true,
   messages:[{id:'d01-cipher7-hello',from:D01_CONTACT,text:'通信已建立。',kind:'text',...moment(s)}]});
  s.notifications.unshift({id:'d01-cipher7-notice',title:'MIRAGE',body:'Cipher-7：通信已建立。',conversationId:D01_CONTACT,day:s.day,clock:s.clock,link:links('mirage','/chat/'+D01_CONTACT)});
 }
 return true;
}
export function openD01Key(s){
 const p=ensureD01(s);if(!p?.order.mailDelivered)throw Error('附件尚未送達');
 p.order.keyOpened=true;
 return true;
}
export function deployD01(s,key){
 const p=ensureD01(s);if(!p?.order.keyOpened)throw Error('請先從 KIRA 開啟密鑰');
 if(String(key).trim()!=='mirage001')throw Error('部署密鑰錯誤');
 if(!p.order.deployed)p.order.deployed=true;
 return true;
}
export function receiveD01Round(s){
 const o=ensureD01(s)?.order;
 if(!o?.deployed||o.completed>=5)throw Error('修復尚未開放');
 if(o.board?.done!==true)throw Error('線路尚未接通');
 o.completed++;
 o.board=null;o.boardSaved=false;
 return o.completed;
}
export function submitD01Order(s,now=Date.now()){
 const o=ensureD01(s)?.order;
 if(!o||o.completed<5)throw Error('請先完成五處數據修復');
 if(o.submitAt!==null||o.paid)return false;
 o.submitAt=now+2000;
 return true;
}
export function onD01Message(s,channel,id,text,now=Date.now()){
 if(!activeD01(s)||!['wechat','mirage'].includes(channel))return;
 const p=ensureD01(s);
 if(channel==='mirage'&&id==='mc-flow-d03'){p.flowLeftMessage=true;return;}
 if(channel!=='wechat')return;
 if(id==='group'){
  if(p.group.stage==='idle'){
   p.group.stage='xin1';p.group.dueAt=now+3000;p.group.afternoon=s.clock>='12:00';
  }
 }else if(id==='wang'){
  const b=p.brother;
  if(b.stage==='idle'&&String(text).includes('哥')){b.stage='hello';b.dueAt=now+500;}
  else if(b.stage==='waiting'){
   b.sent++;
   if(b.sent>=3)b.replyAt=nowMinute(s)+2;
  }
 }
}
export function d01Draft(s,channel,id){
 if(!activeD01(s)||channel!=='wechat'||id!=='group')return null;
 const g=d01(s)?.group;
 const lines=['不知道怎么就醒了','还不是小辛说打赢boss才睡觉','谢谢哥，我要吃牛腩饭'];
 if(!g||!/^player[123]$/.test(g.stage))return null;
 const i=Number(g.stage.slice(-1))-1;
 return {id:'d01-group',index:i,kind:'me',text:lines[i],channel,conversationId:id};
}
export function sendD01Draft(s,text,now=Date.now()){
 const line=d01Draft(s,'wechat','group');
 if(!line||line.text!==String(text).trim())throw Error('請發送完整預設台詞');
 pushChat(s,'group','熙蒙','me',line.text,'d01-group-player'+(line.index+1),false);
 const g=d01(s).group;
 if(line.index<2){g.stage='player'+(line.index+2)+'Wait';g.dueAt=now+2000;}
 else {g.stage='xinEnd';g.dueAt=now+2000;}
 delete s.drafts?.group;
 return true;
}
export function d01WechatLocked(s,id){
 if(!activeD01(s))return false;
 const p=d01(s);
 if(id!=='group'&&id!=='wang')return true;
 if(id==='wang')return p?.brother?.stage==='done'||p?.brother?.stage==='reply1'||p?.brother?.stage==='reply2';
 return p?.group?.stage!=='idle'&&p?.group?.stage!=='done'&&!/^player[123]$/.test(p?.group?.stage||'');
}
// Developer-only reconstruction should not require five interactive puzzles.
export function simulateD01(s){
 const p=ensureD01(s);
 if(!p)return;
 p.openingDelivered=true;
 if(!s.content.mail.some(m=>m.id===D01_OPENING_MAIL))
  pushMail(s,{id:D01_OPENING_MAIL,from:'MIRAGE Network',subject:'[MIRAGE] Order Completed',body:'Archived payment.'},false);
 claimD01Bank(s);
 acceptD01Order(s,Date.now());
 p.order.mailAt=Date.now()-1;tickD01(s,Date.now());
 p.order.keyOpened=true;p.order.deployed=true;p.order.completed=5;p.order.submitAt=Date.now()-1;
 tickD01(s,Date.now());
}
