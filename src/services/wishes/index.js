// One state machine for optional Reminders -> Bank -> delivery -> WeChat rewards.
// All functions accept the existing PhoneStore state. No new storage or clock.
import {wishDefinition} from './catalog.js';
import {appendAuthoredPhoneMessage} from '../messaging/phone-messages.js';
import {celebration,privateScenes,nextDay,extraDay,rewardSets} from '../../story/d06/wish-content.js';
import {completed,date55} from '../story55/state.js';
import {payBankPurchase} from '../bank.js';

const today=s=>date55(s.day);
const perDay=s=>s.story55?.version===1&&!s.story55?.ended;
const ledger=s=>s.story55.wishes??=({records:{},story:{started:false,lines:[],nextAt:null,d07Started:false}});
const record=(s,id)=>ledger(s).records[id]||null;
const hasPhrase=(s,id)=>Object.values(s.content?.conversations||{}).some(list=>list.some(c=>c.messages?.some(m=>m.wishId===id)));
export const getWish=(s,id)=>s.story55?.wishes?.records?.[id]||null;
// Repair reminders incorrectly marked complete by legacy home-widget taps.
// Only the wish lifecycle may mark them fulfilled, never generic UI toggles.
export function syncWishReminders(s){
 if(!perDay(s))return false;
 let changed=false;
 for(const item of s.content?.reminders||[]){
  if(!item.wishId)continue;
  const r=s.story55?.wishes?.records?.[item.wishId];
  if(!r)continue;
  const done=r.status==='completed'||r.status==='delivered';
  if(item.done!==done){item.done=done;changed=true;}
  if(item.wishStatus!==r.status){item.wishStatus=r.status;changed=true;}
 }
 return changed;
}

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
 payBankPurchase(s,{id:'wish-purchase-'+id,title:w.title,price:w.price,metadata:{wishId:id}});
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

function queueReward(s,id,isEvent){
 const r=record(s,id);
 if(!r||r.rewardQueued)return;
 r.rewardQueued=true;
 for(const item of rewardSets[id]||[])queue(s,{...item,
   dueDay:isEvent?s.day:r.deliveryDay,
   dueClock:isEvent?(item.kind==='image'?'20:30':item.id==='wish-dinner-01'?r.purchasedClock:'19:30'):'16:00',
   silentAfterDay:true,
   wishRewardId:id});
}
export function d06CelebrationDraft(s,id){
 if(!perDay(s)||s.day!==6||id!=='group'||!completed(s,'wallet')||s.story55?.wishes?.story?.started)return null;
 return {text:'兄弟们！我真的拿到 10 BTC 了！',stage:'d06-celebration-share',day:6,priority:3};
}
export function sendD06Celebration(store,id,text,now=Date.now()){
 const draft=d06CelebrationDraft(store.get(),id);
 if(!draft)return {handled:false};
 if(String(text||'').trim()!==draft.text)
  return {handled:true,reason:'請發送輸入框裡完整的預設台詞'};
 store.update(s=>beginD06Celebration(s,now));
 return {handled:true,messageId:'d06-celebration-player'};
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
 if(s.day>=7&&s.clock>='09:00'&&!st?.d07Started)return true;
 if(st?.lines?.some(x=>!st.delivered?.includes(x.id)&&eligibleLine(s,x))&&now>=(st.nextAt||0))return true;
 return Object.values(s.story55?.wishes?.records||{}).some(r=>r.status==='saved'&&wishExpired(s,r.id)||r.status==='ordered'&&s.day>=r.deliveryDay&&(s.day>r.deliveryDay||s.clock>='15:00'));
}
export function tickWishes(s,now=Date.now()){
 if(!perDay(s))return false;
 const w=s.story55?.wishes;
 if(!w&&!(s.day>=7&&s.clock>='09:00'))return false;
 const state=w||ledger(s);
 let changed=false;
 for(const r of Object.values(state.records)){
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
 const st=state.story;
 if(!st.d07Started&&s.day>=7&&s.clock>='09:00'){
  st.d07Started=true;
  for(const line of nextDay)queue(s,{...line,dueDay:7,dueClock:'09:00',silentAfterDay:true});
  for(const line of extraDay)queue(s,{...line,dueDay:7,dueClock:'11:00',silentAfterDay:true});
  if(record(s,'d06-dinner')?.status==='delivered')
   queue(s,{...group('d07-dinner-after','小辛','昨天吃得太撑了，我今天真的不想看见肉了'),dueDay:7,dueClock:'09:00',silentAfterDay:true});
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
