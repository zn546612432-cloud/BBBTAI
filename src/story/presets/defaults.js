// The runtime state holds mutable rule copies. Authored defaults are loaded from
// separate per-day JSON packs, never embedded in this module.
export function starterPresetState(){
 return {
  rules:[],usedIds:[],usedGroups:[],firedProactiveDays:[],flags:[],deletedRuleIds:[],
 };
}

export function blankPreset({day=57,channel='wechat',conversationId='wang',kind='reply'}={}){
 return {id:`rule-${crypto.randomUUID()}`,title:kind==='reply'?'新的预设回复':'新的主动消息',kind,mode:kind==='proactive'?'scheduled':'',day,channel,conversationId,from:'08:00',to:'23:59',priority:50,enabled:true,once:true,condition:'any',keywords:[],minMessages:0,requiresFlag:'',setsFlag:'',group:'',messages:['']};
}
