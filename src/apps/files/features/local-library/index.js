// Single local library for native phone file cards. ZIP archives are stored
// unopened; neither Files nor chat extracts or executes attachment contents.
import {esc} from '../../../../system/ui.js';
import {commissionAttachment,commissionPreviewAvailable} from '../../../../services/commissions/attachment-flow.js';
import {completed,projectById} from '../../../../services/story55/state.js';
import {appendAuthoredPhoneMessage} from '../../../../services/messaging/phone-messages.js';

const FOLDERS=Object.freeze([
 {id:'downloads',name:'已下載'},
 {id:'documents',name:'工作資料'}
]);
const knownFolder=id=>FOLDERS.some(f=>f.id===id);
const decode=value=>{try{return decodeURIComponent(value);}catch{return '';}};
const library=s=>Array.isArray(s.content?.localFiles)?s.content.localFiles:[];
const fileName=m=>String(m?.fileName||m?.text||'').trim();
const canArchive=m=>m?.kind==='file'&&/\.zip$/i.test(fileName(m));
const fileId=(chatId,messageId)=>'wechat-'+encodeURIComponent(chatId)+'-'+encodeURIComponent(messageId);
const safeName=name=>String(name||'').trim().replace(/[\x00-\x1f/\\]/g,'').slice(0,140);
const icon=()=>'<span class="fl-archive-icon" aria-hidden="true">ZIP</span>';
const nameFor=f=>esc(f.name);
const sizeFor=value=>Number.isFinite(Number(value))&&Number(value)>0
 ?(Number(value)>=1048576?(Number(value)/1048576).toFixed(1)+' MB':Math.ceil(Number(value)/1024)+' KB'):'ZIP 壓縮檔';
const appRoute=(path)=>'/'+path;
const fileById=(s,id)=>library(s).find(f=>f.id===id);
const chatFile=(s,chatId,messageId)=>{
 const chat=s.content?.conversations?.wechat?.find(c=>c.id===chatId);
 const message=chat?.messages?.find(m=>m.id===messageId);
 return canArchive(message)?{chat,message}:null;
};
export const isLibraryRoute=route=>route==='/'||/^\/(iphone|folder|recent|trash|item|rename|move|search|incoming|work-key)\b/.test(route);
export const localFileList=s=>library(s).filter(f=>!f.deleted);
// Generated story documents are inert records, stored in the same phone library.
export function saveGeneratedLocalFile(s,{id,name,description}){
 const files=s.content.localFiles??=[];
 if(files.some(f=>f.id===id))return files.find(f=>f.id===id);
 const f={id,name:safeName(name),kind:'tear-artifact',description:String(description||''),folder:'documents',createdDay:s.day,createdTime:s.clock,origin:{app:'ghost'},deleted:false,createdAt:Date.now()};
 files.push(f);return f;
}
export function saveIncomingZip(s,chatId,messageId){
 const pair=chatFile(s,chatId,messageId);
 if(!pair)throw Error('附件不存在或不是 ZIP');
 const id=fileId(chatId,messageId),files=s.content.localFiles??(s.content.localFiles=[]);
 const previous=files.find(f=>f.id===id);
 if(previous){if(previous.deleted)previous.deleted=false;return {file:previous,created:false};}
 const m=pair.message;
 const file={id,name:safeName(fileName(m)),kind:'zip',size:Number(m.fileSize)||null,
  folder:'downloads',createdDay:Number(m.day)||s.day,createdTime:m.time||s.clock,
  origin:{app:'wechat',chatId,messageId},assetPath:typeof m.assetPath==='string'&&m.assetPath.startsWith('/assets/')?m.assetPath:null,
  deleted:false,createdAt:Date.now()};
 files.push(file);
 return {file,created:true};
}
export function renameLocalFile(s,id,name){
 const f=fileById(s,id);if(!f||f.deleted)throw Error('檔案不存在');
 const updated=safeName(name);
 if(!updated||!updated.toLowerCase().endsWith('.zip'))throw Error('檔名須保留 .zip 副檔名');
 f.name=updated;return f;
}
export function moveLocalFile(s,id,folder){
 const f=fileById(s,id);if(!f||f.deleted||!knownFolder(folder))throw Error('無法移動檔案');
 f.folder=folder;return f;
}
export function deleteLocalFile(s,id){const f=fileById(s,id);if(!f||f.deleted)return false;f.deleted=true;return true;}
export function restoreLocalFile(s,id){const f=fileById(s,id);if(!f||!f.deleted)return false;f.deleted=false;return true;}
export function copyLocalFile(s,id){
 const f=fileById(s,id);if(!f||f.deleted)throw Error('檔案不存在');
 const files=s.content.localFiles??(s.content.localFiles=[]);
 const count=files.filter(x=>String(x.id).startsWith(f.id+'-copy-')).length+1;
 const copy={...f,id:f.id+'-copy-'+count,origin:{...f.origin},name:f.name.replace(/\.zip$/i,' 副本.zip'),createdAt:Date.now()};
 files.push(copy);return copy;
}
const nav=(label,back='')=>'<header class="fl-nav"><button type="button" data-action="files-local-nav" data-route="'+esc(back)+'" aria-label="返回">‹</button><strong>'+esc(label)+'</strong><span></span></header>';
const row=f=>'<button type="button" class="fl-row" data-action="files-local-item" data-id="'+esc(f.id)+'">'+icon()+
 '<span class="fl-row-copy"><strong>'+nameFor(f)+'</strong><small>'+esc(f.kind==='tear-artifact'?'Ouroboros’ Tear':sizeFor(f.size))+'</small></span><span class="fl-chevron">›</span></button>';
const empty='<p class="fl-empty">尚無檔案</p>';
const path=(route,prefix)=>decode(route.slice(prefix.length));
const heading=(title)=>'<h1 class="fl-title">'+esc(title)+'</h1>';
// Credentials are a read-only view of already received mail and authorized
// GHOST records, not a duplicate key store or an unlock mechanism.
function workFiles(s){
 return (s.content?.mail||[]).filter(m=>m.read).flatMap(m=>{
  const file=commissionAttachment(s,m.id);
  if(file&&commissionPreviewAvailable(s,m.id)){
   const key=Object.values(s.ghost?.orders||{}).find(o=>o.mailId===m.id&&o.key)?.key;
   return [{id:m.id,name:file.name,route:file.route,key}];
  }
  if(m.storyWalletD06){
   const project=projectById(s,'wallet');
   if(project)return [{id:m.id,name:'wallet_challenge.key',appId:'kira',route:'/mail/'+m.id,key:project.key}];
  }
  if(m.id==='s55-d13-wallet-mail'&&completed(s,'d13-wallet-mail'))
   return [{id:m.id,name:m.attachmentName||'wallet-binding.key',appId:'mirage',route:'/wallet'}];
  const project=m.story55&&m.project&&completed(s,m.storyNode)&&projectById(s,m.project);
  if(project)return [{id:m.id,name:m.attachmentName||project.id+'.key',route:'/story55-key',project:project.id,
   key:s.story55?.projectKeysRevealed?.[project.id]?project.key:null}];
  return [];
 });
}
const folderIcon='<svg class="fl-folder-art" viewBox="0 0 32 28" aria-hidden="true"><path fill="#72caff" d="M2 4a4 4 0 0 1 4-4h8l4 4h8a4 4 0 0 1 4 4v15a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><path fill="#339cf4" d="M2 10h28v13a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/></svg>';
const folderRow=(route,name)=>'<button type="button" class="fl-folder-row" data-action="files-local-nav" data-route="'+esc(route)+'">'+folderIcon+'<span>'+esc(name)+'</span><span class="fl-chevron">›</span></button>';
const keyRow=f=>'<button type="button" class="fl-row" data-action="files-local-nav" data-route="/work-key/'+encodeURIComponent(f.id)+'"><span class="fl-archive-icon">KEY</span><span class="fl-row-copy"><strong>'+esc(f.name)+'</strong><small>加密憑證</small></span><span class="fl-chevron">›</span></button>';
const top=s=>'<div class="fl-library">'+heading('瀏覽')+
 '<form class="fl-search" data-form="files-local-search"><span aria-hidden="true">⌕</span><input name="query" aria-label="搜尋檔案" placeholder="搜尋" autocomplete="off"><button type="submit">搜尋</button></form>'+
 '<h2>位置</h2><div class="fl-section">'+
 folderRow('/iphone','我的 iPhone')+
 '<button type="button" class="fl-folder-row" data-action="files-local-nav" data-route="/recent"><span class="fl-folder-icon">◷</span><span>最近使用</span><span class="fl-chevron">›</span></button>'+
 '<button type="button" class="fl-folder-row" data-action="files-local-nav" data-route="/trash"><span class="fl-folder-icon">♻</span><span>最近刪除</span><span class="fl-chevron">›</span></button></div>'+
 '</div>';
const archive=(s,route)=>{
 const tail=route.slice('/incoming/wechat/'.length),sep=tail.indexOf('/'),chatId=sep>=0?decode(tail.slice(0,sep)):'',messageId=sep>=0?decode(tail.slice(sep+1)):'';
 const info=chatFile(s,chatId,messageId);if(!info)return nav('檔案預覽')+empty;
 const m=info.message,saved=fileById(s,fileId(chatId,messageId));
 return '<div class="fl-library">'+nav('檔案預覽','/back')+
 '<section class="fl-preview-main">'+icon()+heading(fileName(m))+
 '<p>'+esc(sizeFor(m.fileSize))+'</p></section>'+
 '<button type="button" class="fl-primary" data-action="files-local-save" data-chat="'+esc(chatId)+'" data-message="'+esc(messageId)+'"'+
 (saved&&!saved.deleted?' disabled':'')+'>'+(saved&&!saved.deleted?'已儲存':'儲存到檔案')+'</button></div>';
};
const itemView=(s,id)=>{
 const f=fileById(s,id);if(!f)return '<div class="fl-library">'+nav('檔案')+empty+'</div>';
 if(f.kind==='tear-artifact')return '<div class="fl-library">'+nav('檔案','/folder/documents')+'<section class="fl-preview-main"><span class="fl-archive-icon">LOG</span>'+heading(f.name)+'<p>Ouroboros’ Tear</p><p>'+esc(f.description)+'</p>'+(f.id==='tear-artifact-program'?'<button type="button" class="button-quiet wide" data-action="files-local-share-program" data-id="'+esc(f.id)+'" '+(s.story55?.tearAgent?.programShared?'disabled':'')+'>'+(s.story55?.tearAgent?.programShared?'已分享給胡楓':'分享給胡楓')+'</button>':'')+'</section></div>';
 return '<div class="fl-library">'+nav('檔案','/folder/'+f.folder)+
 '<section class="fl-preview-main">'+icon()+heading(f.name)+'<p>'+esc(sizeFor(f.size))+'</p>'+
 '<p>ZIP 壓縮檔</p></section>'+
 (f.deleted?'<div class="fl-actions"><button type="button" data-action="files-local-restore" data-id="'+esc(id)+'">恢復</button></div>':
 '<div class="fl-actions"><button type="button" data-action="files-local-nav" data-route="/rename/'+esc(id)+'">重新命名</button>'+
 '<button type="button" data-action="files-local-nav" data-route="/move/'+esc(id)+'">移動</button>'+
 '<button type="button" data-action="files-local-copy" data-id="'+esc(id)+'">複製</button>'+
 '<button type="button" class="fl-danger" data-action="files-local-delete" data-id="'+esc(id)+'">刪除</button></div>')+
 '</div>';
};
export function renderLibrary(s,route,params={}){
 if(route.startsWith('/incoming/wechat/'))return archive(s,route);
 if(route==='/')return top(s);
 if(route==='/iphone')return '<div class="fl-library">'+nav('我的 iPhone','/')+'<div class="fl-section">'+FOLDERS.map(f=>folderRow('/folder/'+f.id,f.name)).join('')+'</div></div>';
 if(route.startsWith('/work-key/')){
  const f=workFiles(s).find(f=>f.id===path(route,'/work-key/'));
  if(!f)return '<div class="fl-library">'+nav('工作資料','/folder/documents')+empty+'</div>';
  return '<div class="fl-library">'+nav('檔案','/folder/documents')+'<section class="fl-preview-main"><span class="fl-archive-icon">KEY</span>'+heading(f.name)+'<p>加密憑證</p>'+(f.key?'<p>'+esc(f.key)+'</p>':'')+'</section><div class="fl-actions"><button type="button" data-action="files-local-open-key" data-id="'+esc(f.id)+'">開啟</button>'+(f.key?'<button type="button" data-action="files-local-copy-key" data-id="'+esc(f.id)+'">複製密鑰</button>':'')+'</div></div>';
 }
 if(route.startsWith('/item/'))return itemView(s,path(route,'/item/'));
 if(route.startsWith('/rename/')){
  const f=fileById(s,path(route,'/rename/'));if(!f)return empty;
  return '<div class="fl-library">'+nav('重新命名','/item/'+encodeURIComponent(f.id))+
   '<form class="fl-editor" data-form="files-local-rename"><input type="hidden" name="id" value="'+esc(f.id)+'"><input name="name" value="'+nameFor(f)+'" required maxlength="140" aria-label="檔案名稱"><button type="submit" class="fl-primary">完成</button></form></div>';
 }
 if(route.startsWith('/move/')){
  const f=fileById(s,path(route,'/move/'));if(!f)return empty;
  return '<div class="fl-library">'+nav('移動到','/item/'+encodeURIComponent(f.id))+
   '<div class="fl-section">'+FOLDERS.map(folder=>'<button type="button" class="fl-folder-row" data-action="files-local-move" data-id="'+esc(f.id)+'" data-folder="'+folder.id+'"><span class="fl-folder-icon">▤</span><span>'+folder.name+'</span><span class="fl-chevron">'+(folder.id===f.folder?'✓':'›')+'</span></button>').join('')+'</div></div>';
 }
 const trash=route==='/trash',recent=route==='/recent',search=route==='/search';
 const folder=route.startsWith('/folder/')?path(route,'/folder/'):'downloads';
 const title=trash?'最近刪除':recent?'最近使用':search?'搜尋結果':FOLDERS.find(f=>f.id===folder)?.name||'已下載';
 const query=String(params.query||'').trim().toLocaleLowerCase();
 const items=library(s).filter(f=>trash?f.deleted:!f.deleted&&(recent||search||f.folder===folder||folder==='downloads'&&f.folder==='reports'))
  .filter(f=>!search||f.name.toLocaleLowerCase().includes(query)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 const keys=!trash&&(recent||search||folder==='documents')?workFiles(s).filter(f=>!search||f.name.toLocaleLowerCase().includes(query)):[];
 return '<div class="fl-library">'+nav(title,route.startsWith('/folder/')?'/iphone':'/')+ (search?'<p class="fl-search-term">'+esc(params.query||'')+'</p>':'')+
 '<div class="fl-section">'+(items.length||keys.length?items.map(row).join('')+keys.map(keyRow).join(''):empty)+'</div><p class="fl-count">'+(items.length+keys.length)+' 個項目</p></div>';
}
export function handleLibraryAction(a,t,c){
 if(!a.startsWith('files-local-'))return false;
 const id=t.dataset.id;
 if(a==='files-local-nav'){
  if(t.dataset.route==='/back')c.router.back();else c.router.open({appId:'files',route:t.dataset.route||'/'});
 }else if(a==='files-local-item')c.router.open({appId:'files',route:'/item/'+encodeURIComponent(id)});
 else if(a==='files-local-save'){
  let result;c.store.update(s=>result=saveIncomingZip(s,t.dataset.chat,t.dataset.message));
  c.toast?.(result.created?'已儲存到已下載':'檔案已儲存');
 }else if(a==='files-local-share-program'){
  let sent=false;c.store.update(s=>{const f=fileById(s,id),agent=s.story55?.tearAgent;if(f?.id!=='tear-artifact-program'||f.deleted||!agent?.jobs?.program?.done||agent.programShared)return;
   const message=appendAuthoredPhoneMessage(s,{conversationId:'hufeng',messageId:'s55-d28-bc-01',from:'me',text:f.name,kind:'file',attachment:{localFileId:f.id}});
   if(!message)return;agent.programShared=true;sent=true;
   appendAuthoredPhoneMessage(s,{conversationId:'hufeng',messageId:'s55-d28-bc-ack',from:'胡枫',text:'收到，謝謝蒙哥。',schedule:{mode:'chat-delay',seconds:2}});
  });if(sent)c.router.open({appId:'wechat',route:'/chat/hufeng'});
 }else if(a==='files-local-open-key'){
  const f=workFiles(c.store.get()).find(f=>f.id===id);
  if(f)c.router.open({appId:f.appId||'files',route:f.route,params:{...(f.project?{project:f.project}:{}),fromFiles:true}});
 }else if(a==='files-local-copy-key'){
  const f=workFiles(c.store.get()).find(f=>f.id===id);
  if(f?.key&&globalThis.navigator?.clipboard?.writeText)globalThis.navigator.clipboard.writeText(f.key).then(()=>c.toast?.('已複製')).catch(()=>c.toast?.('無法複製'));
 }else if(a==='files-local-delete'){c.store.update(s=>deleteLocalFile(s,id));c.router.open({appId:'files',route:'/folder/downloads'});}
 else if(a==='files-local-restore'){c.store.update(s=>restoreLocalFile(s,id));c.router.open({appId:'files',route:'/item/'+encodeURIComponent(id)});}
 else if(a==='files-local-copy'){let copied;c.store.update(s=>copied=copyLocalFile(s,id));c.router.open({appId:'files',route:'/item/'+encodeURIComponent(copied.id)});}
 else if(a==='files-local-move'){c.store.update(s=>moveLocalFile(s,id,t.dataset.folder));c.router.open({appId:'files',route:'/item/'+encodeURIComponent(id)});}
 return true;
}
export function submitLibraryForm(form,ctx){
 if(form.dataset.form==='files-local-search'){
  const query=String(new FormData(form).get('query')||'').trim();
  ctx.router.open({appId:'files',route:'/search',params:{query}});return true;
 }
 if(form.dataset.form==='files-local-rename'){
  const d=new FormData(form),id=String(d.get('id'));
  ctx.store.update(s=>renameLocalFile(s,id,d.get('name')));
  ctx.router.open({appId:'files',route:'/item/'+encodeURIComponent(id)});return true;
 }
 return false;
}
