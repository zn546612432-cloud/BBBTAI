import {reconcileD01History} from '../../services/messaging/lifecycle/legacy-d01.js';
import {appendAuthoredPhoneMessage} from '../../services/messaging/phone-messages.js';
// D01 optional WeChat scenes. Timers, message IDs and stages persist in the phone save.
// Player bubbles are never auto-sent. This deliberately does not call AI.
const DAY_DATE='2025-05-19';
const GROUP_ID='group',BROTHER_ID='wang';
const beforeNoon=s=>s.clock<'12:00';
const groupSteps=branch=>[
 {after:3000,from:'小辛',text:branch==='morning'?'嗯？蒙蒙哥怎麼今天起得那麼早？':'蒙蒙哥，你不會現在才起吧？'},
 {after:1000,from:'小辛',text:branch==='morning'?'昨天和我打遊戲打到那麼晚…今天不到12點居然就醒了。':'昨天和我打遊戲打得那麼晚，果然起不來床了，哈哈'},
 {after:3000,from:'熙旺',text:'怎麼又熬夜打遊戲？你的眼睛度數已經很深了，阿蒙。'},
 {after:2000,from:'熙旺',text:'今天不忙的話，就再去睡會，我中午收車回來給你帶午餐。'},
 {after:2000,from:'me',text:'不知道怎麼就醒了'},
 {after:2000,from:'me',text:'還不是小辛說打贏boss才睡覺'},
 {after:2000,from:'me',text:'謝謝哥，我要吃牛腩飯'},
 {after:2000,from:'小辛',text:'還不是我們太菜了，哈哈。'},
 {after:2000,from:'熙旺',text:'好'}
];
// Two seconds more breathing room between every scripted group beat.
// Add another 3 seconds whenever Xiao Xin and Xiwang speak consecutively.
export function d01GroupWait(steps,index){
 const next=steps[index],previous=steps[index-1];
 if(!next)return 0;
 const npc=new Set(['小辛','熙旺']);
 const handoff=previous&&npc.has(previous.from)&&npc.has(next.from)&&previous.from!==next.from;
 return next.after+2000+(handoff?3000:0);
}
const d01=s=>s.story55?.version===1&&s.day===1;
const state=s=>(s.story55.d01??={});
const chat=(s,id)=>s.content.conversations.wechat?.find(c=>c.id===id);
const stamp=s=>({time:s.clock,sentDate:DAY_DATE,day:1,kind:'text',actual:true,storyD01:true});
const visible=(s,id)=>s.unlocked&&s.nav.current.appId==='wechat'&&s.nav.current.route==='/chat/'+id;
const deliver=(s,id,from,text,messageId)=>!!appendAuthoredPhoneMessage(s,{
 channel:'wechat',conversationId:id,messageId,from,text,
 day:1,clock:s.clock,sentDate:DAY_DATE,storyTag:'storyD01'
});
export function d01Draft(s,id){
 if(!d01(s)||id!==GROUP_ID)return null;
 const g=state(s).group;
 if(!g||!g.awaitingPlayer||g.cancelled||g.completed)return null;
 return {text:groupSteps(g.branch)[g.index]?.text||'',stage:'d01:'+g.index};
}
export function d01ComposerDisabled(s,id){
 if(!d01(s))return false;
 if(id!==GROUP_ID&&id!==BROTHER_ID)return true;
 if(id===BROTHER_ID)return !!state(s).brother?.locked;
 const g=state(s).group;
 return !!g?.started&&!g.awaitingPlayer&&!g.completed;
}
function pushMe(s,id,text){
 const d=state(s);d.messageSerial=(d.messageSerial||0)+1;
 const messageId='d01-player-'+id+'-'+d.messageSerial;
 deliver(s,id,'me',text,messageId);
 delete s.drafts[id];
 s.events??=[];s.events.push({type:'message_sent',channel:'wechat',conversationId:id,messageId,day:1,clock:s.clock});
 return messageId;
}
const gameMinute=s=>(s.story55?.d01?.nightAfterMidnight?1440:0)+Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3));
export function sendD01WeChat(store,id,text,now=Date.now()){
 if(!d01(store.get()))return {handled:false};
 if(id!==GROUP_ID&&id!==BROTHER_ID)return {handled:true,reason:'D01 此對話僅可查看歷史記錄'};
 let result={handled:true};
 store.update(s=>{
  if(d01ComposerDisabled(s,id)){result.reason='目前正在等待對方回覆';return;}
  const d=state(s);
  if(id===GROUP_ID){
   const g=d.group;
   if(!g){
    result.messageId=pushMe(s,id,text);
    const branch=beforeNoon(s)?'morning':'afternoon';
    d.group={started:true,index:0,branch,startedClock:s.clock,dueAt:now+d01GroupWait(groupSteps(branch),0),awaitingPlayer:false,completed:false};
    return;
   }
   if(g.completed){result.messageId=pushMe(s,id,text);return;}
   if(!g.awaitingPlayer){result.reason='請等待群聊訊息';return;}
   const step=groupSteps(g.branch)[g.index];
   if(step?.from!=='me'||text.trim()!==step.text){result.reason='請發送已預設的完整訊息';return;}
   result.messageId=pushMe(s,id,step.text);
   g.index++;g.awaitingPlayer=false;
   const next=groupSteps(g.branch)[g.index];
   if(next)g.dueAt=now+d01GroupWait(groupSteps(g.branch),g.index);
   else {g.completed=true;g.dueAt=null;}
   return;
  }
  // The independent brother exchange is optional. After the initial "哥",
  // wait for at least three further player bubbles, then 2 game minutes.
  const b=d.brother??={phase:'idle',extra:0,locked:false};
  if(b.locked){result.reason='熙旺現在不方便回覆';return;}
  result.messageId=pushMe(s,id,text);
  if(b.phase==='idle'&&text.includes('哥')){
   b.phase='hello';b.helloAt=now+850;b.helloDelivered=false;b.extra=0;
  }else if(['hello','counting','waiting'].includes(b.phase)){
   b.extra++;
   if(b.extra>=3){b.phase='waiting';b.dueGameMinute=gameMinute(s)+2;}
   else b.phase='counting';
  }
  d.brother=b;
 });
 return result;
}
export function tickD01WeChat(s,now=Date.now()){
 if(s.day>1||s.story55?.d01?.nightAfterMidnight)return reconcileD01History(s,groupSteps);
 if(!d01(s))return false;
 const d=state(s);let changed=false;
 const g=d.group;
 if(g?.started&&!g.completed&&!g.cancelled&&!g.awaitingPlayer&&g.dueAt!==null){
  // Catch up after a reload or another app; never send the player's dialogue.
  for(let guard=0;guard<1&&g.dueAt!==null&&now>=g.dueAt;guard++){
   const steps=groupSteps(g.branch),step=steps[g.index];
   if(!step){g.completed=true;g.dueAt=null;break;}
   if(step.from==='me'){g.awaitingPlayer=true;g.dueAt=null;changed=true;break;}
   const at=g.dueAt;
   changed=deliver(s,GROUP_ID,step.from,step.text,'d01-group-script-'+g.index)||changed;
   g.index++;
   const next=steps[g.index];
   if(!next){g.completed=true;g.dueAt=null;}
   else g.dueAt=now+d01GroupWait(steps,g.index);
  }
 }
 const b=d.brother;
 if(b&&!b.helloDelivered&&b.helloAt&&now>=b.helloAt){changed=deliver(s,BROTHER_ID,'熙旺','嗯？','d01-wang-hello')||changed;b.helloDelivered=true;if(b.phase==='hello')b.phase='counting';}
 if(b?.phase==='waiting'&&gameMinute(s)>=b.dueGameMinute){
  changed=deliver(s,BROTHER_ID,'熙旺','剛才在開車','d01-wang-driving')||changed;
  b.phase='replySecond';b.secondAt=now+1500;
 }
 if(b?.phase==='replySecond'&&now>=b.secondAt){
  changed=deliver(s,BROTHER_ID,'熙旺','怎麼發了那麼多消息？現在看不及時，不重要的話，有什麼話等我回家當面跟我講吧。','d01-wang-finish')||changed;
  b.phase='done';b.locked=true;changed=true;
 }
 return changed;
}
export function closeD01WeChat(s){
 const d=s.story55?.d01;if(!d)return;
 if(d.group&&!d.group.completed){d.group.cancelled=true;d.group.dueAt=null;d.group.awaitingPlayer=false;}
 if(d.brother&&!d.brother.locked){d.brother.phase='cancelled';d.brother.dueGameMinute=null;}
}

export function d01WeChatDue(s,now=Date.now()){
 if(s.story55?.version===1&&(s.day>1||s.story55?.d01?.nightAfterMidnight))return !!s.story55.d01&&!s.story55.d01.lifecycleSettled;
 if(!d01(s))return false;
 const d=state(s),g=d.group,b=d.brother;
 return !!(g?.started&&!g.completed&&!g.cancelled&&!g.awaitingPlayer&&g.dueAt!==null&&now>=g.dueAt
  ||b&&!b.helloDelivered&&b.helloAt&&now>=b.helloAt
  ||b?.phase==='waiting'&&gameMinute(s)>=b.dueGameMinute
  ||b?.phase==='replySecond'&&now>=b.secondAt);
}
