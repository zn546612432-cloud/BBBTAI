import {sendChat,attachChat} from '../../components/chat.js';
import {createConversation,actors,isGroup} from '../../editor/conversations/model.js';
import {renderWeChatHome,routeForTab} from './components/views.js';
import {renderWeChatChat,wechatConversation,smileIcon,keyboardIcon} from './components/chat-view.js';
import {recallWeChatMessage} from './features/recall/index.js';
import {speakWeChatText} from './features/tts/index.js';
import {selectEmojiCategory,editEmojiInput} from './features/emoji/index.js';
import {esc} from '../../system/ui.js';

export const manifest={id:'wechat',name:'微信',icon:0,defaultRoute:'/',supportsDeepLink:true,kicker:'MESSAGES'};
export const render=({store},location)=>location.route.startsWith('/chat/')
  ?renderWeChatChat(store.get(),location.route.slice(6))
  :renderWeChatHome(store.get(),location.route);

export function openMessageMenu(bubble){
  const conversation=bubble?.closest('.wx-conversation'),menu=conversation?.querySelector('.wx-message-menu');
  if(!menu||!bubble?.dataset.id)return;
  const options=[];
  if(bubble.dataset.text==='1')options.push('<button type="button" data-action="wx-message-tts" data-id="'+esc(bubble.dataset.id)+'">朗读</button>');
  if(bubble.dataset.owner==='1')options.push('<button type="button" data-action="wx-message-recall" data-id="'+esc(bubble.dataset.id)+'">撤回</button>');
  if(!options.length)return;
  const root=conversation.getBoundingClientRect(),rect=bubble.getBoundingClientRect();
  menu.innerHTML=options.join('');menu.hidden=false;
  const maxX=Math.max(8,root.width-menu.offsetWidth-8);
  menu.style.left=Math.min(maxX,Math.max(8,rect.left-root.left+rect.width/2-menu.offsetWidth/2))+'px';
  const offset=rect.top-root.top-menu.offsetHeight-10;
  menu.style.top=(offset>8?offset:rect.bottom-root.top+10)+'px';
}

function currentMessage(ctx,messageId){
  const route=ctx.store.get().nav.current.route,id=route.startsWith('/chat/')?route.slice(6):'';
  const conversation=wechatConversation(ctx.store.get(),id),message=conversation?.messages.find(m=>m.id===messageId);
  if(!message)throw Error('消息不存在');
  return {id,message};
}

function emojiPanelFor(target){return target.closest('.wx-conversation')?.querySelector('.wx-emoji-panel');}
function showEmojiPanel(conversation,open,{focusKeyboard=false}={}){
  const panel=conversation?.querySelector('.wx-emoji-panel'),input=conversation?.querySelector('.wx-composer input[name="text"]'),toggle=conversation?.querySelector('[data-action="wx-emoji"]');
  if(!panel||!input||!toggle)return;
  panel.hidden=!open;
  toggle.innerHTML=open?keyboardIcon:smileIcon;
  toggle.setAttribute('aria-label',open?'切换到键盘':'表情');
  toggle.setAttribute('aria-expanded',String(open));
  if(open){input.blur();const messages=conversation.querySelector('.wx-chat-messages');if(messages)messages.scrollTop=messages.scrollHeight;}
  else if(focusKeyboard)input.focus();
}

export function dismissEmojiForKeyboard(input){
  if(!input?.matches('.wx-composer input[name="text"]'))return;
  const conversation=input.closest('.wx-conversation');
  if(conversation?.querySelector('.wx-emoji-panel:not([hidden])'))showEmojiPanel(conversation,false);
}

export function handle(action,target,ctx){
  if(action==='wx-message-options'){openMessageMenu(target);return;}
  if(action==='wx-message-menu-close'){const menu=target.closest('.wx-conversation')?.querySelector('.wx-message-menu');if(menu)menu.hidden=true;return;}
  if(action==='wx-message-tts'){
    const {message}=currentMessage(ctx,target.dataset.id);
    if(message.kind==='recalled'||message.kind==='image')throw Error('这条消息没有可朗读的文字');
    speakWeChatText(message.text);
    target.closest('.wx-message-menu')?.setAttribute('hidden','');
    return;
  }
  if(action==='wx-message-recall'){
    const {id}=currentMessage(ctx,target.dataset.id);
    recallWeChatMessage(ctx.store,id,target.dataset.id);
    return;
  }
  if(action==='wx-speak-draft'){
    const draft=target.closest('.wx-composer')?.elements.text?.value||'';
    speakWeChatText(draft);
    return;
  }
  if(action==='wx-emoji'){
    const conversation=target.closest('.wx-conversation'),panel=emojiPanelFor(target);
    if(panel)showEmojiPanel(conversation,panel.hidden,{focusKeyboard:!panel.hidden});
    return;
  }
  if(action==='wx-emoji-category'){
    selectEmojiCategory(emojiPanelFor(target),target.dataset.category);
    return;
  }
  if(action==='wx-emoji-insert'||action==='wx-emoji-delete'){
    const input=target.closest('.wx-conversation')?.querySelector('.wx-composer input[name="text"]');
    editEmojiInput(input,action==='wx-emoji-insert'?target.dataset.emoji:null);
    return;
  }
  if(action==='wx-chat-more'){
    const id=ctx.store.get().nav.current.route.slice(6),conversation=wechatConversation(ctx.store.get(),id);
    if(conversation)ctx.toast(isGroup(conversation)?'群成员：'+actors(conversation).map(a=>a.name).join('、'):conversation.name);
    return;
  }
  if(action==='wx-tab'){
    const route=routeForTab(target.dataset.tab);
    if(ctx.store.get().nav.current.route!==route)ctx.store.update(s=>{s.nav.current.route=route;s.nav.current.params={};});
    return;
  }
  if(action==='wx-toggle-menu'){
    const menu=target.closest('.wx-screen')?.querySelector('.wx-action-menu');
    if(menu)menu.hidden=!menu.hidden;
    return;
  }
  if(action==='wx-open-entry'){
    ctx.toast((target.dataset.label||'此功能')+'：二级页面将在下一阶段接入');
    return;
  }
  if(action==='wx-open-contact'){
    const name=target.dataset.name||'';
    const existing=ctx.store.get().content.conversations.wechat?.find(c=>c.id===target.dataset.id||c.name===name);
    const id=existing?.id||createConversation(ctx.store,{channel:'wechat',name});
    ctx.router.open({appId:'wechat',route:'/chat/'+id});
    return;
  }
  if(action==='wx-open-groups'){
    const group=ctx.store.get().content.conversations.wechat?.find(c=>c.group||c.id==='group');
    if(group)ctx.router.open({appId:'wechat',route:'/chat/'+group.id});
    else ctx.toast('还没有群聊');
    return;
  }
  if(action==='wx-index'){
    const section=[...document.querySelectorAll('.wx-contact-section')].find(n=>n.dataset.wxSection===target.dataset.letter);
    section?.scrollIntoView({block:'start',behavior:'smooth'});
    return;
  }
  if(action==='open-chat')ctx.router.open({appId:'wechat',route:'/chat/'+target.dataset.id});
  if(action==='attach-chat')attachChat(target.dataset.id,'wechat',ctx);
}
export function input(target){
  if(!target.matches('[data-wx-search]'))return;
  const term=target.value.trim().toLocaleLowerCase();
  const root=target.closest('.wx-screen');
  root?.querySelectorAll('[data-wx-filter]').forEach(row=>{
    row.hidden=Boolean(term)&&!String(row.dataset.wxFilter||'').toLocaleLowerCase().includes(term);
  });
}
export const submit=(form,ctx)=>{if(form.dataset.form==='send-chat')sendChat(form,ctx);};
