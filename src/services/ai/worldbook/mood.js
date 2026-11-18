export const XITAI_MOODS=['calm','interested','amused','affectionate','tired','irritated','hurt','concerned','guarded','regretful'];
export function normalizeTaiMood(data){
 if(!XITAI_MOODS.includes(data?.mood_after)||typeof data.mood_reason!=='string'||!data.mood_reason.trim())return null;
 return {mood:data.mood_after,reason:data.mood_reason.trim().slice(0,180)};
}
export function rememberTaiMood(store,decision,sourceId){
 const mood=decision?.mood_after;if(!mood||!XITAI_MOODS.includes(mood)||!decision.mood_reason)return false;
 if(store.get().aiDraft?.xitaiMood?.sourceId===sourceId)return false;
 store.update(s=>{s.aiDraft??={};s.aiDraft.xitaiMood={mood,reason:decision.mood_reason.slice(0,180),sourceId,day:s.day,clock:s.clock};});return true;
}
export function taiMoodPrompt(value){return value&&XITAI_MOODS.includes(value.mood)?'【熙泰自己的近期情緒（主觀，不是對方動機的證據）】'+value.mood+'；原因：'+String(value.reason||'').slice(0,180)+'。沒有新原因不需要重置心情；不直接把這些內部標籤念出來。':'';}
