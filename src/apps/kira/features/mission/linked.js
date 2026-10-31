import {btn,esc,empty} from '../../../../system/ui.js';
import {linkedMission,linkedMailId} from '../../../mirage/linked-missions.js';
export function linkedMailView(s,orderId){
 const mission=linkedMission(s,orderId),mail=s.content.mail.find(m=>m.id===linkedMailId(orderId));
 if(!mission||!mail)return empty('邮件不存在');
 const run=s.ghost?.orders?.[orderId],stage=mission.stage,paid=run?.status==='paid';
 const action=(name,label)=>btn('kira-linked-'+name,label,'button-quiet wide','data-order="'+esc(orderId)+'"');
 const next=paid?'<div class="kira-linked-state">款项已入账</div>'
  :stage<2?action('research','查看资料 · 浏览器')
  :stage<3?action('send','发送任务确认')
  :!run?action('ghost','开始任务 · GHOST')
  :run.status==='success'?action('settle','提交任务并结算')
  :run.status==='paid'?'<div class="kira-linked-state">已完成</div>'
  :run.status==='settling'?'<div class="kira-linked-state">等待结算…</div>'
  :action('ghost','继续任务 · GHOST');
 return '<div class="kira-mail-detail kira-linked-mail">'+
  '<div class="kira-mail-toolbar">'+btn('kira-back','‹　收件箱')+'</div>'+
  '<div class="kira-detail-head"><h2>'+esc(mail.subject)+'</h2><p>来自 '+esc(mail.from)+'</p></div>'+
  '<div class="kira-mail-body">'+esc(mail.body)+'</div>'+
  '<div class="kira-linked-progress"><span class="'+(stage>=1?'complete':'')+'">01 收件</span><span class="'+(stage>=2?'complete':'')+'">02 检索</span><span class="'+(stage>=3?'complete':'')+'">03 确认</span><span class="'+(stage>=5?'complete':'')+'">04 GHOST</span><span class="'+(paid?'complete':'')+'">05 结算</span></div>'+
  next+'</div>';
}

export function linkedReceiptView(s,mailId){
 const receipt=s.content.mail.find(m=>m.id===mailId&&m.linkedReceipt);
 if(!receipt)return empty('邮件不存在');
 return '<div class="kira-mail-detail kira-payment-receipt">'+
 '<div class="kira-mail-toolbar">'+btn('kira-back','‹　收件箱')+'</div>'+
 '<div class="kira-detail-head"><h2>'+esc(receipt.subject)+'</h2><p>来自 '+esc(receipt.from)+'</p></div>'+
 '<div class="kira-mail-body">'+esc(receipt.body)+'</div>'+
 '<div class="kira-linked-state">✓ PAYMENT RECEIVED</div></div>';
}
