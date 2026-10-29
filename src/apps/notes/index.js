import {uid} from '../../services/id.js';
import {empty} from '../../system/ui.js';
import {renderList} from './features/list/index.js';
import {renderFolders} from './features/folders/index.js';
import {renderEditor,resetEditorUi} from './features/editor/index.js';
import {handleNoteAction,saveNoteField} from './features/actions/index.js';
import {filterNoteRows} from './features/search/index.js';
import {renderLockedNote,isNoteUnlocked,prepareLockedNote,showUnlockDialog,hideUnlockDialog,lockNote,tryUnlockNote} from './features/lock/index.js';

export const manifest={id:'notes',name:'备忘录',icon:3,defaultRoute:'/',kicker:'NOTES'};

export function render({store},loc){
 const state=store.get(),route=loc.route||'/',notes=state.content.notes||[];
 if(route==='/edit'){
  const note=notes.find(n=>n.id===loc.params?.noteId);
  if(note?.locked&&!isNoteUnlocked(note.id))return `<main class="nt-screen nt-screen-locked" data-view-key="notes-locked">${renderLockedNote(note)}</main>`;
  return `<main class="nt-screen nt-screen-editor" data-view-key="notes-editor">${note?renderEditor(note):empty('未找到备忘录')}</main>`;
 }
 if(route==='/locked'){
  const note=notes.find(n=>n.id===loc.params?.noteId);
  return `<main class="nt-screen nt-screen-locked" data-view-key="notes-locked">${note?renderLockedNote(note):empty('未找到备忘录')}</main>`;
 }
 if(route==='/folders')return `<main class="nt-screen nt-screen-folders" data-view-key="notes-folders">${renderFolders(notes)}</main>`;
 return `<main class="nt-screen nt-screen-list" data-view-key="notes-list">${renderList(notes,state)}</main>`;
}

export function handle(action,target,ctx,loc){
 if(action==='new-note'){
  resetEditorUi();
  const id=uid();
  ctx.store.update(s=>s.content.notes.unshift({id,title:'',text:'',actual:true,createdDay:s.day,updatedDay:s.day,updatedClock:s.clock}));
  ctx.router.open({appId:'notes',route:'/edit',params:{noteId:id}});
  globalThis.document?.querySelector('.nt-title-input')?.focus();
  return;
 }
 if(action==='open-note'){
  resetEditorUi();
  const note=ctx.store.get().content.notes.find(n=>n.id===target.dataset.id);
  if(note?.locked)prepareLockedNote(note.id);
  ctx.router.open({appId:'notes',route:note?.locked?'/locked':'/edit',params:{noteId:target.dataset.id}});
  return;
 }
 if(action==='notes-lock-back'){ctx.router.back();return;}
 if(action==='notes-unlock-open'){showUnlockDialog(loc.params?.noteId);ctx.refresh();globalThis.document?.querySelector('.nt-unlock-dialog input')?.focus();return;}
 if(action==='notes-unlock-cancel'){hideUnlockDialog(loc.params?.noteId);ctx.refresh();return;}
 if(action==='notes-folders'){
  ctx.router.open({appId:'notes',route:'/folders'});return;
 }
 if(action==='notes-open-list'){
  ctx.router.open({appId:'notes',route:'/'});return;
 }
 if(handleNoteAction(action,target,ctx,loc))return;
}

export function input(target,ctx){
 if(target.matches('[data-notes-search]')){filterNoteRows(target);return;}
 if(target.matches('[data-notes-title],[data-notes-text]'))saveNoteField(target,ctx);
}

export function submit(form,ctx){
 if(form.dataset.form==='notes-unlock'){
  const id=form.dataset.id;
  if(tryUnlockNote(id,new FormData(form).get('password')||''))ctx.router.open({appId:'notes',route:'/edit',params:{noteId:id}});
  else ctx.refresh();
  return;
 }
 if(form.dataset.form!=='note')return;
 const fields=new FormData(form),id=form.dataset.id;
 ctx.store.update(s=>{const note=s.content.notes.find(n=>n.id===id);if(!note)return;
  note.title=String(fields.get('title')||'');note.text=String(fields.get('text')||'');note.updatedDay=s.day;note.updatedClock=s.clock;
 });
 lockNote(id);
 ctx.router.back();
}
