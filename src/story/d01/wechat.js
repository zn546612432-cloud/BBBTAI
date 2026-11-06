import {appendAuthoredPhoneMessage} from '../../services/messaging/phone-messages.js';
// D01 optional WeChat scenes. Timers, message IDs and stages persist in the phone save.
// Player bubbles are never auto-sent. This deliberately does not call AI.
const DAY_DATE='2025-05-19';
const GROUP_ID='group',BROTHER_ID='wang';
const beforeNoon=s=>s.clock<'12:00';
const groupSteps=branch=>[
 {after:3000,from:'小辛',text:branch==='morning'?'嗯？蒙蒙哥怎么今天起得那么早？':'蒙蒙哥，你不会现在才起吧？'},
 {after:1000,from:'小辛',text:branch==='morning'?'昨天和我打游戏打到那么晚…今天不到12点居然就醒了。':'昨天和我打游戏打得那么晚，果然起不来床了，哈哈'},
 {after:3000,from:'熙旺',text:'怎么又熬夜打游戏？你的眼睛度数已经很深了，阿蒙。'},
 {after:2000,from:'熙旺',text:'今天不忙的话，就再去睡会，我中午收车回来给你带午餐。'},
 {after:2000,from:'me',text:'不知道怎么就醒了'},
 {after:2000,from:'me',text:'还不是小辛说打赢boss才睡觉'},
 {after:2000,from:'me',text:'谢谢哥，我要吃牛腩饭'},
 {after:2000,from:'小辛',text:'还不是我们太菜了，哈哈。'},
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
    d.group={started:true,index:0,branch,dueAt:now+d01GroupWait(groupSteps(branch),0),awaitingPlayer:false,completed:false};
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
 if(!d01(s))return false;
 const d=state(s);let changed=false;
 const g=d.group;
 if(g?.started&&!g.completed&&!g.cancelled&&!g.awaitingPlayer&&g.dueAt!==null){
  // Catch up after a reload or another app; never send the player's dialogue.
  for(let guard=0;guard<9&&g.dueAt!==null&&now>=g.dueAt;guard++){
   const steps=groupSteps(g.branch),step=steps[g.index];
   if(!step){g.completed=true;g.dueAt=null;break;}
   if(step.from==='me'){g.awaitingPlayer=true;g.dueAt=null;changed=true;break;}
   const at=g.dueAt;
   changed=deliver(s,GROUP_ID,step.from,step.text,'d01-group-script-'+g.index)||changed;
   g.index++;
   const next=steps[g.index];
   if(!next){g.completed=true;g.dueAt=null;}
   else g.dueAt=at+d01GroupWait(steps,g.index);
  }
 }
 const b=d.brother;
 if(b&&!b.helloDelivered&&b.helloAt&&now>=b.helloAt){changed=deliver(s,BROTHER_ID,'熙旺','嗯？','d01-wang-hello')||changed;b.helloDelivered=true;if(b.phase==='hello')b.phase='counting';}
 if(b?.phase==='waiting'&&gameMinute(s)>=b.dueGameMinute){
  changed=deliver(s,BROTHER_ID,'熙旺','刚才在开车','d01-wang-driving')||changed;
  b.phase='replySecond';b.secondAt=now+1500;
 }
 if(b?.phase==='replySecond'&&now>=b.secondAt){
  changed=deliver(s,BROTHER_ID,'熙旺','怎么发了那么多消息？现在看不及时，不重要的话，有什么话等我回家当面跟我讲吧。','d01-wang-finish')||changed;
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
 if(!d01(s))return false;
 const d=state(s),g=d.group,b=d.brother;
 return !!(g?.started&&!g.completed&&!g.cancelled&&!g.awaitingPlayer&&g.dueAt!==null&&now>=g.dueAt
  ||b&&!b.helloDelivered&&b.helloAt&&now>=b.helloAt
  ||b?.phase==='waiting'&&gameMinute(s)>=b.dueGameMinute
  ||b?.phase==='replySecond'&&now>=b.secondAt);
}
