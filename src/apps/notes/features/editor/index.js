import {esc} from '../../../../system/ui.js';
import {ntIcon} from '../../components/icons.js';
import {renderAttachments} from '../attachments/index.js';

export const editorUi={menu:false,format:false,confirmDelete:false};
export function resetEditorUi(){editorUi.menu=false;editorUi.format=false;editorUi.confirmDelete=false;}

export function renderEditor(note){
 return `<form class="nt-editor-page" data-form="note" data-id="${esc(note.id)}" autocomplete="off" aria-label="编辑备忘录">
  <header class="nt-editor-header">
   <button class="nt-round-button nt-editor-back" type="button" data-action="notes-done" aria-label="返回备忘录列表">${ntIcon('back',29)}</button>
   <div class="nt-editor-head-actions"><div class="nt-editor-combo">
     <button type="button" data-action="notes-share" aria-label="分享备忘录">${ntIcon('share',24)}</button>
     <button type="button" data-action="notes-editor-more" aria-label="更多备忘录操作">${ntIcon('more',25)}</button>
    </div><button class="nt-finish-button" type="button" data-action="notes-done" aria-label="完成编辑">${ntIcon('check',29)}</button></div>
  </header>
  <div class="nt-editor-main" data-key="notes-edit-scroll">
   <input class="nt-title-input" data-notes-title name="title" value="${esc(note.title||'')}" placeholder="" aria-label="备忘录标题" spellcheck="true">
   <textarea class="nt-body-input" data-notes-text name="text" placeholder="" aria-label="备忘录正文" spellcheck="true">${esc(note.text||'')}</textarea>
   ${renderAttachments(note)}
  </div>
  <div class="nt-editor-toolbar" aria-label="编辑工具栏">
   <button type="button" class="nt-format-button" data-action="notes-format">格式</button>
   <button type="button" data-action="notes-checklist" aria-label="插入待办清单">${ntIcon('checklist',27)}</button>
   <button type="button" data-action="notes-table" aria-label="插入表格">${ntIcon('table',28)}</button>
   <button type="button" data-action="notes-attach" aria-label="添加图片附件">${ntIcon('paperclip',27)}</button>
   <button type="button" data-action="notes-sketch" aria-label="插入手绘标记">${ntIcon('pen',27)}</button>
  </div>
  <div class="nt-editor-menu" data-notes-editor-menu ${editorUi.menu?'':'hidden'}>
   <button type="button" data-action="notes-pin">${ntIcon('pin',18)}${note.pinned?'取消置顶':'置顶备忘录'}</button>
   <button type="button" data-action="notes-delete">${ntIcon('trash',18)}删除备忘录</button>
  </div>
  <div class="nt-format-sheet" data-notes-format-sheet ${editorUi.format?'':'hidden'}>
   <button type="button" data-action="notes-insert" data-insert="• ">项目符号</button>
   <button type="button" data-action="notes-insert" data-insert="1. ">编号列表</button>
   <button type="button" data-action="notes-insert" data-insert="— ">引用</button>
  </div>
  ${editorUi.confirmDelete?`<div class="nt-delete-overlay"><div class="nt-delete-dialog" role="dialog" aria-modal="true" aria-label="确认删除备忘录"><strong>删除这条备忘录？</strong><p>删除后无法恢复。</p><button type="button" data-action="notes-confirm-delete">删除备忘录</button><button type="button" data-action="notes-cancel-delete">取消</button></div></div>`:''}
 </form>`;
}
