import {GHOST_CAR_ARCHIVES} from '../../../../story/d35-d40/archives.js';
import {ORPHANAGE_ARCHIVES,ORPHANAGE_IMAGE_RECORDS} from '../../../../story/d29/archives.js';
import {completed,isStory55} from '../../../../services/story55/state.js';
import {modelDelivered,ghostCarTasks} from '../../../../services/story55/ghost-car.js';
import {SOURCE_FILE} from '../../../../story/d47/definition.js';

const personalReady=s=>s.day>=33&&completed(s,'photo')&&s.content?.localFiles?.some(f=>f.id==='personal-files'&&!f.deleted&&f.unlocked);
export function storyArchives(s,{personal=false}={}){
 if(!isStory55(s))return [];
 if(personal&&!personalReady(s))return [];
 return (personal?ORPHANAGE_ARCHIVES:[...GHOST_CAR_ARCHIVES,{...SOURCE_FILE,model:true}]).filter(f=>s.day>=f.day&&(!f.requires||completed(s,f.requires))&&(!f.model||modelDelivered(s,f.id))).map(f=>({
  id:f.id,name:f.name,kind:'story-archive',folder:personal?'personal':'documents',createdDay:f.day,personal,
  ...(f.id==='story-archive-intake'?{image:'/assets/story55/personal-files/tai/infant-admission.webp'}:{}),
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
export function archiveFile(s,id){
 const archive=[...storyArchives(s),...storyArchives(s,{personal:true})].find(f=>f.id===id);
 if(archive)return archive;
 if(!isStory55(s)||!personalReady(s))return null;
 const record=ORPHANAGE_IMAGE_RECORDS.find(r=>id==='personal-files/tai/record/'+r.id);
 return record?{id,name:record.name,kind:'personal-evidence',personal:true,text:record.text,image:'/assets/story55/personal-files/tai/'+record.id+'.webp'}:null;
}
// Private archive corrections apply to existing completed jobs too. Keep the
// historical snapshot of time-dependent work records; correct only the old names.
export function documentResultText(s,id,snapshot){
 const file=archiveFile(s,id);
 if(!file)return '';
 if(file.personal)return file.text;
 if(['story-archive-ghost-car-plan','story-archive-retreat','story-archive-equipment'].includes(id))
  return String(snapshot??file.text).replace(/陳熙[蒙旺]/g,name=>name.slice(1));
 return snapshot??file.text;
}
