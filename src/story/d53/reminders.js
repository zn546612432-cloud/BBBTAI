import {isStory55,completed,scriptedCallPlayed,nodeStatus} from '../../services/story55/state.js';
import {D53_CALL} from './call.js';
import {D53_ISOLDE_DEAL} from './definition.js';
import {D46_CONTACT} from '../d46/definition.js';
export const D53_REMINDER_ID='s55-d53-isolde-deal-reminder';
const NOTICE_ID='s55-d53-isolde-deal-notice';
const TITLE='Isolde｜確認第二筆委託';
const LINK={appId:'mirage',route:'/chat/'+D46_CONTACT,params:{}};
export function d53DealReminderDue(s,now=Date.now()){
 if(!isStory55(s)||s.day!==53||!scriptedCallPlayed(s,D53_CALL)||completed(s,D53_ISOLDE_DEAL))return false;
 if(nodeStatus(s,D53_ISOLDE_DEAL).state!=='ready')return false;
 if(now<(s.story55.d53DealPromptAt??0))return false;
 return !s.content.reminders?.some(r=>r.id===D53_REMINDER_ID);
}
export function syncD53DealReminder(s,now=Date.now()){
 if(!isStory55(s)||s.day!==53)return false;
 const done=completed(s,D53_ISOLDE_DEAL),items=s.content.reminders??(s.content.reminders=[]);
 const item=items.find(r=>r.id===D53_REMINDER_ID);
 if(item){item.done=done;return false;}
 if(done||!d53DealReminderDue(s,now))return false;
 items.push({id:D53_REMINDER_ID,title:TITLE,done:false,storyNode:D53_ISOLDE_DEAL,priority:'critical',link:{...LINK}});
 s.notifications??=[];
 if(!s.notifications.some(n=>n.id===NOTICE_ID))s.notifications.unshift({
  id:NOTICE_ID,title:'提醒事項',body:TITLE,storyMessage:true,bannerPending:true,
  day:s.day,clock:s.clock,link:{...LINK}
 });
 return true;
}
