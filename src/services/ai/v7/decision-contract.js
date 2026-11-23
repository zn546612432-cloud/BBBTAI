// v7 two-stage decision contract. Pure validation: never calls the phone or marks messages read.
export const ACTIONS=Object.freeze(['send_text','send_voice','start_call','read_no_reply','defer_reply','end_session']);
export const STRATEGIES=Object.freeze(['answer_directly','tease','ask_back','brief_pushback','challenge','share_life','comfort','serious','deflect','set_boundary','repair_misunderstanding']);
const allowedActions=new Set(ACTIONS),allowedStrategies=new Set(STRATEGIES);
const blocked=reason=>({ok:false,reason,plan:null});
export function decodeTaiDecision(raw,{sourceMessageId}={}){
 let item=raw;
 if(typeof raw==='string'){
  try{item=JSON.parse(raw.trim());}catch{return blocked('invalid_json');}
 }
 if(!item||typeof item!=='object'||Array.isArray(item))return blocked('invalid_object');
 if(item.schema_version!==1)return blocked('schema_version');
 if(!sourceMessageId||item.source_message_id!==sourceMessageId)return blocked('stale_source');
 if(!allowedActions.has(item.action))return blocked('invalid_action');
 if(!allowedStrategies.has(item.strategy))return blocked('invalid_strategy');
 if(!['low','medium','high'].includes(item.intensity))return blocked('invalid_intensity');
 if(typeof item.intent!=='string'||!item.intent.trim()||item.intent.length>200)return blocked('invalid_intent');
 const delay=Number(item.delay_seconds??0);
 if(!Number.isFinite(delay)||delay<0||delay>21600)return blocked('invalid_delay');
 if(item.action==='defer_reply'&&delay<30)return blocked('defer_requires_time');
 const keys=new Set(['schema_version','source_message_id','action','strategy','intensity','intent','delay_seconds']);
 if(Object.keys(item).some(k=>!keys.has(k)))return blocked('unexpected_fields');
 return {ok:true,reason:null,plan:{
  schema_version:1,source_message_id:sourceMessageId,action:item.action,
  strategy:item.strategy,intensity:item.intensity,intent:item.intent.trim(),delay_seconds:delay
 }};
}
export function authorizeTaiDecision(parsed,{
 channel,recognized=false,storyLocked=false,phoneBusy=false,
 voiceAvailable=false,callAvailable=false,appRunning=true,
 userForbidsCall=false,callCooldownActive=false,canMarkRead=false
}={}){
 if(!parsed?.ok||!parsed.plan)return blocked(parsed?.reason||'malformed_plan');
 const {action}=parsed.plan;
 if(storyLocked)return blocked('story_locked');
 if(!['noapp','mirage','chess'].includes(channel))return blocked('unknown_channel');
 if(channel!=='mirage'&&!recognized)return blocked('unrecognized_stage');
 if(action==='send_voice'&&(channel!=='noapp'||!recognized||!voiceAvailable))return blocked('voice_not_available');
 if(action==='start_call'&&(channel!=='noapp'||!recognized||!callAvailable||phoneBusy||!appRunning||userForbidsCall||callCooldownActive))return blocked('call_not_allowed');
 // The executor must write a real read receipt before the UI shows '已读'.
 if(action==='read_no_reply'&&!canMarkRead)return blocked('read_receipt_unavailable');
 return parsed;
}
