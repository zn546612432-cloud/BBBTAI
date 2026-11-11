import {renderWebArchive} from './web-archive.js';
import {esc} from '../../system/ui.js';
import {isStory55,completed,completeNode,nodeStatus} from '../../services/story55/state.js';
import {D17_FORUM,D17_WEB_PAGES,D17_NOTE_TEXT,D17_MEDIA} from '../../story/d17/content.js';

export {D17_WEB_PAGES};
export const canResearchMirage=s=>isStory55(s)&&s.day>=17;
export const isResearchPage=p=>!!p&&D17_WEB_PAGES.some(x=>x.id===p.id);
export const researchUrl=loc=>loc.params?.expired?'https://bbs.xingyue.club/thread/18427/login':null;
const paths={
 code:'m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
 record:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0m-6 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6 9l2 1m8 4 2 1',
 news:'M4 3h16v18H4zm4 4h8M8 11h8m-8 4h3m3 0h2m-8 3h8',
 book:'M3 4c4-2 7-1 9 1 2-2 5-3 9-1v16c-4-2-7-1-9 1-2-2-5-3-9-1zm9 1v16',
 compass:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0m-5-5-2 7-7 2 2-7z',
 back:'m14 5-7 7 7 7',search:'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
 menu:'M4 6h16M4 12h16M4 18h16',star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',
 comment:'M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z',
 view:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 moon:'M19 15A8 8 0 0 1 9 5a8 8 0 1 0 10 10z',
 globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18',
 image:'M3 4h18v16H3zm0 13 6-6 4 4 3-3 5 5M16 8h.01',
 shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zm-4 9 3 3 5-6'
};
export const researchIcon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.globe}"/></svg>`;
const control=(a,label,icon)=>`<button type="button" data-action="${a}" aria-label="${esc(label)}">${researchIcon(icon)}</button>`;
const photo=(src,alt,attrs='')=>`<img src="${src}" alt="${esc(alt)}" decoding="async" ${attrs}>`;

export function researchSearchResult(p){
 const brand=p.label;
 const icon=p.forum||p.kind==='forum'?'moon':p.reference?'book':({docs:'code',software:'code',music:'record',travel:'compass',feature:'news',news:'news',blog:'book'})[p.kind]||'globe';
 const cover=p.forum?'community':p.reference?'cosmic':p.article?.hero;
 const date=p.forum?'2024-11-08':p.article?.date;
 const thumb=cover?`<span class="research-result-thumb">${photo(D17_MEDIA[cover],p.forum?'星月論壇情感生活版':p.label+' 配圖')}</span>`:'';
 return `<div class="saf-result-site"><i class="research-favicon is-${p.forum||p.kind==='forum'?'forum':p.kind||'portal'}">${researchIcon(icon)}</i><span class="research-result-brand">${brand}<small>${esc(new URL(p.url).hostname)} ${p.forum?'› 情感生活 › 討論串':''}</small></span><em>⋮</em></div><div class="research-result-content">${thumb}<h2>${esc(p.title)}</h2><p>${date?'<span class="research-result-date">'+esc(date)+' — </span>':''}${esc(p.desc)}</p></div>`;
}
function author(c,{reply=false}={}){
 const op=c.author==='樓主';
 return `<div class="xy-user">${photo(op?D17_MEDIA.island:D17_MEDIA.fish,op?'小島失眠中 的頭像':'憂傷的魚 的頭像','class="xy-avatar" width="36" height="36"')}<div><strong>${op?'小島失眠中':esc(c.author)}</strong>${op?'<span class="xy-op-badge">樓主</span>':''}${!reply?'<small>2024-11-08 · '+(op?'23:14':'23:26')+'</small>':''}</div>${!reply?'<span class="xy-floor">'+(op?'樓主':'12樓')+'</span>':''}</div>`;
}
function comment(c){
 const children=D17_FORUM.comments.filter(x=>x.parent===c.id),reply=!!c.parent;
 return `<article class="comment xy-comment ${reply?'is-reply':''}" id="xy-${esc(c.id)}">${author(c,{reply})}<div class="body"><p>${esc(c.text)}</p></div>${children.length?`<div class="xy-replies" aria-label="樓中樓回覆">${children.map(comment).join('')}</div>`:''}</article>`;
}
function forumHeader(){
 return `<header class="xy-sitebar">${control('browser-back','返回搜尋','back')}<span class="xy-wordmark">${researchIcon('moon')}<b>星月<span>論壇</span></b></span><button type="button" class="xy-site-login" data-action="browser-forum-login">登入</button></header>`;
}
function forum(){
 return `<article class="xingyue-forum" aria-label="星月論壇舊帖">${forumHeader()}<div class="xy-board-cover">${photo(D17_MEDIA.community,'海岸與晴空','width="1000" height="350"')}<div><span>COMMUNITY</span><h2>情感與生活</h2><p>總有些心事，想找個地方說說。</p></div></div><nav class="xy-breadcrumb">首頁 <span>›</span> 情感與生活 <span>›</span> 帖子</nav><div class="xy-thread"><div class="xy-title-row"><span class="xy-topic-tag">求助</span><span class="xy-topic-id">#18427</span></div><h1>${esc(D17_FORUM.title)}</h1>${author({author:'樓主'})}<p class="xy-excerpt">${esc(D17_FORUM.excerpt)}</p><div class="xy-thread-stats"><span>${researchIcon('view')}1,286</span><span>${researchIcon('comment')}24</span><button type="button" data-action="browser-share">${researchIcon('star')}收藏</button></div></div><section class="xy-discussion"><div class="xy-comment-heading"><h2>回覆 <span>24</span></h2><span>按時間排序</span></div>${comment(D17_FORUM.comments[0])}<div class="xy-login"><span class="xy-login-avatars">${photo(D17_MEDIA.island,'')}${photo(D17_MEDIA.fish,'')}</span><p>登入後查看完整討論</p><button type="button" data-action="browser-forum-login">登入查看更多</button></div></section><footer class="xy-footer"><b>星月論壇</b><span>關於星月 · 社群公約 · 聯絡我們</span><small>© 2025 星月社群</small></footer></article>`;
}
function reference({media=false,directory=false,entry}={}){
 const pic=photo(D17_MEDIA.cosmic,'阿撒托斯宇宙神話藝術想像','width="1280" height="853"');
 if(media)return `<article class="bk-gallery"><header>${control('browser-research-close','返回詞條','back')}<span>阿撒托斯 · 圖集</span><span>1 / 1</span></header><figure>${pic}<figcaption>阿撒托斯相關藝術想像</figcaption></figure></article>`;
 const ps=lines=>lines.map(t=>`<p>${esc(t)}</p>`).join('');
 return `<article class="xy-reference baike-entry"><header class="bk-sitebar"><span class="bk-wordmark">知識<b>百科</b></span><form data-form="browser-search"><input name="query" value="阿撒托斯" aria-label="搜尋百科"><button>搜尋</button></form></header><div class="bk-cover"><button data-action="browser-research-gallery" aria-label="查看阿撒托斯圖集">${pic}<span>圖集 1</span></button></div><div class="bk-intro"><div class="bk-title-row"><h1>${esc(entry.title)}</h1><button data-action="browser-share" aria-label="收藏詞條">${researchIcon('star')}</button></div><p class="bk-subtitle">${esc(entry.subtitle)}</p></div><nav class="bk-tabs"><a href="#bk-overview">概述</a><a href="#bk-profile">基本資料</a><a href="#bk-literature">文學形象</a><a href="#bk-relations">相關角色</a></nav><div class="bk-content"><section id="bk-overview">${ps(entry.overview)}</section><div class="bk-directory ${directory?'is-open':''}"><button class="bk-directory-toggle" data-action="browser-research-directory" aria-expanded="${directory}"><span>目錄</span><small>${directory?'收起':'展開'}</small></button>${directory?'<a href="#bk-profile">01　基本資料</a><a href="#bk-literature">02　文學形象</a><a href="#bk-relations">03　相關角色</a>':''}</div><section id="bk-profile"><h2>基本資料</h2><dl class="bk-infobox">${entry.facts.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section><section id="bk-literature"><h2>文學形象</h2>${ps(entry.literature)}</section><section id="bk-relations"><h2>相關角色</h2>${ps(entry.relations)}</section><section><h2>參考閱讀</h2><ul class="bk-sources">${entry.sources.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section><footer class="bk-footer">知識百科</footer></div></article>`;
}
export function renderResearchPage(s,p,{expired=false,media=false,directory=false}={}){
 if(!canResearchMirage(s))return '<section class="xy-error"><h1>找不到此網頁</h1></section>';
 if(expired)return `<article class="xingyue-forum xy-expired">${forumHeader()}<section class="xy-expired-body"><span class="xy-empty-mark">${researchIcon('comment')}</span><small>內容無法顯示</small><h1>該帖子已失效</h1><p>可能已被作者刪除，或已超過可查看期限。</p><button type="button" data-action="browser-back">返回上一頁</button></section><footer class="xy-footer"><b>星月論壇</b><small>© 2025 星月社群</small></footer></article>`;
 if(p.failure){
  const text={expired:'此網站已停止服務。',unsafe:'Safari 無法與此網站建立安全連線。',outdated:'此頁面已不存在，舊版入口無法使用。'}[p.failure];
  return `<section class="xy-error" role="status"><span class="xy-error-icon">${researchIcon(p.failure==='unsafe'?'shield':'globe')}</span><h1>無法開啟此網頁</h1><p>${text}</p><small>${esc(new URL(p.url).hostname)}</small><button type="button" data-action="browser-back">返回搜尋結果</button></section>`;
 }
 if(p.reference)return reference({media,directory,entry:p.entry});
 if(p.article)return renderWebArchive(p);
 return forum();
}
// Reading uses the existing store and one ledger; website presentation has no timers.
export function recordMirageReading(s,p){
 if(!canResearchMirage(s)||!p?.forum)return false;
 const ledger=s.story55.browserReadIds??=[];
 if(ledger.includes(D17_FORUM.id))return false;
 const notes=s.content.notes??=[];
 let note=notes.find(n=>String(n.title||'').trim().toLowerCase()==='mirage');
 if(!note){note={id:'xm-note-mirage',title:'mirage',text:'',authored:true,storyContent:true,createdDay:s.day};notes.unshift(note);}
 note.text=[note.text,D17_NOTE_TEXT].filter(Boolean).join('\n\n');
 note.updatedDay=s.day;note.updatedClock=s.clock;ledger.push(D17_FORUM.id);
 if(!completed(s,'rumours')&&nodeStatus(s,'rumours').state==='ready')completeNode(s,'rumours');
 return true;
}
