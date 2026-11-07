import {esc} from '../../../../system/ui.js';
import {projectById,completed} from '../../../../services/story55/state.js';
export function storyProjectKey(s,id){
 const p=projectById(s,id),mail=s.content.mail?.find(m=>m.project===id&&m.story55);
 if(!p||!mail||!completed(s,mail.storyNode))return '<div class="page-pad">附件尚未授權</div>';
 const revealed=!!s.story55.projectKeysRevealed?.[id];
 return '<div class="files-d01-preview"><header class="files-d01-nav"><button data-action="files-story-key-back" data-mail="'+esc(mail.id)+'">‹ KIRA</button><span>檔案預覽</span></header><section class="files-d01-document" aria-label="加密授權檔案"><h2>'+esc(mail.attachmentName||'Framework package.key')+'</h2>'+(revealed?'<p>授權密鑰</p><strong>'+esc(p.key)+'</strong>':'<p>已加密</p><button type="button" data-action="files-story-key-reveal" data-project="'+esc(id)+'">開啟密鑰</button>')+'</section><button type="button" data-action="files-story-key-ghost" data-project="'+esc(id)+'">使用 GHOST 開啟</button></div>';
}
