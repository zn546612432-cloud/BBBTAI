import {esc} from '../../system/ui.js';
import {isStory55,completed,completeNode,nodeStatus} from '../../services/story55/state.js';
import {D17_FORUM,D17_WEB_PAGES,D17_NOTE_TEXT} from '../../story/d17/content.js';

export {D17_WEB_PAGES};
export const canResearchMirage=s=>isStory55(s)&&s.day>=17;
export const isResearchPage=p=>!!p&&D17_WEB_PAGES.some(x=>x.id===p.id);
export const researchUrl=loc=>loc.params?.expired?'https://xingyue.example/thread/18427/login':null;

function comment(c){
 const children=D17_FORUM.comments.filter(x=>x.parent===c.id);
 return `<article class="comment xy-comment" id="xy-${esc(c.id)}"><header class="title"><span class="xy-avatar" aria-hidden="true">${esc(c.author.slice(0,1))}</span><strong>${esc(c.author)}</strong>${c.author==='樓主'?'<small>樓主</small>':''}</header><div class="body"><p>${esc(c.text)}</p></div>${children.length?`<div class="xy-replies" aria-label="樓中樓回覆">${children.map(comment).join('')}</div>`:''}</article>`;
}
export function renderResearchPage(s,p,{expired=false}={}){
 if(!canResearchMirage(s))return '<section class="xy-error"><h1>找不到此網頁</h1></section>';
 if(expired)return '<section class="xy-error" role="status"><span>星月論壇</span><h1>該帖子已失效</h1><p>此內容已無法查看。</p></section>';
 if(p.failure){
  const text={expired:'此網站已停止服務。',unsafe:'Safari 無法與此網站建立安全連線。',outdated:'此頁面已不存在，舊版入口無法使用。'}[p.failure];
  return `<section class="xy-error" role="status"><span>${esc(new URL(p.url).hostname)}</span><h1>無法開啟此網頁</h1><p>${text}</p></section>`;
 }
 if(p.reference)return '<article class="xy-reference"><small>詞條</small><h1>Azathoth</h1><h2>神話中的名字</h2><p>阿撒托斯，洛夫克拉夫特作品與克蘇魯神話中的存在。Nyarlathotep（奈亞拉托提普）被稱為祂的使者。</p><h2>網絡上的同名傳聞</h2><p>部分論壇使用這個名字指稱一個黑客組織。相關說法來源零散，身份與成員資料無法核實。</p></article>';
 return `<article class="xingyue-forum" aria-label="星月論壇舊帖"><header class="xy-masthead"><b>星月<span>論壇</span></b><small>分享生活，交換心事</small></header><nav class="xy-breadcrumb">星月論壇 › 感情與生活 › 求助</nav><div class="xy-thread"><small>求助</small><h1>${esc(D17_FORUM.title)}</h1><div class="xy-thread-meta">${esc(D17_FORUM.author)} · <time>${D17_FORUM.date}</time></div><p class="xy-excerpt">${esc(D17_FORUM.excerpt)}</p><div class="xy-match-label">含 Mirage 的回覆</div>${comment(D17_FORUM.comments[0])}<div class="xy-login"><button type="button" data-action="browser-forum-login">登入查看更多</button></div></div><footer>星月論壇</footer></article>`;
}

// Called by the browser's existing navigation action, never by a timed tick.
// Only the displayed excerpt is collected; hidden posts and failed pages have no effects.
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
