// Xi Meng's own dossier. Its suspected hours are projected from the existing
// Story55 presence schedule, not separately maintained game timing rules.
import {seedAuthoredNotes} from '../../../services/story55/authored-notes.js';

export const OUROBOROS_DOSSIER_ID='s55-ouroboros-dossier';
export const OUROBOROS_DOSSIER_TITLE='銜尾蛇資料';
export const OUROBOROS_DOSSIER_HEADING='疑似上線時間（澳門時間）';

export function ouroborosDossierHours(windows){
 return [OUROBOROS_DOSSIER_HEADING,
  ...windows.map(([from,to])=>from+'－'+to),
  '只記下幾個比較容易碰到他的時段。未必每天一樣。',
  '不在這些時間也可能突然出現。不能當作準確作息。'].join('\n');
}

export function syncOuroborosDossier(s,windows){
 if(s?.story55?.version!==1||s.day<16||!Array.isArray(windows)||!windows.length)return false;
 s.content.notes??=[];
 const notes=s.content.notes,ledger=s.story55.authoredNoteIds??=[];
 const existing=notes.find(n=>n.id===OUROBOROS_DOSSIER_ID||
  ['銜尾蛇資料','衔尾蛇资料','衔尾蛇資料','銜尾蛇资料'].includes(String(n.title||'').trim()));
 const hours=ouroborosDossierHours(windows);
 if(existing){
  if(!ledger.includes(OUROBOROS_DOSSIER_ID))ledger.push(OUROBOROS_DOSSIER_ID);
  // Remove the two game-like day markers even from previously saved notes.
  // Leave all other observations and player edits unchanged.
  const previousText=String(existing.text||'');
  const cleanedText=previousText.split('\n').filter(line=>![
   'D13 曾入侵手機。反追蹤失敗。',
   'D14 收到他寄來的框架。'
  ].includes(line.trim())).join('\n');
  if(cleanedText.includes(OUROBOROS_DOSSIER_HEADING)){
   if(cleanedText===previousText)return false;
   existing.text=cleanedText;
   return true;
  }
  existing.text=[cleanedText.trim(),hours].filter(Boolean).join('\n\n');
  return true;
 }
 if(ledger.includes(OUROBOROS_DOSSIER_ID))return false; // Player deleted it.
 seedAuthoredNotes(s,[{
  id:OUROBOROS_DOSSIER_ID,day:16,at:'00:00',title:OUROBOROS_DOSSIER_TITLE,
  text:[
   'Dr Ouroboros',
   'MIRAGE 匿名聯絡人',
   '真名：未知',
   '',
   hours
  ].join('\n')
 }]);
 return true;
}
