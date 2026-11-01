import {mirageAIEnabled,mirageAIRevision} from '../../../../services/ai/channel-controls.js';
import {askTai,aiStatus} from '../../../../services/ai/gateway.js';
import {unpackTaiReply} from '../../../../services/ai/format.js';
import {taiBehavior,replyDelayMs} from '../../../../services/ai/behavior.js';
import {anonymousPresence55} from '../../../../services/story55/runtime.js';
import {currentScript55} from '../../../../services/story55/scripted-chat.js';
import {isStory55,taiRecognized} from '../../../../services/story55/state.js';
import {visibleMessages} from '../../../../services/messaging/delivery.js';
import {dateParts} from '../../../../services/calendar.js';
import {uid} from '../../../../services/id.js';
import {isOuroborosScriptActive} from '../../ouroboros-flow.js';
import {isMirageAuthenticated} from '../../session.js';

const pending=new Set();
export async function replyToOuroboros(ctx,contactId,sourceId,{wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 const initial=ctx.store.get(),revision=mirageAIRevision(initial),key=contactId+':'+revision;
 const contact=initial.content.conversations.mirage?.find(c=>c.id===contactId);
 if(!mirageAIEnabled(initial)||!contact||!/(ouroboros|衔尾蛇)/i.test(contact.name)||pending.has(key))return 0;
 const permitted=()=>{
  const s=ctx.store.get(),c=s.content.conversations.mirage?.find(c=>c.id===contactId);
  return mirageAIEnabled(s)&&mirageAIRevision(s)===revision&&s.day===initial.day&&isMirageAuthenticated()&&
   c?.messages.filter(m=>m.from==='me').at(-1)?.id===sourceId&&
   !isOuroborosScriptActive(s,contactId)&&!currentScript55(s,'mirage',contactId)&&
   (!isStory55(s)||anonymousPresence55(s).online);
 };
 if(!permitted()||contact.messages.at(-1)?.id!==sourceId)return 0;
 pending.add(key);
 try{
  const status=await aiStatus();if(!permitted())return 0;
  if(!status.deepseek)throw Error('请在 NoApp 的 AI 设置中填写 DeepSeek Key');
  const history=visibleMessages(contact,initial).filter(m=>m.kind==='text'&&typeof m.text==='string'&&!m.demo).slice(-20).map(m=>({role:m.from==='me'?'user':'assistant',content:m.text.slice(0,2000)}));
  if(history.at(-1)?.role!=='user')return 0;
  const result=await askTai({day:initial.day,channel:'mirage',storyVersion:isStory55(initial)?'55-v1':undefined,recognized:isStory55(initial)?taiRecognized(initial):undefined,messages:history,profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories});
  const chunks=unpackTaiReply(result,'mirage');let inserted=0;
  for(const item of chunks){
   if(!permitted())break;
   const msgId=uid();
   ctx.store.update(s=>{
    const target=s.content.conversations.mirage.find(c=>c.id===contactId);
    target.messages.push({id:msgId,from:contactId,text:item.text,kind:'text',day:s.day,time:s.clock,sentDate:dateParts(s).iso,aiGenerated:true});
    if(s.nav.current.appId!=='mirage'||s.nav.current.route!=='/chat/'+contactId){
     target.unread=(Number(target.unread)||0)+1;
     s.notifications.unshift({id:'mirage-ai-'+msgId,title:'MIRAGE',body:'NEW ENCRYPTED MESSAGE',link:{appId:'mirage',route:'/chat/'+contactId,params:{}}});
    }
   });
   inserted++;
   if(inserted<chunks.length)await wait(replyDelayMs(item.text,taiBehavior(initial)));
  }
  return inserted;
 }catch(error){if(!permitted())return 0;throw error;}
 finally{pending.delete(key);}
}
