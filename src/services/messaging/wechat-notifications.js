// Preferences affect presentation only, never delivery or story progression.
export const wechatChatMuted=(s,id)=>s.wechatNotificationPrefs?.muted?.[id]===true;
export const wechatAlertsEnabled=s=>s.wechatNotificationPrefs?.alerts!==false;
export function setWeChatChatMuted(s,id,muted){
 if(!s.content?.conversations?.wechat?.some(c=>c.id===id))return;
 const prefs=s.wechatNotificationPrefs??={};
 (prefs.muted??={})[id]=Boolean(muted);
}
export function setWeChatAlerts(s,enabled){(s.wechatNotificationPrefs??={}).alerts=Boolean(enabled);}
export function wechatNoticeMuted(s,n){
 if(n.link?.appId!=='wechat')return false;
 const route=n.link.route||'',id=n.conversationId||(route.startsWith('/chat/')?route.slice(6):'');
 return !wechatAlertsEnabled(s)||wechatChatMuted(s,id);
}
