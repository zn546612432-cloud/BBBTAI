// Single local library for native phone file cards. ZIP archives are stored
// unopened; neither Files nor chat extracts or executes attachment contents.
import {esc} from '../../../../system/ui.js';

const FOLDERS=Object.freeze([
 {id:'downloads',name:'下載項目',icon:'↓'},
 {id:'documents',name:'文件',icon:'▤'},
 {id:'reports',name:'分析報告',icon:'▤'}
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
export const isLibraryRoute=route=>route==='/'||/^\/(folder|recent|trash|item|rename|move|search|incoming)\b/.test(route);
export const localFileList=s=>library(s).filter(f=>!f.deleted);
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
 '<span class="fl-row-copy"><strong>'+nameFor(f)+'</strong><small>'+esc(sizeFor(f.size))+'</small></span><span class="fl-chevron">›</span></button>';
const empty='<p class="fl-empty">尚無檔案</p>';
const path=(route,prefix)=>decode(route.slice(prefix.length));
const heading=(title)=>'<h1 class="fl-title">'+esc(title)+'</h1>';
const top=s=>'<div class="fl-library">'+heading('瀏覽')+
 '<form class="fl-search" data-form="files-local-search"><span aria-hidden="true">⌕</span><input name="query" aria-label="搜尋檔案" placeholder="搜尋" autocomplete="off"><button type="submit">搜尋</button></form>'+
 '<h2>位置</h2><div class="fl-section">'+
 '<button type="button" class="fl-folder-row" data-action="files-local-nav" data-route="/folder/downloads"><span class="fl-folder-icon">▤</span><span>我的 iPhone</span><span class="fl-chevron">›</span></button>'+
 FOLDERS.map(f=>'<button type="button" class="fl-folder-row" data-action="files-local-nav" data-route="/folder/'+f.id+'"><span class="fl-folder-icon">'+f.icon+'</span><span>'+f.name+'</span><span class="fl-chevron">›</span></button>').join('')+
 '<button type="button" class="fl-folder-row" data-action="files-local-nav" data-route="/recent"><span class="fl-folder-icon">◷</span><span>最近使用</span><span class="fl-chevron">›</span></button>'+
 '<button type="button" class="fl-folder-row" data-action="files-local-nav" data-route="/trash"><span class="fl-folder-icon">♻</span><span>最近刪除</span><span class="fl-chevron">›</span></button></div>'+
 (s.story55?.version===1?'<h2>其他位置</h2><div class="fl-section"><button type="button" class="fl-folder-row" data-action="files-local-nav" data-route="/story55"><span class="fl-folder-icon">▤</span><span>既有劇情檔案</span><span class="fl-chevron">›</span></button></div>':'')+
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
 const title=trash?'最近刪除':recent?'最近使用':search?'搜尋結果':FOLDERS.find(f=>f.id===folder)?.name||'下載項目';
 const query=String(params.query||'').trim().toLocaleLowerCase();
 const items=library(s).filter(f=>trash?f.deleted:!f.deleted&&(recent||search||f.folder===folder))
  .filter(f=>!search||f.name.toLocaleLowerCase().includes(query)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 return '<div class="fl-library">'+nav(title,'/')+ (search?'<p class="fl-search-term">'+esc(params.query||'')+'</p>':'')+
 '<div class="fl-section">'+(items.length?items.map(row).join(''):empty)+'</div><p class="fl-count">'+items.length+' 個項目</p></div>';
}
export function handleLibraryAction(a,t,c){
 if(!a.startsWith('files-local-'))return false;
 const id=t.dataset.id;
 if(a==='files-local-nav'){
  if(t.dataset.route==='/back')c.router.back();else c.router.open({appId:'files',route:t.dataset.route||'/'});
 }else if(a==='files-local-item')c.router.open({appId:'files',route:'/item/'+encodeURIComponent(id)});
 else if(a==='files-local-save'){
  let result;c.store.update(s=>result=saveIncomingZip(s,t.dataset.chat,t.dataset.message));
  c.toast?.(result.created?'已儲存到下載項目':'檔案已儲存');
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
