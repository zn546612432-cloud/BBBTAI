// Allowlisted DeepSeek chat models for NoApp, MIRAGE, and Chess.
// Thinking must be disabled explicitly: the DeepSeek API defaults to thinking enabled.
// temperature is meaningful for v4-pro only when thinking is disabled.
export const DEFAULT_DEEPSEEK_MODEL='deepseek-flash';
export const DEEPSEEK_MODELS=Object.freeze([
 {id:'deepseek-flash',label:'DeepSeek Flash · 非思考（原版）'},
 {id:'deepseek-v4-pro',label:'DeepSeek V4 Pro · 非思考 · 温度 1.3'}
]);
export function normalizeDeepSeekModel(value){
 return DEEPSEEK_MODELS.some(m=>m.id===value)?value:DEFAULT_DEEPSEEK_MODEL;
}
export function deepseekModelOptions(model){
 const selected=normalizeDeepSeekModel(model);
 return {
  model:selected,
  thinking:{type:'disabled'},
  ...(selected==='deepseek-v4-pro'?{temperature:1.3}:{})
 };
}
