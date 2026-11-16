import {wechatNoticeMuted} from './wechat-notifications.js';

// Presentation preferences never prevent delivery, unread badges or story triggers.
export const quietNotifications=s=>s.focus===true||s.allowNotifications===false;
const alarm=n=>n?.title==='闹钟'||n?.title==='鬧鐘'||n?.type==='alarm';
export function notificationMuted(s,n){
 return !!n&&(n.silent===true||n.bannerSuppressed===true||wechatNoticeMuted(s,n)||quietNotifications(s)&&!alarm(n));
}
export function suppressQuietBanners(s){
 if(!quietNotifications(s))return false;
 let changed=false;
 for(const notice of s.notifications||[]){
  if(alarm(notice)||notice.bannerSuppressed)continue;
  notice.bannerSuppressed=true;changed=true;
 }
 return changed;
}
export const hasQuietBanners=s=>quietNotifications(s)&&(s.notifications||[]).some(n=>!alarm(n)&&!n.bannerSuppressed);
