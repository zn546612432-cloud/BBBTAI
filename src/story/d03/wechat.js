import {appendAuthoredPhoneMessage} from '../../services/messaging/phone-messages.js';
// D03 authored WeChat dialogue. The player's bubbles only exist after Send.
// Each NPC scene has an early completion path and a clock-time fallback.
import {D03_ORDER} from './contract.js';
const DATE='2025-05-21', DAY=3;
const pc='/apps/wechat/media/d03-computer.webp';
const t=(who,text)=>({who,text,kind:'text'});
const image=(who,url)=>({who,text:url,kind:'image'});
const SCENES=[
 {id:'morning',chat:'group',early:'08:20',fallback:'08:40',trigger:s=>!!s.story55?.flowD03?.submitted,lines:[
  t('小辛','我真的服了，樓下那家店裝修是不是不用睡覺的'),t('小辛','八點不到就在那鑽鑽鑽'),
  t('仔仔','你昨晚幾點睡的？'),t('小辛','四點'),t('胡楓','那你睡不著跟裝修有什麼關係哈哈哈哈'),
  t('小辛','有沒有一點同情心'),t('阿威','沒有'),
  t('熙旺','下午誰有空去把之前訂的東西拿回來？到了。'),t('小辛','1'),
  t('熙旺','行，那你下午去一趟。')
 ]},
 {id:'hufeng',chat:'hufeng',early:'10:00',fallback:'10:45',trigger:s=>!!s.story55?.flowD03?.submitted,lines:[
  t('胡楓','阿蒙'),t('胡楓','你下午有空沒'),t('me','幹嘛'),
  t('胡楓','我電腦好像又出問題了'),t('胡楓','一開機風扇就跟飛機起飛一樣'),
  t('me','你是不是又摔了'),t('胡楓','不是，你怎麼每次都先懷疑我啊'),t('me','有前科'),
  t('胡楓','上次真的是意外好不好'),t('胡楓','你幫我看看唄'),t('me','修不好怎麼辦'),
  t('胡楓','那就扔了買新的'),t('me','有錢人'),
  t('胡楓','少來，你那個機房裡隨便拆一塊東西都比我電腦貴'),
  t('me','哈哈哈哈'),t('me','下午拿過來'),t('胡楓','好嘞'),
  t('胡楓','晚上請你吃飯，想吃什麼？'),t('me','我想吃米其林'),t('胡楓','？'),
  t('胡楓','我們兩個偷偷去吃御膳扒房這種事情如果曝光了，家族就要變天了。'),
  t('me','那你就再叫一份，打包給他們'),t('胡楓','等我有錢了一定💪'),
  t('胡楓','所以吃什麼嘛？真要吃扒房也不是不行，等我提前一個月預約'),
  t('me','行，那就先欠著')
 ]},
 {id:'xiaoxin',chat:'xiaoxin',early:'14:00',fallback:'14:25',trigger:s=>!!s.content?.orders?.find(o=>o.id===D03_ORDER&&o.status!=='OPEN'),lines:[
  t('小辛','蒙哥蒙哥'),t('小辛','幫我看看這台怎麼樣'),image('小辛',pc),
  t('me','你又要買電腦？'),t('小辛','我就看看'),t('小辛','這個燈是不是特別帥'),
  t('me','你買電腦還是買燈'),t('小辛','主要是性能'),t('小辛','燈只是順便的'),
  t('me','把配置發我'),t('小辛','等下等下'),t('小辛','我找找'),
  t('me','你連配置都沒看就想買？'),t('小辛','我這不是先找專業人士把關嗎🥺'),
  t('me','預算多少'),t('小辛','最好不要超過八千'),t('me','澳門幣？'),
  t('小辛','不然呢大哥'),t('me','那你先別買'),t('小辛','啊？'),
  t('me','我給你配一套，比這個划算'),t('小辛','！！！'),
  t('小辛','蒙哥我真是全天下最愛你的人🥺'),t('me','滾')
 ]},
 {id:'afternoon',chat:'group',early:'15:30',fallback:'16:10',trigger:s=>!!s.content?.orders?.find(o=>o.id===D03_ORDER&&o.status!=='OPEN'),lines:[
  t('小辛','誰拿快遞去了？'),t('仔仔','不是你去嗎？'),t('小辛','？？？'),
  t('阿威','哥早上問誰有空，你自己回了個1'),t('小辛','我以為在點名'),
  t('胡楓','哈哈哈哈哈哈哈哈'),t('仔仔','你到底醒了沒有'),t('小辛','我現在就去行了吧！')
 ]},
 {id:'wang',chat:'wang',early:'17:10',fallback:'17:36',trigger:s=>!!s.content?.orders?.find(o=>o.id===D03_ORDER&&['READY','COMPLETED'].includes(o.status)),lines:[
  t('熙旺','阿蒙'),t('熙旺','這兩天老下雨，晚上有點涼'),t('熙旺','你之前那幾件厚衣服拿出來洗了沒？'),
  t('me','沒有🥺'),t('熙旺','我就知道'),t('熙旺','上次叫你收拾衣櫃，你是不是也沒收拾'),
  t('me','哥～～'),t('me','你幫我洗嘛'),t('熙旺','你多大了還讓我幫你洗衣服😂'),
  t('me','三歲'),t('me','哥哥最好了😘'),t('熙旺','少來這套'),
  t('熙旺','放洗衣籃裡，晚上我拿去洗'),t('me','愛你哥❤️'),t('熙旺','😂')
 ]}
];
const active=s=>s.story55?.version===1&&s.day===DAY;
const sceneState=(s,id)=>s.story55?.d03Chats?.[id];
const conversation=(s,id)=>s.content.conversations.wechat?.find(c=>c.id===id);
const visible=(s,id)=>s.unlocked&&s.nav?.current?.appId==='wechat'&&s.nav.current.route==='/chat/'+id;
const readable=who=>who==='me'?'熙蒙':who;
function push(s,scene,index,part){
 const c=conversation(s,scene.chat);if(!c)return false;
 return !!appendAuthoredPhoneMessage(s,{
  conversationId:c.id,messageId:'d03-'+scene.id+'-'+index,
  from:part.who,text:part.text,kind:part.kind,
  day:DAY,clock:s.clock,sentDate:DATE,storyTag:'storyD03'
 });
}
function ensure(s) {
 const d=s.story55.d03Chats??(s.story55.d03Chats={});
 for(const scene of SCENES)d[scene.id]??={started:false,index:0,dueAt:null,completed:false,mode:null};
 return d;
}
export function tickD03Chats(s,now=Date.now()){
 if(!active(s))return false;
 const d=ensure(s);let changed=false;
 for(const scene of SCENES){
  const q=d[scene.id],c=conversation(s,scene.chat);
  if(!c||q.completed)continue;
  if(!q.started){
   if(s.clock<scene.early||!(scene.trigger(s)||s.clock>=scene.fallback))continue;
   q.started=true;q.mode=scene.trigger(s)?'completed-task':'fallback';
   q.dueAt=now+900;changed=true;
  }
  if(q.dueAt==null||now<q.dueAt)continue;
  const part=scene.lines[q.index];
  if(!part){q.completed=true;q.dueAt=null;changed=true;continue;}
  if(part.who==='me'){q.dueAt=null;changed=true;continue;}
  changed=push(s,scene,q.index,part)||changed;
  q.index++;
  if(q.index>=scene.lines.length){q.completed=true;q.dueAt=null;}
  else if(scene.lines[q.index].who==='me')q.dueAt=null;
  else q.dueAt=now+(part.kind==='image'?2600:1900);
  changed=true;
 }
 return changed;
}
export function d03ChatDue(s,now=Date.now()){
 if(!active(s))return false;
 const d=s.story55?.d03Chats||{};
 return SCENES.some(scene=>{
  const q=d[scene.id];
  return q?.started&&!q.completed&&q.dueAt!=null&&now>=q.dueAt;
 });
}
export function d03Draft(s,id) {
 if(!active(s))return null;
 for(const scene of SCENES){
  if(scene.chat!==id)continue;
  const q=sceneState(s,scene.id),part=scene.lines[q?.index||0];
  if(q?.started&&!q.completed&&q.dueAt==null&&part?.who==='me')
   return {text:part.text,stage:'d03:'+scene.id+':'+q.index};
 }
 return null;
}
export function d03ComposerDisabled(s,id) {
 if(!active(s))return false;
 return SCENES.some(scene=>scene.chat===id&&sceneState(s,scene.id)?.started&&!sceneState(s,scene.id)?.completed
   &&sceneState(s,scene.id)?.dueAt!=null);
}
export function sendD03WeChat(store,id,text,now=Date.now()){
 const s=store.get();if(!active(s))return {handled:false};
 const scene=SCENES.find(scene=>scene.chat===id&&sceneState(s,scene.id)?.started&&!sceneState(s,scene.id)?.completed);
 if(!scene)return {handled:false};
 const q=sceneState(s,scene.id),part=scene.lines[q.index];
 if(!part||part.who!=='me')return {handled:true,reason:'請等對方回覆'};
 if(String(text||'').trim()!==part.text.trim())return {handled:true,reason:'請發送輸入框裡完整的預設台詞'};
 let messageId=null;
 store.update(next=>{
  const state=sceneState(next,scene.id);
  messageId='d03-'+scene.id+'-'+state.index;
  push(next,scene,state.index,part);
  state.index++;
  if(state.index>=scene.lines.length){state.completed=true;state.dueAt=null;}
  else state.dueAt=scene.lines[state.index].who==='me'?null:now+1900;
  if(next.drafts)delete next.drafts[id];
 });
 return {handled:true,messageId};
}
export const D03_CHAT_SCENES=SCENES.map(({id,chat,early,fallback})=>({id,chat,early,fallback}));
