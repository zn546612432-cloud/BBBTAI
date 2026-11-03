// Isolated reviewer shortcut. No production or V2 URL activates it.
import {isStory55} from '../../services/story55/state.js';
import {calendarAnchor} from '../../services/calendar.js';
export const NOAPP_V3_REVIEW_PATH='/BBBTAI/review/noapp-v3-20261103/';
export function isNoAppV3Review(pathname='',search='',isPreview=false){
 return isPreview===true&&String(pathname).startsWith(NOAPP_V3_REVIEW_PATH)&&
  new URLSearchParams(String(search)).get('panel')==='noapp-v3';
}
export function prepareNoAppV3Review(s){
 if(!isStory55(s))return false;
 const marker='noapp_v3_review_ready';
 if(!s.events?.some(e=>e?.type===marker)){
  s.day=37;
  s.calendar=calendarAnchor(37);
  s.clock='20:00';
  s.powerMode='idle';s.poweredOff=false;
  s.story55.completed??={};
  s.story55.completed.recognition={day:37,clock:'20:00',test:true};
  s.story55.noappInstalled=true;
  const tai=s.content?.conversations?.noapp?.find(c=>c.id==='tai');
  if(tai)tai.name='陈熙泰';
  s.events.push({type:marker,day:s.day,clock:s.clock,testOnly:true});
 }
 s.unlocked=true;
 s.nav.current={appId:'noapp',route:'/chat/tai',params:{}};
 s.nav.stack=[];
 return true;
}
