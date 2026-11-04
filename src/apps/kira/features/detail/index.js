import {D01_OPENING,D01_ATTACHMENT,D01_ATTACHMENT_BODY} from '../../../../story/d01/runtime.js';
import {btn,esc,empty} from '../../../../system/ui.js';
import {HACKER_MAIL_ID} from '../../../mirage/mission.js';
import {missionSteps} from '../mission/index.js';

const lineBreaks=content=>esc(content).replaceAll('\\n','<br>');
function attachmentCard(s){
 const state=s.story55?.d01||{},completed=state.completedRounds===5;
 const status=state.rewardPaid
  ?'<div class="kira-d01-file-status">✓ 文件已驗收 · 交易回執已寄送</div>'
  :completed||state.submitted
  ?'<div class="kira-d01-file-status">✓ 修復完成 · 正在驗收結果</div>'
  :state.deployed
  ?'<div class="kira-d01-file-status">GHOST 已儲存修復進度 · '+Math.min(100,(state.completedRounds||0)*20)+'%</div>'
  :'';
 return `<div class="kira-d01-attachments" aria-label="郵件附件">
  <div class="kira-d01-attachment-heading">1 個附件</div>
  <button type="button" class="kira-d01-attachment" data-action="kira-d01-open-file" aria-label="打開附件 mirage001.key">
   <span class="kira-d01-file-icon" aria-hidden="true"><svg viewBox="0 0 32 38" fill="none"><path d="M7 1.5h12l10 10V35a2 2 0 0 1-2 2H7a4 4 0 0 1-4-4V5.5a4 4 0 0 1 4-4Z" stroke="currentColor" stroke-width="1.5"/><path d="M19 2v10h10" stroke="currentColor" stroke-width="1.5"/><path d="m13 22 3-3 3 3m-3-3v9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
   <span class="kira-d01-attachment-copy"><strong>mirage001.key</strong><small>加密憑證 · MIRAGE</small></span>
   <span class="kira-d01-attachment-arrow" aria-hidden="true">›</span>
  </button>
  ${status}
 </div>`;
}
export function kiraDetail(s,id){
 const m=s.content.mail.find(m=>m.id===id);
 if(!m)return empty('邮件不存在');
 const body=m.id===D01_OPENING
  ?lineBreaks(m.body).replaceAll('bank account','<a href="#" class="kira-d01-inline-link" data-action="kira-d01-bank">bank account</a>')
  :lineBreaks(m.id===D01_ATTACHMENT?D01_ATTACHMENT_BODY:m.body);
 const d01File=m.id===D01_ATTACHMENT?attachmentCard(s):'';
 const otherAttachment=m.id===HACKER_MAIL_ID?missionSteps(m,s)
  :m.id==='flow-d03-reward'||m.d01||m.storyD02&&!m.attachments?.length?'':btn('kira-attachment','查看附件　↗','button-quiet wide',`data-id="${esc(m.id)}"`);
 return `<div class="kira-mail-detail${m.id===D01_ATTACHMENT?' kira-d01-mail':''}">
  <div class="kira-mail-toolbar">${btn('kira-back','‹　收件箱')}<span>‹　›　□</span></div>
  <div class="kira-detail-head"><h2>${esc(m.subject)}</h2><p>来自 ${esc(m.from)}　·　今天</p></div>
  <div class="kira-mail-body">${body}${d01File}</div>${otherAttachment}</div>`;
}
