import {esc,empty} from '../../../system/ui.js';
import {visibleMessages} from '../../../services/messaging/delivery.js';
import {timestampGroups,timestampLabel} from '../../../services/messaging/timestamps.js';
import {actorName,isGroup} from '../../../editor/conversations/model.js';
import {resolveWeChatAvatar} from '../avatars.js';
import {renderEmojiPanel} from '../features/emoji/index.js';

export const wechatConversation=(s,id)=>s.content.conversations.wechat?.find(c=>c.id===id);

// Messages are frequently patched in place and live in an inner scroll area.
// Safari can leave lazy images there unrequested, showing only the gray tile.
const portrait=name=>'<span class="wx-message-avatar"><img src="'+esc(resolveWeChatAvatar(name))+'" alt="'+esc(name)+'" width="40" height="40" loading="eager" decoding="async"></span>';
const action=(name,title,icon)=>'<button type="button" class="wx-composer-icon" data-action="'+name+'" aria-label="'+title+'">'+icon+'</button>';
const voiceIcon='<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="14" cy="14" r="11"/><path d="M9 11v6m3-8c3 2.6 3 7.4 0 10m3-13c4.8 4.5 4.8 11.5 0 16"/></svg>';
const plusIcon='<svg width="29" height="29" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="14" cy="14" r="11"/><path d="M14 8v12M8 14h12"/></svg>';
export const smileIcon='<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="14" cy="14" r="11"/><circle cx="10" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="18" cy="11" r="1" fill="currentColor" stroke="none"/><path d="M9 17c2.6 3 7.4 3 10 0"/></svg>';
export const keyboardIcon='<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3" y="7" width="22" height="15" rx="2.5"/><path d="M7 11h1m4 0h1m4 0h1m3 0h.2M7 15h1m4 0h1m4 0h1m3 0h.2M8 19h12"/></svg>';

function invite(m,s,c){
  const invitation=s.invitations?.find(i=>i.id===m.invitationId),status=invitation?.status||'pending';
  return '<div class="wx-invite"><div class="wx-invite-title">♞　国际象棋邀请</div><span>'+esc(actorName(c,m.from))+' 邀请你下一局棋</span>'+
    (['pending','deferred'].includes(status)?'<button type="button" data-action="accept-invite" data-id="'+esc(m.invitationId)+'">接受邀请</button>':'<small>'+esc(status==='accepted'?'已接受':'邀请已结束')+'</small>')+'</div>';
}

function messageRow(m,s,c){
  if(m.kind==='recalled')return '<div class="wx-recall-notice" data-key="message-'+esc(m.id)+'" role="status">'+(m.recalledBy==='me'?'你':'对方')+'撤回了一条消息</div>';
  const mine=m.from==='me',name=mine?'熙蒙':actorName(c,m.from);
  const body=m.kind==='image'?'<img src="'+esc(m.text)+'" alt="聊天图片" class="wx-bubble-picture">':
    m.kind==='app_invitation'?invite(m,s,c):esc(m.text);
  const isText=!m.kind||m.kind==='text';
  return '<div class="message-row wx-message-row '+(mine?'mine':'theirs')+'" data-key="message-'+esc(m.id)+'">'+
    portrait(name)+'<div class="wx-message-body">'+
    (isGroup(c)&&!mine?'<span class="wx-message-sender">'+esc(name)+'</span>':'')+
    '<button type="button" class="wx-bubble '+(m.kind==='image'?'wx-bubble-image':'')+'" data-action="wx-message-options" data-id="'+esc(m.id)+'" data-owner="'+(mine?'1':'0')+'" data-text="'+(isText?'1':'0')+'" aria-label="'+esc(name)+'的消息，点击或长按查看操作" title="'+esc(timestampLabel(m,s))+'">'+body+'</button>'+
    '</div></div>';
}

/** Native-style WeChat conversation view, separate from the app-agnostic chat UI. */
export function renderWeChatChat(s,id){
  const c=wechatConversation(s,id);
  if(!c)return empty('对话不存在');
  return '<section class="chat-screen wx-conversation" data-wx-conversation="'+esc(id)+'">'+
    '<div class="chat-messages wx-chat-messages" role="log" aria-label="'+esc(c.name)+'的聊天消息">'+
    timestampGroups(visibleMessages(c),s).map(({m,separator})=>
      (separator?'<div class="chat-time-divider wx-time-divider" data-key="time-'+esc(m.id)+'">'+esc(separator)+'</div>':'')+
      messageRow(m,s,c)).join('')+'</div>'+
    '<form class="composer wx-composer" data-form="send-chat" data-channel="wechat" data-id="'+esc(id)+'">'+
      action('wx-speak-draft','朗读输入框文字',voiceIcon)+
      '<input name="text" type="text" autocomplete="off" enterkeyhint="send" placeholder=" " aria-label="输入聊天内容" value="'+esc(s.drafts[id]||'')+'">'+
      action('wx-emoji','表情',smileIcon)+
      action('attach-chat','发送图片',plusIcon).replace('aria-label="发送图片"','data-id="'+esc(id)+'" aria-label="发送图片"')+
      '<button type="submit" class="wx-composer-send" aria-label="发送消息">发送</button></form>'+
    renderEmojiPanel()+
    '<div class="wx-message-menu" hidden role="group" aria-label="消息操作"></div>'+ 
    '</section>';
}
