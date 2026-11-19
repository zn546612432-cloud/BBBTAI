import {GHOST_CAR_ARCHIVES} from '../../../../story/d35-d40/archives.js';
import {ORPHANAGE_ARCHIVES} from '../../../../story/d29/archives.js';
import {completed,isStory55} from '../../../../services/story55/state.js';
import {modelDelivered,ghostCarTasks} from '../../../../services/story55/ghost-car.js';

const personalReady=s=>s.day>=33&&completed(s,'photo')&&s.content?.localFiles?.some(f=>f.id==='personal-files'&&!f.deleted&&f.unlocked);
export function storyArchives(s,{personal=false}={}){
 if(!isStory55(s))return [];
 if(personal&&!personalReady(s))return [];
 return (personal?ORPHANAGE_ARCHIVES:GHOST_CAR_ARCHIVES).filter(f=>s.day>=f.day&&(!f.requires||completed(s,f.requires))&&(!f.model||modelDelivered(s,f.id))).map(f=>({
  id:f.id,name:f.name,kind:'story-archive',folder:personal?'personal':'documents',createdDay:f.day,personal,
  text: f.id==='story-archive-rehearsal'&&s.day>=38?f.text.replaceAll('出席　待確認','出席　出席'):
   f.id==='story-archive-ghost-car-plan'?planText(s,f.text):f.text
 }));
}
function planText(s,text){
 if(s.day>=37)text=text.replace('移動工作站：待驗收','移動工作站：已驗收');
 if(s.day>=38)text=text.replace('人員演練：進行中','人員演練：已完成').replace('行動服裝：待驗收','行動服裝：已驗收');
 for(const task of ghostCarTasks(s).filter(t=>t.file&&t.delivered)){
  text=text.replace(task.title+'：待交付',task.title+'：已交付');
 }
 if(completed(s,'prep')&&s.day>=40)text=text.replaceAll('待交付','已交付').replace('鬼車系統最終測試：未完成','鬼車系統最終測試：已完成');
 return text;
}
export const archiveFile=(s,id)=>[...storyArchives(s),...storyArchives(s,{personal:true})].find(f=>f.id===id)||null;
