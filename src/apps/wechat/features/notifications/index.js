import {esc} from '../../../../system/ui.js';
import {wechatChatMuted,wechatAlertsEnabled,setWeChatChatMuted,setWeChatAlerts} from '../../../../services/messaging/wechat-notifications.js';
import {wechatConversation} from '../../components/chat-view.js';
import {renderGroupInfo,renderDirectInfo} from '../group/index.js';

const header=title=>`<header class="wx-header wx-pref-header"><button type="button" data-action="back" aria-label="返回">‹</button><h1>${title}</h1></header>`;
const toggle=(label,action,checked,id='')=>`<button class="wx-pref-toggle" type="button" role="switch" aria-checked="${checked}" data-action="${action}" data-id="${esc(id)}"><span>${label}</span><i class="wx-pref-switch" aria-hidden="true"></i></button>`;
export function renderWeChatPreferences(s,route){
 if(route.startsWith('/chat-info/')){
  const id=route.slice(11).split('/')[0],c=wechatConversation(s,id);
  return id==='group'?renderGroupInfo(s,route):renderDirectInfo(s,c);
 }
 if(route==='/settings/notifications')return `<section class="wx-screen wx-pref">${header('新消息通知')}<div class="wx-scroll">${toggle('新消息提醒','wx-alert-toggle',wechatAlertsEnabled(s))}</div></section>`;
 return `<section class="wx-screen wx-pref">${header('設定')}<div class="wx-scroll"><button class="wx-pref-toggle" data-action="wx-notification-settings">新消息通知 <span>›</span></button></div></section>`;
}
export function handleWeChatPreferences(action,target,ctx){
 if(action==='wx-chat-more'){
  const route=ctx.store.get().nav.current.route;
  if(route.startsWith('/chat/'))ctx.router.open({appId:'wechat',route:'/chat-info/'+route.slice(6)});
  return true;
 }
 if(action==='wx-mute-chat'){ctx.store.update(s=>setWeChatChatMuted(s,target.dataset.id,!wechatChatMuted(s,target.dataset.id)));return true;}
 if(action==='wx-alert-toggle'){ctx.store.update(s=>setWeChatAlerts(s,!wechatAlertsEnabled(s)));return true;}
 if(action==='wx-notification-settings'){ctx.router.open({appId:'wechat',route:'/settings/notifications'});return true;}
 if(action==='wx-open-entry'&&target.dataset.label==='设置'){ctx.router.open({appId:'wechat',route:'/settings'});return true;}
 return false;
}
