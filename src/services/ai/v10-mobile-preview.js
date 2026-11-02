// A separate, opt-in reviewer shortcut for the v10 phone preview.
// Never activates on production /BBBTAI/ or on unrelated review routes.
// It changes only the v10 review's already-namespaced browser save.
import {isStory55} from '../story55/state.js';
export const TAI_V10_PREVIEW_PATH='/BBBTAI/review/xitai-v10-20261102/';
export function isTaiV10MobilePreview(pathname,search,isPreview){
 return isPreview===true&&String(pathname||'').startsWith(TAI_V10_PREVIEW_PATH)&&
  new URLSearchParams(String(search||'')).get('panel')==='tai-v10';
}
export function prepareTaiV10MobilePreview(s){
 if(!isStory55(s))return false;
 const marker='tai_v10_mobile_preview_ready';
 if(!s.events?.some(e=>e?.type===marker)){
  s.day=37;
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
