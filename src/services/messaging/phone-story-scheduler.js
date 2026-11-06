// Only one phone-story tick registration for every authored WeChat day.
// Each day keeps its own content and conditional scenario state, but lifecycle
// / deadlines are called from the same coordinator. New days register here.
import {tickD01WeChat,d01WeChatDue} from '../../story/d01/wechat.js';
import {tickD02Wechat,d02WeChatDue} from '../../story/d02/wechat.js';
import {tickD03Chats,d03ChatDue} from '../../story/d03/wechat.js';
import {tickD04Chats,d04ChatDue} from '../../story/d04/wechat.js';
import {tickD05Chats,d05ChatDue} from '../../story/d05/wechat.js';

const tracks=[
 {name:'D01',day:1,tick:tickD01WeChat,due:d01WeChatDue},
 {name:'D02',day:2,tick:tickD02Wechat,due:d02WeChatDue},
 {name:'D03',day:3,tick:tickD03Chats,due:d03ChatDue},
 // D04 backlogs can continue after the calendar day without fabricating
 // missing player replies or emptying a saved conversation.
 {name:'D04',day:4,tick:tickD04Chats,due:d04ChatDue,carryForward:true},
 {name:'D05',day:5,tick:tickD05Chats,due:d05ChatDue,carryForward:true}
];
export const PHONE_CHAT_TRACKS=tracks.map(({name,day,carryForward})=>({name,day,carryForward:!!carryForward}));

export function tickPhoneStoryMessages(s,now=Date.now(),{dueOnly=false}={}){
 if(s.story55?.version!==1)return false;
 let changed=false;
 for(const track of tracks){
  if(s.day!==track.day&&!(track.carryForward&&s.day>track.day))continue;
  if(dueOnly&&!track.due(s,now))continue;
  changed=!!track.tick(s,now)||changed;
 }
 return changed;
}

export function phoneStoryMessagesDue(s,now=Date.now()){
 if(s.story55?.version!==1)return false;
 return tracks.some(track=>
  (s.day===track.day||(track.carryForward&&s.day>track.day))&&track.due(s,now)
 );
}
