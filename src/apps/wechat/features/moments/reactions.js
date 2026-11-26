import {MOMENTS_PEOPLE,momentsCommentMessages,parseMomentComment} from '../../../../services/ai/moments-comments.js';
import {taiCloudCall,isTaiCloudHost} from '../../../../services/ai/supabase-gateway.js';
import {editableMoments,findMoment,recordMomentInteraction,allMoments} from './model.js';
import {dateParts} from '../../../../services/calendar.js';
import {momentReactionsAt} from './data.js';
import {isStory55,completed} from '../../../../services/story55/state.js';
import {momentPhoto,momentPhotoKey,requestMomentVision} from './vision.js';

const minute=s=>(Math.max(1,Number(s.day)||1)-1)*1440+Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3,5));
const allowed=(s,name)=>MOMENTS_PEOPLE.includes(name)&&!(name==='熙旺'&&isStory55(s)&&(s.day>55||s.day===55&&(completed(s,'d55-wang-last')||s.clock>='19:00')));
const permitted=(s,p)=>!!p&&p.author==='熙蒙'&&p.playerPublished===true&&p.privacy!=='private'&&s.day<=55;
const shuffle=(list,random)=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const queue=(s,p,by,kind,{delay,replyId='',to='熙蒙'}={})=>{
 const m=editableMoments(s);m.reactionJobs??=[];
 const id=p.id+':'+kind+':'+by+(replyId?':'+replyId:'');
 if(m.reactionJobs.some(j=>j.id===id)||(m.interactions||[]).some(j=>j.id===id))return;
 m.reactionJobs.push({id,postId:p.id,by,kind,to,replyId,due:minute(s)+delay});
};
export function scheduleMomentReactions(s,p,{random=Math.random}={}){
 if(!permitted(s,p))return false;
 const names=shuffle(MOMENTS_PEOPLE.filter(n=>allowed(s,n)),random);
 p.reactionPolicy=2;
 const likers=names.slice(0,1+Math.floor(random()*names.length));
 for(const [i,name] of likers.entries())queue(s,p,name,'like',{delay:i===0?1+Math.floor(random()*3):3+Math.floor(random()*28)});
 // Photos are recognized lazily only when a comment has actually been selected.
 if(p.text||p.music||momentPhoto(p)){
  const count=1+Math.floor(random()*3),commenters=shuffle(names,random).slice(0,count);
  for(const by of commenters)queue(s,p,by,'comment',{delay:5+Math.floor(random()*36)});
 }
 return true;
}
export function scheduleMomentReply(s,id,comment,{random=Math.random}={}){
 const p=findMoment(s,id);
 if(!permitted(s,p)||!comment?.to||!allowed(s,comment.to))return false;
 const m=editableMoments(s),source=comment.id;
 if(!source)return false;
 queue(s,p,comment.to,'comment',{delay:3+Math.floor(random()*15),replyId:source});
 // One optional sibling may join a public thread; there is no autonomous infinite reply chain.
 const others=MOMENTS_PEOPLE.filter(n=>n!==comment.to&&allowed(s,n));
 if(others.length&&random()<.25)queue(s,p,others[Math.floor(random()*others.length)],'comment',{delay:7+Math.floor(random()*20),replyId:source,to:comment.to});
 return true;
}
const flight=new WeakMap();
function dueJob(s){return (s.content?.moments?.reactionJobs||[]).filter(j=>j.due<=minute(s)).sort((a,b)=>a.due-b.due)[0];}
const needsLikeRepair=s=>(s.content?.moments?.posts||[]).some(p=>permitted(s,p)&&p.storyDay===s.day&&p.reactionPolicy!==2);
function repairTodayLikes(s,random=Math.random){
 const m=editableMoments(s),now=minute(s);
 for(const p of m.posts){
  if(!permitted(s,p)||p.storyDay!==s.day||p.reactionPolicy===2)continue;
  p.reactionPolicy=2;
  if(p.likes?.length)continue;
  const pending=(m.reactionJobs||[]).filter(j=>j.postId===p.id&&j.kind==='like'&&allowed(s,j.by)).sort((a,b)=>a.due-b.due);
  if(pending.length){pending[0].due=Math.min(pending[0].due,now+1+Math.floor(random()*3));continue;}
  const names=MOMENTS_PEOPLE.filter(n=>allowed(s,n));
  if(names.length)queue(s,p,names[Math.floor(random()*names.length)],'like',{delay:1+Math.floor(random()*3)});
 }
}
export const momentReactionsDue=s=>needsLikeRepair(s)||!!dueJob(s);
function removeJob(s,id){const m=editableMoments(s);m.reactionJobs=(m.reactionJobs||[]).filter(j=>j.id!==id);}
function commentInput(s,p,j,photoDescription=''){
 const now=dateParts(s).iso+'T'+s.clock;
 const examples=allMoments(s).filter(x=>x.privacy!=='private'&&x.publishedAt<=now).flatMap(x=>(momentReactionsAt(x,dateParts(s).iso,s.clock).comments||[]).filter(c=>c.by===j.by).map(c=>c.text)).slice(-6);
 return {by:j.by,day:s.day,clock:s.clock,to:j.to,post:{text:p.text||'',song:p.music?p.music.title+' - '+p.music.artist:'',hasPhoto:!!p.media?.length,photoDescription},
  thread:[...(p.comments||[]),...(s.content.moments?.comments?.[p.id]||[])].slice(-12),examples};
}
export async function requestMomentComment(input){
 const messages=momentsCommentMessages(input);
 if(isTaiCloudHost())return parseMomentComment(await taiCloudCall('chat',{model:'deepseek-v4-pro',temperature:.7,top_p:.8,max_tokens:160,messages}));
 const r=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channel:'moments',day:input.day,moment:input}),signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error('Moments AI unavailable');return parseMomentComment(await r.json());
}
// Store the recognition record on the actual saved post. The same uploaded
// bytes can reuse a public sibling post's record in this save, not another
// player's save. A persisted pending record prevents a reload from resending.
async function photoDescription(store,job,p,recognize){
 const image=momentPhoto(p);
 if(!image)return '';
 const hash=await momentPhotoKey(image);
 const current=store.get(),post=findMoment(current,job.postId);
 if(!permitted(current,post)||!allowed(current,job.by)||momentPhoto(post)!==image||!(current.content.moments.reactionJobs||[]).some(j=>j.id===job.id))return '';
 const own=post.imageVision?.key===hash?post.imageVision:null;
 const existing=own||current.content.moments.posts.find(q=>momentPhoto(q)===image&&q.imageVision?.key===hash)?.imageVision;
 if(existing){
  if(!own)store.update(s=>{const live=findMoment(s,job.postId);if(momentPhoto(live)===image)live.imageVision={...existing};});
  return existing.status==='ready'?existing.description:'';
 }
 store.update(s=>{const live=findMoment(s,job.postId);if(momentPhoto(live)===image)live.imageVision={key:hash,status:'pending',description:''};});
 let description='';try{const value=await recognize(image);if(typeof value==='string')description=value.trim().slice(0,400);}catch{}
 store.update(s=>{const live=findMoment(s,job.postId);
  if(momentPhoto(live)!==image||live.imageVision?.key!==hash)return;
  live.imageVision={key:hash,status:description?'ready':'failed',description};
 });
 return description;
}
export async function tickMomentReactions(store,{request=requestMomentComment,recognize=requestMomentVision}={}){
 if(needsLikeRepair(store.get()))store.update(s=>repairTodayLikes(s));
 const s=store.get(),job=flight.has(store)?(s.content?.moments?.reactionJobs||[]).filter(j=>j.kind==='like'&&j.due<=minute(s)).sort((a,b)=>a.due-b.due)[0]:dueJob(s);
 if(!job)return false;
 const p=findMoment(s,job.postId);
 if(!permitted(s,p)||!allowed(s,job.by)){store.update(x=>removeJob(x,job.id));return true;}
 if(job.kind==='like'){
  store.update(x=>{const post=findMoment(x,job.postId);removeJob(x,job.id);if(!permitted(x,post)||!allowed(x,job.by))return;
   post.likes??=[];if(post.likes.includes(job.by))return;post.likes.push(job.by);recordMomentInteraction(x,post,job);});
  return true;
 }
 // A saved pending job is consumed at most once; a late response must still match the live post and player timeline.
 const key={id:job.id,day:s.day};
 flight.set(store,key);
 try{
  let text='',description='';
  try{
   if(momentPhoto(p))description=await photoDescription(store,job,p,recognize);
   const latest=store.get(),live=findMoment(latest,job.postId);
   // Privacy or deletion may change while the image is being recognized.
   if(permitted(latest,live)&&allowed(latest,job.by)&&latest.day>=key.day&&(latest.content.moments.reactionJobs||[]).some(j=>j.id===job.id)&&(live.text||live.music||description)){
    text=await request(commentInput(latest,live,job,description));
   }
  }catch{}
  store.update(x=>{
   const m=editableMoments(x),live=(m.reactionJobs||[]).find(j=>j.id===job.id),post=findMoment(x,job.postId);
   if(!live)return;removeJob(x,job.id);
   if(!text||!permitted(x,post)||!allowed(x,job.by)||x.day<key.day)return;
   const list=m.comments[post.id]??=[];
   if(list.some(c=>c.id===job.id))return;
   list.push({id:job.id,by:job.by,to:job.replyId?job.to:undefined,text,day:x.day,time:x.clock,aiGenerated:true});
   recordMomentInteraction(x,post,job,text);
  });
 }finally{flight.delete(store);}
 return true;
}
