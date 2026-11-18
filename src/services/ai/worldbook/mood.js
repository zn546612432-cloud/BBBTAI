import {taiRecognized} from '../../story55/state.js';
import {applyTaiMemoryUpdate} from '../memory.js';
export const XITAI_MOODS=['calm','interested','amused','affectionate','tired','irritated','hurt','concerned','guarded','regretful'];
const levels=['low','medium','high'];
// The existing phone day changes at 03:00, not at midnight. No second clock.
const stamp=(day,clock)=>{const [h,m]=String(clock||'03:00').split(':').map(Number);return (Number(day)-1)*1440+(h*60+m+1260)%1440;};
export function normalizeTaiMood(data){
 if(!XITAI_MOODS.includes(data?.mood_after)||typeof data.mood_reason!=='string'||!data.mood_reason.trim())return null;
 return {mood:data.mood_after,reason:data.mood_reason.trim().slice(0,180),intensity:levels.includes(data.mood_intensity)?data.mood_intensity:'medium'};
}
export function readTaiMood(s){
 const v=s?.aiDraft?.xitaiMood;if(!v||!XITAI_MOODS.includes(v.mood)||!taiRecognized(s)||v.day>s.day)return null;
 const age=Math.max(0,stamp(s.day,s.clock)-stamp(v.day,v.clock)),initial=Math.max(0,levels.indexOf(v.intensity||'medium')),step=Math.floor(age/240),index=initial-step;
 return {...v,intensity:index>=0?levels[index]:'settled',elapsedMinutes:age};
}
export function rememberTaiMood(store,decision,sourceId,{evidence=''}={}){
 if(!decision||!sourceId||decision.action==='defer_reply'||!taiRecognized(store.get()))return false;
 const mood=normalizeTaiMood(decision),existing=store.get().aiDraft?.taiReflectionSources||[];
 if(existing.includes(sourceId)||store.get().aiDraft?.xitaiMood?.sourceId===sourceId||!mood&&!decision.memory_update)return false;
 let changed=false;store.update(s=>{
  s.aiDraft??={};
  if(mood){s.aiDraft.xitaiMood={mood:mood.mood,reason:mood.reason,intensity:mood.intensity,sourceId,day:s.day,clock:s.clock};changed=true;}
  if(applyTaiMemoryUpdate(s,decision.memory_update,{sourceId,evidence}))changed=true;
  if(changed)s.aiDraft.taiReflectionSources=[...(s.aiDraft.taiReflectionSources||[]),sourceId].slice(-200);
 });return changed;
}
export function taiMoodPrompt(value){if(!value||!XITAI_MOODS.includes(value.mood))return '';return '【熙泰自己的近期情緒（主觀，不是對方動機的證據）】'+(value.intensity==='settled'?'曾經 '+value.mood+'，現已自然平復':value.mood+'／'+(value.intensity||'medium'))+'；原因：'+String(value.reason||'').slice(0,180)+'。情緒會隨時間淡化，沒有新原因不刻意延長，也不等於矛盾已解決；不直接把內部標籤念出來。';}
