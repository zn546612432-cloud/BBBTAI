// Exact repair for the confirmed erroneous AI thread. No new player speech.
const compact=t=>String(t||'').replace(/[\s，。？！,!?]/g,'').replace(/這/g,'这').replace(/麼/g,'么').replace(/後/g,'后').replace(/覺/g,'觉').replace(/來/g,'来');
const isHu=c=>['胡枫','胡楓'].includes(c?.by);
export function repairMomentDisclosure(s){
 const m=s.content?.moments;if(!m)return;
 for(const p of m.posts||[]){
  if(!p.playerPublished||p.author!=='熙蒙'||compact(p.text)!=='原来我是三胞胎')continue;
  const list=m.comments?.[p.id];if(!Array.isArray(list))continue;
  // Accept both script variants; only repair the exact three-row exchange.
  const start=list.findIndex(c=>isHu(c)&&['你反射弧这么长','你反射弧这么長'].includes(compact(c.text)));
  if(start<0)continue;
  const [a,b,c]=list.slice(start,start+3);
  if(!b||!c||b.by!=='熙蒙'||!['胡枫','胡楓'].includes(b.to)||compact(b.text)!=='你知道'||!isHu(c)||c.to!=='熙蒙'||!['知道啊你以為我跟你一樣后知后觉','知道啊你以为我跟你一样后知后觉'].includes(compact(c.text)))continue;
  list.splice(start,3,{...a,to:undefined,text:'三胞胎？？'},{...c,by:'小辛',to:undefined,text:'所以我們還有一個哥哥？'});
  for(const row of m.interactions||[]){
   if(row.postId!==p.id||row.kind!=='comment')continue;
   if(row.id===a.id){row.text='三胞胎？？';}
   if(row.id===c.id){row.by='小辛';row.text='所以我們還有一個哥哥？';}
  }
  for(const n of s.notifications||[]){
   if(n.momentPostId!==p.id)continue;
   if(n.id==='hyq-'+a.id)n.body='三胞胎？？';
   if(n.id==='hyq-'+c.id){n.title='朋友圈 · 小辛';n.body='所以我們還有一個哥哥？';}
  }
  if(b.id&&Array.isArray(m.reactionJobs))m.reactionJobs=m.reactionJobs.filter(j=>j.postId!==p.id||j.replyId!==b.id);
 }
}
