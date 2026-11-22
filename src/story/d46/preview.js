import {rebuildStory55AtDay} from '../../services/story55/rebuild.js';
export function prepareD45D46Preview(s,day){
 if(s.story55?.d45d46ReviewDay===day){s.unlocked=true;return;}
 rebuildStory55AtDay(s,day,day===45?'10:30':'14:20',{preservePlayerChats:false});
 s.story55.d45d46ReviewDay=day;
 s.unlocked=true;
 s.nav={current:day===45?{appId:'noapp',route:'/chat/tai',params:{}}:{appId:'kira',route:'/mail/s55-d46-isolde-mail',params:{}},stack:[]};
}
