import {uid} from '../id.js';
import {dateParts} from '../calendar.js';
import {taiPresence} from '../presence.js';
import {isConversationOpen,visibleMessages} from '../messaging/delivery.js';
import {deathLocked} from '../../system/power/story.js';
import {aiStatus,askTai} from './gateway.js';

const conversation=s=>s.content.conversations.noapp?.find(c=>c.id==='tai');
const replyAfter=(c,id)=>{
  const index=c?.messages.findIndex(m=>m.id===id)??-1;
  return index<0||c.messages.slice(index+1).some(m=>m.kind!=='app_invitation');
};

// Live replies are test output in this conversation. Fixed story messages keep
// priority, and AI output is not marked as a canonical story event.
export async function replyToTaiMessage(store,sourceMessageId){
  const start=store.get(),c=conversation(start);
  if(!c||!c.messages.some(m=>m.id===sourceMessageId)||replyAfter(c,sourceMessageId))return {status:'scripted'};
  if(start.day<56||deathLocked(start))return {status:'unavailable',message:'当前剧情暂不能回复'};
  if(taiPresence(start).status!=='online')return {status:'offline',message:'熙泰现在不在线，消息已保存'};
  const status=await aiStatus();
  if(!status.deepseek)throw Error('本机未读取到 DeepSeek 密钥；请检查 .env.local 并重启服务');
  const messages=visibleMessages(c).filter(m=>m.kind!=='image'&&m.kind!=='app_invitation'&&!m.demo&&typeof m.text==='string'&&m.text.trim()&&m.day<=start.day)
    .slice(-12).map(m=>({role:m.from==='me'?'user':'assistant',content:m.text.slice(0,2000)}));
  if(messages.at(-1)?.role!=='user')return {status:'scripted'};
  const result=await askTai({day:start.day,channel:'noapp',messages,profile:start.aiDraft?.profile,memories:start.aiDraft?.memories});
  const current=store.get(),chat=conversation(current);
  if(!chat||replyAfter(chat,sourceMessageId)||deathLocked(current))return {status:'scripted'};
  const id=uid();
  store.update(s=>{
    const target=conversation(s);
    target.messages.push({id,from:'tai',text:result.text,kind:'text',time:s.clock,day:s.day,sentDate:dateParts(s).iso,aiGenerated:true,testOnly:true,actual:false});
    if(!isConversationOpen(s,'noapp','tai')){
      target.unread=Math.max(0,Number(target.unread)||0)+1;
      s.notifications.unshift({id:`ai-test-${id}`,title:target.name,body:result.text,link:{appId:'noapp',route:'/chat/tai',params:{}}});
    }
  });
  return {status:'replied',text:result.text};
}
