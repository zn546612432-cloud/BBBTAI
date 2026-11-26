// Only BOARD-owned personal layout. Story sources will be connected separately.
export const WIDTH=960, HEIGHT=720, NOTE_WIDTH=176, NOTE_HEIGHT=156;
export const COLORS=['yellow','ivory','blue','rose'];
const clamp=(v,max)=>Math.max(0,Math.min(max,Number.isFinite(Number(v))?Number(v):0));
export function boardNotes(s){return Array.isArray(s.content?.board?.notes)?s.content.board.notes:[];}
export function addNote(s,id,text,color='yellow'){
 const notes=boardNotes(s);
 if(notes.length>=60||notes.some(n=>n.id===id)||!String(text).trim())return false;
 const i=notes.length;
 s.content.board??={notes:[]};
 if(!Array.isArray(s.content.board.notes))s.content.board.notes=[];
 s.content.board.notes.push({id,text:String(text).trim().slice(0,400),color:COLORS.includes(color)?color:'yellow',x:52+(i%4)*209,y:56+(Math.floor(i/4)%3)*204,angle:[-3,2,-1,4][i%4],createdDay:s.day});
 return true;
}
export function updateNote(s,id,text,color){const n=boardNotes(s).find(n=>n.id===id);if(!n||!String(text).trim())return false;n.text=String(text).trim().slice(0,400);n.color=COLORS.includes(color)?color:n.color;return true;}
export function moveNote(s,id,x,y){const n=boardNotes(s).find(n=>n.id===id);if(!n)return false;n.x=clamp(x,WIDTH-NOTE_WIDTH);n.y=clamp(y,HEIGHT-NOTE_HEIGHT);return true;}
export function removeNote(s,id){if(!s.content?.board)return false;const notes=boardNotes(s),next=notes.filter(n=>n.id!==id);if(next.length===notes.length)return false;s.content.board.notes=next;return true;}
