import {authoredMoments,profiles as originalProfiles} from './data.js';
import {isStory55} from '../../../../services/story55/state.js';
import {d04DinnerConfirmed} from '../../../../story/d04/wechat.js';

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
 // Retain the original authored D01–D55 posts, including all linked photographs.
 // Old D56–D90 posts remain in source but never leak into this 55-day campaign.
 return [...authoredMoments.filter(p=>!isStory55(s)||p.storyDay<=55).map(p=>{
   const post=m.editedPosts?.[p.id]||p;
   if(post.id==='xs-d05'&&post!==p){
    return {...post,text:post.text==='今天這張我先發了。別又說我相冊全是自己。'?p.text:post.text,
     comments:(post.comments||[]).map(c=>c.by==='胡枫'&&c.text==='你自己先說的'?{...c,text:p.comments[0].text}:c)};
   }
   if(post.id==='xw-d04'&&post!==p){
    return {...post,text:post.text==='和阿蒙出來吃飯。終於肯離開工房了。'?p.text:post.text,
     comments:(post.comments||[]).map(c=>c.by==='小辛'&&c.text==='哥你說的是菜還是你自己？'?{...c,text:'好啊你們，偷偷吃好的'}:c)};
   }
   if(post.id==='xw-d23'&&post!==p){
    // Old editor saves may preserve the retired authored caption/comments.
    // Migrate only exact legacy defaults and keep player-added replies,
    // custom captions, media, time, reactions and independently edited text.
    const comments=post.comments||[];
    const legacy=comments[0]?.by==='熙蒙'&&comments[0]?.text==='你不是说只喝杯茶？'&&!comments[0]?.to
     &&comments[1]?.by==='阿威'&&comments[1]?.text==='风景真好'&&!comments[1]?.to;
    return {...post,text:post.text==='窗边这个位置，能坐一下午。'?p.text:post.text,
     comments:legacy?[...p.comments,...comments.slice(2)]:post.comments};
   }
   if(post.id==='zz-d15'&&post!==p){
    // An older saved editor snapshot can retain the retired default comments.
    // Replace that exact authored prefix only; preserve player-added comments
    // and every other edited field, without touching live reaction history.
    const comments=post.comments||[];
    const previous=[['熙蒙','你说谁？'],['熙旺','我没说累'],['小辛','这题我不敢答']];
    const oldDefaults=previous.every(([by,text],i)=>comments[i]?.by===by&&comments[i]?.text===text&&!comments[i]?.to);
    return oldDefaults?{...post,comments:[...p.comments,...comments.slice(previous.length)]}:post;
   }
   // Migrate only the old built-in HYQ defaults; keep genuinely customized posts.
   if(post.id==='xw-d11'&&post!==p&&post.media?.length===1&&post.media[0]==='macau')
    return {...post,media:[]};
   if(post.id==='xm-d13'&&post!==p){
    const old='新灯装上了。看起来不像临时工房了。';
    const comments=post.comments||[];
    const oldReplies=comments.length>=2&&comments[0].by==='熙旺'&&comments[0].text==='早点睡'
     &&comments[1].by==='胡枫'&&comments[1].text==='上次你也这么说';
    return {...post,text:post.text===old?p.text:post.text,
     comments:oldReplies?[...p.comments,...comments.slice(2)]:post.comments,
     likes:post.likes?.length?post.likes:p.likes};
   }
   if(post.id==='xw-d35'&&post.text==='石排湾看熊猫。阿蒙在馆里站得比熊猫还久。')
    return {...post,text:p.text};
   if(post.id==='xs-d51'&&post.text==='爱上你 是命是病 是明知得不到的回应 我最亲爱的炸鸡')
    return {...post,text:p.text};
   if(post.id==='xw-d49'&&post.text==='路过公园，看见它们坐得很认真。')
    return {...post,text:p.text,media:p.media,comments:p.comments,likes:p.likes,kind:p.kind,music:p.music};
   if(post.id==='xs-d25'&&post.media?.length===1&&post.media[0]==='xiaoxinMirror')
    return {...post,media:p.media};
   if(post.id==='aw-d17'&&post.media?.length===1&&post.media[0]==='gymGear')
    return {...post,media:p.media};
   if(post.id==='xm-d44'&&post.text==='西湖醋鱼吃完了。下次别点。'){
    const oldComments=(post.comments||[]).length===2&&post.comments[0].by==='胡枫'&&post.comments[0].text==='我就说你不爱吃'&&post.comments[1].by==='熙旺'&&post.comments[1].text==='回去给你买烧腊';
    return {...post,text:p.text,...(oldComments?{comments:p.comments}:{}),likes:[...new Set([...(post.likes||[]),...p.likes])]};
   }
   if(post.id!=='xw-0519')return post;
   const legacy=(post.likes||[]).length===1&&post.likes[0]==='熙蒙'&&(post.comments||[]).some(c=>c.by==='熙蒙'&&c.text==='哥哥早安');
   return {...post,...(post.text==='早上好。今天的云很好看。'?{text:p.text}:{}),...(legacy?{likes:p.likes,comments:p.comments}:{})};
  }),...(m.posts||[])]
  .filter(p=>p&&p.id&&!['xm-d41','aw-d53','aw-d69','xs-d47','xs-d55'].includes(p.id)&&!deleted.has(p.id)&&(!isStory55(s)||!(p.storyDay>55))
   &&(!isStory55(s)||p.id!=='xw-d04'||d04DinnerConfirmed(s)));
}
export const findMoment=(s,id)=>allMoments(s).find(p=>p.id===id);
export const momentProfiles=s=>Object.fromEntries(Object.entries(originalProfiles).map(([name,profile])=>{
 const saved=getMomentContent(s).profiles?.[name],resolved={...profile,...saved};
 if(name==='熙蒙'){
  if(resolved.bio==='别打电话，在工房。')resolved.bio=profile.bio;
  if(resolved.cover==='harbor')resolved.cover=profile.cover;
 }
 if(name==='小辛'&&resolved.cover==='morning')resolved.cover=profile.cover;
 if(name==='胡枫'){
  if(resolved.cover==='seoul')resolved.cover=profile.cover;
  if(resolved.bio==='下次再一起去。')resolved.bio=profile.bio;
 }
 if(name==='熙旺'&&resolved.bio==='平安就好。')resolved.bio=profile.bio;
 return [name,resolved];
}));
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
 comments.push({by:'熙蒙',text,day:s.day,time:s.clock,...(to?{to}:{})});
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
  schema:'bbbtai.wechat.moments/1',startDate:'2025-05-19',days:isStory55(s)?55:90,
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
