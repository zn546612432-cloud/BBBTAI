import {D14_D24_CONTENT} from './definition.js';

// These are value overrides for the SAME lifecycle engine, never another
// scheduler, duplicated message stream, or replacement of the shipped source.
const TIME=/^([01]\d|2[0-3]):[0-5]\d$/;
const byKey=new Map(D14_D24_CONTENT.wechat.map(scene=>[trackKey(scene),scene]));
export function trackKey(scene){return `d${String(scene.day).padStart(2,'0')}:${scene.id}`;}
export const trackSource=key=>byKey.get(key)||null;
export function tracksForDay(day){return D14_D24_CONTENT.wechat.filter(x=>x.day===day);}
export function trackValues(s,scene){
 const overridden=s.story55?.chatSceneEdits?.[trackKey(scene)];
 return overridden?structuredClone(overridden):{at:scene.at,lines:structuredClone(scene.lines)};
}
export function validateTrackValues(key,values){
 const original=trackSource(key);
 if(!original)throw Error('未知的劇情段落：'+key);
 if(!values||typeof values!=='object'||Array.isArray(values)||!TIME.test(values.at))throw Error('劇情時間必須是 HH:MM');
 if(!Array.isArray(values.lines)||values.lines.length!==original.lines.length)throw Error('不得修改既有劇情的消息數量與順序');
 for(let i=0;i<values.lines.length;i++){
  const line=values.lines[i];
  if(!line||typeof line!=='object'||Array.isArray(line)||line.who!==original.lines[i].who||typeof line.text!=='string'||!line.text.trim()||line.text.length>3000)
   throw Error(`第 ${i+1} 條的發言人或正文格式不正確`);
 }
 return {at:values.at,lines:values.lines.map(x=>({who:x.who,text:x.text}))};
}
export function trackEditReason(s,scene){
 if(!s.story55||s.story55.version!==1)return '只有 55 天劇情周目可以編輯此來源';
 const prefix=`d${String(scene.day).padStart(2,'0')}`,q=s.story55.authoredDays?.[prefix]?.[scene.id];
 if(q&&(q.started||q.historySettled||q.completed||q.index>0||q.lateRun||q.unansweredSent))return '這段劇情已開始播放，不能覆蓋既有劇情進度';
 const idPrefix=prefix+'-'+scene.id+'-',lifecycleId=prefix+':'+scene.id;
 for(const c of s.content?.conversations?.wechat||[]){
  if((c.messages||[]).some(m=>m.lifecycleId===lifecycleId||String(m.id||'').startsWith(idPrefix)))
   return '這段劇情已有發送記錄，請保留原玩家消息';
 }
 return '';
}
export function saveTrackValues(s,key,raw){
 const scene=trackSource(key);
 if(!scene)throw Error('找不到此劇情來源');
 const reason=trackEditReason(s,scene);
 if(reason)throw Error(reason);
 const values=validateTrackValues(key,raw);
 s.story55.chatSceneEdits??={};
 // An exact return to the original text removes the override.
 if(JSON.stringify(values)===JSON.stringify({at:scene.at,lines:scene.lines}))
  delete s.story55.chatSceneEdits[key];
 else s.story55.chatSceneEdits[key]=values;
}
