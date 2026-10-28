import {btn,esc,empty} from '../../../../system/ui.js';
import {HACKER_MAIL_ID} from '../../../mirage/mission.js';
import {missionSteps} from '../mission/index.js';
export function kiraDetail(s,id){const m=s.content.mail.find(m=>m.id===id);return m?`<div class="kira-mail-detail"><div class="kira-mail-toolbar">${btn('kira-back','‹　收件箱')}<span>‹　›　□</span></div><div class="kira-detail-head"><h2>${esc(m.subject)}</h2><p>来自 ${esc(m.from)}　·　今天</p></div><div class="kira-mail-body">${esc(m.body)}</div>${m.id===HACKER_MAIL_ID?missionSteps(m,s):btn('kira-attachment','查看附件　↗','button-quiet wide',`data-id="${esc(m.id)}"`)}</div>`:empty('邮件不存在');}
