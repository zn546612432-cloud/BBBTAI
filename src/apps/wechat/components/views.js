import {esc} from '../../../system/ui.js';
import {visibleMessages} from '../../../services/messaging/delivery.js';
import {actors,isGroup} from '../../../editor/conversations/model.js';
import {wxIcon} from './icons.js';
import {resolveWeChatAvatar,wechatAvatars} from '../avatars.js';
import {groupAvatar} from './group-avatar.js';

const tabs=[
  {id:'chats',label:'微信',icon:'chats',route:'/'},
  {id:'contacts',label:'通讯录',icon:'contacts',route:'/contacts'},
  {id:'discover',label:'发现',icon:'compass',route:'/discover'},
  {id:'me',label:'我',icon:'me',route:'/me'}
];
const icons={newFriends:'personAdd',onlyChats:'bubbles',groups:'group',tags:'tag',official:'book',services:'globe',enterprise:'bubbles',moments:'aperture',live:'live',scan:'scan',mini:'mini',service:'service',favorites:'box',photos:'photo',works:'work',shop:'shop',stickers:'smile',settings:'settings'};
const colors={newFriends:'#fa9a37',onlyChats:'#f7a03b',groups:'#0abc67',tags:'#168cf1',official:'#158ef5',services:'#15a8f5',enterprise:'#2c88d8',moments:'#23ba8a',live:'#ff6757',scan:'#278cf3',mini:'#7067ff',service:'#06c777',favorites:'#5799ff',photos:'#299af7',works:'#10b4fb',shop:'#ff6855',stickers:'#ffb900',settings:'#258ef4'};
const letters={'阿':'A','胡':'H','熙':'X','小':'X','仔':'Z'};
export const routeForTab=id=>tabs.find(t=>t.id===id)?.route||'/';
export const tabForRoute=route=>tabs.find(t=>t.route===route)?.id||'chats';

function avatar(name='',source='',extra=''){
  const candidate=String(source||'');
  const hasImage=/^(?:\/|data:image\/(?:png|jpeg|webp);base64,|https:\/\/)/i.test(candidate);
  return '<span class="wx-avatar '+extra+'">'+(hasImage?'<img src="'+esc(candidate)+'" alt="" loading="lazy">':'<span>'+esc((name||'?').slice(0,1))+'</span>')+'</span>';
}
function featureIcon(id){
  return '<span class="wx-feature-icon wx-feature-'+id+'" style="--wx-feature-color:'+colors[id]+'">'+wxIcon(icons[id],25)+'</span>';
}
function item(id,title,detail='',opts={}){
  return '<button type="button" class="wx-entry" data-action="'+(opts.action||'wx-open-entry')+'" data-label="'+esc(title)+'"'+(opts.id?' data-id="'+esc(opts.id)+'"':'')+'>'+
    featureIcon(id)+'<span class="wx-entry-main"><span class="wx-entry-name">'+esc(title)+'</span>'+
    (detail?'<span class="wx-entry-detail">'+esc(detail)+'</span>':'')+'</span>'+
    wxIcon('chevron',19)+'</button>';
}
function nav(active,s){
  const unread=(s.content.conversations.wechat||[]).reduce((total,c)=>total+Math.max(0,Number(c.unread)||0),0);
  return '<nav class="wx-tabs" data-view-key="wechat-tab-bar" aria-label="微信底部导航">'+tabs.map(t=>
    '<button type="button" class="wx-tab '+(active===t.id?'selected':'')+'" data-action="wx-tab" data-tab="'+t.id+'"'+(active===t.id?' aria-current="page"':'')+'>'+ 
    '<span class="wx-tab-icon">'+wxIcon(active===t.id&&['chats','contacts','me'].includes(t.id)?({chats:'chatsFilled',contacts:'contactsFilled',me:'meFilled'}[t.id]):t.icon,27)+
    (t.id==='chats'&&unread?'<span class="wx-unread-badge" aria-label="'+unread+'条未读消息">'+(unread>99?'99+':unread)+'</span>':'')+'</span><span class="wx-tab-title">'+t.label+'</span></button>').join('')+'</nav>';
}
function header(title,right){
  return '<header class="wx-header"><h1>'+title+'</h1><div class="wx-head-actions">'+
    (right||'')+'</div></header>';
}
const iconButton=(action,icon,label)=>'<button type="button" class="wx-head-button" data-action="'+action+'" aria-label="'+label+'">'+wxIcon(icon,24)+'</button>';
function searchBox(placeholder='搜索'){
  return '<label class="wx-search"><span>'+wxIcon('search',18)+'</span><input type="search" data-wx-search aria-label="搜索" placeholder="'+placeholder+'" autocomplete="off"></label>';
}
function frame(tab,body,s){
  return '<div class="wx-screen wx-'+tab+'" data-wx-tab="'+tab+'"><div class="wx-page-body" data-view-key="wechat-page">'+body+'</div>'+nav(tab,s)+'</div>';
}
function menu(){
  return '<div class="wx-action-menu" hidden>'+
    '<button data-action="wx-open-entry" data-label="发起群聊">发起群聊</button>'+
    '<button data-action="wx-open-entry" data-label="添加朋友">添加朋友</button>'+
    '<button data-action="wx-open-entry" data-label="扫一扫">扫一扫</button>'+
    '</div>';
}
function chats(s){
  const conversations=s.content.conversations.wechat||[];
  const title=header('微信',iconButton('wx-toggle-menu','plus','更多操作'))+menu();
  const rows=conversations.map((c,i)=>{
    const last=visibleMessages(c).at(-1);
    const preview=last?(last.kind==='recalled'?'你撤回了一条消息':last.kind==='image'?'[图片]':last.kind==='app_invitation'?'[邀请]':last.text||''):'暂无消息';
    const time=last?.time||'';
    const unread=Math.max(0,Number(c.unread)||0);
    return '<button type="button" class="wx-chat-row" data-action="open-chat" data-id="'+esc(c.id)+'" data-wx-filter="'+esc(c.name+' '+preview)+'">'+
      '<span class="wx-chat-avatar-wrap">'+(isGroup(c)?groupAvatar(c):avatar(c.name,resolveWeChatAvatar(c.name,c.avatar),'wx-avatar-'+(i%5)))+(unread?'<span class="wx-chat-unread">'+(unread>99?'99+':unread)+'</span>':'')+'</span>'+ 
      '<span class="wx-chat-main"><span class="wx-chat-top"><strong>'+esc(c.name)+'</strong><time>'+esc(time)+'</time></span>'+
      '<span class="wx-chat-preview">'+esc(preview)+'</span></span></button>';
  }).join('');
  return frame('chats',title+'<div class="wx-search-region">'+searchBox()+'</div><div class="wx-scroll wx-chat-list">'+(rows||'<p class="wx-empty">暂无聊天，新的对话会显示在这里。</p>')+'</div>',s);
}
function contactList(s){
  const records=new Map();
  for(const c of s.content.conversations.wechat||[]){
    if(!isGroup(c))records.set(c.name,{name:c.name,id:c.id,avatar:c.avatar});
    if(isGroup(c))for(const a of actors(c))if(a.id!=='me'&&!records.has(a.name))records.set(a.name,{name:a.name});
  }
  const sorted=[...records.values()].sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));
  const grouped=new Map();
  for(const c of sorted){
    const first=letters[c.name[0]]||'#';
    if(!grouped.has(first))grouped.set(first,[]);
    grouped.get(first).push(c);
  }
  return [...grouped.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([letter,group])=>
    '<section class="wx-contact-section" data-wx-section="'+esc(letter)+'"><h2>'+esc(letter)+'</h2>'+
    group.map(c=>'<button type="button" class="wx-contact-row" data-action="wx-open-contact" data-name="'+esc(c.name)+'" data-id="'+esc(c.id||'')+'" data-wx-filter="'+esc(c.name)+'">'+
      avatar(c.name,resolveWeChatAvatar(c.name,c.avatar),'wx-avatar-contact')+'<strong>'+esc(c.name)+'</strong></button>').join('')+'</section>').join('');
}
function contacts(s){
  const top=header('通讯录',iconButton('wx-open-entry','personAdd','添加联系人'));
  const shortcuts='<div class="wx-contact-shortcuts">'+
    item('newFriends','新的朋友')+item('onlyChats','仅聊天的朋友')+
    item('groups','群聊','',{action:'wx-open-groups'})+item('tags','标签')+
    item('official','公众号')+item('services','服务号')+item('enterprise','企业微信联系人')+'</div>';
  const index='<aside class="wx-alpha-index" aria-label="字母索引">'+
    '☆ABCDEFGHIJKLMN OPQRSTUVWXYZ#'.replace(/ /g,'').split('').map(x=>'<button type="button" data-action="wx-index" data-letter="'+x+'">'+x+'</button>').join('')+'</aside>';
  return frame('contacts',top+'<div class="wx-search-region">'+searchBox()+'</div><div class="wx-scroll wx-contacts-scroll">'+shortcuts+contactList(s)+'</div>'+index,s);
}
function discover(s){
  const groups=[
    [item('moments','朋友圈')],
    [item('live','直播')],
    [item('scan','扫一扫'),item('mini','小程序')]
  ];
  return frame('discover',header('发现')+'<div class="wx-scroll wx-settings-scroll">'+groups.map(x=>'<section class="wx-settings-group">'+x.join('')+'</section>').join('')+'</div>',s);
}
function me(s){
  const profile='<button type="button" class="wx-profile" data-action="wx-open-entry" data-label="个人信息">'+
    '<img class="wx-profile-avatar" src="'+wechatAvatars['熙蒙']+'" alt="熙蒙的微信头像">'+
    '<span class="wx-profile-copy"><strong>熙蒙</strong><span>微信号：未设置</span><small><span class="wx-state">＋ 状态</span></small></span>'+
    '<span class="wx-profile-qr">'+wxIcon('qr',20)+wxIcon('chevron',20)+'</span></button>';
  const groups=[
    [item('service','服务')],
    [item('favorites','收藏'),item('photos','朋友圈'),item('works','作品'),item('shop','小店与卡包'),item('stickers','表情')],
    [item('settings','设置')]
  ];
  return frame('me','<div class="wx-scroll wx-settings-scroll">'+profile+groups.map(x=>'<section class="wx-settings-group">'+x.join('')+'</section>').join('')+'</div>',s);
}
export function renderWeChatHome(s,route='/'){
  const selected=tabForRoute(route);
  return selected==='contacts'?contacts(s):selected==='discover'?discover(s):selected==='me'?me(s):chats(s);
}

