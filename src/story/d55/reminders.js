import {completed,isStory55,nodeStatus} from '../../services/story55/state.js';
import {D55_BRIEFING,D55_DEPARTURE} from './definition.js';
const ITEMS=[
 {id:'s55-d55-briefing-reminder',node:D55_BRIEFING,at:'09:50',title:'在群聊確認最後一次行動流程',link:{appId:'wechat',route:'/chat/group'}},
 {id:'s55-d55-departure-reminder',node:D55_DEPARTURE,at:'18:00',title:'行動開始',link:{appId:'wechat',route:'/chat/wang'}}
];
export function syncD55Reminders(s){
 if(!isStory55(s)||s.day!==55)return false;
 let changed=false;
 s.content.reminders??=[];s.notifications??=[];
 for(const entry of ITEMS){
  const done=completed(s,entry.node),reminder=s.content.reminders.find(r=>r.id===entry.id);
  if(reminder){reminder.done=done;continue;}
  if(done||s.clock<entry.at||nodeStatus(s,entry.node).state!=='ready')continue;
  s.content.reminders.push({id:entry.id,title:entry.title,done:false,priority:'critical',storyNode:entry.node,link:{...entry.link}});
  if(!s.notifications.some(n=>n.id===entry.id+'-notice'))s.notifications.unshift({
   id:entry.id+'-notice',title:'提醒事項',body:entry.title,day:55,clock:entry.at,
   storyMessage:true,bannerPending:true,link:{...entry.link}
  });
  changed=true;
 }
 return changed;
}
