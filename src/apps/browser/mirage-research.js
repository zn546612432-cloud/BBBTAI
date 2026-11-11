import {renderWebArchive} from './web-archive.js';
import {esc} from '../../system/ui.js';
import {isStory55,completed,completeNode,nodeStatus} from '../../services/story55/state.js';
import {D17_FORUM,D17_WEB_PAGES,D17_NOTE_TEXT,D17_MEDIA} from '../../story/d17/content.js';

export {D17_WEB_PAGES};
export const canResearchMirage=s=>isStory55(s)&&s.day>=17;
export const isResearchPage=p=>!!p&&D17_WEB_PAGES.some(x=>x.id===p.id);
export const researchUrl=loc=>loc.params?.expired?'https://bbs.xingyue.club/thread/18427/login':null;
const paths={
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
 const icon=p.forum||p.kind==='forum'?'moon':p.reference?'shield':p.kind==='music'?'image':'globe';
 const cover=p.forum?'community':p.article?.hero;
 const thumb=cover?`<span class="research-result-thumb">${photo(D17_MEDIA[cover],p.forum?'星月論壇情感生活版':p.label+' 配圖')}</span>`:'';
 return `<div class="saf-result-site"><i class="research-favicon is-${p.forum?'forum':'portal'}">${researchIcon(icon)}</i><span class="research-result-brand">${brand}<small>${esc(new URL(p.url).hostname)} ${p.forum?'› 情感生活 › 討論串':''}</small></span><em>⋮</em></div><div class="research-result-content">${thumb}<h2>${esc(p.title)}</h2><p>${p.forum?'<span class="research-result-date">2024年11月8日 — </span>':''}${esc(p.desc)}</p></div>`;
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
function reference({media=false,directory=false}={}){
 if(media)return `<article class="bk-gallery"><header>${control('browser-research-close','返回詞條','back')}<span>阿撒托斯 · 圖集</span><span>1 / 1</span></header><figure>${photo(D17_MEDIA.cosmic,'阿撒托斯的宇宙神話藝術想像','width="1536" height="1024"')}<figcaption>阿撒托斯相關藝術想像</figcaption></figure></article>`;
 return `<article class="xy-reference baike-entry" aria-label="阿撒托斯 百度百科詞條"><header class="bk-sitebar"><span class="bk-wordmark">百度<b>百科</b></span><form data-form="browser-search">${researchIcon('search')}<input name="query" value="阿撒托斯" aria-label="搜尋百科"><button type="submit">搜尋</button></form></header><div class="bk-cover"><button type="button" data-action="browser-research-gallery" aria-label="查看阿撒托斯圖集">${photo(D17_MEDIA.cosmic,'阿撒托斯的宇宙神話藝術想像','width="1536" height="1024"')}<span>${researchIcon('image')}圖集 1</span></button></div><div class="bk-intro"><div class="bk-title-row"><h1>阿撒托斯</h1><button type="button" data-action="browser-share" aria-label="收藏詞條">${researchIcon('star')}</button></div><p class="bk-subtitle">Azathoth · 克蘇魯神話中的虛構存在</p><div class="bk-quick-facts"><span>文學形象</span><span>克蘇魯神話</span><span>外神</span></div></div><nav class="bk-tabs" aria-label="詞條章節"><a href="#bk-overview">概述</a><a href="#bk-profile">基本資料</a><a href="#bk-literature">文學形象</a><a href="#bk-relations">角色關係</a></nav><div class="bk-content"><section id="bk-overview"><p>阿撒托斯（Azathoth）是美國作家 H. P. 洛夫克拉夫特筆下的虛構存在，也是克蘇魯神話中廣為人知的名字。相關作品常把祂與無邊的虛空、混沌，以及難以理解的宇宙力量聯繫在一起。<sup>[1]</sup></p><p>這一形象並不遵循人類熟悉的思考方式。圍繞祂的描寫多帶有夢境與幻視的色彩，長笛、黑暗和翻湧的混沌反覆出現在文字中。<sup>[2]</sup></p></section><div class="bk-directory ${directory?'is-open':''}"><button class="bk-directory-toggle" type="button" data-action="browser-research-directory" aria-expanded="${directory}"><span>${researchIcon('menu')}目錄</span><small>${directory?'收起':'展開'}</small></button>${directory?'<a href="#bk-profile">01　基本資料</a><a href="#bk-literature">02　文學形象</a><a href="#bk-relations">03　角色關係</a><a href="#bk-sources">04　參考資料</a>':''}</div><section id="bk-profile"><h2>基本資料</h2><dl class="bk-infobox"><div><dt>中文名</dt><dd>阿撒托斯</dd></div><div><dt>外文名</dt><dd>Azathoth</dd></div><div><dt>創作者</dt><dd>H. P. 洛夫克拉夫特</dd></div><div><dt>所屬體系</dt><dd>克蘇魯神話</dd></div><div><dt>形象類型</dt><dd>虛構神祇</dd></div><div><dt>相關角色</dt><dd>奈亞拉托提普</dd></div></dl></section><section id="bk-literature"><h2>文學形象</h2><figure class="bk-inline-figure"><button type="button" data-action="browser-research-gallery">${photo(D17_MEDIA.cosmic,'混沌與星雲的藝術描繪','loading="lazy" width="1536" height="1024"')}</button><figcaption>混沌與星雲的藝術描繪</figcaption></figure><p>在《來自猶格斯的真菌》第二十二首〈Azathoth〉中，敘述者被帶往時間與物質之外的混沌。詩中的宏大存在身處黑暗，周圍伴隨著異樣的舞動與長笛聲。這些意象構成了阿撒托斯最常被提及的文學特徵。<sup>[2]</sup></p></section><section id="bk-relations"><h2>角色關係</h2><div class="bk-relation-card">${photo(D17_MEDIA.cosmic,'克蘇魯神話藝術插畫')}<div><h3>奈亞拉托提普</h3><p>Nyarlathotep</p><span>使者</span></div></div><p>奈亞拉托提普與阿撒托斯的關係，常被概括為「使者」與其所侍奉的存在。洛夫克拉夫特的詩篇以使者的自述，把這層關係置於宇宙幻視般的場景中。<sup>[2]</sup></p></section><section id="bk-sources"><h2>參考資料</h2><ol class="bk-sources"><li>H. P. Lovecraft. <i>Azathoth.</i><span>The H. P. Lovecraft Archive</span></li><li>H. P. Lovecraft. <i>Fungi from Yuggoth</i>, XXII.<span>The H. P. Lovecraft Archive</span></li></ol></section><footer class="bk-footer"><b>百度百科</b><span>讓每個人平等地提升自我</span></footer></div></article>`;
}
export function renderResearchPage(s,p,{expired=false,media=false,directory=false}={}){
 if(!canResearchMirage(s))return '<section class="xy-error"><h1>找不到此網頁</h1></section>';
 if(expired)return `<article class="xingyue-forum xy-expired">${forumHeader()}<section class="xy-expired-body"><span class="xy-empty-mark">${researchIcon('comment')}</span><small>內容無法顯示</small><h1>該帖子已失效</h1><p>可能已被作者刪除，或已超過可查看期限。</p><button type="button" data-action="browser-back">返回上一頁</button></section><footer class="xy-footer"><b>星月論壇</b><small>© 2025 星月社群</small></footer></article>`;
 if(p.failure){
  const text={expired:'此網站已停止服務。',unsafe:'Safari 無法與此網站建立安全連線。',outdated:'此頁面已不存在，舊版入口無法使用。'}[p.failure];
  return `<section class="xy-error" role="status"><span class="xy-error-icon">${researchIcon(p.failure==='unsafe'?'shield':'globe')}</span><h1>無法開啟此網頁</h1><p>${text}</p><small>${esc(new URL(p.url).hostname)}</small><button type="button" data-action="browser-back">返回搜尋結果</button></section>`;
 }
 if(p.reference)return reference({media,directory});
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
