import {rebuildStory55AtDay} from '../../services/story55/rebuild.js';
import {WALLET_GIFT_DAY,PRIVATE_ACCEPT_DAY,D46_MAIL} from './definition.js';
export function prepareD45D46Preview(s,day){
 if(s.story55?.d45d46ReviewDay===day&&s.story55?.d45d46ReviewRevision===2){s.unlocked=true;return;}
 const clock=day===WALLET_GIFT_DAY?'10:30':day===PRIVATE_ACCEPT_DAY?'14:20':day===45?'11:23':'08:00';
 rebuildStory55AtDay(s,day,clock,{preservePlayerChats:false});
 s.story55.d45d46ReviewDay=day;
 s.story55.d45d46ReviewRevision=2;
 s.unlocked=true;
 s.nav={current:day===WALLET_GIFT_DAY?{appId:'noapp',route:'/chat/tai',params:{}}:day===PRIVATE_ACCEPT_DAY?{appId:'kira',route:'/mail/'+D46_MAIL,params:{}}:day===45?{appId:'wechat',route:'/chat/group',params:{}}:{appId:'home',route:'/',params:{}},stack:[]};
}
