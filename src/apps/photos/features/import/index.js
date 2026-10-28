import {uid} from '../../../../services/id.js';
// User-owned images are stored in editable phone state, never embedded in layout source.
export function importPhoto(ctx){
 ctx.pickImage((src,title)=>ctx.store.update(s=>{
  if(!Array.isArray(s.content.photos))s.content.photos=[];
  s.content.photos.unshift({id:uid(),src,title,actual:true,favorite:false});
 }));
}
