import {D01_OPENING,D01_ATTACHMENT,D01_ATTACHMENT_BODY} from '../../../../story/d01/runtime.js';
import {btn,esc,empty} from '../../../../system/ui.js';
import {D02_S,D02_A,D02_MAIL,D02_A_MAIL,D02_KEY_FILES,D02_KIRA_BODY} from '../../../../story/d02/runtime.js';
import {HACKER_MAIL_ID} from '../../../mirage/mission.js';
import {missionSteps} from '../mission/index.js';
import {kiraMailTreatment,kiraMailDateLabel} from './policy.js';
import {renderCommissionAttachment} from './attachment.js';
import {D13_MAIL_ID} from '../../../../story/d13/definition.js';

const lineBreaks=content=>esc(content).replace(/\r?\n|\\n/g,'<br>');
export function kiraDetail(s,id){
 const m=s.content.mail.find(m=>m.id===id);
 if(!m)return empty('邮件不存在');
 const body=m.id===D01_OPENING
  ?lineBreaks(m.body).replaceAll('bank account','<a href="#" class="kira-d01-inline-link" data-action="kira-d01-bank">bank account</a>')
  :lineBreaks(m.id===D01_ATTACHMENT?D01_ATTACHMENT_BODY:m.id===D02_MAIL?D02_KIRA_BODY[D02_S]:m.id===D02_A_MAIL?D02_KIRA_BODY[D02_A]:m.body);
 const linkedBody=m.id===D13_MAIL_ID?body.replace('MIRAGE 錢包','<button type="button" class="kira-d01-inline-link" data-action="kira-d13-wallet">MIRAGE 錢包</button>'):body;
 const treatment=kiraMailTreatment(m);
 const commissionFile=renderCommissionAttachment(s,m.id);
 // No default attachment button. Only explicitly authorized mission or
 // credential mail types may show actions.
 const bodyAction=treatment==='mission'?missionSteps(m,s):'';
 return `<div class="kira-mail-detail${m.id===D01_ATTACHMENT?' kira-d01-mail':''}${m.id===D13_MAIL_ID?' kira-d13-mail':''}">
  <div class="kira-mail-toolbar">${btn('kira-back','‹　收件箱')}</div>
  <div class="kira-detail-head"><h2>${esc(m.subject)}</h2><p>来自 ${esc(m.from)}　·　${esc(kiraMailDateLabel(s,m))}</p></div>
  <div class="kira-mail-body">${linkedBody}${commissionFile}</div>${bodyAction}</div>`;
}
