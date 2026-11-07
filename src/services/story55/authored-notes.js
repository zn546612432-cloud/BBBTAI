// Reusable timed note content. Called only by the existing Story55 tick.
// Inserting once never overwrites the player's edits or marks Ghost progress.
export function seedAuthoredNotes(s,definitions){
 let changed=false;
 for(const note of definitions){
  if(s.day<note.day||s.day===note.day&&s.clock<note.at)continue;
  const ledger=s.story55.authoredNoteIds??=[];
  if(ledger.includes(note.id))continue;
  const notes=s.content.notes??=[];
  if(!notes.some(n=>n.id===note.id))notes.unshift({id:note.id,title:note.title,text:note.text,
   authored:true,storyContent:true,createdDay:note.day,updatedDay:note.day,updatedClock:note.at});
  ledger.push(note.id);changed=true;
 }
 return changed;
}
