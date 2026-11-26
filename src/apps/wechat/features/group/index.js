import {esc} from '../../../../system/ui.js';
import {resolveWeChatAvatar} from '../../avatars.js';
import {wechatChatMuted,setWeChatChatMuted} from '../../../../services/messaging/wechat-notifications.js';
import {visibleMessages} from '../../../../services/messaging/delivery.js';
import {actorName} from '../../../../editor/conversations/model.js';
import {openGamePhotoPicker,snapshotGamePhoto} from '../../../photos/features/picker/index.js';
import {GROUP_ID,FATHER_ID,BROTHERS,groupThread,chatSettings,editChatSettings,groupEggsOpen,groupAway,fatherPresent,fatherUsed,groupName,displayMembers} from './state.js';
import {canGroupEgg,inviteFather,leaveGroup,changeGroupField,patBrother} from './runtime.js';
const header=(title,extra='')=>'<header class="wx-header wx-group-header"><button data-action="back" type="button" aria-label="返回">‹</button><h1>'+esc(title)+'</h1>'+extra+'</header>';
const wrap=(title,body,extra='')=>'<section class="wx-screen wx-group-info">'+header(title,extra)+'<div class="wx-scroll wx-group-scroll">'+body+'</div></section>';
const row=(label,action,value='',attrs='')=>'<button type="button" class="wx-group-row" data-action="'+action+'" '+attrs+'><span>'+esc(label)+'</span><span class="wx-group-value">'+esc(value)+'<i>›</i></span></button>';
const section=(...rows)=>'<section class="wx-group-section">'+rows.join('')+'</section>';
const toggle=(label,action,value,id)=>'<button type="button" role="switch" aria-checked="'+Boolean(value)+'" class="wx-group-row wx-group-toggle" data-action="'+action+'" data-id="'+esc(id)+'"><span>'+esc(label)+'</span><i class="wx-group-switch"></i></button>';
const img=(name,s)=>'<img src="'+esc(resolveWeChatAvatar(name,s.characterAvatars?.[name]))+'" alt="" loading="eager">';
const route=(ctx,path)=>ctx.router.open({appId:'wechat',route:path});
const edit=(field,label,value,max)=>wrap(label,'<form class="wx-group-edit" data-form="wx-group-edit" data-field="'+field+'">'+
 (field==='notice'?'<textarea name="value" maxlength="'+max+'" rows="7" placeholder="請輸入群公告">'+esc(value)+'</textarea>':'<input name="value" maxlength="'+max+'" value="'+esc(value)+'" autocomplete="off">')+
 '<button type="submit" class="wx-group-save">'+(field==='notice'?'發布':'完成')+'</button></form>');
export function renderGroupInfo(s,routePath){
 const c=groupThread(s);if(!c)return wrap('聊天資訊','');
 const p=chatSettings(s,GROUP_ID),sub=routePath.split('/').slice(3).join('/');
 if(sub==='invite'){
  const blocked=fatherUsed(s)||!groupEggsOpen(s)||!canGroupEgg(s),reason=fatherUsed(s)?'該用戶暫時無法拉入群聊':!groupEggsOpen(s)||!canGroupEgg(s)?'暫時無法邀請':'';
  return wrap('選擇聯絡人',section('<button class="wx-group-contact" data-action="wx-group-select-father" type="button"'+(blocked?' disabled':'')+'><span class="wx-group-select-circle"></span>'+img('傅隆生',s)+'<span><strong>傅隆生</strong>'+(reason?'<small>'+reason+'</small>':'')+'</span></button>'));
 }
 if(sub==='invite-confirm')return wrap('添加成員',section('<div class="wx-group-contact">'+img('傅隆生',s)+'<span>傅隆生</span></div>','<button type="button" class="wx-group-save" data-action="wx-group-invite-confirm"'+(!canGroupEgg(s)||fatherUsed(s)?' disabled':'')+'>完成</button>'));
 if(sub==='leave')return wrap('退出群聊',section('<p class="wx-group-description">退出後將不再接收此群聊的消息。</p>','<button class="wx-group-exit" type="button" data-action="wx-group-leave-confirm">退出群聊</button>'));
 if(sub==='search'){
  const msgs=visibleMessages(c,s).filter(m=>m.kind!=='image'&&m.kind!=='recalled').slice().reverse();
  return wrap('查找聊天內容','<div class="wx-group-search"><input type="search" data-wx-search placeholder="搜索" autocomplete="off"></div>'+section(...msgs.map(m=>'<button type="button" class="wx-group-result" data-action="wx-group-search-result" data-id="'+esc(m.id)+'" data-wx-filter="'+esc(m.text)+'"><small>'+esc(actorName(c,m.from))+' · '+esc(m.time||'')+'</small><span>'+esc(m.text)+'</span></button>')));
 }
 const fields={name:['群聊名稱',groupName(s,c),60],notice:['群公告',p.notice||'',500],nickname:['我在本群的暱稱',p.nickname||'',60],remark:['備註',p.remark||'',60]};
 if(fields[sub])return edit(sub,...fields[sub]);
 const members=displayMembers(s,c);
 return wrap('聊天資訊 ('+members.length+')',
 section('<div class="wx-group-members">'+members.map(m=>'<button type="button" data-action="wx-group-member" data-name="'+esc(m.name)+'" '+(m.id==='me'?'disabled':'')+'>'+img(m.name,s)+'<span>'+esc(m.id==='me'&&p.nickname?p.nickname:m.name)+'</span></button>').join('')+
 (!groupAway(s)?'<button type="button" data-action="wx-group-invite"><i class="wx-group-add">＋</i><span></span></button>':'')+'</div>')+
 section(row('群聊名稱','wx-group-field',groupName(s,c),'data-field="name"'),row('群公告','wx-group-field',p.notice||'未設置','data-field="notice"'),row('備註','wx-group-field',p.remark||'','data-field="remark"'))+
 section(row('查找聊天內容','wx-group-search'))+
 section(toggle('消息免打擾','wx-mute-chat',wechatChatMuted(s,GROUP_ID),GROUP_ID),toggle('置頂聊天','wx-group-pin',c.pinned,GROUP_ID),toggle('保存到通訊錄','wx-group-save-contact',p.saved!==false,GROUP_ID))+
 section(row('我在本群的暱稱','wx-group-field',p.nickname||'熙蒙','data-field="nickname"'),row('設置當前聊天背景','wx-group-background',p.background?'已設置':'','data-id="group"'))+
 section('<button type="button" class="wx-group-exit" data-action="wx-group-leave"'+(!canGroupEgg(s)?' disabled':'')+'>退出群聊</button>'));
}
export function renderSavedGroups(s){
 const c=groupThread(s);
 return wrap('群聊',c&&!groupAway(s)&&chatSettings(s,GROUP_ID).saved!==false?section(row(groupName(s,c),'open-chat','','data-id="group"')):'<p class="wx-group-description">暫無已保存群聊</p>');
}
export function renderDirectInfo(s,c){
 if(!c)return wrap('聊天資訊','');
 return wrap('聊天資訊',section('<div class="wx-group-members"><div>'+img(c.name,s)+'<span>'+esc(c.name)+'</span></div></div>')+
 section(toggle('消息免打擾','wx-mute-chat',wechatChatMuted(s,c.id),c.id),toggle('置頂聊天','wx-group-pin',c.pinned,c.id),row('設置當前聊天背景','wx-group-background',chatSettings(s,c.id).background?'已設置':'','data-id="'+esc(c.id)+'"')));
}
let lastPat=null;
export function handleGroupAction(action,target,ctx){
 const s=ctx.store.get(),id=target.dataset.id,field=target.dataset.field;
 if(action==='wx-group-field'){if(['name','notice','remark','nickname'].includes(field))route(ctx,'/chat-info/group/'+field);return true;}
 if(action==='wx-group-invite'){route(ctx,'/chat-info/group/invite');return true;}
 if(action==='wx-group-select-father'){if(canGroupEgg(s)&&!fatherUsed(s))route(ctx,'/chat-info/group/invite-confirm');return true;}
 if(action==='wx-group-invite-confirm'){
  if(canGroupEgg(s)&&!fatherUsed(s)){ctx.store.update(x=>inviteFather(x));ctx.store.update(x=>{x.nav.stack=x.nav.stack.filter(l=>l.appId!=='wechat'||!l.route.startsWith('/chat-info/group'));x.nav.current={appId:'wechat',route:'/chat/group',params:{}};if(x.nav.stack.at(-1)?.route==='/chat/group')x.nav.stack.pop();});}
  return true;
 }
 if(action==='wx-group-leave'){if(canGroupEgg(s))route(ctx,'/chat-info/group/leave');return true;}
 if(action==='wx-group-leave-confirm'){
  if(canGroupEgg(s))ctx.store.update(x=>{if(leaveGroup(x)){x.nav.stack=x.nav.stack.filter(l=>l.appId!=='wechat'||!l.route.startsWith('/chat'));x.nav.current={appId:'wechat',route:'/',params:{}};}});
  return true;
 }
 if(action==='wx-group-pin'){ctx.store.update(x=>{const c=x.content.conversations.wechat.find(c=>c.id===id);if(c)c.pinned=!c.pinned;});return true;}
 if(action==='wx-group-save-contact'){ctx.store.update(x=>{const p=editChatSettings(x,GROUP_ID);p.saved=p.saved===false;});return true;}
 if(action==='wx-group-background'){
  openGamePhotoPicker(ctx,async p=>{const image=await snapshotGamePhoto(p);if(ctx.store.get().content.conversations.wechat.some(c=>c.id===id))ctx.store.update(x=>{editChatSettings(x,id).background=image;});});
  return true;
 }
 if(action==='wx-group-search'){route(ctx,'/chat-info/group/search');return true;}
 if(action==='wx-group-search-result'){if(!groupAway(s)){route(ctx,'/chat/group');globalThis.document?.querySelectorAll('[data-key]').forEach(el=>{if(el.dataset.key==='message-'+id)el.scrollIntoView?.({block:'center'});});}return true;}
 if(action==='wx-group-member'){
  const c=s.content.conversations.wechat.find(c=>c.name===target.dataset.name);
  if(c)route(ctx,'/chat/'+c.id);return true;
 }
 if(action==='wx-group-pat'){
  if(s.nav.current.route!=='/chat/group')return true;
  const by=target.dataset.name,now=Date.now();
  if(lastPat?.by===by&&now-lastPat.at<=450){lastPat=null;if(canGroupEgg(s))ctx.store.update(x=>patBrother(x,by,{now}));}
  else lastPat={by,at:now};
  return true;
 }
 return false;
}
export function submitGroup(form,ctx){
 if(form.dataset.form!=='wx-group-edit')return false;
 const value=String(new FormData(form).get('value')||'');
 if(form.dataset.field==='name'&&!value.trim()){ctx.toast?.('請輸入群聊名稱');return true;}
 ctx.store.update(s=>changeGroupField(s,form.dataset.field,value));ctx.router.back();return true;
}
