import {apiConfig,askTai} from './gateway.js';
import {unpackTaiReply} from './format.js';
import {uid} from '../id.js';
import {dateParts} from '../calendar.js';
import {taiPresence} from '../presence.js';
import {visibleMessages,isConversationOpen} from '../messaging/delivery.js';
// Editable review schedule; no background network requests when the web app is closed.
export const TAI_OUTREACH_DAYS=[57,60,64,68,71,75,79,83,87];
export const TAI_CALL_DAYS=[63,73,81];
let inFlight=false,lastErrorAt=0;
function eligible(s){
 const minutes=Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3,5));
 return s.day>=56&&s.day<90&&!s.poweredOff&&s.powerMode==='idle'&&minutes>=19*60&&minutes<=23*60+59;
}
export function isProactiveMessageDue(s){
 if(!eligible(s)||!TAI_OUTREACH_DAYS.includes(s.day))return false;
 if(s.events?.some(e=>e.type==='tai_proactive_sent'&&e.day===s.day))return false;
 const c=s.content.conversations.noapp?.find(c=>c.id==='tai');
 if(!c)return false;
 const recent=visibleMessages(c).filter(m=>m.day===s.day&&m.from==='me').at(-1);
 // Avoid cutting across a conversation initiated by the player today.
 if(recent)return false;
 return taiPresence(s).status==='online';
}
export function isProactiveCallDue(s){
 if(!eligible(s)||!TAI_CALL_DAYS.includes(s.day))return false;
 if(s.events.some(e=>e.type==='tai_proactive_call'&&e.day===s.day))return false;
 return taiPresence(s).status==='online'&&s.content.conversations.noapp?.find(c=>c.id==='tai')?.messages?.some(m=>m.from==='me'&&!m.demo);
}
export async function maybeSendProactive(store){
 if(inFlight||Date.now()-lastErrorAt<60000)return false;
 const initial=store.get();
 if(!isProactiveMessageDue(initial)||!apiConfig().deepseek)return false;
 inFlight=true;
 try{
  const c=initial.content.conversations.noapp.find(c=>c.id==='tai');
  const history=visibleMessages(c).filter(m=>m.kind!=='image'&&m.kind!=='app_invitation'&&!m.demo&&m.text?.trim())
    .slice(-12).map(m=>({role:m.from==='me'?'user':'assistant',content:m.text.slice(0,1200)}));
  history.push({role:'user',content:'[独立生活事件：现在是你主动联系熙蒙的时间。请根据你已有的共同记忆，从科技/AI编程/国际象棋/当晚小事或真实的关系话题中自行选择一件值得告诉他的事情。不是用户刚刚问你话，不能假装对方主动说过什么，不能虚构重要共同经历；不要客服式问候、强制报备或天天炫耀。自恋、冷幽默和偶尔葡语要自然且少量。生成一到数条普通聊天消息。]'});
  const r=await askTai({channel:'noapp',day:initial.day,messages:history,profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories});
  const items=unpackTaiReply(r,'noapp').filter(m=>m.text);
  if(!items.length)throw Error('AI 自主消息为空');
  if(!isProactiveMessageDue(store.get()))return false;
  store.update(s=>{
   const target=s.content.conversations.noapp.find(c=>c.id==='tai');
   if(!target)return;
   for(const item of items.slice(0,3)){
    const id=uid();
    // Proactive messages default to text; voice is used only when player can consent to listen.
    target.messages.push({id,from:'tai',text:item.text,kind:'text',aiTone:item.tone,time:s.clock,day:s.day,sentDate:dateParts(s).iso,aiGenerated:true,proactive:true});
    if(!isConversationOpen(s,'noapp','tai')){
     target.unread=(target.unread||0)+1;
     s.notifications.unshift({id:'tai-proactive-'+id,title:'陈熙泰',body:item.text,link:{appId:'noapp',route:'/chat/tai',params:{}}});
    }
   }
   s.events.push({type:'tai_proactive_sent',day:s.day,clock:s.clock});
  });
  return true;
 }catch(e){lastErrorAt=Date.now();console.warn('Xitai proactive message skipped:',e?.message);return false;}
 finally{inFlight=false;}
}
