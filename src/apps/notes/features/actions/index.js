import {editorUi,resetEditorUi} from '../editor/index.js';
import {listUi} from '../list/index.js';
import {addNoteAttachment} from '../attachments/index.js';
import {openSketch,saveSketch} from '../sketch/index.js';

const noteId=ctx=>ctx.store.get().nav.current.params?.noteId;
const activeNote=ctx=>ctx.store.get().content.notes.find(n=>n.id===noteId(ctx));

export function saveNoteField(field,ctx){
 const form=field.closest('[data-form="note"]');if(!form)return;
 const id=form.dataset.id,value=field.value,name=field.matches('[data-notes-title]')?'title':'text';
 ctx.store.update(s=>{const note=s.content.notes.find(n=>n.id===id);if(!note)return;
  note[name]=value;note.updatedDay=s.day;note.updatedClock=s.clock;
 });
}

function insertAtCaret(text){
 const field=globalThis.document?.querySelector('.nt-body-input');if(!field)return;
 field.focus();const pos=field.selectionStart;
 field.setRangeText(text,field.selectionStart,field.selectionEnd,'end');
 field.dispatchEvent(new Event('input',{bubbles:true}));
 field.setSelectionRange(pos+text.length,pos+text.length);
}

function finishNote(ctx){
 const note=activeNote(ctx);if(!note)return;
 const form=globalThis.document?.querySelector('.nt-editor-page');
 if(form){const title=form.querySelector('[data-notes-title]')?.value||'',text=form.querySelector('[data-notes-text]')?.value||'';
  ctx.store.update(s=>{const n=s.content.notes.find(n=>n.id===note.id);if(n){n.title=title;n.text=text;}});
 }
 const current=activeNote(ctx);
 if(current&&!current.title.trim()&&!current.text.trim()&&!current.attachments?.length){
  ctx.store.update(s=>{s.content.notes=s.content.notes.filter(n=>n.id!==current.id);});
 }
 resetEditorUi();ctx.router.back();
}

export function handleNoteAction(action,target,ctx,loc){
 if(action==='notes-menu'){
  const menu=globalThis.document?.querySelector('[data-notes-menu]');if(menu)menu.hidden=!menu.hidden;return true;
 }
 if(action==='notes-sort'){
  listUi.sort=target.dataset.order==='title'?'title':'updated';ctx.refresh();return true;
 }
 if(action==='notes-done'){finishNote(ctx);return true;}
 if(action==='notes-editor-more'){editorUi.menu=!editorUi.menu;editorUi.format=false;ctx.refresh();return true;}
 if(action==='notes-pin'){
  const id=noteId(ctx);ctx.store.update(s=>{const n=s.content.notes.find(note=>note.id===id);if(n)n.pinned=!n.pinned;});
  resetEditorUi();ctx.refresh();return true;
 }
 if(action==='notes-delete'){editorUi.menu=false;editorUi.confirmDelete=true;ctx.refresh();return true;}
 if(action==='notes-cancel-delete'){editorUi.confirmDelete=false;ctx.refresh();return true;}
 if(action==='notes-confirm-delete'){
  if(!editorUi.confirmDelete)return true;
  const id=noteId(ctx);ctx.store.update(s=>{s.content.notes=s.content.notes.filter(n=>n.id!==id);});
  resetEditorUi();ctx.router.back();return true;
 }
 if(action==='notes-format'){
  const panel=globalThis.document?.querySelector('[data-notes-format-sheet]');if(panel)panel.hidden=!panel.hidden;return true;
 }
 if(action==='notes-insert'){
  insertAtCaret(target.dataset.insert||'');const panel=globalThis.document?.querySelector('[data-notes-format-sheet]');if(panel)panel.hidden=true;return true;
 }
 if(action==='notes-checklist'){insertAtCaret('☐ ');return true;}
 if(action==='notes-table'){insertAtCaret('| 项目 | 内容 |\n| — | — |\n|  |  |\n');return true;}
 if(action==='notes-attach'){addNoteAttachment(ctx,noteId(ctx));return true;}
 if(action==='notes-remove-attachment'){
  const id=noteId(ctx),index=Number(target.dataset.index);
  ctx.store.update(s=>{const n=s.content.notes.find(note=>note.id===id);if(n?.attachments)n.attachments.splice(index,1);});return true;
 }
 if(action==='notes-sketch'){openSketch();return true;}
 if(action==='notes-sketch-cancel'){globalThis.document?.querySelector('.nt-sketch-overlay')?.remove();return true;}
 if(action==='notes-sketch-save'){saveSketch(ctx,noteId(ctx));return true;}
 if(action==='notes-share'){
  const note=activeNote(ctx);if(!note)return true;
  const content=[note.title,note.text].filter(Boolean).join('\n\n');
  if(globalThis.navigator?.share)globalThis.navigator.share({title:note.title||'备忘录',text:content}).catch(()=>{});
  else if(globalThis.navigator?.clipboard?.writeText)globalThis.navigator.clipboard.writeText(content).then(()=>ctx.toast('内容已复制')).catch(()=>ctx.toast('分享暂不可用'));
  else ctx.toast('此设备不支持系统分享');return true;
 }
 return false;
}
