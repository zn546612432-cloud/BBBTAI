import {phIcon} from '../../components/icons.js';

export const selection={enabled:false,selected:new Set(),filter:'all',deletePrompt:false};
export function resetSelection(){selection.enabled=false;selection.selected.clear();selection.filter='all';selection.deletePrompt=false;}
export function renderSelectionControls(){
 return `<div class="ph-selection-bottom" aria-label="照片选择操作">
  <span class="ph-selected-total" role="status">已选择 ${selection.selected.size} 项</span>
  <button type="button" class="ph-trash-button" data-action="photos-delete-selected" aria-label="删除所选照片" ${selection.selected.size?'':'disabled'}>${phIcon('trash',26)}</button>
 </div>
 ${selection.deletePrompt?`<div class="ph-delete-overlay"><div class="ph-delete-dialog" role="dialog" aria-modal="true" aria-label="确认删除照片">
  <h2>删除 ${selection.selected.size} 张照片？</h2><p>删除后将无法恢复。</p>
  <button class="ph-delete-confirm" type="button" data-action="photos-confirm-delete">删除照片</button>
  <button class="ph-delete-cancel" type="button" data-action="photos-cancel-delete">取消</button>
 </div></div>`:''}`;
}
export function handleSelection(action,target,ctx){
 if(action==='photos-toggle-select'){
  selection.enabled=!selection.enabled;selection.selected.clear();selection.deletePrompt=false;ctx.refresh();return true;
 }
 if(action==='photos-select-photo'){
  const id=target.dataset.id;
  selection.selected.has(id)?selection.selected.delete(id):selection.selected.add(id);
  ctx.refresh();return true;
 }
 if(action==='photos-clear-selection'){resetSelection();ctx.refresh();return true;}
 if(action==='photos-delete-selected'){
  if(selection.selected.size){selection.deletePrompt=true;ctx.refresh();}return true;
 }
 if(action==='photos-cancel-delete'){selection.deletePrompt=false;ctx.refresh();return true;}
 if(action==='photos-confirm-delete'){
  if(!selection.deletePrompt)return true;
  const toDelete=new Set(selection.selected);
  ctx.store.update(s=>{s.content.photos=(s.content.photos||[]).filter(photo=>!toDelete.has(photo.id));});
  resetSelection();ctx.refresh();return true;
 }
 if(action==='photos-filter'){selection.filter=target.dataset.filter||'all';ctx.refresh();return true;}
 return false;
}
