import {esc} from '../../../../system/ui.js';
import {projectById,completed} from '../../../../services/story55/state.js';

// A single Quick Look surface for the authored .key attachment. Reveal state,
// back navigation and GHOST authorization remain in the existing Files service.
const documentIcon=String.raw`<svg viewBox="0 0 78 94" role="img" aria-label="KEY 檔案" focusable="false">
 <path d="M17 3h30l24 24v54c0 5.5-4.5 10-10 10H17c-5.5 0-10-4.5-10-10V13c0-5.5 4.5-10 10-10Z" fill="#fff" stroke="#cdd4df" stroke-width="1.4"/>
 <path d="M47 3v18c0 3.3 2.7 6 6 6h18" fill="#e7ebf2" stroke="#cdd4df" stroke-width="1.4"/>
 <circle cx="32" cy="47" r="8" stroke="#6d7b93" stroke-width="3" fill="none"/>
 <path d="M38 53l12 12m-1-5 5-5m-2 8 5-5" stroke="#6d7b93" stroke-width="3" stroke-linecap="round"/>
 <rect x="17" y="72" width="44" height="13" rx="5" fill="#eef1f6"/>
 <text x="39" y="81.5" font-size="9" font-family="Arial,sans-serif" letter-spacing="1.4" text-anchor="middle" fill="#62718b" font-weight="700">KEY</text>
 </svg>`;
const chevron=String.raw`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`;
const arrow=String.raw`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`;

export function storyProjectKey(s,id){
 const p=projectById(s,id),mail=s.content.mail?.find(m=>m.project===id&&m.story55);
 if(!p||!mail||!completed(s,mail.storyNode))return '<div class="page-pad">附件尚未授權</div>';
 const revealed=!!s.story55.projectKeysRevealed?.[id];
 const name=esc(mail.attachmentName||'Framework package.key');
 const credential=revealed
  ?'<div class="files-key-credential"><span>授權密鑰</span><code aria-label="授權密鑰，長按可選取複製">'+esc(p.key)+'</code></div>'
  :'<div class="files-key-credential"><span>授權密鑰</span><button type="button" class="files-key-reveal" data-action="files-story-key-reveal" data-project="'+esc(id)+'">顯示密鑰</button></div>';
 return '<div class="files-d01-preview files-key-preview">'+
  '<header class="files-d01-nav files-key-navigation">'+
   '<button type="button" class="files-key-back" data-action="files-story-key-back" data-mail="'+esc(mail.id)+'" aria-label="返回 KIRA">'+chevron+'<span>KIRA</span></button>'+
   '<strong>檔案預覽</strong><span class="files-key-nav-spacer" aria-hidden="true"></span>'+
  '</header>'+
  '<main class="files-key-body" aria-label="加密授權檔案">'+
   '<div class="files-key-document-icon">'+documentIcon+'</div>'+
   '<h1>'+name+'</h1><p class="files-key-type">KEY 檔案</p>'+credential+
  '</main>'+
  '<footer class="files-key-footer">'+
   '<button type="button" class="files-key-open-ghost" data-action="files-story-key-ghost" data-project="'+esc(id)+'">'+
    '<span>使用 GHOST 開啟</span>'+arrow+
   '</button>'+
  '</footer>'+
 '</div>';
}
