import {chatView,sendChat} from '../../components/chat.js';
import {visibleMessages} from '../../services/messaging/delivery.js';
import {timestampLabel} from '../../services/messaging/timestamps.js';
import {render as composeReplica,submit as submitReplica} from './replica.js';
import {btn,esc} from '../../system/ui.js';
export const manifest={id:'messages',name:'信息',glyph:'••',tone:'#5bbd82',defaultRoute:'/',supportsDeepLink:true,kicker:'MESSAGES'};
let search='',unreadOnly=false,selectMode=false,confirmDelete=false,selected=new Set();
const portrait='<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="16" r="8" fill="white"/><path d="M6 39c1-13 31-13 32 0" fill="white"/></svg>';
export function render({store},loc){
 const s=store.get();
 if(loc.route.startsWith('/chat/'))return `<div class="sms-chat">${btn('sms-back','‹ 信息','sms-chat-back')}${chatView(s,'messages',loc.route.slice(6))}</div>`;
 if(loc.route==='/compose')return composeReplica({store},loc);
 const list=(s.content.conversations.messages||[])
  .filter(c=>{const msgs=visibleMessages(c,s);return (msgs.length>0||c.authored)&&(!unreadOnly||c.unread)&&`${c.name} ${msgs.map(m=>m.text).join(' ')}`.toLowerCase().includes(search.toLowerCase());})
  .sort((a,b)=>{const key=c=>{const m=visibleMessages(c,s).at(-1);return m?`${m.sentDate||''} ${m.time||''}`:'';};return key(b).localeCompare(key(a));});
 const rows=list.map(c=>{
  const m=visibleMessages(c,s).at(-1),pick=selectMode&&selected.has(c.id);
  const item=`${selectMode?`<span class="sms-selector ${pick?'selected':''}">${pick?'✓':''}</span>`:`<span class="sms-unread ${c.unread?'on':''}"></span>`}<span class="sms-avatar">${portrait}</span><span class="sms-copy"><strong>${esc(c.name)}</strong><small>${esc(m?.text||'')}</small></span><time>${esc(m?.timeLabel||(m?timestampLabel(m,s).replace(/\\s+\\d\\d:\\d\\d$/,''):''))}</time><span class="sms-chevron">›</span>`;
  return btn(selectMode?'sms-pick':'open-chat',item,'sms-row',`data-id="${esc(c.id)}"`);
 }).join('')||'<p class="sms-empty">没有信息</p>';
 const bottom=selectMode
 ?`<div class="sms-selection"><span>已选择 ${selected.size} 项</span>${btn('sms-delete','删除','sms-delete',selected.size?'':'disabled')}${btn('sms-done','完成','sms-pill')}</div>`
 :`<div class="sms-search">⌕ <input name="sms-search" placeholder="搜索" value="${esc(search)}" aria-label="搜索短信">♩ ${btn('sms-compose','□','',`aria-label="新建短信"`)}</div>`;
 const confirm=confirmDelete?`<div class="sms-delete-confirm" role="dialog" aria-modal="true"><div><strong>删除选中的 ${selected.size} 条信息？</strong><p>删除后会从本机短信列表中移除。</p>${btn('sms-cancel-delete','取消','sms-pill')}${btn('sms-confirm-delete','删除信息','sms-delete')}</div></div>`:'';
 return `<div class="sms-screen"><header>${btn('sms-edit',selectMode?'取消':'编辑','sms-pill')}${btn('sms-filter',unreadOnly?'全部':'☰','sms-pill',`aria-label="${unreadOnly?'显示全部短信':'筛选未读短信'}"`)}</header><h1>信息</h1><div class="sms-list">${rows}</div>${bottom}${confirm}</div>`;
}
export function handle(a,t,c){
 if(a==='sms-aodong-link')return c.router.open({appId:'browser',route:'/aodong',params:{}});
 if(a==='open-chat'){
  const id=t.dataset.id;
  c.router.open({appId:'messages',route:'/chat/'+id});
  c.store.update(s=>{const record=s.content.conversations.messages?.find(x=>x.id===id);if(record)record.unread=0;});
  return;
 }
 if(a==='sms-back')return c.router.back();
 if(a==='sms-compose')return c.router.open({appId:'messages',route:'/compose'});
 if(a==='sms-edit'){selectMode=!selectMode;selected.clear();confirmDelete=false;c.refresh();return;}
 if(a==='sms-filter'){unreadOnly=!unreadOnly;c.refresh();return;}
 if(a==='sms-pick'){selected.has(t.dataset.id)?selected.delete(t.dataset.id):selected.add(t.dataset.id);c.refresh();return;}
 if(a==='sms-done'){selectMode=false;selected.clear();confirmDelete=false;c.refresh();return;}
 if(a==='sms-delete'&&selected.size){confirmDelete=true;c.refresh();return;}
 if(a==='sms-cancel-delete'){confirmDelete=false;c.refresh();return;}
 if(a==='sms-confirm-delete'&&selected.size){
  const ids=new Set(selected),count=ids.size;
  c.store.update(s=>{
   s.content.conversations.messages=s.content.conversations.messages.filter(x=>!ids.has(x.id));
   s.notifications=s.notifications.filter(n=>!ids.has(n.conversationId)||n.link?.appId!=='messages');
   for(const id of ids)delete s.drafts[id];
   if(s.editor.channel==='messages'&&ids.has(s.editor.conversation))s.editor.conversation=s.content.conversations.messages[0]?.id||'';
  });
  selected.clear();selectMode=false;confirmDelete=false;c.toast('已删除 '+count+' 条信息');c.refresh();return;
 }
}
export const submit=(form,ctx)=>{
 if(form.dataset.form==='send-chat')return sendChat(form,ctx);
 if(form.dataset.form==='sms-new')return submitReplica(form,ctx);
};
export function input(el,ctx){if(el.name==='sms-search'){search=el.value;ctx.refresh();}}
