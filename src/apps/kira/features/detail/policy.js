// KIRA mail continuity contract. Unknown mail types are ordinary messages,
// never receive a made-up "查看附件" button just because they are not known.
// Real, specifically-approved file interactions are registered by exact ID.
import {dateParts} from '../../../../services/calendar.js';
import {D01_ATTACHMENT} from '../../../../story/d01/runtime.js';
import {D02_MAIL,D02_A_MAIL} from '../../../../story/d02/runtime.js';
import {HACKER_MAIL_ID} from '../../../mirage/mission.js';

const keyFiles=new Set([D01_ATTACHMENT,D02_MAIL,D02_A_MAIL]);
export const KIRA_INTERACTIVE_MAILS=Object.freeze([
 D01_ATTACHMENT,D02_MAIL,D02_A_MAIL,HACKER_MAIL_ID
]);
export function kiraMailTreatment(m){
 if(!m)return 'none';
 if(m.id===HACKER_MAIL_ID)return 'mission';
 if(keyFiles.has(m.id))return 'explicit-key-file';
 return 'plain-mail';
}
export function kiraMailDateLabel(s,m){
 const sent=(typeof m?.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(m.date))
  ?m.date:(Number.isInteger(m?.day)?dateParts({...s,day:m.day}).iso:null);
 const current=dateParts(s).iso;
 const clock=/^([01]\d|2[0-3]):[0-5]\d$/.test(String(m?.time||''))?m.time:'';
 if(!sent)return clock||'';
 const difference=Math.round((Date.parse(current)-Date.parse(sent))/86400000);
 const label=difference===0?'今天':difference===1?'昨天'
  :Number(sent.slice(5,7))+'月'+Number(sent.slice(8))+'日';
 return [label,clock].filter(Boolean).join(' ');
}
