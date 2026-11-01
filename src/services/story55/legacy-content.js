// Carry historical authored content into the new campaign without importing
// a previous campaign's progress, future plot, or player interactions.
export function restoreLegacyHistoricalContent(storage,state){
 if(state.story55?.legacyContentImported)return false;
 let old;
 try{old=JSON.parse(storage?.getItem?.('ximeng-phone-v2')||'null');}catch{return false;}
 const beforeStart=post=>post&&typeof post.id==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(post.publishedAt||'')&&post.publishedAt<'2025-05-19';
 const source=old?.content?.moments;
 if(source){
  const target=state.content.moments??={posts:[],editedPosts:{},deletedIds:[],profiles:{},likes:{},comments:{}};
  const posts=Array.isArray(source.posts)?source.posts.filter(beforeStart):[];
  const ids=new Set((target.posts||=[]).map(post=>post.id));
  for(const post of posts)if(!ids.has(post.id)){target.posts.push(structuredClone(post));ids.add(post.id);}
  target.editedPosts??={};
  for(const [id,post] of Object.entries(source.editedPosts||{}))if(beforeStart(post)&&!target.editedPosts[id])target.editedPosts[id]=structuredClone(post);
  target.profiles={...structuredClone(source.profiles||{}),...target.profiles};
 }
 const notes=state.content.notes??=[];
 const ids=new Set(notes.map(note=>note.id));
 for(const note of Array.isArray(old?.content?.notes)?old.content.notes:[]){
  if(note?.authored===true&&typeof note.id==='string'&&!ids.has(note.id)){notes.push(structuredClone(note));ids.add(note.id);}
 }
 state.story55.legacyContentImported=true;
 return true;
}
