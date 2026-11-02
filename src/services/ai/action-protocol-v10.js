// V10 two-stage protocol. This file decides WHAT may happen; it never performs UI effects.
// Author's fixed scripted events take precedence over every AI decision.
export const TAI_TEXT_ACTIONS=Object.freeze(['send_text','send_voice','start_call','read_no_reply','defer_reply','end_session']);
export const TAI_CALL_ACTIONS=Object.freeze(['speak','hang_up','listen']);
export const TAI_STRATEGIES=Object.freeze(['answer_directly','tease','ask_back','brief_pushback','challenge','comfort','serious','deflect','set_boundary','repair_misunderstanding']);
export const TAI_EMOTIONS=Object.freeze(['neutral','dry','playful','soft','serious','danger','happy','sad','angry','fearful','surprised','disgusted']);
export const TAI_VOCAL_CUES=Object.freeze(['none','small_laugh','sigh','hesitate','tired','whisper']);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const oneOf=(value,allowed,fallback)=>allowed.includes(value)?value:fallback;
const clamp=(n,min,max,fallback)=>Number.isFinite(Number(n))?Math.min(max,Math.max(min,Math.round(Number(n)))):fallback;
function unwrap(input){
 let data=input;
 if(data&&typeof data==='object'&&typeof data.text==='string')data=data.text;
 if(typeof data==='string'){
  try{data=JSON.parse(data.replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,'').trim());}
  catch{return null;}
 }
 return data&&typeof data==='object'&&!Array.isArray(data)?data:null;
}
export function validateTaiAction(input,{mode='text',channel='noapp',recognized=false,sourceMessageId='',allowCall=true,allowVoice=true,allowDefer=true,hasIncoming=true,playerDeclinedCall=false,callConnected=false}={}){
 const data=unwrap(input),actions=mode==='call'?TAI_CALL_ACTIONS:TAI_TEXT_ACTIONS;
 if(!data||data.schema_version!==10||typeof data.action!=='string'||!actions.includes(data.action))return {ok:false,reason:'invalid_schema_or_action',decision:null};
 if(data.source_message_id!==undefined&&String(data.source_message_id)!==String(sourceMessageId))return {ok:false,reason:'stale_source',decision:null};
 let action=data.action,reason='';
 if(mode==='call'&&!callConnected)return {ok:false,reason:'no_active_call',decision:null};
 if(mode==='call'&&action==='listen'&&hasIncoming)return {ok:false,reason:'cannot_ignore_live_player_turn',decision:null};
 if(mode!=='call'){
  if(['send_voice','start_call'].includes(action)&&(channel!=='noapp'||!recognized)){
   action='send_text';reason='locked_channel';
  }
  if(action==='send_voice'&&!allowVoice){action='send_text';reason='voice_not_available';}
  if(action==='start_call'&&(!allowCall||playerDeclinedCall)){action='send_text';reason='call_not_allowed';}
  if(['read_no_reply','defer_reply'].includes(action)&&!hasIncoming){
   action='end_session';reason='no_incoming_message';
  }
  if(action==='defer_reply'&&!allowDefer){action='send_text';reason='defer_already_used';}
 }
 const decision={
  schema_version:10,
  source_message_id:String(sourceMessageId),
  action,
  strategy:oneOf(data.strategy,TAI_STRATEGIES,'answer_directly'),
  intensity:oneOf(data.intensity,['low','medium','high'],'low'),
  tone:oneOf(data.tone,TAI_EMOTIONS,'neutral'),
  vocal_cue:oneOf(data.vocal_cue,TAI_VOCAL_CUES,'none'),
  intent:String(typeof data.intent==='string'?data.intent:'').slice(0,180),
  delay_seconds:action==='defer_reply'?clamp(data.delay_seconds,30,3600,90):0
 };
 return {ok:true,reason,decision};
}
export function taiActionDecisionPrompt({mode='text',channel='noapp',day=1,recognized=false,sourceMessageId='',scene='',relationshipContext='',hasIncoming=true,allowDefer=true}={}){
 const actions=mode==='call'?TAI_CALL_ACTIONS:TAI_TEXT_ACTIONS;
 return [
  '你是互动叙事《熙蒙的手机》中陈熙泰的【行为决策层】，现在只决定是否行动。不要生成对白，不要输出思考过程，只输出一个JSON对象。',
  '陈熙旺是大哥，熙蒙是二哥，熙泰是弟弟。他聪明傲慢、自律而有私生活，但对熙蒙的好奇心远大于展示自己；从不主动报备健身、旅行、讲座或具体行程。棋局只有剧情事件能发起；不要自行邀请下棋，不持续追问棋局。',
  '角色可能拒绝、已读而不回、暂缓、主动联系、打电话或挂断；每轮只有一个主动作，不为了展示能力轮流执行动作。既不永远秒回，也不能为了戏剧效果随机消失。',
  '特别注意：能拒绝、能已读不回，不意味着默认冷淡。熙蒙认真发问、分享喜怒、连续追问你自己的经历或展示技术成果时，若没有具体的忙碌、冲突或边界理由，优先继续实际交流；别用 read_no_reply、end_session 或 defer_reply 逃避对方的正常谈话。你喜欢捉弄哥哥、好奇他，也会在兴致好时主动聊个痛快；不是专门吊人胃口的冷脸客服。',
  '固定剧情、关机、相认锁、在线状态和已知事实由程序控制。不能提前说出真实身份、未来剧情或偷窥未授权资料。所有执行由程序验证。',
  mode==='call'?'电话正在进行。speak=继续说话，hang_up=决定结束真实电话（可在挂断前生成一句告别），listen=本轮暂时安静等待；不要以文字假装已经挂断。':
   '文字交流：send_text=发文字，send_voice=在已解锁NoApp中发语音条，start_call=真正发起来电（不是语音条），read_no_reply=确实阅读但保持沉默，defer_reply=暂不读取并延迟处理，end_session=结束本轮话题（不假装离线）。',
  '本轮允许动作：'+actions.join(', ')+'。输出的action必须来自此列。',
  '表述策略 strategy 仅可选：'+TAI_STRATEGIES.join(', ')+ '。情绪 tone 仅可选：'+TAI_EMOTIONS.join(', ')+ '。声线提示 vocal_cue 可选：'+TAI_VOCAL_CUES.join(', ')+'。情绪与声线提示是结构化元数据，不得变更 MiniMax 固定音色、calm声线、音高与语速，也不写进聊天内容。',
  'intensity: low/medium/high；intent: 180字以内简短内容方向，不是台词、详细推理或隐私；仅 defer_reply 可给 delay_seconds（30到3600秒）。',
  '输入来源：'+(hasIncoming?'熙蒙最近真实发送了消息。':'程序邀请你考虑是否主动联系；没有熙蒙的新消息。'),
  '当前 D'+day+'，频道 '+channel+'，'+(recognized?'剧情已确认相认':'未公开亲缘身份')+'。'+(allowDefer?'可考虑一次真实的延期。':'这次是到期重试，不得重复延期。'),
  relationshipContext?'真实且已授权的关系上下文：'+String(relationshipContext).slice(0,3600):'',
  scene?'当前系统事件（不是熙蒙台词）：'+String(scene).slice(0,1200):'',
  'JSON结构严格为 {"schema_version":10,"source_message_id":'+JSON.stringify(String(sourceMessageId))+',"action":"send_text","strategy":"answer_directly","intensity":"low","tone":"neutral","vocal_cue":"none","intent":"简短内容方向","delay_seconds":0}。只改字段值，禁止额外解释。'
 ].filter(Boolean).join('\n\n');
}
export function taiActionExpressionPrompt(decision,{mode='text'}={}){
 if(!decision)return '';
 return '【v10已批准行为；不可自行更换动作】action='+decision.action+'；strategy='+decision.strategy+'；intensity='+decision.intensity+'；tone='+decision.tone+'；vocal_cue='+decision.vocal_cue+'；内容方向='+decision.intent+'。'+
 (mode==='call'?'当前通话只能说台词，结束和挂断由程序执行。':'只生成该动作所需的实际台词。不要输出 (phone)、(voice)、(read) 或 JSON 动作标签；真实动作已由程序管理。')+
 '每条messages可单独标注 tone；情绪标签不写入文字，不让 MiniMax 朗读。';
}
