import {esc} from '../../system/ui.js';
import {D17_MEDIA,D17_WEB_PAGES} from '../../story/d17/content.js';

const image=(key,caption,cls='')=>`<figure class="${cls}"><img src="${D17_MEDIA[key]}" alt="${esc(caption)}" decoding="async"><figcaption>${esc(caption)}</figcaption></figure>`;
export function renderWebArchive(p){
 const a=p.article;
 const related=(a.related||[]).map(id=>D17_WEB_PAGES.find(x=>x.id===id)).filter(Boolean);
 const sections=a.sections.map((s,i)=>`<section id="archive-${i}"><h2>${esc(s.heading)}</h2>${s.paragraphs.map(t=>`<p>${esc(t)}</p>`).join('')}${s.code?`<pre><code>${esc(s.code)}</code></pre>`:''}</section>`).join('');
 const facts=a.facts?`<dl class="archive-facts">${a.facts.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`:'';
 const tracks=a.tracks?`<ol class="archive-tracks">${a.tracks.map(([n,t,time])=>`<li><span>${esc(n)}</span><strong>${esc(t)}</strong><time>${esc(time)}</time></li>`).join('')}</ol>`:'';
 return `<article class="web-archive archive-${a.style}" aria-label="${esc(p.label+' '+p.title)}"><header class="archive-sitebar"><button type="button" data-action="browser-back" aria-label="返回搜尋">‹</button><b>${esc(a.brand)}</b><span>${a.style==='music'?'MUSIC JOURNAL':a.style==='discussion'?'COMMUNITY':'JOURNAL'}</span></header><div class="archive-column"><div class="archive-category">${esc(a.category)}</div><h1>${esc(p.title.split(' — ')[0])}</h1><div class="archive-byline"><span>${esc(a.author)}</span><time datetime="${a.date}">${a.date.replaceAll('-','.')} </time></div>${a.hero?image(a.hero,a.caption,'archive-hero'):''}<p class="archive-lead">${esc(a.lead)}</p>${facts}${tracks}<div class="archive-body">${sections}</div><aside class="archive-related"><h2>${a.style==='software'?'繼續閱讀':a.style==='music'?'另一種聲音':'延伸閱讀'}</h2>${related.map(x=>`<button type="button" data-action="browser-open" data-page="${x.id}"><span>${esc(x.label)}</span><strong>${esc(x.title)}</strong><i>↗</i></button>`).join('')}<button type="button" data-action="browser-back" class="archive-return">← 返回上一頁</button></aside></div><footer class="archive-footer"><b>${esc(a.brand)}</b><span>© ${a.date.slice(0,4)} · ${esc(p.label)}</span></footer></article>`;
}
