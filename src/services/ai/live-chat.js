import {xitaiRelationshipContext} from './relationship-context.js';
import {uid} from '../id.js';
import {dateParts} from '../calendar.js';
import {taiPresence,markTaiEngaged} from '../presence.js';
import {isConversationOpen,visibleMessages} from '../messaging/delivery.js';
import {deathLocked} from '../../system/power/story.js';
import {aiStatus,askTai,voicePreview} from './gateway.js';
import {saveClip} from '../voice/audio-store.js';
import {unpackTaiReply} from './format.js';

const conversation=s=>s.content.conversations.noapp?.find(c=>c.id==='tai');
const replyAfter=(c,id)=>{const i=c?.messages.findIndex(m=>m.id===id)??-1;return i<0||c.messages.slice(i+1).some(m=>m.from!=='me'&&m.kind!=='app_invitation');};
let pendingRequest=false;
let ttsQueue=Promise.resolve();
function synthesizeVoiceNotes(store,jobs){
 const work=async()=>{
  for(const job of jobs){
   try{
    const clip=await voicePreview({text:job.text,tone:job.tone});
    const audioId='tai-'+job.id;
    await saveClip(audioId,clip);
    const current=store.get();
    if(current.day!==job.day||deathLocked(current))continue;
    store.update(s=>{
     const m=conversation(s)?.messages.find(x=>x.id===job.id);
     if(m){m.kind='voice';m.audioId=audioId;m.voiceCaption=job.text;
       delete m.voiceRequested;}
    });
   }catch(error){
    console.warn('MiniMax voice failed; text remains:',error?.message);
    store.update(s=>{const m=conversation(s)?.messages.find(m=>m.id===job.id);if(m){delete m.voiceRequested;m.voiceFailed=true;}});
   }
  }
 };
 // A rejection must not poison subsequent voice synthesis.
 const queued=ttsQueue.then(work,work);
 ttsQueue=queued.catch(()=>{});
 return queued;
}

export async function replyToTaiMessage(store,sourceMessageId){
 const initial=store.get(),c=conversation(initial);
 if(!c||!c.messages.some(m=>m.id===sourceMessageId)||replyAfter(c,sourceMessageId))return {status:'scripted'};
 if(initial.day<56||deathLocked(initial))return {status:'unavailable',message:'当前剧情暂不能回复'};
 const presence=taiPresence(initial);
 if(!presence.contactable||presence.status==='away')return {status:'offline',message:'熙泰暂时不在线，消息已保存'};
 markTaiEngaged();
 if(pendingRequest)return {status:'busy',message:'熙泰正在输入'};
 const status=await aiStatus();if(!status.deepseek)throw Error('请在 NoApp 的 AI 设置中输入 DeepSeek Key');
 const messages=visibleMessages(c).filter(m=>m.kind!=='image'&&m.kind!=='app_invitation'&&!m.demo&&typeof m.text==='string'&&m.text.trim()&&m.day<=initial.day)
  .slice(-20).map(m=>({role:m.from==='me'?'user':'assistant',content:m.kind==='voice'?m.voiceCaption||'[语音消息；未提供转写，无法识别内容]':m.text.slice(0,2000)}));
 if(messages.at(-1)?.role!=='user')return {status:'scripted'};
 pendingRequest=true;
 try{
  const lastUser=c.messages.find(m=>m.id===sourceMessageId)?.text||'';
  const voiceRequested=/语音|录音|听听你的声音|听你说|说句话/.test(lastUser);
  const hashed=[...sourceMessageId].reduce((h,ch)=>(Math.imul(h,33)+ch.charCodeAt(0))>>>0,5381);
  const voiceTurn=voiceRequested||(initial.day>=60&&hashed%19===0);
  const result=await askTai({day:initial.day,channel:'noapp',messages,outputMode:voiceTurn?'voice':'text',
   scene:'熙蒙刚发来的真实消息：'+String(lastUser).slice(0,400)+'。根据对话自然接话，必要时可连发两三条，不要每一句都反问。',
   relationshipContext:xitaiRelationshipContext(initial,{mode:'text'}),
   profile:initial.aiDraft?.profile,memories:initial.aiDraft?.memories});
  const entries=unpackTaiReply(result,'noapp').map(item=>voiceTurn?{...item,mode:'voice',speechText:item.speechText||item.text}:item);
  let emitted=0;
  const voiceJobs=[];
  for(const item of entries){
   const current=store.get(),chat=conversation(current);
   if(!chat||deathLocked(current)||current.day!==initial.day)break;
   if(emitted===0&&replyAfter(chat,sourceMessageId))break;
   const id=uid();
   // A text bubble appears as soon as it is received. Slow MiniMax synthesis
   // cannot stall subsequent sentences or make the conversation look frozen.
   store.update(s=>{
    const target=conversation(s);if(!target)return;
    const msg={id,from:'tai',text:item.text,kind:'text',
      aiTone:item.tone,time:s.clock,day:s.day,sentDate:dateParts(s).iso,
      aiGenerated:true,actual:true,voiceRequested:item.mode==='voice'};
    target.messages.push(msg);
    if(!isConversationOpen(s,'noapp','tai')){
     target.unread=Math.max(0,Number(target.unread)||0)+1;
     s.notifications.unshift({id:'tai-reply-'+id,conversationId:'tai',title:target.name,
       body:item.text,link:{appId:'noapp',route:'/chat/tai',params:{}}});
    }
   });
   emitted++;
   if(item.mode==='voice'){
    // Queue TTS in its own chain so three voice messages do not create three
    // simultaneous MiniMax calls. Failed audio leaves the written bubble.
    voiceJobs.push({id,text:item.speechText||item.text,tone:item.tone,day:initial.day});
   }
   if(entries.length>1)await new Promise(resolve=>setTimeout(resolve,420+Math.random()*460));
  }
  if(voiceJobs.length){
   void synthesizeVoiceNotes(store,voiceJobs).catch(error=>{
    console.warn('MiniMax voice conversion delayed, chat text preserved:',error?.message);
   });
  }
  return {status:'replied',count:emitted,text:entries.map(x=>x.text).join('\n')};
 }finally{pendingRequest=false;}
}
