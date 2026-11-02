// Allowlisted DeepSeek chat models for NoApp, MIRAGE, and Chess.
// Thinking must be disabled explicitly: the DeepSeek API defaults to thinking enabled.
// temperature is meaningful for v4-pro only when thinking is disabled.
export const DEFAULT_DEEPSEEK_MODEL='deepseek-flash';
export const DEEPSEEK_MODELS=Object.freeze([
 {id:'deepseek-flash',label:'DeepSeek Flash · 非思考（原版）'},
 {id:'deepseek-v4-pro',label:'DeepSeek V4 Pro · 非思考'}
]);
export function normalizeDeepSeekModel(value){
 return DEEPSEEK_MODELS.some(m=>m.id===value)?value:DEFAULT_DEEPSEEK_MODEL;
}
export function normalizeAiParameters(input={}){
 const n=(k,min,max,def)=>{const v=input[k];return v!=null&&v!==''&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):def;};
 return {temperature:n('temperature',0,2,1.3),topP:n('topP',.01,1,1),maxTokens:Math.round(n('maxTokens',128,32768,4096))};
}
export function deepseekModelOptions(model,parameters){
 const selected=normalizeDeepSeekModel(model);
 return {
  model:selected,
  thinking:{type:'disabled'},
  ...(parameters?{temperature:normalizeAiParameters(parameters).temperature,...(selected==='deepseek-v4-pro'?{top_p:normalizeAiParameters(parameters).topP}:{})}:selected==='deepseek-v4-pro'?{temperature:1.3}:{})
 };
}
