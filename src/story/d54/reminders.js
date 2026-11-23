import {completed,isStory55,nodeStatus} from '../../services/story55/state.js';
import {D54_FATHER} from './definition.js';

export const D54_FATHER_REMINDER='s55-d54-father-reminder';
export const D54_FATHER_NOTIFICATION='s55-d54-father-notification';
export const D54_FATHER_NOTICE_TEXT='給傅隆生發信息';
export const D54_FATHER_LINK={appId:'wechat',route:'/chat/fulongsheng',params:{}};

export function syncD54FatherReminder(s){
 if(!isStory55(s)||s.day!==54)return false;
 const list=s.content.reminders??(s.content.reminders=[]);
 const done=completed(s,D54_FATHER);
 const item=list.find(r=>r.id===D54_FATHER_REMINDER);
 if(item){item.done=done;return false;}
 if(done||nodeStatus(s,D54_FATHER).state!=='ready')return false;
 list.push({id:D54_FATHER_REMINDER,title:D54_FATHER_NOTICE_TEXT,done:false,
  storyNode:D54_FATHER,priority:'critical',link:{...D54_FATHER_LINK}});
 s.notifications??=[];
 if(!s.notifications.some(n=>n.id===D54_FATHER_NOTIFICATION))s.notifications.unshift({
  id:D54_FATHER_NOTIFICATION,title:'提醒事項',body:D54_FATHER_NOTICE_TEXT,
  day:54,clock:'19:00',storyMessage:true,bannerPending:true,link:{...D54_FATHER_LINK}
 });
 return true;
}
