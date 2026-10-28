export function handleCollectionAction(action,target){
 if(action==='photos-collapse'){
  const section=target.closest('section');
  if(section){
   section.classList.toggle('ph-collapsed');
   target.setAttribute('aria-expanded',String(!section.classList.contains('ph-collapsed')));
  }
  return true;
 }
 if(action==='photos-edit-pin'){
  const section=target.closest('[data-photos-section="pinned"]');
  section?.classList.toggle('ph-editing');
  target.textContent=section?.classList.contains('ph-editing')?'完成':'编辑';
  return true;
 }
 if(action==='photos-profile'){
  const sheet=target.closest('.ph-collections')?.querySelector('.ph-profile-sheet');
  if(sheet)sheet.hidden=!sheet.hidden;
  return true;
 }
 return false;
}
