import {isStory55,completed,completeNode,nodeStatus,date55} from './state.js';
import {GHOST_CAR_TASKS,GHOST_CAR_MODEL_FILES} from '../../story/d35-d40/progress.js';
import {appendAuthoredPhoneMessage} from '../messaging/phone-messages.js';
import {SOURCE_FILE,SOURCE_SCENE} from '../../story/d47/definition.js';

export const modelDelivered=(s,id)=>[...GHOST_CAR_MODEL_FILES,SOURCE_FILE].some(f=>f.id===id&&
 (s.content?.conversations?.noapp?.find(c=>c.id==='tai')?.messages||[]).some(m=>m.id===f.messageId&&m.actual===true&&m.day<=s.day&&m.from==='tai'));
const modelParsed=(s,id)=>modelDelivered(s,id)&&s.story55?.tearAgent?.jobs?.[id]?.done===true;
export function ghostCarTasks(s){
 const active=isStory55(s)&&completed(s,'plan'),legacy=active&&completed(s,'prep');
 const modelsReady=GHOST_CAR_MODEL_FILES.every(f=>modelParsed(s,f.id));
 return GHOST_CAR_TASKS.map(t=>{
  const done=!!(active&&(legacy||(s.day>=t.day&&(t.file?modelParsed(s,t.file):t.id==='validation'?modelsReady:true))));
  return {...t,date:date55(t.day),done,progress:done?100:0,delivered:!!(t.file&&modelDelivered(s,t.file))};
 });
}
export function ghostCarProgress(s){const tasks=ghostCarTasks(s);return tasks.filter(t=>t.done).length*10;}
export function syncGhostCarProgress(s){
 if(isStory55(s)&&s.story55.completed[SOURCE_SCENE]?.legacySkipped&&!completed(s,'second')){
  appendAuthoredPhoneMessage(s,{channel:'noapp',conversationId:'tai',messageId:SOURCE_FILE.messageId,from:'tai',text:SOURCE_FILE.name,kind:'file',attachment:{storyArchiveId:SOURCE_FILE.id},day:47,clock:'21:31',storyTag:'story55',silent:true});
 }
 if(!isStory55(s)||s.story55.ended||!completed(s,'plan'))return;
 if(s.day>=39&&completed(s,'recognition')){
  for(const f of GHOST_CAR_MODEL_FILES)appendAuthoredPhoneMessage(s,{
   channel:'noapp',conversationId:'tai',messageId:f.messageId,from:'tai',text:f.name,kind:'file',
   attachment:{storyArchiveId:f.id},day:s.day,clock:s.clock,storyTag:'story55',silent:s.day>39
  });
 }
 // The original completed node survives migration. New saves only complete
 // after both model records actually went through the existing TAI reader.
 if(s.day>=40&&ghostCarProgress(s)===100&&nodeStatus(s,'prep').state==='ready')completeNode(s,'prep');
}
