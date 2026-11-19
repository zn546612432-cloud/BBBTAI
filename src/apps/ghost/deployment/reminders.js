import {completed,isStory55,date55} from '../../../services/story55/state.js';
import {deployment} from '../../../services/story55/projects.js';
import {ghostCarTasks,ghostCarProgress} from '../../../services/story55/ghost-car.js';

// The existing reminders store is a projection of the canonical project
// batches, never a separate progress counter or a manually toggleable task.
export function syncTearReminders(s){
 if(!isStory55(s))return;
 const items=s.content.reminders??=[];
 const batches=deployment(s,'base').batches;
 for(let day=14;day<=Math.min(24,s.day);day++){
  const b=batches[day-14],count=Math.min(5,(b?.steps||[]).filter(Boolean).length);
  const id='tear-link-'+day;
  const title='Ouroboros’ Tear — 鏈接測試 '+count+'/5';
  let r=items.find(x=>x.id===id);
  if(!r){r={id,storyProject:true,day};items.push(r);}
  Object.assign(r,{title,date:date55(day),done:count===5,progress:count,total:5});
 }
 if(completed(s,'plan')){
  let r=items.find(x=>x.id==='ghost-car-plan');
  if(!r){r={id:'ghost-car-plan',title:'鬼車行動',storyProject:true};items.push(r);}
  const progress=ghostCarProgress(s),children=ghostCarTasks(s);
  Object.assign(r,{done:progress===100,children,progress,total:children.length});
 }
}
