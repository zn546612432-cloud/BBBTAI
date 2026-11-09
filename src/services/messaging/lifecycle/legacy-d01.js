// D01's author-approved free first message and three-message brother trigger
// remain intact. This adapter reconciles their earned NPC replies at boundaries.
import {appendAuthoredPhoneMessage} from '../phone-messages.js';
const add=(s,id,from,text,key)=>{
 const previous=s.content.conversations.wechat?.find(c=>c.id===id)?.messages.filter(m=>m.storyD01).at(-1);
 return appendAuthoredPhoneMessage(s,{conversationId:id,messageId:key,from,text,
 day:1,clock:previous?.time||s.story55.d01?.group?.startedClock||'08:00',sentDate:'2025-05-19',storyTag:'storyD01',silent:true,lifecycleId:'d01:'+id});};
export function reconcileD01History(s,steps,brother=null){
 if(s.story55?.version!==1||s.day<=1&&!s.story55.d01?.nightAfterMidnight)return false;
 const d=s.story55.d01;if(!d||d.lifecycleSettled)return false;
 const g=d.group;
 if(g?.started&&!g.completed){
  const parts=steps(g.branch);
  while(g.index<parts.length&&parts[g.index].from!=='me'){
   const line=parts[g.index];add(s,'group',line.from,line.text,'d01-group-script-'+g.index);g.index++;
  }
  g.cancelled=true;g.awaitingPlayer=false;g.dueAt=null;
 }
 const b=d.brother;
 if(b?.helloAt&&!b.helloDelivered){add(s,'wang','熙旺',brother?.[0]?.text||'嗯？','d01-wang-hello');b.helloDelivered=true;}
 if(b&&(b.extra>=3||b.phase==='replySecond'||b.phase==='waiting')){
  add(s,'wang','熙旺',brother?.[1]?.text||'刚才在开车','d01-wang-driving');
  add(s,'wang','熙旺',brother?.[2]?.text||'怎么发了那么多消息？现在看不及时，不重要的话，有什么话等我回家当面跟我讲吧。','d01-wang-finish');
  b.phase='done';b.locked=true;
 }
 for(const n of s.notifications||[])if(String(n.messageId||'').startsWith('d01-')&&n.link?.appId==='wechat')n.silent=true;
 d.lifecycleSettled=true;return true;
}
