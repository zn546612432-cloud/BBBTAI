import {esc} from '../../../../system/ui.js';
import {nodeStatus,completed} from '../../../../services/story55/state.js';
import {readEvidence55} from '../../../../services/story55/runtime.js';
import {ROOM404_URL,ROOM404_AVATAR,ROOM404_POSTS} from './content.js';
export {room404Page,isRoom404Url,ROOM404_URL} from './content.js';

const paths={
 back:'m15 4-8 8 8 8',close:'m5 5 14 14M19 5 5 19',next:'m9 4 8 8-8 8',
 heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
 comment:'M21 11.5a9 9 0 0 1-9.5 9A10 10 0 0 1 7 19.4L2 21l1.6-5A9 9 0 1 1 21 11.5Z',
 share:'m22 2-7 20-4-9L2 9l20-7ZM22 2 11 13',save:'M5 3h14v19l-7-5-7 5Z',
 grid:'M3 3h18v18H3ZM3 9h18M3 15h18M9 3v18M15 3v18',
 tagged:'M8 3h8l2 3h3v15H3V6h3l2-3ZM9 11a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM7 21v-2a5 5 0 0 1 10 0v2',
 people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM20 8v6M17 11h6',
 camera:'M4 6h4l2-3h4l2 3h4v15H4ZM8 13a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z',
 more:'M4 12h.01M12 12h.01M20 12h.01',link:'m9 15 6-6M8 17l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 7l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0'
};
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${n==='more'?3.5:1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[n]}"/></svg>`;
const btn=(a,label,attrs='')=>`<button type="button" data-action="browser-ig-${a}" ${attrs}>${label}</button>`;
const avatar=(className='')=>`<img class="r404-avatar ${className}" src="${ROOM404_AVATAR}" alt="room.404 的黑白頭像">`;
const dateLabel=p=>p.date.replace(/^(\d+)-(\d+)-(\d+)$/,(_,y,m,d)=>`${y}年${Number(m)}月${Number(d)}日`);
export const canOpenRoom404=s=>['ready','done'].includes(nodeStatus(s,'ig').state);
const scrollKey=loc=>loc?.appId==='browser'&&['ig','room404'].includes(loc.params?.page)?'room404:'+JSON.stringify({route:loc.route,post:loc.params.post||'',tab:loc.params.tab||''}):null;
export function rememberRoom404Scroll(c){
 const key=scrollKey(c.store.get().nav?.current),pane=globalThis.document?.querySelector('#screen-layer .saf-content');
 if(key&&pane)c.router.scroll?.set(key,pane.scrollTop);
}
export function restoreRoom404Scroll(c){
 const key=scrollKey(c.store.get().nav?.current);if(!key||!globalThis.requestAnimationFrame)return;
 requestAnimationFrame(()=>{if(scrollKey(c.store.get().nav?.current)!==key)return;const pane=document.querySelector('#screen-layer .saf-content');if(pane)pane.scrollTop=c.router.scroll?.get(key)||0;});
}
const homeParams=(loc,extra={})=>({...loc.params,page:loc.route==='/story55'?'ig':'room404',post:undefined,tab:undefined,sheet:undefined,zoom:undefined,...extra});
function sheet(params,post){
 if(!params.sheet&&!params.zoom)return '';
 if(params.zoom)return `<div class="r404-lightbox" role="dialog" aria-modal="true" aria-label="${post?'貼文原圖':'大頭貼照'}">${btn('close',icon('close'),'class="r404-close" aria-label="關閉原圖"')}<img src="${post?post.image:ROOM404_AVATAR}" alt="${esc(post?.alt||'黑白口罩頭像')}" decoding="async"></div>`;
 const kind=params.sheet,title={comments:'留言',likes:`${post?.likes||0} 個讚`,followers:'粉絲',following:'追蹤中',login:'登入 Instagram',menu:'room.404',share:'分享個人檔案'}[kind]||'Instagram';
 let body='';
 if(kind==='comments')body=`<div class="r404-sheet-empty">${icon('comment')}<h3>尚無留言</h3><p>成為第一個留言的人。</p>${btn('login','登入以留言','class="r404-primary"')}</div>`;
 else if(['followers','following','likes'].includes(kind))body=`<div class="r404-sheet-empty">${icon(kind==='likes'?'heart':'people')}<p>${kind==='likes'?'登入即可查看誰按了讚。':kind==='followers'?'尚無粉絲':'尚未追蹤任何人'}</p>${kind==='likes'?btn('login','登入','class="r404-primary"'):''}</div>`;
 else if(kind==='menu'||kind==='share')body=`<div class="r404-menu">${btn('copy',icon('link')+'複製連結')} ${btn('login','登入 Instagram')}</div>`;
 else if(kind==='copied')body='<div class="r404-sheet-empty"><h3>已複製連結</h3></div>';
 else body=`<div class="r404-sheet-empty">${icon('camera')}<h3>查看 room.404 的更多內容</h3><p>登入後即可追蹤、按讚及傳送訊息。</p><p class="r404-small">目前以訪客身分瀏覽。</p>${btn('close','繼續瀏覽','class="r404-primary"')}</div>`;
 return `<div class="r404-overlay" role="dialog" aria-modal="true" aria-label="${esc(title)}">${btn('close','','class="r404-scrim" aria-label="關閉視窗"')}<section class="r404-sheet"><div class="r404-grabber"></div><header><h2>${esc(title)}</h2>${btn('close',icon('close'),'aria-label="關閉視窗"')}</header>${body}</section></div>`;
}
export function renderRoom404(s,loc){
 const params=loc.params||{},post=ROOM404_POSTS.find(p=>p.id===params.post),tagged=params.tab==='tagged';
 const header=`<header class="r404-masthead"><img class="r404-wordmark" src="/apps/browser/room404/wordmark.svg" width="104" height="30" alt="Instagram">${btn('login','登入','class="r404-login"')}</header>`;
 let body;
 if(post){const idx=ROOM404_POSTS.indexOf(post);body=`<nav class="r404-postnav">${btn('profile',icon('back'),'aria-label="返回個人檔案"')}<div><small>ROOM.404</small><strong>貼文</strong></div><span></span></nav><article class="r404-post"><header>${btn('profile',avatar()+'<strong>room.404</strong>','class="r404-author"')}${btn('menu',icon('more'),'aria-label="貼文選項"')}</header>${btn('zoom',`<img src="${post.image}" width="1080" height="1350" alt="${esc(post.alt)}" decoding="async">`,'class="r404-post-image" aria-label="查看原圖"')}<nav class="r404-actions">${btn('login',icon('heart'),'aria-label="按讚"')}${btn('comments',icon('comment'),'aria-label="查看留言"')}${btn('share',icon('share'),'aria-label="分享貼文"')}${btn('login',icon('save'),'class="r404-save" aria-label="收藏貼文"')}</nav><div class="r404-post-copy">${btn('likes',`${post.likes} 個讚`,'class="r404-likes"')}<p><strong>room.404</strong> <span lang="${['afterparty','jetlag'].includes(post.id)?'en':'pt'}">${esc(post.caption)}</span></p>${btn('comments','查看留言','class="r404-comment-link"')}<time datetime="${post.date}">${dateLabel(post)}</time></div><nav class="r404-pagination">${idx?btn('post',icon('back')+'上一則',`data-post="${ROOM404_POSTS[idx-1].id}"`):'<span></span>'}<small>${idx+1} / ${ROOM404_POSTS.length}</small>${idx<ROOM404_POSTS.length-1?btn('post','下一則'+icon('next'),`data-post="${ROOM404_POSTS[idx+1].id}"`):'<span></span>'}</nav></article>`;}
 else body=`<section class="r404-profile"><div class="r404-identity">${btn('avatar',avatar('r404-avatar-large'),'aria-label="查看大頭貼照"')}<div><div class="r404-name"><h1>room.404</h1>${btn('menu',icon('more'),'aria-label="個人檔案選項"')}</div><div class="r404-controls">${btn('login','追蹤','class="r404-primary"')}${btn('login','傳送訊息','class="r404-secondary"')}</div></div></div><p class="r404-display-name">T.</p></section><nav class="r404-stats"><div><strong>${ROOM404_POSTS.length}</strong><span>貼文</span></div>${btn('followers','<strong>0</strong><span>粉絲</span>')}${btn('following','<strong>0</strong><span>追蹤中</span>')}</nav><nav class="r404-tabs" aria-label="個人檔案內容">${btn('grid',icon('grid'),`class="${!tagged?'is-active':''}" aria-label="貼文" aria-pressed="${!tagged}"`)}${btn('tagged',icon('tagged'),`class="${tagged?'is-active':''}" aria-label="標註的相片" aria-pressed="${tagged}"`)}</nav>${tagged?`<section class="r404-empty">${icon('tagged')}<h2>相片</h2><p>尚無標註的相片。</p></section>`:`<div class="r404-grid">${ROOM404_POSTS.map(p=>btn('post',`<img src="${p.image}" width="360" height="480" alt="${esc(p.alt)}" style="object-position:${p.position||'50% 50%'}" decoding="async">`,`data-post="${p.id}" aria-label="查看貼文：${esc(p.caption)}"`)).join('')}</div>`}<footer class="r404-footer"><span>Meta</span><span>關於</span><span>使用條款</span><span>隱私</span><small>© 2025 Instagram from Meta</small></footer>`;
 return `<div class="r404" data-key="room404" lang="zh-Hant">${header}${body}${sheet(params,post)}</div>`;
}
export function handleRoom404(a,t,c,loc,{navigate,preview=false}={}){
 if(!a.startsWith('browser-ig-'))return false;
 if(!preview&&!canOpenRoom404(c.store.get()))return true;
 const key=a.slice(11),params=loc.params||{},next=extra=>navigate(loc.route,{...params,...extra});
 if(key==='post'){
  const post=ROOM404_POSTS.find(p=>p.id===t.dataset.post);if(!post)return true;
  if(!preview&&post.id==='selfie'&&!completed(c.store.get(),'ig'))c.store.update(s=>readEvidence55(s,'page','ig'));
  next({post:post.id,sheet:undefined,zoom:undefined});
 }else if(key==='profile')navigate(loc.route,homeParams(loc));
 else if(key==='grid'||key==='tagged')navigate(loc.route,homeParams(loc,{tab:key==='tagged'?'tagged':undefined}));
 else if(key==='close'){
  // Closing a sheet restores its originating page without adding history entries.
  c.store.update(s=>{delete s.nav.current.params.sheet;delete s.nav.current.params.zoom;});
 }else if(key==='avatar'||key==='zoom')next({zoom:'1'});
 else if(key==='copy'){
  const url=params.post?ROOM404_URL+'?post='+params.post:ROOM404_URL;
  if(globalThis.navigator?.clipboard?.writeText)navigator.clipboard.writeText(url).then(()=>c.toast?.('已複製連結')).catch(()=>c.toast?.(url));
  else c.toast?.(url);
 }else if(['comments','likes','followers','following','login','menu','share'].includes(key))next({sheet:key});
 return true;
}
