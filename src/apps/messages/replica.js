import {btn,esc} from '../../system/ui.js';
import {visibleMessages} from '../../services/messaging/delivery.js';
import {timestampLabel,timestampGroups} from '../../services/messaging/timestamps.js';
import {sendChat} from '../../components/chat.js';
import {sendMessage} from '../../services/messaging/index.js';
import {createConversation} from '../../editor/conversations/model.js';

export const manifest={id:'messages',name:'信息',glyph:'••',tone:'#5bbd82',defaultRoute:'/',supportsDeepLink:true,kicker:'MESSAGES'};
const symbols={
 back:'<path d="m15 4-8 8 8 8"/>',
 check:'<circle cx="12" cy="12" r="9"/><path d="m7.5 12.2 3.2 3.2 6-7"/>',
 search:'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
 compose:'<path d="M13 4H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-8M12 12 22 2m-6 0h6v6"/>',
 filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
 mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
 plus:'<path d="M12 3v18M3 12h18"/>',
 wave:'<path d="M3 10v4M7 6v12M11 2v20M15 7v10M19 5v14M23 10v4"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 send:'<path d="m12 19 0-14m-6 6 6-6 6 6"/>',
 person:'<circle cx="12" cy="8" r="4" fill="#fff" stroke="none"/><path d="M4.5 20a8.5 8.5 0 0 1 15 0" fill="#fff" stroke="none"/>',
 trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6M10 10v7m4-7v7"/>'
};
const ico=(name,size=22)=>`<svg class="ios-msg-icon ios-msg-icon-${name}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbols[name]}</svg>`;
const face=(large=false)=>`<span class="ios-msg-face ${large?'large':''}">${ico('person',large?38:31)}</span>`;
const label=(m,s)=>m?.timeLabel|| (m?timestampLabel(m,s).replace(/\s+\d\d:\d\d$/,''):'');
const linkify=t=>esc(t).replace(/\b\d{1,2}-\d{1,2}-\d{4}\b/g,match=>`<span class="ios-msg-detected">${match}</span>`);
let search='',menuOpen=false,unreadOnly=false,selectMode=false,confirmDelete=false,selected=new Set();

function listView(s){
 const list=(s.content.conversations.messages||[]).filter(c=>(!unreadOnly||c.unread)&&`${c.name} ${visibleMessages(c).map(m=>m.text).join(' ')}`.toLowerCase().includes(search.toLowerCase()));
 return `<div class="ios-messages-page ios-messages-list"><header class="ios-msg-top">${btn('sms-more',selectMode?'取消':'编辑','ios-msg-top-button',`aria-label="${selectMode?'取消选择':'编辑信息'}"`)}${btn('sms-filter',ico('filter',24),'ios-msg-round',`aria-label="${unreadOnly?'显示所有信息':'筛选未读信息'}"`)}</header>
 <h1>信息</h1><div class="ios-msg-scroll">${list.map(c=>{const m=visibleMessages(c).at(-1);return `<button type="button" class="ios-msg-row" data-action="${selectMode?'sms-pick':'open-chat'}" data-id="${esc(c.id)}">${selectMode?`<span class="ios-msg-selector ${selected.has(c.id)?'selected':''}">${selected.has(c.id)?'✓':''}</span>`:`<span class="ios-msg-unread ${c.unread?'active':''}"></span>`}${face()}<span class="ios-msg-summary"><strong>${esc(c.name)}</strong><small><b>内地</b> ${esc(m?.text||'')}</small></span><time>${esc(label(m,s))}</time><span class="ios-msg-chevron">${ico('chevron',17)}</span></button>`;}).join('')||'<p class="ios-msg-no-results">没有信息</p>'}</div>
 ${selectMode?`<div class="ios-msg-selection-bar"><span>已选择 ${selected.size} 项</span><div class="ios-msg-selection-actions">${btn('sms-done','完成','ios-msg-finish')}${btn('sms-delete',`${ico('trash',21)}<span>删除</span>`,'ios-msg-trash',`${selected.size?'':'disabled'} aria-label="删除选中的短信"`)}</div></div>`:`<div class="ios-msg-bottom"> <label class="ios-msg-floating-search">${ico('search',21)}<input name="sms-search" placeholder="搜索" value="${esc(search)}" aria-label="搜索短信">${ico('mic',20)}</label>${btn('sms-compose',ico('compose',24),'ios-msg-compose',`aria-label="新建短信"`)}</div>`}
 ${menuOpen?`<div class="ios-msg-menu-veil" data-action="sms-dismiss-menu"></div><div class="ios-msg-popup">${[['sms-select','check','选择信息'],['sms-pins','plus','编辑置顶'],['sms-profile','person','设置姓名与照片']].map(([act,ic,title])=>btn(act,`${ico(ic,21)}<span>${title}</span>`,'ios-msg-popup-row')).join('')}</div>`:''}
 ${confirmDelete?`<div class="ios-msg-delete-veil"><div class="ios-msg-delete-dialog" role="dialog" aria-modal="true" aria-label="确认删除短信"><strong>删除选中的 ${selected.size} 条信息？</strong><p>删除后会从本机短信列表中移除。</p><div>${btn('sms-cancel-delete','取消','')}${btn('sms-confirm-delete','删除信息','danger')}</div></div></div>`:''}</div>`;
}

function chatView(s,id){
 const c=s.content.conversations.messages?.find(x=>x.id===id);
 if(!c)return `<div class="ios-messages-page"><header>${btn('sms-back','‹ 信息','ios-msg-back')}</header><p class="ios-msg-no-results">对话不存在</p></div>`;
 const items=timestampGroups(visibleMessages(c),s),count=s.content.conversations.messages?.filter(x=>x.unread).length||0;
 return `<div class="ios-messages-page ios-msg-conversation"><header class="ios-chat-header"><div class="ios-chat-topline">${btn('sms-back',`${ico('back',25)}<span>${count||''}</span>`,'ios-chat-back',`aria-label="返回信息列表"`)}</div>${face(true)}<div class="ios-chat-name">${esc(c.name)}${ico('chevron',18)}</div></header>
 <div class="ios-chat-scroll" role="log" aria-label="短信聊天记录">${items.map(({m,separator})=>`${separator?`<div class="ios-chat-date">${esc(separator)}</div>`:''}<div class="ios-chat-line ${m.from==='me'?'outbound':'inbound'}" data-key="message-${esc(m.id)}"><div class="ios-chat-bubble" title="${esc(timestampLabel(m,s))}">${m.kind==='image'?`<img src="${esc(m.text)}" alt="短信图片">`:linkify(m.text)}</div></div>`).join('')}</div>
 <form class="ios-chat-compose composer" data-form="send-chat" data-channel="messages" data-id="${esc(id)}">${btn('sms-add-media',ico('plus',27),'ios-chat-plus',`type="button" aria-label="添加内容"`)}<div class="ios-chat-input"> <input name="text" placeholder="信息 · 短信" value="${esc(s.drafts[id]||'')}" aria-label="短信内容"><span class="ios-chat-wave">${ico('wave',24)}</span><button type="submit" class="ios-chat-send" aria-label="发送短信">${ico('send',20)}</button></div></form></div>`;
}
function composeView(){return `<div class="ios-messages-page ios-new-message"><header>${btn('sms-back','取消','ios-msg-cancel')}<strong>新信息</strong><span></span></header><form data-form="sms-new"><label>收件人：<input name="recipient" placeholder="电话号码或姓名" maxlength="60" required></label><textarea name="text" rows="3" placeholder="信息 · 短信" aria-label="短信内容" required></textarea><button type="submit">发送</button></form></div>`;}
export function render({store},loc){const s=store.get();return loc.route.startsWith('/chat/')?chatView(s,loc.route.slice(6)):loc.route==='/compose'?composeView():listView(s);}
export function handle(a,t,c){
 if(a==='open-chat'){c.router.open({appId:'messages',route:'/chat/'+t.dataset.id});c.store.update(s=>{const x=s.content.conversations.messages?.find(x=>x.id===t.dataset.id);if(x)x.unread=0;});}
 if(a==='sms-back')c.router.back();
 if(a==='sms-compose'){menuOpen=false;c.router.open({appId:'messages',route:'/compose'});}
 if(a==='sms-filter'){unreadOnly=!unreadOnly;c.refresh();}
 if(a==='sms-more'){if(selectMode){selectMode=false;selected.clear();confirmDelete=false;}else menuOpen=!menuOpen;c.refresh();}
 if(a==='sms-dismiss-menu'){menuOpen=false;c.refresh();}
 if(a==='sms-select'){menuOpen=false;selectMode=true;selected.clear();c.refresh();}
 if(a==='sms-pick'){selected.has(t.dataset.id)?selected.delete(t.dataset.id):selected.add(t.dataset.id);c.refresh();}
 if(a==='sms-done'){selectMode=false;selected.clear();confirmDelete=false;c.refresh();}
 if(a==='sms-delete'&&selected.size){confirmDelete=true;c.refresh();}
 if(a==='sms-cancel-delete'){confirmDelete=false;c.refresh();}
 if(a==='sms-confirm-delete'&&selected.size){
  const ids=new Set(selected),count=ids.size;
  c.store.update(s=>{
   s.content.conversations.messages=s.content.conversations.messages.filter(x=>!ids.has(x.id));
   s.notifications=s.notifications.filter(n=>!ids.has(n.conversationId)||n.link?.appId!=='messages');
   for(const id of ids)delete s.drafts[id];
   if(s.editor.channel==='messages'&&ids.has(s.editor.conversation))s.editor.conversation=s.content.conversations.messages[0]?.id||'';
  });
  selected.clear();selectMode=false;confirmDelete=false;c.toast(`已删除 ${count} 条信息`);c.refresh();
 }
 if(a==='sms-pins'){menuOpen=false;c.toast('置顶消息编辑将在后续功能阶段开放');c.refresh();}
 if(a==='sms-profile'){menuOpen=false;c.toast('可在开发者功能中修改发件人姓名');c.refresh();}
 if(a==='sms-add-media')c.toast('图片短信将在后续功能阶段开放');
}
export function submit(f,c){
 if(f.dataset.form==='send-chat')return sendChat(f,c);
 if(f.dataset.form==='sms-new'){
  const data=new FormData(f),name=String(data.get('recipient')||'').trim(),text=String(data.get('text')||'').trim();
  if(!name||!text)throw Error('请输入收件人和短信内容');
  const id=createConversation(c.store,{channel:'messages',name});sendMessage(c.store,{channel:'messages',conversationId:id,text});
  c.router.open({appId:'messages',route:'/chat/'+id});
 }
}
export function input(el,c){if(el.name==='sms-search'){search=el.value;c.refresh();}}
