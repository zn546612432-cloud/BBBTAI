import {isStory55} from '../../../../services/story55/state.js';
import {esc} from '../../../../system/ui.js';
import {avatarUrl,momentImage} from '../../../wechat/features/moments/index.js';
import {allMoments,findMoment,momentPeople,momentProfiles,momentDate,momentDay,normalizeMomentTime,editableMoments,editMoment,addMoment,removeMoment,exportMomentPackage,importMomentPackage} from '../../../wechat/features/moments/model.js';

const a=esc;
const mediaSrc=src=>momentImage(src)||src||'';
const image=(src,alt)=>src?`<img src="${a(mediaSrc(src))}" alt="${a(alt)}" loading="lazy">`:'<span class="mom-no-image">暂无图片</span>';
const people=(value,empty=false)=>`${empty?'<option value="">不指定</option>':''}${momentPeople.map(name=>`<option value="${a(name)}" ${name===value?'selected':''}>${a(name)}</option>`).join('')}`;
const field=(name,title,value,type='text')=>`<label>${title}<input data-moment-field="${name}" type="${type}" value="${a(value??'')}"></label>`;
const area=(name,title,value)=>`<label>${title}<textarea data-moment-field="${name}" rows="3">${a(value||'')}</textarea></label>`;
const select=(name,title,value,opts)=>`<label>${title}<select data-moment-field="${name}">${opts.map(([key,label])=>`<option value="${a(key)}" ${value===key?'selected':''}>${a(label)}</option>`).join('')}</select></label>`;
const rowHeader=(title,action,label)=>`<div class="mom-section-title"><h3>${title}</h3><button type="button" class="mom-btn" data-action="${action}">${label}</button></div>`;
const pick=(type,label)=>`<button type="button" class="mom-btn" data-action="mom-upload" data-type="${type}">${label}</button>`;

function overview(s){
 const chosen=s.editor?.momentsFilter||'all',list=allMoments(s).filter(p=>chosen==='all'||p.author===chosen).sort((x,y)=>y.publishedAt.localeCompare(x.publishedAt)),profiles=momentProfiles(s);
 return `<div class="mom-overview">${rowHeader(`全部朋友圈 · ${list.length} 条`,'mom-new-post','＋新建')}
  <p class="mom-caption">可预览 D01–D${isStory55(s)?'55':'90'} 的全部动态，包括尚未发布、超过三天和置顶的内容。</p>
  <label>按发布人筛选<select data-moment-filter><option value="all">全部人物</option>${people(chosen)}</select></label>
  <div class="mom-profile-strip">${momentPeople.map(name=>`<button type="button" data-action="mom-open-profile" data-name="${a(name)}">${image(profiles[name].avatar||avatarUrl(name),name)}<span>${a(name)}</span></button>`).join('')}</div>
  ${list.map(p=>`<article class="mom-overview-card"><div class="mom-post-head">${image(profiles[p.author]?.avatar||avatarUrl(p.author),p.author)}<div><strong>${a(p.author)}</strong><small>D${String(p.storyDay||momentDay(p.publishedAt)).padStart(2,'0')} · ${a(p.publishedAt.replace('T',' '))}${p.pinned?' · 📌置顶':''}</small></div><button type="button" data-action="mom-select-post" data-id="${a(p.id)}">编辑</button></div>
  ${p.text?`<p class="mom-post-text">${a(p.text)}</p>`:''}
  ${p.media?.length?`<div class="mom-post-gallery">${p.media.slice(0,9).map(src=>image(src,'朋友圈图片')).join('')}</div>`:''}
  ${p.kind==='music'?`<div class="mom-rich">♫ ${a(p.music?.title||'音乐')} · ${a(p.music?.artist||'')}</div>`:''}
  ${p.kind==='article'?`<div class="mom-rich">🔗 ${a(p.article?.title||'公众号文章')}</div>`:''}
  ${p.kind==='video'?'<div class="mom-rich">▶ 视频动态</div>':''}
  ${p.likes?.length?`<div class="mom-reactions">♡ ${a(p.likes.join('、'))}</div>`:''}
  ${p.comments?.length?`<div class="mom-comments">${p.comments.map(c=>`<div><b>${a(c.by)}${c.to?' 回复 '+a(c.to):''}：</b>${a(c.text)}</div>`).join('')}</div>`:''}
  ${p.replyOptions?.length||p.replyRules?.length?`<div class="mom-mini-tag">熙蒙可选回复 ${p.replyOptions?.length||0} · NPC 应答 ${p.replyRules?.length||0}</div>`:''}</article>`).join('')||'<p>该人物还没有朋友圈</p>'}</div>`;
}

function profileEditor(s){
 const name=s.editor?.momentsProfile||'熙蒙',profile=momentProfiles(s)[name];
 return `<div class="mom-form-block"><h3>头像、封面与个性签名</h3><label>人物<select data-moment-profile>${people(name)}</select></label>
  <div class="mom-profile-edit"><div>${image(profile.avatar||avatarUrl(name),name+'头像')}${pick('avatar','更换头像')}</div><div>${image(profile.cover,name+'封面')}${pick('cover','更换朋友圈封面')}</div></div>
  ${area('bio','个性签名',profile.bio)}<p class="mom-caption">更改会同步反映到游戏内的朋友圈个人主页。</p></div>`;
}

function detailEditor(s){
 const id=s.editor?.momentsSelected||allMoments(s)[0]?.id,p=findMoment(s,id);
 if(!p)return '<p>还没有朋友圈，点击新建开始。</p>';
 const day=Number(p.storyDay)||momentDay(p.publishedAt),time=p.publishedAt.slice(11,16);
 return `<div class="mom-detail">${rowHeader('编辑朋友圈','mom-open-all','返回全部预览')}
  <div class="mom-form-block"><label>选择动态<select data-moment-selected>${allMoments(s).sort((x,y)=>x.publishedAt.localeCompare(y.publishedAt)).map(x=>`<option value="${a(x.id)}" ${x.id===id?'selected':''}>D${x.storyDay||momentDay(x.publishedAt)} · ${a(x.author)} · ${a((x.text||'无文字').slice(0,12))}</option>`).join('')}</select></label>
  <label>发布人<select data-moment-field="author">${people(p.author)}</select></label>
  <div class="mom-inline">${field('day',`游戏天数 D01–D${isStory55(s)?55:90}`,day,'number')}${field('time','定时发布',time,'time')}</div>
  <div class="mom-date-hint">D${day} = ${momentDate(day)} ${time}，到游戏时刻后自动展示</div>
  ${area('text','正文（可只发图片）',p.text)}
  <div class="mom-inline">${select('kind','内容类型',p.kind||'text',[['text','图文 / 纯文字'],['article','公众号链接'],['music','音乐'],['video','视频']])}${select('privacy','可见范围',p.privacy||'public',[['public','朋友可见'],['private','仅自己可见']])}</div>
  <label class="mom-check"><input type="checkbox" data-moment-field="pinned" ${p.pinned?'checked':''}>置顶（在发布人的主页永久显示）</label>
  ${p.kind==='music'?field('musicTitle','歌曲名',p.music?.title)+field('musicArtist','歌手',p.music?.artist)+field('musicAlbum','专辑',p.music?.album):''}
  ${p.kind==='article'?field('articleTitle','文章标题',p.article?.title)+field('articlePublisher','公众号',p.article?.publisher)+area('articleSummary','文章摘要',p.article?.summary):''}
  ${p.kind==='video'?field('video','视频资源地址/素材名称',p.video):''}
  ${rowHeader(`配图 · ${p.media?.length||0}/9`,'mom-upload','＋上传照片').replace('data-action="mom-upload"','data-action="mom-upload" data-type="media"')}
  <div class="mom-photo-grid">${(p.media||[]).map((src,i)=>`<div class="mom-photo-cell">${image(src,'朋友圈配图')}<button type="button" data-action="mom-delete-media" data-index="${i}" aria-label="删除第${i+1}张图片">×</button></div>`).join('')}</div>
  <p class="mom-caption">图片自动压缩并存入当前浏览器，导出时连同图片一起保存为 JSON。</p>
  <div class="mom-toolbar"><button type="button" class="mom-btn mom-danger" data-action="mom-delete-post">删除这条</button><button type="button" class="mom-btn mom-primary" data-action="mom-play-post">在微信里预览</button></div></div>
  <div class="mom-form-block"><h3>预设点赞</h3><div class="mom-liker-grid">${momentPeople.map(name=>`<label><input type="checkbox" data-moment-like-person="${a(name)}" ${p.likes?.includes(name)?'checked':''}>${a(name)}</label>`).join('')}</div></div>
  <div class="mom-form-block">${rowHeader(`预设评论 · ${p.comments?.length||0}`,'mom-add-comment','＋评论')}
  ${(p.comments||[]).map((c,i)=>`<div class="mom-row-card"><div class="mom-inline"><label>说话人<select data-moment-comment="by" data-index="${i}">${people(c.by)}</select></label><label>回复谁<select data-moment-comment="to" data-index="${i}">${people(c.to,true)}</select></label></div><textarea data-moment-comment="text" data-index="${i}" aria-label="评论正文">${a(c.text)}</textarea><button type="button" class="mom-delete" data-action="mom-delete-comment" data-index="${i}">删除评论</button></div>`).join('')}</div>
  <div class="mom-form-block">${rowHeader('熙蒙的预设回复','mom-add-option','＋选项')}
  <p class="mom-caption">玩家点「评论」时，第一条预设台词自动填入输入框；其他选项点击后替换，不会自动发送。</p>
  ${(p.replyOptions||[]).map((v,i)=>`<div class="mom-row-card"><small>${i===0?'第 1 条 · 默认填入':'选项 '+(i+1)}</small><textarea data-moment-option="${i}" aria-label="熙蒙预设台词">${a(typeof v==='string'?v:v.text)}</textarea><button type="button" class="mom-delete" data-action="mom-delete-option" data-index="${i}">删除选项</button></div>`).join('')}
  ${rowHeader('NPC 回复熙蒙','mom-add-rule','＋应答')}<p class="mom-caption">熙蒙发表匹配的评论后，由 NPC 自动回复。触发句留空表示任意评论都触发。</p>
  ${(p.replyRules||[]).map((r,i)=>`<div class="mom-row-card"><label>回复人物<select data-moment-rule="by" data-index="${i}">${people(r.by)}</select></label><label>触发句（可留空）<input data-moment-rule="trigger" data-index="${i}" value="${a(r.trigger||'')}"></label><label>NPC 台词<textarea data-moment-rule="text" data-index="${i}">${a(r.text||'')}</textarea></label><label class="mom-check"><input type="checkbox" data-moment-rule="once" data-index="${i}" ${r.once?'checked':''}>同一局仅自动回复一次</label><button type="button" class="mom-delete" data-action="mom-delete-rule" data-index="${i}">删除应答</button></div>`).join('')}</div></div>`;
}

export function momentsEditor(s){
 const mode=s.editor?.momentsMode||'overview';
 return `<section class="editor-panel mom-editor"><div class="mom-hero"><small>MOMENTS / STORY WORKBENCH</small><h2>微信朋友圈编辑器</h2><p>七位人物 · ${isStory55(s)?55:90} 天时间线 · 本机保存 · 完整导出</p><div class="mom-stats"><span>${allMoments(s).length} 条动态</span><span>${momentPeople.length} 位人物</span><span>三天可见</span></div></div>
  <div class="mom-toolbar"><button type="button" class="mom-btn ${mode==='overview'?'mom-primary':''}" data-action="mom-open-all">全部预览</button><button type="button" class="mom-btn ${mode==='edit'?'mom-primary':''}" data-action="mom-open-edit">编辑</button><button type="button" class="mom-btn ${mode==='profile'?'mom-primary':''}" data-action="mom-open-profile" data-name="熙蒙">人物资料</button></div>
  <div class="mom-toolbar"><button type="button" class="mom-btn mom-add" data-action="mom-new-post">＋新建</button><button type="button" class="mom-btn" data-action="mom-export">↓ 导出</button><button type="button" class="mom-btn" data-action="mom-import">↑ 导入</button></div>
  <input id="mom-import-file" type="file" accept="application/json,.json" hidden>
  ${mode==='edit'?detailEditor(s):mode==='profile'?profileEditor(s):overview(s)}
  <p class="mom-export-tip">编辑不会破坏仓库原始素材。导出的完整数据包包括配图、头像、签名、点赞、评论和回复规则，可再导入。</p></section>`;
}

function updateField(s,t){
 const id=s.editor?.momentsSelected,p=findMoment(s,id);if(!p)return;
 const field=t.dataset.momentField;
 if(field&&field!=='bio'){
  if(field==='day'||field==='time'){
   const day=field==='day'?Number(t.value):p.storyDay||momentDay(p.publishedAt),time=field==='time'?t.value:p.publishedAt.slice(11,16);
   if(!Number.isInteger(day)||day<1||day>(isStory55(s)?55:90)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return;
   editMoment(s,id,post=>{post.storyDay=day;post.publishedAt=normalizeMomentTime(day,time);});return;
  }
  editMoment(s,id,post=>{
   if(field==='pinned')post.pinned=t.checked;
   else if(field.startsWith('music')){post.music??={};post.music[field.slice(5).toLowerCase()]=t.value;}
   else if(field.startsWith('article')){post.article??={};post.article[field.slice(7).toLowerCase()]=t.value;}
   else if(field==='kind'){
    post.kind=t.value;
    if(t.value==='article')post.article??={title:'',publisher:'',summary:''};
    if(t.value==='music')post.music??={title:'',artist:'',album:''};
   }else post[field]=t.value;
  });return;
 }
 const i=Number(t.dataset.index);
 if(t.dataset.momentComment){editMoment(s,id,p=>{p.comments??=[];if(p.comments[i])p.comments[i][t.dataset.momentComment]=t.value;});return;}
 if(t.dataset.momentOption!==undefined){editMoment(s,id,p=>{p.replyOptions??=[];p.replyOptions[Number(t.dataset.momentOption)]=t.value;});return;}
 if(t.dataset.momentRule){editMoment(s,id,p=>{p.replyRules??=[];if(p.replyRules[i])p.replyRules[i][t.dataset.momentRule]=t.dataset.momentRule==='once'?t.checked:t.value;});return;}
 if(t.dataset.momentLikePerson){editMoment(s,id,p=>{p.likes??=[];p.likes=t.checked?[...new Set([...p.likes,t.dataset.momentLikePerson])]:p.likes.filter(name=>name!==t.dataset.momentLikePerson);});}
}
export function changeMoments(t,ctx){
 const {store}=ctx;
 if(t.dataset.momentFilter!==undefined){store.update(s=>{s.editor.momentsFilter=t.value;});return true;}
 if(t.dataset.momentProfile!==undefined){store.update(s=>{s.editor.momentsProfile=t.value;});return true;}
 if(t.dataset.momentSelected!==undefined){store.update(s=>{s.editor.momentsSelected=t.value;});return true;}
 if(t.dataset.momentField||t.dataset.momentComment||t.dataset.momentOption!==undefined||t.dataset.momentRule||t.dataset.momentLikePerson){store.update(s=>updateField(s,t));return true;}
 return false;
}
export function inputMoments(t,ctx){
 if(t.dataset.momentField==='bio'){
  ctx.store.update(s=>{const m=editableMoments(s),name=s.editor.momentsProfile||'熙蒙';m.profiles[name]??={};m.profiles[name].bio=t.value;});return true;
 }
 if(isMomentsTextEdit(t))return changeMoments(t,ctx);
 return false;
}
export const isMomentsTextEdit=t=>Boolean(t.dataset.momentComment||t.dataset.momentRule&&t.dataset.momentRule!=='once'||t.dataset.momentOption!==undefined||['text','bio','musicTitle','musicArtist','musicAlbum','articleTitle','articlePublisher','articleSummary','video'].includes(t.dataset.momentField));

export function handleMoments(action,t,ctx){
 if(!action.startsWith('mom-'))return false;
 const {store}=ctx,id=t.dataset.id,selected=store.get().editor?.momentsSelected;
 if(['mom-open-all','mom-open-edit','mom-open-profile'].includes(action)){
  store.update(s=>{s.editor.momentsMode=action==='mom-open-all'?'overview':action==='mom-open-edit'?'edit':'profile';if(t.dataset.name)s.editor.momentsProfile=t.dataset.name;});return true;
 }
 if(action==='mom-select-post'){store.update(s=>{s.editor.momentsSelected=id;s.editor.momentsMode='edit';});return true;}
 if(action==='mom-new-post'){store.update(s=>{s.editor.momentsSelected=addMoment(s,s.day<=(isStory55(s)?55:90)?s.day:1);s.editor.momentsMode='edit';});return true;}
 if(action==='mom-delete-post'){
  if(!globalThis.confirm?.('确定删除这条朋友圈吗？建议先导出备份。'))return true;
  store.update(s=>{removeMoment(s,selected);s.editor.momentsSelected=allMoments(s)[0]?.id||'';s.editor.momentsMode='overview';});return true;
 }
 if(action==='mom-upload'){
  const type=t.dataset.type,name=store.get().editor?.momentsProfile||'熙蒙';
  if(type==='media'&&(findMoment(store.get(),selected)?.media||[]).length>=9){ctx.toast('每条最多 9 张照片');return true;}
  ctx.pickImage(src=>store.update(s=>{
   if(type==='media')editMoment(s,selected,p=>{p.media??=[];if(p.media.length<9)p.media.push(src);});
   else {const m=editableMoments(s);m.profiles[name]??={};m.profiles[name][type]=src;}
  }),{maxEdge:type==='avatar'?420:900,quality:type==='avatar'?.78:.72});return true;
 }
 if(action==='mom-delete-media'){store.update(s=>editMoment(s,selected,p=>p.media.splice(Number(t.dataset.index),1)));return true;}
 const adds={'mom-add-comment':['comments',()=>({by:'胡枫',text:''})],'mom-add-option':['replyOptions',()=>''],'mom-add-rule':['replyRules',()=>({id:'rule-'+(globalThis.crypto?.randomUUID?.()||Date.now()),by:'熙旺',trigger:'',text:'',once:true})]};
 if(adds[action]){const [key,make]=adds[action];store.update(s=>editMoment(s,selected,p=>{p[key]??=[];p[key].push(make());}));return true;}
 const removals={'mom-delete-comment':'comments','mom-delete-option':'replyOptions','mom-delete-rule':'replyRules'};
 if(removals[action]){store.update(s=>editMoment(s,selected,p=>p[removals[action]]?.splice(Number(t.dataset.index),1)));return true;}
 if(action==='mom-play-post'){
  const post=findMoment(store.get(),selected);if(!post)return true;
  store.update(s=>{s.day=post.storyDay||momentDay(post.publishedAt);s.clock=post.publishedAt.slice(11,16);});
  ctx.router.open({appId:'wechat',route:'/moments/profile/'+encodeURIComponent(post.author)});return true;
 }
 if(action==='mom-export'){
  const blob=new Blob([JSON.stringify(exportMomentPackage(store.get()),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='BBBTAI-wechat-moments-v1.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);ctx.toast('朋友圈数据包已导出');return true;
 }
 if(action==='mom-import'){document.getElementById('mom-import-file')?.click();return true;}
 return true;
}
export async function handleMomentsImport(file,ctx){
 if(file.size>35_000_000)throw Error('数据包不能超过 35MB');
 const payload=JSON.parse(await file.text());
 if(!globalThis.confirm?.('导入将替换本地朋友圈编辑记录。请先导出备份。确定继续？'))return;
 ctx.store.update(s=>{importMomentPackage(s,payload);s.editor.momentsMode='overview';});ctx.toast('已导入朋友圈数据');
}
