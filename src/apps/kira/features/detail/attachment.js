// Exactly one authentic KIRA file card per MIRAGE commission.
// Shared HTML and action across all days. D01/D02 retain their existing
// key preview semantics; D03/D04 use the same Files and GHOST user flow.
import {esc} from '../../../../system/ui.js';
import {commissionAttachment} from '../../../../services/commissions/attachment-flow.js';
export const acceptedReceipt='<div class="kira-d01-file-status">✓ 文件已驗收 · 交易回執已寄送</div>';
export function renderCommissionAttachment(s,mailId){
 const named=s.content.mail?.find(m=>m.id===mailId&&m.story55);
 const explicit=named&&(mailId==='s55-d13-wallet-mail'?{kind:'wallet-binding',name:'wallet-binding.key',mailId,action:'kira-d13-wallet',caption:'加密憑證 · MIRAGE'}:mailId==='code-mail'&&named.project==='base'?{kind:'framework',name:named.attachmentName||'Ouroboros_Tear_package.key',mailId,action:'s55-read-mail',caption:'加密附件'}:null);
 const file=commissionAttachment(s,mailId)||explicit;
 if(!file)return '';
 const d01=s.story55?.d01||{};
 const legacyD02Verified=file.kind==='D02'
  &&s.content.orders?.find(o=>o.id===file.orderId)?.status==='COMPLETED'
  &&!!s.story55?.d02?.submitted?.[file.orderId]
  &&!!s.bankData?.transactions?.some(t=>t.id==='d02-payment-'+file.orderId);
 const finished=file.kind==='D02'?legacyD02Verified:file.status==='COMPLETED';
 const disabled=file.status==='EXPIRED';
 const action=file.action|| (file.kind==='D01'?'kira-d01-open-file':file.kind==='D02'?'kira-d02-open-file':'kira-open-commission-file');
 // Preserve every D01/D02 status transition from the approved original UI.
 const progress=file.kind==='D01'&&!finished
  ?d01.completedRounds===5||d01.submitted
    ?'<div class="kira-d01-file-status">✓ 修復完成 · 正在驗收結果</div>'
    :d01.deployed
      ?'<div class="kira-d01-file-status">GHOST 已儲存修復進度 · '+Math.min(100,(d01.completedRounds||0)*20)+'%</div>'
      :''
  :'';
 return `<div class="kira-d01-attachments" aria-label="郵件附件">
  <div class="kira-d01-attachment-heading">1 個附件</div>
  <button type="button" class="kira-d01-attachment" data-action="${action}"
   data-id="${esc(file.mailId)}" aria-label="打開附件 ${esc(file.name)}" ${disabled?'disabled':''}>
   <span class="kira-d01-file-icon" aria-hidden="true"><svg viewBox="0 0 32 38" fill="none"><path d="M7 1.5h12l10 10V35a2 2 0 0 1-2 2H7a4 4 0 0 1-4-4V5.5a4 4 0 0 1 4-4Z" stroke="currentColor" stroke-width="1.5"/><path d="M19 2v10h10" stroke="currentColor" stroke-width="1.5"/><path d="m13 22 3-3 3 3m-3-3v9" stroke="currentColor" stroke-width="1.5"/></svg></span>
   <span class="kira-d01-attachment-copy"><strong>${esc(file.name)}</strong><small>${esc(file.caption||'加密憑證 · MIRAGE')}</small></span>
   <span class="kira-d01-attachment-arrow" aria-hidden="true">›</span>
  </button>
  ${finished?acceptedReceipt:disabled?'<div class="kira-d01-file-status">委託已過期</div>':progress}
 </div>`;
}
