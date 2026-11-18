import {TAI_WORLDBOOK} from './entries.js';

// A bounded, deterministic selector for the supported World Info concepts:
// constant, keywords, priority, recent-message persistence and event activation.
// Sticky here is measured in genuine player messages, not wall-clock time.
export const TAI_WORLDBOOK_BUDGET = 1800;
const systemMarker=/^\s*\[(?:游戏系统事件|遊戲系統事件|电话系统事件|電話系統事件|系统记录|系統記錄|系统可信通话回执|系統可信通話回執|语音消息|語音消息)/;
const genuinePlayerText=messages=>(Array.isArray(messages)?messages:[])
 .filter(m=>m?.role==='user'&&!systemMarker.test(String(m.content||'')))
 .map(m=>String(m.content||'').normalize('NFKC').toLowerCase()).slice(-6);

export function selectTaiWorldbook({messages=[],channel='noapp',recognized=false,outputMode='text',worldbookEvents=[],phase='expression',budget=TAI_WORLDBOOK_BUDGET,entries=TAI_WORLDBOOK}={}){
 const recent=genuinePlayerText(messages),events=new Set(Array.isArray(worldbookEvents)?worldbookEvents:[]);
 if(channel==='noapp'&&outputMode==='call')events.add('call_connected');
 const applicable=entries.filter(entry=>{
  if(entry.channels&&!entry.channels.includes(channel)||entry.recognized&&recognized!==true||entry.phase&&entry.phase!==phase)return false;
  if(entry.constant)return true;
  if(entry.events?.some(event=>events.has(event)))return true;
  const window=Math.min(6,Math.max(1,entry.sticky||1));
  return !!entry.key?.some(key=>recent.slice(-window).some(text=>text.includes(key.normalize('NFKC').toLowerCase())));
 }).sort((a,b)=>Number(!!b.constant)-Number(!!a.constant)||b.order-a.order||a.id.localeCompare(b.id));
 const selected=[],omitted=[];let used=0;
 // Core entries are never dropped. Optional entries cannot exceed the budget.
 for(const entry of applicable){
  const cost=entry.content.length+1;
  if(!entry.constant&&used+cost>budget){omitted.push(entry.id);continue;}
  selected.push(entry);used+=cost;
 }
 return {entries:selected,omitted,used};
}

export function taiWorldbookPrompt(context={}){
 const result=selectTaiWorldbook(context);
 return result.entries.length?'【当前生效的世界书｜仅供当前角色判断，不是聊天记录】\n'+result.entries.map(entry=>entry.content).join('\n'):'';
}
