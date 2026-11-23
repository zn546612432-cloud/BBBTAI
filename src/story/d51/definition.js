// D51 / 2025-07-08: Isolde's second private contract and the authored KIRA dispatch.
import {D46_CONTACT} from '../d46/definition.js';
import {DEPOSIT_REPLY} from '../d47/definition.js';
import {D53_ISOLDE_DEAL} from '../d53/definition.js';
import {completed,completeNode,nodeStatus,date55,isStory55} from '../../services/story55/state.js';

export const D51_ISOLDE_CHAT='d51-isolde-second';
export const D51_PRIVATE_MAIL='d51-private-contract-mail';
export const D51_SENT_ID='s55-d51-private-contract-sent';
export const D51_MAIL_REMINDER='s55-d51-private-contract-reminder';
export const D51_MAIL_NOTICE='s55-d51-private-contract-notice';
export const D51_MAIL_TO='Isolde Mirage';
export const D51_MAIL_SUBJECT='Private Contract';
export const D51_MAIL_BODY='資料見附件，等你消息。';
export const D51_MAIL_ATTACHMENT='Target_Profile.enc';
export const D51_MAIL_LINK={appId:'kira',route:'/compose/private-contract',params:{}};
export const D51_DIALOGUE=[
 ['me','我還需要一支僱傭兵。'],
 ['isolde','僱傭兵的價格可不便宜。'],
 ['me','沒關係，我會用比特幣支付。'],
 ['isolde','Wow.'],
 ['isolde','比特幣，有意思。'],
 ['isolde','聽著，雖然我只是個拿佣金的中間人，但我做生意向來講信用。只要你付得起錢，我就能給你找來最好的人。'],
 ['me','我要熟悉安保工作的退役僱傭兵。'],
 ['isolde','還是要澳門本地的？'],
 ['me','當然，我沒耐心等他們入境。'],
 ['isolde','我倒是正好有人選。'],
 ['isolde','不過這次又是什麼差事？不會還是對付那個老頭吧？'],
 ['me','一個老頭，還有一個小女孩。'],
 ['isolde','Ha！'],
 ['isolde','我知道，做交易最忌諱問得太多。'],
 ['isolde','不過你這個客人還真有意思。'],
 ['isolde','資料發郵件給我，今晚幫你約人。']
];

export function applyD51Definition(c){
 if(c.d51Revision>=1)return false;
 c.nodes.push({
  id:D51_ISOLDE_CHAT,day:51,at:'19:00',title:'第二筆委託',
  channel:'mirage',conversationId:D46_CONTACT,requires:[DEPOSIT_REPLY],requiresContact:true,
  kind:'scene',delivery:'queued',gateDay:51,pauseTimeUntilComplete:true,
  messagePrefix:'s55-'+D51_ISOLDE_CHAT,initialDelayMs:0,pauseMs:3000
 });
 c.scenes[D51_ISOLDE_CHAT]=structuredClone(D51_DIALOGUE);
 // This mail is player-sent, not a generated incoming KIRA mail: its
 // completion is owned exclusively by KIRA's real submit event.
 c.nodes.push({
  id:D51_PRIVATE_MAIL,day:51,at:'19:00',title:'發送目標資料',
  requires:[D51_ISOLDE_CHAT],kind:'mail',manualSend:true,
  gateDay:51,pauseTimeUntilComplete:true
 });
 const deal=c.nodes.find(n=>n.id===D53_ISOLDE_DEAL);
 if(deal&&!deal.requires.includes(D51_PRIVATE_MAIL))deal.requires.push(D51_PRIVATE_MAIL);
 c.d51Revision=1;
 return true;
}

export const D51_FIXED_MAIL={
 to:D51_MAIL_TO,subject:D51_MAIL_SUBJECT,body:D51_MAIL_BODY,attachment:D51_MAIL_ATTACHMENT
};

export function sendD51PrivateMail(s,fields,{test=false}={}){
 if(!isStory55(s))throw Error('請先進入劇情');
 if(completed(s,D51_PRIVATE_MAIL))return false;
 const status=nodeStatus(s,D51_PRIVATE_MAIL);
 if(status.state!=='ready')throw Error(status.reason);
 if(!fields||Object.entries(D51_FIXED_MAIL).some(([key,value])=>String(fields[key]??'')!==value))
  throw Error('請使用已確認的收件人、正文及加密附件');
 if(s.content.mail.some(m=>m.id===D51_SENT_ID))throw Error('這封郵件已存在');
 s.content.mail.unshift({
  id:D51_SENT_ID,to:D51_MAIL_TO,from:'熙蒙',subject:D51_MAIL_SUBJECT,
  body:D51_MAIL_BODY,attachments:[D51_MAIL_ATTACHMENT],
  storyD51Sent:true,read:true,sent:true,day:s.day,time:s.clock,date:date55(s.day),
  ...(test?{developerSimulated:true}:{})
 });
 completeNode(s,D51_PRIVATE_MAIL,{test});
 s.events.push({type:'story55_mail_sent',mailId:D51_SENT_ID,day:s.day,clock:s.clock,test});
 return true;
}

export function syncD51MailReminder(s){
 if(!isStory55(s))return false;
 const reminders=s.content.reminders??(s.content.reminders=[]);
 const exists=reminders.find(r=>r.id===D51_MAIL_REMINDER);
 const done=completed(s,D51_PRIVATE_MAIL);
 if(exists){exists.done=done;return false;}
 if(s.day!==51||!completed(s,D51_ISOLDE_CHAT)||done)return false;
 reminders.push({
  id:D51_MAIL_REMINDER,title:'發送目標資料',done:false,
  storyNode:D51_PRIVATE_MAIL,priority:'critical',link:{...D51_MAIL_LINK}
 });
 s.notifications??=[];
 if(!s.notifications.some(n=>n.id===D51_MAIL_NOTICE))s.notifications.unshift({
  id:D51_MAIL_NOTICE,title:'提醒事項',body:'發送目標資料',
  storyMessage:true,bannerPending:true,day:s.day,clock:s.clock,link:{...D51_MAIL_LINK}
 });
 return true;
}
