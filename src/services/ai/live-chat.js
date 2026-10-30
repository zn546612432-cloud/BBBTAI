import {uid} from '../id.js';
import {dateParts} from '../calendar.js';
import {taiPresence} from '../presence.js';
import {isConversationOpen,visibleMessages} from '../messaging/delivery.js';
import {deathLocked} from '../../system/power/story.js';
import {aiStatus,askTai,voicePreview} from './gateway.js';
import {saveClip} from '../voice/audio-store.js';
import {unpackTaiReply} from './format.js';

const conversation=s=>s.content.conversations.noapp?.find(c=>c.id==='tai');
const replyAfter=(c,id)=>{const i=c?.messages.findIndex(m=>m.id===id)??-1;return i<0||c.messages.slice(i+1).some(m=>m.from!=='me'&&m.kind!=='app_invitation');};
let pendingRequest=false;
export async function replyToTaiMessage(store,sourceMessageId){
 const initial=store.get(),c=conversation(initial);
 if(!c||!c.messages.some(m=>m.id===sourceMessageId)||replyAfter(c,sourceMessageId))return {status:'scripted'};
 if(initial.day<56||deathLocked(initial))return {status:'unavailable',message:'当前剧情暂不能回复'};
 if(taiPresence(initial).status!=='online')return {status:'offline',message:'熙泰目前不在线，消息已保存'};
 if(pendingRequest)return {status:'busy',message:'熙泰正在输入'};
 const status=await aiStatus();if(!status.deepseek)throw Error('请在 NoApp 的 AI 设置中输入 DeepSeek Key');
 const messages=visibleMessages(c).filter(m=>m.kind!=='image'&&m.kind!=='app_invitation'&&!m.demo&&typeof m.text==='string'&&m.text.trim()&&m.day<=initial.day)
  .slice(-20).map(m=>({role:m.from==='me'?'user':'assistant',content:m.kind==='voice'?m.voiceCaption||'[语音消息；未提供转写，无法识别内容]':m.text.slice(0,2000)}));
 if(messages.at(-1)?.role!=='user')return {status:'scripted'};
 pendingRequest=true;
 try{
  const result=await askTai({day:initial.day,channel:'noapp',messages,profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories});
  const entries=unpackTaiReply(result,'noapp');let emitted=0;
  for(const item of entries){
   const current=store.get(),chat=conversation(current);
   if(!chat||deathLocked(current)||current.day!==initial.day)break;
   if(emitted===0&&replyAfter(chat,sourceMessageId))break;
   const id=uid();let audioId=null;
   if(item.mode==='voice'){
    try{const blob=await voicePreview({text:item.text,tone:item.tone});audioId='tai-'+id;await saveClip(audioId,blob);}
    catch(error){console.warn('NoApp voice unavailable, text preserved:',error.message);}
   }
   store.update(s=>{
    const target=conversation(s);if(!target)return;
    const msg={id,from:'tai',text:item.text,kind:audioId?'voice':'text',audioId,
      voiceCaption:audioId?item.text:null,aiTone:item.tone,time:s.clock,day:s.day,sentDate:dateParts(s).iso,aiGenerated:true,testOnly:true,actual:false};
    target.messages.push(msg);
    if(!isConversationOpen(s,'noapp','tai')){target.unread=Math.max(0,Number(target.unread)||0)+1;
      s.notifications.unshift({id:'ai-test-'+id,title:target.name,body:audioId?'发来一条语音':item.text,link:{appId:'noapp',route:'/chat/tai',params:{}}});}
   });
   emitted++;if(entries.length>1)await new Promise(resolve=>setTimeout(resolve,380+Math.random()*470));
  }
  return {status:'replied',count:emitted,text:entries.map(x=>x.text).join('\n')};
 }finally{pendingRequest=false;}
}
