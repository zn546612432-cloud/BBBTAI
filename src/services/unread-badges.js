// Shared iOS-style Home/Dock badge counts.
// Read state is already persisted by each app; do not duplicate it in a
// second badge counter or treat old authored history as new notifications.
const channels=new Set(['wechat','messages','noapp','mirage']);
const positive=value=>{
 const number=Number(value);
 return Number.isFinite(number)?Math.max(0,Math.floor(number)):0;
};

export function unreadAppCount(s,appId){
 if(channels.has(appId))
  return (s?.content?.conversations?.[appId]||[]).reduce((total,chat)=>total+positive(chat.unread),0);
 if(appId==='kira')
  return (s?.content?.mail||[]).filter(mail=>!mail.read&&!mail.linkedDelivery).length;
 return 0;
}

export const badgeText=count=>count>99?'99+':String(count);

export function unreadBadge(s,appId){
 const count=unreadAppCount(s,appId);
 return count>0
  ?'<span class="home-unread-badge" aria-hidden="true">'+badgeText(count)+'</span>'
  :'';
}
