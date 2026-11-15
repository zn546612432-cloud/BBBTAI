// This friends-only branch ends on the last authored day, without invoking D55.
export const FRIENDS_LAST_DAY=29;
export const friendsPreviewEnded=s=>s?.story55?.friendsPreviewEnded===true;
export const friendsLastDay=s=>s?.story55?.version===1&&s.day===FRIENDS_LAST_DAY;
export function finishFriendsPreview(s){
 if(!friendsLastDay(s)||!s.story55.completed?.plan)return false;
 s.story55.friendsPreviewEnded=true;
 s.powerMode='idle';s.shortCharge=null;s.worldMinuteFraction=0;
 s.emergencyCharge=false;s.poweredOff=false;s.sleepWakeAt=null;s.alarmRinging=null;
 s.dayChargeRemainingMs=0;
 return true;
}
export const friendsEndingView=()=>'<section class="power-fullscreen friends-preview-end" role="status"><span class="friends-preview-kicker">THE END OF THE PREVIEW</span><div class="friends-preview-day">29<span> / 29</span></div><h2>本次試玩到這裡</h2><p>感謝陪伴熙蒙度過這二十九天。</p><p>故事未完，敬請期待。</p></section>';
