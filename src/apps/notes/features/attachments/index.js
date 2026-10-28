import {esc} from '../../../../system/ui.js';
import {ntIcon} from '../../components/icons.js';

export function renderAttachments(note){
 const files=Array.isArray(note.attachments)?note.attachments:[];
 if(!files.length)return '';
 return `<div class="nt-attachments" aria-label="备忘录附件">${files.map((asset,index)=>`<div class="nt-attachment"><img src="${esc(asset.src)}" alt="${esc(asset.title||'照片附件')}"><button type="button" data-action="notes-remove-attachment" data-index="${index}" aria-label="移除附件">${ntIcon('close',15)}</button></div>`).join('')}</div>`;
}

export function addNoteAttachment(ctx,id){
 ctx.pickImage((src,title)=>ctx.store.update(s=>{
  const note=s.content.notes.find(n=>n.id===id);if(!note)return;
  if(!Array.isArray(note.attachments))note.attachments=[];
  note.attachments.push({src,title});note.updatedDay=s.day;note.updatedClock=s.clock;
 }));
}
