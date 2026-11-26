import {MOMENTS_PEOPLE,momentsCommentMessages,parseMomentComment} from '../../../../services/ai/moments-comments.js';
import {taiCloudCall,isTaiCloudHost} from '../../../../services/ai/supabase-gateway.js';
import {editableMoments,findMoment,recordMomentInteraction,allMoments} from './model.js';
import {dateParts} from '../../../../services/calendar.js';
import {momentReactionsAt} from './data.js';
import {isStory55,completed} from '../../../../services/story55/state.js';

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
 for(const name of names.slice(0,Math.floor(random()*(names.length+1))))queue(s,p,name,'like',{delay:3+Math.floor(random()*38)});
 // Image-only posts still get likes; don't invent a description or send image bytes to the text provider.
 if(p.text||p.music){
  const count=Math.min(3,Math.floor(random()*4)),commenters=shuffle(names,random).slice(0,count);
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
export const momentReactionsDue=s=>!!dueJob(s);
function removeJob(s,id){const m=editableMoments(s);m.reactionJobs=(m.reactionJobs||[]).filter(j=>j.id!==id);}
function commentInput(s,p,j){
 const now=dateParts(s).iso+'T'+s.clock;
 const examples=allMoments(s).filter(x=>x.privacy!=='private'&&x.publishedAt<=now).flatMap(x=>(momentReactionsAt(x,dateParts(s).iso,s.clock).comments||[]).filter(c=>c.by===j.by).map(c=>c.text)).slice(-6);
 return {by:j.by,day:s.day,clock:s.clock,to:j.to,post:{text:p.text||'',song:p.music?p.music.title+' - '+p.music.artist:'',hasPhoto:!!p.media?.length},
  thread:[...(p.comments||[]),...(s.content.moments?.comments?.[p.id]||[])].slice(-12),examples};
}
export async function requestMomentComment(input){
 const messages=momentsCommentMessages(input);
 if(isTaiCloudHost())return parseMomentComment(await taiCloudCall('chat',{model:'deepseek-v4-pro',temperature:.7,top_p:.8,max_tokens:160,messages}));
 const r=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channel:'moments',day:input.day,moment:input}),signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error('Moments AI unavailable');return parseMomentComment(await r.json());
}
export async function tickMomentReactions(store,{request=requestMomentComment}={}){
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
  let text='';try{text=await request(commentInput(s,p,job));}catch{}
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
