import {ntIcon} from '../../components/icons.js';
export function renderFolders(notes=[]){
 return `<section class="nt-folders-page" aria-label="备忘录文件夹">
  <header><h1>文件夹</h1></header>
  <div class="nt-folders-label">在我的 iPhone 上</div>
  <button class="nt-folder-row" type="button" data-action="notes-open-list">${ntIcon('folder',26)}<strong>备忘录</strong><span>${notes.length}</span><span class="nt-folder-chevron">›</span></button>
  <div class="nt-folder-bottom"><button class="nt-round-button nt-compose-button" type="button" data-action="new-note" aria-label="新建备忘录">${ntIcon('compose',27)}</button></div>
 </section>`;
}
