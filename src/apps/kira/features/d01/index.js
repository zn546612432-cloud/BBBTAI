// KIRA keeps its existing mailbox layout. Only D01 mail content is specialized.
import {D01_OPENING_MAIL,D01_ORDER_MAIL,D01_DONE_MAIL,d01} from '../../../../services/story55/d01.js';
import {esc,btn} from '../../../../system/ui.js';
const link=(action,label,attrs='')=>btn(action,label,'kira-d01-link',attrs);
export function renderD01Mail(s,id){
 const m=s.content.mail.find(x=>x.id===id);
 if(!m)return '';
 const p=d01(s),o=p?.order;
 const header='<div class="kira-mail-detail kira-d01-mail"><div class="kira-mail-toolbar">'+btn('kira-back','‹　收件匣')+'<span>‹　›　□</span></div><div class="kira-detail-head"><h2>'+esc(m.subject)+'</h2><p>來自 '+esc(m.from)+' · '+esc(m.date||'2025-05-19')+'</p></div><div class="kira-mail-body">';
 let body='';
 if(id===D01_OPENING_MAIL){
  body='<p>Dear Nyarlathotep,</p><p>Your vulnerability scanning order has been completed. The payment has been transferred to your designated '+link('kira-d01-bank','bank account')+'. Please check your bank account for confirmation.</p><p>Best regards,<br>MIRAGE Network</p>'+(p?.bankPaid?'<p class="kira-d01-success">Payment confirmed · 2,000 USD</p>':'');
 }else if(id===D01_ORDER_MAIL){
  body='<p>Dear Nyarlathotep,</p><p>The client has delivered the attachment access key '+link('kira-d01-key','mirage001')+'. Please confirm receipt.</p><p>Best regards,<br>MIRAGE Network</p>';
  if(o?.keyOpened)body+='<div class="kira-d01-attachment"><b>1. 附件已解鎖</b>'+link('kira-d01-ghost','打開 GHOST 完成鏈接')+'</div>';
  if(o?.completed===5)body+='<div class="kira-d01-attachment"><b>2. 修復完成 · 100%</b>'+(!o.submitAt?link('kira-d01-submit','提交附件'):o.paid?'<p>已提交 · 結算完成</p>':'<p>已提交 · 等待完成通知</p>')+'</div>';
 }else if(id===D01_DONE_MAIL){
  body='<p>Dear Nyarlathotep,</p><p>The mirage001 data recovery order has been completed.</p><p>Your payment of <strong>0.04 BTC</strong> has been credited to your MIRAGE wallet.</p><p>Best regards,<br>MIRAGE Network</p>';
 }
 return header+body+'</div></div>';
}
