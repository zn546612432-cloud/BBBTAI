import {esc} from '../../../../system/ui.js';
import {dateParts} from '../../../../services/calendar.js';
import {wechatAvatars,resolveWeChatAvatar} from '../../avatars.js';
import {publicAssetPath,stablePublicAssetBase,rebaseBundledPublicAsset} from '../../../../services/public-assets.js';
import {profiles,authoredMoments,visibleMoments,momentReactionsAt} from './data.js';
import {allMoments,findMoment,momentProfiles,addGameMomentComment,editableMoments,playerMoment,deletePlayerMoment,updatePlayerMomentImage,publishPlayerMoment,momentInteractions,unreadMomentInteractions,markMomentInteractionsRead} from './model.js';
import {scheduleMomentReactions,scheduleMomentReply} from './reactions.js';
import {momentIcons} from './icons.js';
import {wxIcon} from '../../components/icons.js';
import {handle as handleMusic} from '../../../music/index.js';
import {tracks} from '../../../music/features/shared/catalog.js';
import {openAvatarCropper} from '../../../../features/avatar-cropper/index.js';
import {openGamePhotoPicker,snapshotGamePhoto} from '../../../photos/features/picker/index.js';
let openActions=null,replyTo=null,replyToName=null,replyDraft='',pendingDelete=null;
const heart=momentIcons.heart;
const trash='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg>';

const photos={ximengCover:'ximeng-moments-cover.webp',d03Breakfast:'d03-breakfast.webp',d03Street:'d03-street.webp',macau:'moment-0.webp',seoul:'moment-1.webp',food:'moment-2.webp',gym:'moment-3.webp',puppy:'moment-4.webp',harbor:'moment-5.webp',design:'zaizai-fashion-design.webp',catVideo:'moment-cat-video.mp4',catCover:'cat-video-cover.webp',hufengMirror:'hufeng-mirror.webp',hufengOutdoors:'hufeng-outdoors.webp',xiaoxinMirror:'xiaoxin-mirror-clean.webp',xiaoxinSelfie:'xiaoxin-selfie-clean.webp',morning:'macau-morning.webp',dawn:'macau-dawn.webp',shumai:'shumai.webp',fabric:'fabric-swatches.webp',xmCaught:'user-xiaoxin-ximeng.webp',xmDinner:'user-xiwang-ximeng.webp',dinnerDish:'user-dinner-dish.webp',brothers:'user-ximeng-brothers.webp',groupPhoto:'user-group-photo.webp',fountain:'user-fountain.webp',park:'user-park.webp',arcade:'user-hufeng-arcade.webp',gymGear:'awei-arm-20240324.jpg',foodMenu:'user-food-menu.jpeg',foodRice:'user-food-rice.jpeg',foodCheesecake:'user-food-cheesecake.jpeg',foodScallop:'user-food-scallop.jpeg',foodCooking:'user-food-cooking.jpeg',foodSashimi:'user-food-sashimi.jpeg',wynnFountain:'user-wynn-fountain.jpeg',wynnNight:'user-wynn-night.jpeg',yellowWall:'user-yellow-wall.jpeg'};
const local=(filename,base)=>publicAssetPath('apps/wechat/media/'+filename,{base});
photos.xiaoxinCover='xiaoxin-moments-cover.webp';
photos.hufengCover='hufeng-moments-cover.webp';
photos.xiaoxinSunsetCover='d06-xiaoxin-sunset-cover.webp';
photos.xiaoxinSunsetVideo='d06-xiaoxin-sunset.mp4';
photos.d41GoodShow='d41-hufeng-good-show.jpeg';
photos.hufengD12Homecoming='hufeng-d12-homecoming.webp';
photos.xiaoxinD25Selfie='d25-xiaoxin-selfie.webp';
photos.d49Moon='d49-xiwang-moon.webp';
Object.assign(photos,{aweiTraining:'awei-d05-training.webp',aweiStyle:'awei-d24-style.webp',aweiFriends:'awei-d29-friends.webp',aweiFountainFront:'awei-d39-fountain-front.webp',aweiFountainBack:'awei-d39-fountain-back.webp'});
// Avatar map already carries the build's base path. Never resolve it twice.
export const avatarUrl=name=>wechatAvatars[name]||wechatAvatars['熙蒙'];
export function momentImage(source,{base=stablePublicAssetBase()}={}){
 const input=String(source||'');
 if(!input)return '';
 if(input.startsWith('avatar:'))return avatarUrl(input.slice(7));
 if(photos[input])return local(photos[input],base);
 // Preserve media that was edited into a Moment or imported from an older
 // storyline package; previously these were silently replaced with "".
 const rebased=rebaseBundledPublicAsset(input,{base});
 if(rebased!==input||input.startsWith(base+'apps/wechat/media/'))return rebased;
 if(/^(?:https:\/\/|data:image\/|blob:)/i.test(input))return input;
 return '';
}
const allPosts=s=>allMoments(s).filter(p=>p.privacy!=='private'||p.author==='熙蒙');
const nowDate=s=>dateParts(s).iso;
// Use the same resolver and visibility rules as the rendered feed/profiles.
export function momentImageUrls(s){
 const profiles=momentProfiles(s);
 const posts=visibleMoments(allPosts(s),nowDate(s),{clock:s.clock});
 return [...new Set([
  ...Object.entries(profiles).flatMap(([name,profile])=>[momentImage(profile.cover),resolveWeChatAvatar(name,profile.avatar)]),
  ...posts.flatMap(post=>[...(post.media||[]).map(src=>momentImage(src)),...(post.music?.trackId?[tracks.find(t=>t.id===post.music.trackId)?.cover]:[])])
 ].filter(src=>src&&!/\.(?:mp4|webm)(?:[?#]|$)/i.test(src)))];
}
const clockLabel=(date,now)=>date.slice(0,10)===now?'今天 '+date.slice(11):date.slice(5,7).replace(/^0/,'')+'月'+Number(date.slice(8,10))+'日 '+date.slice(11);
const im=(src,alt,cls='')=>'<img class="'+cls+'" src="'+esc(momentImage(src))+'" alt="'+esc(alt)+'" loading="eager" decoding="async">';
const avatar=(name,s)=>'<img class="wx-moments-avatar" src="'+esc(resolveWeChatAvatar(name,momentProfiles(s)[name]?.avatar))+'" alt="'+esc(name)+'头像" loading="eager">';
const authorBtn=name=>'<button type="button" class="wx-moments-author" data-action="wx-moment-profile" data-name="'+esc(name)+'">'+esc(name)+'</button>';
function pictureGrid(post){
 if(!post.media?.length)return '';
 const media=post.media.slice(0,9);
 if(post.kind==='video')return '<button type="button" class="wx-moments-video-trigger" data-action="wx-moment-video" data-id="'+esc(post.id)+'" aria-label="播放视频">'+im(media[0],'视频封面')+'<span>▶</span><small>点击播放</small></button>';
 return '<div class="wx-moments-photos '+(media.length===1?'one':'')+'">'+media.map((src,i)=>
  '<button type="button" class="wx-moments-photo" data-action="wx-moment-photo" data-id="'+esc(post.id)+'" data-index="'+i+'" aria-label="查看图片 '+(i+1)+'">'+im(src,post.author+'的照片 '+(i+1))+'</button>').join('')+'</div>';
}
function postContent(post,s){
 if(post.kind==='article')return '<button type="button" class="wx-moments-article" data-action="wx-moment-article" data-id="'+esc(post.id)+'"><span class="wx-moments-article-logo">📖</span><span><strong>'+esc(post.article.title)+'</strong><small>'+esc(post.article.publisher)+'</small></span></button>';
 if(post.kind==='music'){
  const playable=!!post.music.trackId;
  const playing=playable&&s.musicPlaying&&s.musicTrack===post.music.trackId;
  const albumArt=tracks.find(track=>track.id===post.music.trackId)?.cover;
  const art=albumArt?'<img class="wx-moments-music-cover" src="'+esc(albumArt)+'" alt="'+esc(post.music.title)+' 封面" loading="eager" decoding="async">':'<span class="wx-moments-music-art">♫</span>';
  const card='<'+(playable?'button type="button" data-action="wx-moment-music" data-id="'+esc(post.id)+'" aria-pressed="'+!!playing+'"':'div role="group"')+' class="wx-moments-music" aria-label="'+(playable?(playing?'暂停':'播放'):'分享音乐 ')+esc(post.music.title)+'">'+art+'<span><strong>'+esc(post.music.title)+'</strong><small>'+esc(post.music.artist)+(post.music.album?' · '+esc(post.music.album):'')+'</small></span><span class="wx-moments-music-note" aria-hidden="true">'+(playable?(playing?'Ⅱ':'▶'):'♫')+'</span></'+(playable?'button':'div')+'>';
  return pictureGrid(post)+card;
 }
 return pictureGrid(post);
}
function postCard(post,s){
 const reactions=momentReactionsAt(post,nowDate(s),s.clock);
 const override=s.content.moments?.likes?.[post.id];
 const likes=[...(reactions.likes||[]).filter(name=>name!=='熙蒙'||override!==false),...(override===true?['熙蒙']:[])].filter((name,i,arr)=>arr.indexOf(name)===i);
 const replies=[...(reactions.comments||[]),...(s.content.moments?.comments?.[post.id]||[])];
 const liked=likes.includes('熙蒙');
 return '<article class="wx-moments-post" data-key="'+esc(post.id)+'">'+
  '<button type="button" class="wx-moments-post-avatar" data-action="wx-moment-profile" data-name="'+esc(post.author)+'" aria-label="查看'+esc(post.author)+'的相册">'+avatar(post.author,s)+'</button><div class="wx-moments-post-content">'+
  '<div class="wx-moments-poster">'+authorBtn(post.author)+(post.pinned?'<span class="wx-moments-pin-label">置顶</span>':'')+'</div>'+
  (post.text?'<p class="wx-moments-post-text">'+esc(post.text)+'</p>':'')+
  postContent(post,s)+
  '<div class="wx-moments-meta"><span>'+esc(clockLabel(post.publishedAt,nowDate(s)))+'</span>'+(post.author==='熙蒙'?'<button type="button" class="wx-moments-delete" data-action="wx-moment-delete" data-id="'+esc(post.id)+'" aria-label="删除这条朋友圈">'+trash+'</button>':'')+'<div class="wx-moments-tools">'+
  (openActions===post.id?'<div class="wx-moments-action-menu" role="group" aria-label="动态操作"><button type="button" data-action="wx-moment-like" data-id="'+esc(post.id)+'">'+heart+(liked?'取消':'赞')+'</button><button type="button" data-action="wx-moment-reply" data-id="'+esc(post.id)+'">'+momentIcons['message-circle']+'评论</button></div>':'')+
  '<button type="button" class="wx-moments-more" data-action="wx-moment-actions" data-id="'+esc(post.id)+'" aria-label="点赞和评论" aria-expanded="'+(openActions===post.id)+'"><span></span><span></span></button></div></div>'+
  (likes.length||replies.length?'<div class="wx-moments-reactions">'+
   (likes.length?'<div class="wx-moments-likes">'+heart+' '+esc(likes.join('、'))+'</div>':'')+
   replies.map(x=>'<div class="wx-moments-reply"><button type="button" data-action="wx-moment-reply-comment" data-id="'+esc(post.id)+'" data-to="'+esc(x.by)+'" aria-label="回复'+esc(x.by)+'"><strong>'+esc(x.by)+(x.to?' 回复 '+esc(x.to):'')+'：</strong>'+esc(x.text)+'</button></div>').join('')+'</div>':'')+
  (replyTo===post.id?'<form data-form="wx-moment-comment" data-id="'+esc(post.id)+'" class="wx-moments-comment-form"><input name="text" required maxlength="300" autocomplete="off" value="'+esc(replyDraft)+'" placeholder="'+esc(replyToName?'回复'+replyToName+'…':'评论…')+'" aria-label="评论内容"><button type="submit">发送</button><button type="button" data-action="wx-moment-cancel-reply" aria-label="取消评论">取消</button></form>'+
   (post.replyOptions?.length?'<div class="wx-moments-reply-choices">'+post.replyOptions.map((item,i)=>'<button type="button" data-action="wx-moment-suggestion" data-id="'+esc(post.id)+'" data-index="'+i+'">'+esc(typeof item==='string'?item:item.text)+'</button>').join('')+'</div>':''):'')+
  '</div></article>';
}
function cover(name,s,editable=false){
 const profile=momentProfiles(s)[name]||profiles['熙蒙'];
 return '<section class="wx-moments-cover" style="background-position:'+esc(profile.coverPosition||'center')+';background-image:linear-gradient(0deg,#101c2c75,transparent 70%),url(&quot;'+esc(momentImage(profile.cover))+'&quot;)">'+
  (editable?'<button type="button" class="wx-moments-cover-edit" data-action="wx-moment-change-cover" aria-label="更换相册封面"></button>':'')+'<div class="wx-moments-cover-user"><span>'+esc(name)+'</span>'+(editable?'<button type="button" class="wx-moments-avatar-edit" data-action="wx-moment-change-avatar" aria-label="更换头像">'+avatar(name,s)+'</button>':avatar(name,s))+'</div></section><div class="wx-moments-bio">'+esc(profile.bio||'')+'</div>';
}
function topBar(title){
 return '<div class="wx-moments-header"><button type="button" data-action="back" aria-label="返回">'+wxIcon('chevron',25)+'</button><strong>'+esc(title)+'</strong>'+(title==='朋友圈'?'<button type="button" data-action="wx-moment-compose" aria-label="发表朋友圈">'+momentIcons.camera+'</button>':'<span></span>')+'</div>';
}
function pinnedRow(posts){
 if(!posts.length)return '';
 return '<section class="wx-moments-pinned"><strong>置顶</strong><div class="wx-moments-pinned-list">'+posts.map(post=>
  '<button type="button" data-action="wx-moment-focus" data-id="'+esc(post.id)+'" aria-label="查看置顶动态">'+
  (post.media?.[0]?im(post.media[0],post.author+'置顶动态'):'<span class="wx-moments-pinned-text">'+esc(post.text.slice(0,18))+'</span>')+'</button>').join('')+'</div></section>';
}
function profilePage(s,name){
 const posts=name==='熙蒙'?allPosts(s).filter(p=>p.author===name&&p.publishedAt<=nowDate(s)+'T'+s.clock).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)):visibleMoments(allPosts(s),nowDate(s),{author:name,clock:s.clock});
 const pinned=posts.filter(p=>p.pinned),recent=posts.filter(p=>!p.pinned);
 return '<section class="wx-moments-screen wx-moments-profile">'+topBar(name)+
  '<div class="wx-moments-scroll">'+cover(name,s,name==='熙蒙')+pinnedRow(pinned)+
  '<div class="wx-moments-timeline">'+recent.map(p=>postCard(p,s)).join('')+
  '<div class="wx-moments-privacy">'+(name==='熙蒙'?'':'朋友仅展示最近三天的朋友圈')+'</div></div></div></section>';
}
function feedPage(s){
 const posts=visibleMoments(allPosts(s),nowDate(s),{includePinned:false,clock:s.clock});
 const unread=unreadMomentInteractions(s);
 return '<section class="wx-moments-screen">'+topBar('朋友圈')+'<div class="wx-moments-scroll">'+
  '<button type="button" class="wx-moments-my-header" data-action="wx-moment-profile" data-name="熙蒙">'+cover('熙蒙',s)+'</button>'+
  (unread?'<button type="button" class="wx-moments-new" data-action="wx-moment-interactions">'+unread+' 条新消息 ›</button>':'')+'<div class="wx-moments-timeline">'+(posts.length?posts.map(p=>postCard(p,s)).join(''):'<div class="wx-moments-three-days">最近三天还没有新动态，看看朋友们的置顶吧。</div>')+
  '<div class="wx-moments-feed-end">·</div></div></div></section>';
}
function composerPage(s){
 const draft=s.content.moments?.draft||{},track=tracks.find(t=>t.id===draft.musicTrackId);
 return '<section class="wx-moments-screen wx-moments-composer">'+topBar('发表朋友圈')+
  '<form data-form="wx-moment-send" class="wx-moments-compose-form"><textarea name="text" rows="6" placeholder="这一刻的想法…" maxlength="1200">'+esc(draft.text||'')+'</textarea>'+
  (track?'<div class="wx-moments-music wx-moments-share-preview"><img class="wx-moments-music-cover" src="'+esc(track.cover)+'" alt=""><span><strong>'+esc(track.title)+'</strong><small>'+esc(track.artist)+'</small></span></div>':'')+(draft.image?'<div class="wx-moments-compose-image">'+im(draft.image,'即将发布的照片')+'</div>':'')+
  '<button type="button" class="wx-moments-add-image" data-action="wx-moment-add-image">＋ 添加照片</button>'+
  '<label class="wx-moments-privacy-select">谁可以看 <select name="privacy"><option value="public"'+(draft.privacy!=='private'?' selected':'')+'>公开</option><option value="private"'+(draft.privacy==='private'?' selected':'')+'>私密 · 仅自己可见</option></select></label>'+
  '<button class="wx-moments-publish" type="submit">发表</button></form></section>';
}
function interactionsPage(s){
 const rows=momentInteractions(s).filter(x=>!!playerMoment(s,x.postId));
 return '<section class="wx-moments-screen">'+topBar('消息')+'<div class="wx-moments-scroll">'+rows.map(x=>'<button type="button" class="wx-moments-interaction" data-action="wx-moment-focus" data-id="'+esc(x.postId)+'">'+avatar(x.by,s)+'<span><strong>'+esc(x.by)+'</strong><span>'+esc(x.kind==='like'?'赞了你的朋友圈':x.text)+'</span><small>'+esc(x.time)+'</small></span></button>').join('')+(rows.length?'':'<p class="wx-moments-three-days">暂无互动</p>')+'</div></section>';
}
function commentPage(s,id){
 const post=allPosts(s).find(p=>p.id===id);
 if(!post)return feedPage(s);
 return '<section class="wx-moments-screen wx-moments-detail">'+topBar('详情')+'<div class="wx-moments-scroll">'+postCard(post,s)+'</div>'+
  '<form data-form="wx-moment-comment" data-id="'+esc(id)+'" class="wx-moments-comment-form"><input name="text" required maxlength="300" autocomplete="off" placeholder="评论…"><button type="submit">发送</button></form></section>';
}
function galleryPage(s,id,index){
 const post=allPosts(s).find(p=>p.id===id),src=post?.media?.[Number(index)];
 if(!src)return feedPage(s);
 return '<section class="wx-moments-screen wx-moments-gallery">'+topBar('照片')+
  '<div class="wx-moments-full-image">'+im(src,post.author+'发布的图片')+'</div></section>';
}
function videoPage(s,id){
 const post=allPosts(s).find(p=>p.id===id);
 if(!post?.video)return feedPage(s);
 return '<section class="wx-moments-screen wx-moments-gallery">'+topBar('视频')+
  '<div class="wx-moments-full-image"><video controls autoplay playsinline poster="'+esc(momentImage(post.media[0]))+'" src="'+esc(momentImage(post.video))+'">视频暂不支持播放</video></div></section>';
}
function articlePage(s,id){
 const post=allPosts(s).find(p=>p.id===id);
 if(!post?.article)return feedPage(s);
 return '<section class="wx-moments-screen">'+topBar('文章')+'<div class="wx-moments-scroll wx-moments-reading"><small>'+esc(post.article.publisher)+'</small><h2>'+esc(post.article.title)+'</h2><p>'+esc(post.article.summary)+'</p><p>修电脑的时候能有人陪你唠嗑，吃饭的时候有人记得给你留位置，这大概就是朋友最舒服的样子。</p></div></section>';
}
function renderMomentPage(s,route){
 const parts=route.split('/').filter(Boolean),section=parts[1]||'';
 if(section==='profile')return profilePage(s,decodeURIComponent(parts[2]||'熙蒙'));
 if(section==='compose')return composerPage(s);
 if(section==='interactions')return interactionsPage(s);
 if(section==='comment')return commentPage(s,parts[2]);
 if(section==='photo')return galleryPage(s,parts[2],parts[3]);
 if(section==='video')return videoPage(s,parts[2]);
 if(section==='article')return articlePage(s,parts[2]);
 return feedPage(s);
}
export function renderMoments(s,route){
 const body=renderMomentPage(s,route);
 const post=pendingDelete&&playerMoment(s,pendingDelete);
 return body+(post?'<div class="wx-moment-modal" role="dialog" aria-modal="true" aria-label="删除朋友圈"><div class="wx-moment-dialog"><strong>确定删除这条朋友圈？</strong><p>删除后无法恢复。</p><div><button type="button" data-action="wx-moment-delete-cancel">取消</button><button type="button" class="danger" data-action="wx-moment-delete-confirm">删除</button></div></div></div>':'');
}
export function handleMoment(action,target,ctx){
 const id=target.dataset.id,route=path=>{openActions=null;replyTo=null;replyToName=null;replyDraft='';ctx.router.open({appId:'wechat',route:'/moments'+path});};
 if(action==='wx-moment-music'){
  const post=findMoment(ctx.store.get(),id);
  if(post?.music?.trackId)handleMusic('music-toggle-track',{dataset:{track:post.music.trackId}},ctx);
  return true;
 }
 if(action==='wx-moment-profile'){route('/profile/'+encodeURIComponent(target.dataset.name));return true;}
 if(action==='wx-moment-compose'){ctx.store.update(s=>{const m=editableMoments(s);if(m.draft?.musicTrackId)m.draft=null;});route('/compose');return true;}
 if(action==='wx-moment-interactions'){ctx.store.update(s=>markMomentInteractionsRead(s));route('/interactions');return true;}
 if(action==='wx-moment-delete'){if(playerMoment(ctx.store.get(),id)){pendingDelete=id;ctx.refresh();}return true;}
 if(action==='wx-moment-delete-cancel'){pendingDelete=null;ctx.refresh();return true;}
 if(action==='wx-moment-delete-confirm'){const selected=pendingDelete;pendingDelete=null;const detail=ctx.store.get().nav.current.route==='/moments/comment/'+selected;ctx.store.update(s=>deletePlayerMoment(s,selected));if(detail)ctx.router.back();else ctx.refresh();return true;}
 if(action==='wx-moment-change-avatar'||action==='wx-moment-change-cover'){
  const field=action.endsWith('avatar')?'avatar':'cover',routeAtOpen=ctx.store.get().nav.current.route;
  if(routeAtOpen!=='/moments/profile/'+encodeURIComponent('熙蒙')&&routeAtOpen!=='/moments/profile/熙蒙')return true;
  openGamePhotoPicker(ctx,async photo=>{
   const bitmap=await createImageBitmap(await (await fetch(photo.src)).blob());
   if(ctx.store.get().nav.current.route!==routeAtOpen){bitmap.close?.();return;}
   openAvatarCropper({bitmap,aspect:field==='avatar'?1:1.5,size:field==='avatar'?512:1000,quality:.82,onSave:image=>ctx.store.update(s=>updatePlayerMomentImage(s,field,image))});
  });return true;
 }
 if(action==='wx-moment-focus'){const post=allPosts(ctx.store.get()).find(p=>p.id===id);if(post)route('/comment/'+post.id);return true;}
 if(action==='wx-moment-actions'){openActions=openActions===id?null:id;replyTo=null;ctx.refresh();return true;}
 if(action==='wx-moment-reply'||action==='wx-moment-reply-comment'){
  openActions=null;replyTo=id;replyToName=action==='wx-moment-reply-comment'?target.dataset.to:null;
  const options=findMoment(ctx.store.get(),id)?.replyOptions||[];replyDraft=String(typeof options[0]==='string'?options[0]:options[0]?.text||'');
  ctx.refresh();globalThis.document?.querySelector('[data-form="wx-moment-comment"] input')?.focus();return true;
 }
 if(action==='wx-moment-suggestion'){
  const item=findMoment(ctx.store.get(),id)?.replyOptions?.[Number(target.dataset.index)];
  replyDraft=String(typeof item==='string'?item:item?.text||'');
  const field=globalThis.document?.querySelector('[data-form="wx-moment-comment"] input');if(field){field.value=replyDraft;field.focus();}return true;
 }
 if(action==='wx-moment-cancel-reply'){replyTo=null;replyToName=null;replyDraft='';ctx.refresh();return true;}
 if(action==='wx-moment-photo'){route('/photo/'+id+'/'+target.dataset.index);return true;}
 if(action==='wx-moment-video'){route('/video/'+id);return true;}
 if(action==='wx-moment-article'){route('/article/'+id);return true;}
 if(action==='wx-moment-like'){
  openActions=null;
  ctx.store.update(s=>{const m=s.content.moments??(s.content.moments={});m.likes??={};
   const original=allPosts(s).find(p=>p.id===id)?.likes?.includes('熙蒙')||false;
   const currently=m.likes[id]===undefined?original:m.likes[id];
   m.likes[id]=!currently;
  });return true;
 }
 if(action==='wx-moment-add-image'){
  const form=document.querySelector('.wx-moments-compose-form'),text=form?.querySelector('textarea')?.value||'',privacy=form?.querySelector('select')?.value||'public';
  ctx.store.update(s=>{const m=editableMoments(s);m.draft={...(m.draft||{}),text,privacy};});
  openGamePhotoPicker(ctx,async photo=>{
   const image=await snapshotGamePhoto(photo);
   if(ctx.store.get().nav.current.appId!=='wechat'||ctx.store.get().nav.current.route!=='/moments/compose')return;
   ctx.store.update(s=>{const m=editableMoments(s);m.draft={...(m.draft||{}),image};});
  });
  return true;
 }
 return false;
}
export function submitMoment(form,ctx){
 if(form.dataset.form==='wx-moment-send'){
  const data=new FormData(form),text=String(data.get('text')||'').trim(),draft=ctx.store.get().content.moments?.draft||{};
  if(!text&&!draft.image&&!tracks.some(t=>t.id===draft.musicTrackId)){ctx.toast('写点什么或者选一张照片吧');return true;}
  let published=null;
  ctx.store.update(s=>{published=publishPlayerMoment(s,{text,image:draft.image,privacy:data.get('privacy'),trackId:draft.musicTrackId});if(published)scheduleMomentReactions(s,published);});
  if(!published)return true;
  // Pop the transient composer; normal Back must never re-enter it.
  const current=ctx.store.get().nav,previous=current.stack?.at(-1);
  if(previous?.appId==='wechat'&&previous.route==='/moments'){
   ctx.store.update(s=>{s.nav.stack=s.nav.stack.filter(loc=>!(loc.appId==='wechat'&&loc.route==='/moments/compose'));});
   ctx.router.back();
  }
  else{
   ctx.router.back();
   ctx.router.open({appId:'wechat',route:'/discover'});
   ctx.router.open({appId:'wechat',route:'/moments'});
  }
  return true;
 }
 if(form.dataset.form==='wx-moment-comment'){
  const text=String(new FormData(form).get('text')||'').trim();if(!text)return true;
  const to=replyToName;replyTo=null;replyToName=null;replyDraft='';
  ctx.store.update(s=>{
   const prior=s.content.moments?.comments?.[form.dataset.id]?.length||0,comments=addGameMomentComment(s,form.dataset.id,text,to),own=comments[prior];
   if(own?.by==='熙蒙')scheduleMomentReply(s,form.dataset.id,own);
  });
  form.reset();return true;
 }
 return false;
}
