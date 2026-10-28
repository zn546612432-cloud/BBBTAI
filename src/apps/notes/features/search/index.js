export function filterNoteRows(field){
 const root=field.closest('.nt-list-page');if(!root)return;
 const query=field.value.trim().toLocaleLowerCase();let matches=0;
 root.querySelectorAll('[data-notes-title]').forEach(row=>{
  row.hidden=!!query&&!String(row.dataset.notesTitle).includes(query);
  if(!row.hidden)matches++;
 });
 root.querySelectorAll('[data-notes-group]').forEach(group=>{
  group.hidden=![...group.querySelectorAll('[data-notes-title]')].some(row=>!row.hidden);
 });
 const noMatch=root.querySelector('.nt-search-no-match');if(noMatch)noMatch.hidden=matches>0||!query;
 const noNotes=root.querySelector('.nt-list-empty');if(noNotes&&query)noNotes.hidden=true;
}
