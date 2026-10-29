import {authoredMoments,profiles as originalProfiles} from './data.js';

const BASE=Date.UTC(2025,4,19);
export const momentPeople=Object.keys(originalProfiles);
export const momentDate=day=>new Date(BASE+(Number(day)-1)*86400000).toISOString().slice(0,10);
export const momentDay=date=>Math.round((Date.parse(String(date).slice(0,10)+'T00:00:00Z')-BASE)/86400000)+1;
export const getMomentContent=s=>s.content?.moments||{};
export function editableMoments(s){
 s.content??={};const m=s.content.moments??(s.content.moments={});
 m.posts??=[];m.editedPosts??={};m.deletedIds??=[];m.profiles??={};m.likes??={};m.comments??={};return m;
}
export function allMoments(s){
 const m=getMomentContent(s),deleted=new Set(m.deletedIds||[]);
 return [...authoredMoments.map(p=>m.editedPosts?.[p.id]||p),...(m.posts||[])]
  .filter(p=>p&&p.id&&!deleted.has(p.id));
}
export const findMoment=(s,id)=>allMoments(s).find(p=>p.id===id);
export const momentProfiles=s=>Object.fromEntries(Object.entries(originalProfiles).map(([name,profile])=>[name,{...profile,...getMomentContent(s).profiles?.[name]}]));
export function editMoment(s,id,edit){
 const m=editableMoments(s),fresh=m.posts.find(p=>p.id===id);
 if(fresh){edit(fresh);return fresh;}
 const base=authoredMoments.find(p=>p.id===id);
 if(!base)throw Error('找不到这条朋友圈');
 const copy=m.editedPosts[id]??(m.editedPosts[id]=structuredClone(base));edit(copy);return copy;
}
export const normalizeMomentTime=(day,time)=>momentDate(day)+'T'+time;
export function addMoment(s,day=1){
 const m=editableMoments(s),id='moment-editor-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36));
 m.posts.push({id,storyDay:day,author:'熙蒙',publishedAt:normalizeMomentTime(day,'12:00'),text:'',media:[],comments:[],likes:[],privacy:'public',pinned:false,replyOptions:[],replyRules:[]});
 return id;
}
export function removeMoment(s,id){
 const m=editableMoments(s);
 if(m.posts.some(p=>p.id===id))m.posts=m.posts.filter(p=>p.id!==id);
 else if(authoredMoments.some(p=>p.id===id))m.deletedIds=[...new Set([...m.deletedIds,id])];
 delete m.editedPosts[id];delete m.likes[id];delete m.comments[id];
}
export function addGameMomentComment(s,id,text,to=null){
 const m=editableMoments(s),comments=m.comments[id]??(m.comments[id]=[]);
 comments.push({by:'熙蒙',text,...(to?{to}:{})});
 for(const rule of findMoment(s,id)?.replyRules||[]){
  if(!rule.by||!rule.text||rule.trigger&&rule.trigger!==text)continue;
  if(rule.once&&comments.some(c=>c.ruleId===rule.id))continue;
  comments.push({by:rule.by,to:'熙蒙',text:rule.text,ruleId:rule.id||undefined});
 }
 return comments;
}
export function exportMomentPackage(s){
 const m=getMomentContent(s);
 return {
  schema:'bbbtai.wechat.moments/1',startDate:'2025-05-19',days:90,
  profiles:momentProfiles(s),
  posts:allMoments(s).map(p=>structuredClone(p)),
  overrides:{profiles:structuredClone(m.profiles||{}),editedPosts:structuredClone(m.editedPosts||{}),deletedIds:[...(m.deletedIds||[])],posts:structuredClone(m.posts||[])},
  note:'图片的 data:image/... 内容已内嵌。overrides 可直接写入 content.moments；posts 为全部剧情成品。'
 };
}
export function importMomentPackage(s,payload){
 if(payload?.schema!=='bbbtai.wechat.moments/1'||!Array.isArray(payload.posts)||!payload.overrides)throw Error('不是受支持的朋友圈数据包');
 const {overrides:o}=payload,m=editableMoments(s);
 if(!Array.isArray(o.posts)||!Array.isArray(o.deletedIds)||!o.editedPosts||!o.profiles)throw Error('数据包的编辑记录不完整');
 Object.assign(m,{posts:structuredClone(o.posts),deletedIds:[...o.deletedIds],editedPosts:structuredClone(o.editedPosts),profiles:structuredClone(o.profiles)});
}
