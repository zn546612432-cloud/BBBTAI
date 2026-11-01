import {btn,esc,empty} from '../../../../system/ui.js';
import {linkedMission,linkedMailId,linkedDeliveryId,linkedReceiptId} from '../../../mirage/linked-missions.js';
import {linkedArtifacts} from '../../../mirage/linked-contract-runtime.js';

const action=(name,label,id)=>btn('kira-linked-'+name,label,'button-quiet wide','data-order="'+esc(id)+'"');
export function linkedMailView(s,orderId){
 const mission=linkedMission(s,orderId),mail=s.content.mail.find(m=>m.id===linkedMailId(orderId));
 if(!mission||!mail)return empty('邮件不存在');
 const run=s.ghost?.orders?.[orderId],stage=mission.stage,order=s.content.orders.find(o=>o.id===orderId);
 const paid=run?.status==='paid',submitted=!!mission.submitted;
 const state=order?.status==='FAILED'?'<div class="kira-linked-state">委托已超期 · 无法交付</div>'
  :paid?'<div class="kira-linked-state">✓ 已验收 · 款项已入账</div>'
  :submitted?'<div class="kira-linked-state">已发送附成果的回复 · 等待雇主审核（游戏时间）</div>'
  :stage<2?action('research','查看资料 · 浏览器',orderId)
  :stage<3?action('send','发送任务确认',orderId)
  :!run?action('ghost','开始任务 · GHOST',orderId)
  :run.status==='success'?action('settle','回复邮件并附上成果文件',orderId)
  :action('ghost','继续任务 · GHOST',orderId);
 return '<div class="kira-mail-detail kira-linked-mail">'+
  '<div class="kira-mail-toolbar">'+btn('kira-back','‹　收件箱')+'</div>'+
  '<div class="kira-detail-head"><h2>'+esc(mail.subject)+'</h2><p>来自 '+esc(mail.from)+'</p></div>'+
  '<div class="kira-mail-body">'+esc(mail.body)+'</div>'+
  '<div class="kira-linked-progress"><span class="'+(stage>=1?'complete':'')+'">01 收件</span><span class="'+(stage>=2?'complete':'')+'">02 检索</span><span class="'+(stage>=3?'complete':'')+'">03 确认</span><span class="'+(stage>=5?'complete':'')+'">04 GHOST</span><span class="'+(submitted?'complete':'')+'">05 交付</span><span class="'+(paid?'complete':'')+'">06 结算</span></div>'+
  state+(stage>=5?'<p class="kira-linked-state">GHOST 成果保存在「文件」App；必须由熙蒙亲自选择附件并发送。</p>':'')+
  (submitted?btn('kira-linked-sent','查看已发送的成果邮件','button-quiet wide','data-order="'+esc(orderId)+'"'):'')+
  '</div>';
}
export function linkedComposeView(s,orderId){
 const mission=linkedMission(s,orderId),mail=s.content.mail.find(m=>m.id===linkedMailId(orderId));
 const order=s.content.orders.find(o=>o.id===orderId);
 if(!mission||!mail||order?.status!=='ACCEPTED')return empty('当前无法发送这封任务邮件');
 const files=linkedArtifacts(s).filter(f=>f.orderId===orderId);
 const ready=mission.stage>=5&&s.ghost?.orders?.[orderId]?.status==='success'&&files.length>0;
 return '<div class="kira-mail-detail kira-linked-mail">'+
  '<div class="kira-mail-toolbar">'+btn('kira-linked-back','‹　返回原邮件','button-quiet','data-order="'+esc(orderId)+'"')+'</div>'+
  '<div class="kira-detail-head"><h2>回复：'+esc(mission.subject)+'</h2><p>收件人 '+esc(order.owner||'ANONYMOUS')+'</p></div>'+
  '<form class="kira-linked-compose" data-form="kira-linked-deliver" data-order="'+esc(orderId)+'">'+
  '<label>邮件正文<textarea name="note" rows="4" maxlength="1500">任务已经完成，请查收加密成果。</textarea></label>'+
  '<label>添加附件<select name="attachment" required><option value="">请选择 GHOST 产生的成果文件</option>'+
  files.map(f=>'<option value="'+esc(f.id)+'">'+esc(f.title)+'</option>').join('')+'</select></label>'+
  btn('kira-linked-open-files','去文件 App 检查成果','button-quiet wide','data-order="'+esc(orderId)+'"')+
  '<button class="button-primary wide" type="submit" '+(ready?'':'disabled')+'>发送附成果的邮件</button>'+
  (ready?'':'<p>还没有可交付文件，请先完成 GHOST。</p>')+
  '</form></div>';
}
export function linkedSentView(s,mailId){
 const mail=s.content.mail.find(m=>m.id===mailId&&m.linkedDelivery);
 if(!mail)return empty('邮件不存在');
 const artifact=linkedArtifacts(s).find(f=>f.id===mail.attachments?.[0]);
 return '<div class="kira-mail-detail kira-linked-sent">'+
  '<div class="kira-mail-toolbar">'+btn('kira-back','‹　收件箱')+'</div>'+
  '<div class="kira-detail-head"><h2>'+esc(mail.subject)+'</h2><p>已发送给 '+esc(mail.to)+'</p></div>'+
  '<div class="kira-mail-body">'+esc(mail.body)+'</div>'+
  '<div class="kira-linked-state">附件：'+esc(artifact?.title||mail.attachments?.[0]||'未知文件')+'</div>'+
  '<div class="kira-linked-state">已发送 · D'+esc(mail.day)+' '+esc(mail.time)+'</div>'+
  action('back','返回委托邮件',mail.orderId)+'</div>';
}
export function linkedReceiptView(s,mailId){
 const receipt=s.content.mail.find(m=>m.id===mailId&&m.linkedReceipt);
 if(!receipt)return empty('邮件不存在');
 return '<div class="kira-mail-detail kira-payment-receipt">'+
 '<div class="kira-mail-toolbar">'+btn('kira-back','‹　收件箱')+'</div>'+
 '<div class="kira-detail-head"><h2>'+esc(receipt.subject)+'</h2><p>来自 '+esc(receipt.from)+'</p></div>'+
 '<div class="kira-mail-body">'+esc(receipt.body)+'</div>'+
 '<div class="kira-linked-state">✓ PAYMENT RECEIVED · D'+esc(receipt.day)+' '+esc(receipt.time)+'</div></div>';
}
