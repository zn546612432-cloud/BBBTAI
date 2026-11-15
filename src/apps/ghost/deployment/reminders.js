import {completed,isStory55,date55} from '../../../services/story55/state.js';
import {deployment} from '../../../services/story55/projects.js';

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
 if(completed(s,'plan')&&!items.some(x=>x.id==='ghost-car-plan'))items.push({
  id:'ghost-car-plan',title:'鬼車行動',storyProject:true,done:false,
  children:['入侵攝像頭','入侵警察局電話線','安排撤離路線','搭建本地銀行伺服器程序'].map(title=>({title,progress:0}))
 });
}
