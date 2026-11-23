import {esc,btn} from '../../../../system/ui.js';
import {completed,nodeStatus} from '../../../../services/story55/state.js';
import {
 D51_PRIVATE_MAIL,D51_SENT_ID,D51_MAIL_TO,D51_MAIL_SUBJECT,
 D51_MAIL_BODY,D51_MAIL_ATTACHMENT
} from '../../../../story/d51/definition.js';

const back=()=>'<div class="kira-mail-toolbar">'+btn('kira-back','‹　收件箱')+'</div>';
const file=()=>'<div class="kira-d01-attachments" aria-label="郵件附件"><div class="kira-d01-attachment-heading">1 個附件</div>'+
 '<div class="kira-d01-attachment kira-private-attachment" aria-label="加密附件，不可預覽">'+
 '<span class="kira-d01-file-icon" aria-hidden="true">▣</span>'+
 '<span class="kira-d01-attachment-copy"><strong>'+esc(D51_MAIL_ATTACHMENT)+'</strong><small>ENC · ENCRYPTED</small></span>'+
 '<span class="kira-private-lock" aria-hidden="true">⌁</span></div></div>';

export function kiraD51Compose(s){
 const status=nodeStatus(s,D51_PRIVATE_MAIL);
 if(completed(s,D51_PRIVATE_MAIL))return kiraD51Sent(s);
 if(status.state!=='ready')return '<div class="kira-mail-detail kira-private-compose">'+back()+
  '<div class="kira-detail-head"><h2>Private Contract</h2></div><p class="kira-private-locked">'+
  esc(status.reason)+'</p></div>';
 return '<div class="kira-mail-detail kira-private-compose">'+back()+
  '<div class="kira-detail-head"><h2>新郵件</h2><p>KIRA · ENCRYPTED MAIL</p></div>'+
  '<form class="kira-linked-compose kira-private-form" data-form="kira-d51-private-send">'+
  '<label>收件人<input name="to" readonly value="'+esc(D51_MAIL_TO)+'"></label>'+
  '<label>主旨<input name="subject" readonly value="'+esc(D51_MAIL_SUBJECT)+'"></label>'+
  '<label>正文<textarea name="body" readonly rows="3">'+esc(D51_MAIL_BODY)+'</textarea></label>'+
  file()+'<input type="hidden" name="attachment" value="'+esc(D51_MAIL_ATTACHMENT)+'">'+
  '<button type="submit" class="button-primary wide">發送</button>'+
  '</form></div>';
}
export function kiraD51Sent(s){
 const mail=s.content.mail?.find(m=>m.id===D51_SENT_ID&&m.storyD51Sent);
 if(!mail)return '<div class="kira-mail-detail">'+back()+'<p>尚未發送</p></div>';
 return '<div class="kira-mail-detail kira-private-compose">'+
  '<div class="kira-mail-toolbar">'+btn('kira-sent-list','‹　已發送')+'</div>'+
  '<div class="kira-detail-head"><h2>'+esc(mail.subject)+'</h2><p>收件人 '+esc(mail.to)+'</p></div>'+
  '<div class="kira-mail-body">'+esc(mail.body)+'</div>'+file()+
  '<p class="kira-private-sent">已發送 · D'+mail.day+' '+esc(mail.time)+'</p></div>';
}
