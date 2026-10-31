import {xitaiRelationshipContext} from './relationship-context.js';
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
export function isTaiFollowupDue(s){
 if(s.day<56||s.day>=90||s.poweredOff||s.powerMode!=='idle'||taiPresence(s).status!=='online')return false;
 const c=s.content.conversations.noapp?.find(c=>c.id==='tai');
 if(!c)return false;
 const latest=(c.messages||[]).filter(m=>m.proactive&&m.from==='tai').at(-1);
 if(!latest||latest.followup)return false;
 const i=c.messages.findIndex(m=>m.id===latest.id);
 if(c.messages.slice(i+1).some(m=>m.from==='me'))return false;
 if(s.events.some(e=>e.type==='tai_proactive_followup'&&e.sourceId===latest.id))return false;
 const minutes=(s.day-latest.day)*1440+
  Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3,5))-
  Number(latest.time.slice(0,2))*60-Number(latest.time.slice(3,5));
 return minutes>=190&&minutes<=800;
}
export async function maybeSendProactive(store){
 if(inFlight||Date.now()-lastErrorAt<60000)return false;
 const initial=store.get();
 const followup=isTaiFollowupDue(initial);
 if(!followup&&!isProactiveMessageDue(initial)||!apiConfig().deepseek)return false;
 inFlight=true;
 try{
  const c=initial.content.conversations.noapp.find(c=>c.id==='tai');
  const history=visibleMessages(c).filter(m=>m.kind!=='image'&&m.kind!=='app_invitation'&&!m.demo&&m.text?.trim())
    .slice(-12).map(m=>({role:m.from==='me'?'user':'assistant',content:m.text.slice(0,1200)}));
  const scene=followup
   ?'上一条是你主动给熙蒙发的消息。现实已经过了几小时，他一直没回。你可以有点不满、困惑、担心，或冷冷说一句就停；不要像通知机器人反复催促。只有一次后续提醒。'
   :'这是你独立生活里主动想起熙蒙的时候。从科技/国际象棋/生活或关系里挑一件真正想告诉他的事情，可一条或连发多条。不要客服式问候、不能捏造共同经历。';
  history.push({role:'user',content:'[游戏系统事件：'+scene+']'});
  const r=await askTai({channel:'noapp',day:initial.day,messages:history,outputMode:'text',scene,
   relationshipContext:xitaiRelationshipContext(initial,{mode:'text'}),
   profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories});
  const items=unpackTaiReply(r,'noapp').filter(m=>m.text);
  if(!items.length)throw Error('AI 自主消息为空');
  if(!(followup?isTaiFollowupDue(store.get()):isProactiveMessageDue(store.get())))return false;
  store.update(s=>{
   const sourceId=followup?s.content.conversations.noapp.find(c=>c.id==='tai')?.messages.filter(m=>m.proactive&&!m.followup).at(-1)?.id:null;
   const target=s.content.conversations.noapp.find(c=>c.id==='tai');
   if(!target)return;
   for(const item of items.slice(0,3)){
    const id=uid();
    // Proactive messages default to text; voice is used only when player can consent to listen.
    target.messages.push({id,from:'tai',text:item.text,kind:'text',aiTone:item.tone,time:s.clock,day:s.day,sentDate:dateParts(s).iso,aiGenerated:true,proactive:true,followup});
    if(!isConversationOpen(s,'noapp','tai')){
     target.unread=(target.unread||0)+1;
     s.notifications.unshift({id:'tai-proactive-'+id,title:'陈熙泰',body:item.text,link:{appId:'noapp',route:'/chat/tai',params:{}}});
    }
   }
   s.events.push(followup
    ?{type:'tai_proactive_followup',sourceId,day:s.day,clock:s.clock}
    :{type:'tai_proactive_sent',day:s.day,clock:s.clock});
  });
  return true;
 }catch(e){lastErrorAt=Date.now();console.warn('Xitai proactive message skipped:',e?.message);return false;}
 finally{inFlight=false;}
}
