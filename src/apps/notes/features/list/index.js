import {esc} from '../../../../system/ui.js';
import {ntIcon} from '../../components/icons.js';

const preview=note=>(note.text||'').replace(/\s+/g,' ').trim().slice(0,70);
export const listUi={sort:'updated'};
function updateLabel(note,state){
 if(note.updatedClock)return note.updatedClock;
 if(note.updatedDay===state.day)return '今天';
 return '最近';
}
export function groupNotes(notes=[],state={day:1}){
 const groups=new Map();
 const sorted=[...notes].sort(listUi.sort==='title'
  ?(a,b)=>(a.title||'').localeCompare(b.title||'','zh-Hans-CN')
  :(a,b)=>(b.updatedDay??b.createdDay??-1)-(a.updatedDay??a.createdDay??-1));
 for(const note of sorted){
  const days=Number.isInteger(note.updatedDay??note.createdDay)?Math.max(0,state.day-(note.updatedDay??note.createdDay)):1;
  const group=note.pinned?'置顶':days===0?'今天':days<=7?'过去7天':days<=30?'过去30天':'更早';
  if(!groups.has(group))groups.set(group,[]);
  groups.get(group).push(note);
 }
 return ['置顶','今天','过去7天','过去30天','更早'].filter(k=>groups.has(k)).map(k=>({title:k,notes:groups.get(k)}));
}
function item(note,state){
 const title=note.title?.trim()||preview(note)||'新备忘录';
 const detail=preview(note);
 const thumb=note.attachments?.[0]?.src?`<img class="nt-note-thumb" src="${esc(note.attachments[0].src)}" alt="">`:'';
 return `<button type="button" class="nt-note-row" data-action="open-note" data-id="${esc(note.id)}" data-notes-title="${esc((title+' '+detail).toLocaleLowerCase())}" aria-label="${esc(title)}">
  <span class="nt-note-copy"><strong>${note.locked?ntIcon('lock',14):''}${esc(title)}</strong><small><span>${esc(updateLabel(note,state))}</span>${detail?`<span class="nt-note-preview">${esc(detail)}</span>`:''}</small></span>${thumb}</button>`;
}
export function renderList(notes=[],state){
 const groups=groupNotes(notes,state);
 return `<section class="nt-list-page" aria-label="备忘录列表">
  <header class="nt-list-header">
   <button class="nt-round-button nt-back-circle" type="button" data-action="notes-folders" aria-label="返回文件夹">${ntIcon('back',28)}</button>
   <div class="nt-list-title"><h1>备忘录</h1><span>${notes.length} 个备忘录</span></div>
   <button class="nt-round-button nt-more-circle" type="button" data-action="notes-menu" aria-label="更多选项">${ntIcon('more',24)}</button>
  </header>
  <div class="nt-sort-menu" hidden data-notes-menu>
   <button type="button" data-action="notes-sort" data-order="updated">按编辑时间排序</button>
   <button type="button" data-action="notes-sort" data-order="title">按标题排序</button>
  </div>
  <div class="nt-list-scroll" data-key="notes-list-scroll">
   <div data-notes-groups>${groups.map(({title,notes:items})=>`<section class="nt-note-group" data-notes-group><h2>${title}</h2><div class="nt-note-card">${items.map(n=>item(n,state)).join('')}</div></section>`).join('')}</div>
   <p class="nt-list-empty" ${notes.length?'hidden':''}>暂无备忘录</p>
   <p class="nt-search-no-match" hidden>未找到匹配的备忘录</p>
  </div>
  <div class="nt-list-bottom"><div class="nt-search-pill">${ntIcon('search',24)}<input data-notes-search type="search" placeholder="搜索" aria-label="搜索备忘录" autocomplete="off">${ntIcon('microphone',21)}</div>
   <button class="nt-round-button nt-compose-button" type="button" data-action="new-note" aria-label="新建备忘录">${ntIcon('compose',27)}</button></div>
 </section>`;
}
