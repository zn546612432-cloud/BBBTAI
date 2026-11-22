import {RECOGNITION_CALL,RECOGNITION_STEPS} from '../../story/d29/recognition-call.js';
import {stampFixedLine} from './fixed-timeline.js';

// Historical developer reconstruction and existing completed saves use the
// same native call record as a played conversation, never five text bubbles.
export function recognitionHistory(s,{day=s.day,at=s.clock,advanceClock=false}={}){
 const chat=s.content.conversations.noapp?.find(c=>c.id==='tai');if(!chat)return;
 if(s.story55.scriptedCallCompleted?.[RECOGNITION_CALL.id])return;
 const timeline={},clockState={day,clock:at,story55:{}};
 const transcript=RECOGNITION_STEPS.map(([role,text],index)=>`[${stampFixedLine(clockState,timeline,RECOGNITION_STEPS,index,{day,at})}] ${role==='me'?'熙蒙':'熙泰'}：${text}`).join('\n');
 chat.messages.push({id:'s55-recognition-call',from:'tai',kind:'call',callStatus:'ended',endedBy:'tai',endReason:'scripted_end',text:'語音通話 · 已結束',day,time:clockState.clock,transcript,actual:true,story55:true});
 s.story55.scriptedCallCompleted??={};s.story55.scriptedCallCompleted[RECOGNITION_CALL.id]=true;
 if(advanceClock)s.clock=clockState.clock;
}
export function migrateRecognitionHistory(s){
 const chat=s.content.conversations.noapp?.find(c=>c.id==='tai');if(!chat)return;
 const obsolete=id=>/^s55-recognition-[0-4]$/.test(id);
 const legacy=chat.messages.filter(m=>obsolete(m.id));
 if(legacy.length){
  const done=s.story55.completed.recognition;
  if(done)recognitionHistory(s,{day:legacy[0].day||done.day,at:legacy[0].time||done.clock});
  else {delete s.story55.scenes.recognition;if(s.story55.activeScene==='recognition')s.story55.activeScene=null;}
  const ids=new Set(legacy.map(m=>m.id));chat.messages=chat.messages.filter(m=>!ids.has(m.id));
  s.notifications=s.notifications.filter(n=>!ids.has(n.id)&&!ids.has(n.messageId));
 }
 if(s.story55.developerChatArchive?.some(e=>obsolete(e.message?.id)))s.story55.developerChatArchive=s.story55.developerChatArchive.filter(e=>!obsolete(e.message?.id));
}
