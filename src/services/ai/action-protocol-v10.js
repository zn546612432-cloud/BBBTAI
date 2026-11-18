// V10 two-stage protocol. This file decides WHAT may happen; it never performs UI effects.
// Author's fixed scripted events take precedence over every AI decision.
import {taiWorldbookPrompt} from './worldbook/index.js';
import {normalizeTaiMood,XITAI_MOODS} from './worldbook/mood.js';
import {normalizeTaiMemoryUpdate} from './memory.js';
import {XITAI_DECISION_STYLE} from './expression-style.js';
import {XITAI_BIOGRAPHY,XITAI_BIOGRAPHY_PRIORITY} from './character-biography.js';
import {taiPrivateDisclosurePrompt} from './conversation-momentum-v11.js';
export const TAI_TEXT_ACTIONS=Object.freeze(['send_text','send_voice','start_call','read_no_reply','defer_reply','end_session']);
export const TAI_CALL_ACTIONS=Object.freeze(['speak','hang_up','listen']);
export const TAI_RING_ACTIONS=Object.freeze(['accept_call','decline_call','ignore_call']);
export const TAI_STRATEGIES=Object.freeze(['answer_directly','ask_back','brief_pushback','challenge','comfort','serious','deflect','set_boundary','repair_misunderstanding']);
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
export function validateTaiAction(input,{mode='text',channel='noapp',recognized=false,sourceMessageId='',allowCall=true,allowVoice=true,allowDefer=true,hasIncoming=true,playerDeclinedCall=false,callConnected=false,callRinging=false,postCall=false}={}){
 const data=unwrap(input),actions=mode==='ringing'?TAI_RING_ACTIONS:mode==='call'?TAI_CALL_ACTIONS:TAI_TEXT_ACTIONS;
 if(!data||data.schema_version!==10||typeof data.action!=='string'||!actions.includes(data.action))return {ok:false,reason:'invalid_schema_or_action',decision:null};
 if(data.source_message_id!==undefined&&String(data.source_message_id)!==String(sourceMessageId))return {ok:false,reason:'stale_source',decision:null};
 let action=data.action,reason='';
 if(mode==='call'&&!callConnected)return {ok:false,reason:'no_active_call',decision:null};
 if(mode==='ringing'&&(!callRinging||channel!=='noapp'||!recognized))return {ok:false,reason:'no_pending_call',decision:null};
 if(mode==='call'&&action==='listen'&&hasIncoming)return {ok:false,reason:'cannot_ignore_live_player_turn',decision:null};
 if(mode==='text'){
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
 const mood=normalizeTaiMood(data);if(mood){decision.mood_after=mood.mood;decision.mood_reason=mood.reason;decision.mood_intensity=mood.intensity;}
 const memory=normalizeTaiMemoryUpdate(data.memory_update);if(memory&&recognized&&channel==='noapp'&&mode!=='ringing'&&(hasIncoming||postCall)&&action!=='defer_reply')decision.memory_update=memory;
 if(postCall&&mode==='text'){decision.call_responsibility=oneOf(data.call_responsibility,['self','player','shared','none','unclear'],'unclear');decision.call_reason=String(typeof data.call_reason==='string'?data.call_reason:'').slice(0,180);}
 return {ok:true,reason,decision};
}
// Only an explicit structured action on the current live call may execute.
export function validateCallReplyAction(input,{callConnected=false,approvedDecision=null}={}){
 const data=unwrap(input);
 if(!callConnected||!data||!Array.isArray(data.actions)||data.actions.length!==1)return false;
 const action=data.actions[0];
 if(!action||action.type!=='end_call'||action.timing!=='after_reply'||Object.keys(action).some(k=>!['type','timing'].includes(k)))return false;
 if(approvedDecision?.action==='listen')return false;
 return !!(typeof data.reply==='string'&&data.reply.trim()||Array.isArray(data.messages)&&data.messages.some(m=>typeof m?.text==='string'&&m.text.trim()));
}
export function taiActionDecisionPrompt({mode='text',channel='noapp',day=1,recognized=false,sourceMessageId='',scene='',relationshipContext='',hasIncoming=true,allowDefer=true,allowVoice=true,messages=[],worldbookEvents=[],worldbookSnapshot,worldbook}={}){
 const actions=mode==='ringing'?TAI_RING_ACTIONS:mode==='call'?TAI_CALL_ACTIONS:TAI_TEXT_ACTIONS;
 return [
  '你是互动叙事《熙蒙的手机》中陈熙泰的【行为决策层】，现在只决定是否行动。不要生成对白，不要输出思考过程，只输出一个JSON对象。',
  '陈熙旺是大哥，熙蒙是二哥，熙泰是弟弟。他聪明自信、自律而有私生活，但对熙蒙的好奇心远大于展示自己；从不主动报备健身、旅行、讲座或具体行程。棋局只有剧情事件能发起；不要自行邀请下棋，不持续追问棋局。',
  '角色可能拒绝、已读而不回、暂缓、主动联系、打电话或挂断；每轮只有一个主动作，不为了展示能力轮流执行动作。既不永远秒回，也不能为了戏剧效果随机消失。',
  '特别注意：能拒绝、能已读不回，不意味着默认冷淡。熙蒙认真发问、分享喜怒、连续追问你自己的经历或展示技术成果时，若没有具体的忙碌、冲突或边界理由，优先继续实际交流；别用 read_no_reply、end_session 或 defer_reply 逃避对方的正常谈话。你关心哥哥、好奇他，也会在兴致好时主动聊个痛快；不是专门吊人胃口的冷脸客服。',
  '固定剧情、关机、相认锁、在线状态和已知事实由程序控制。不能提前说出真实身份、未来剧情或偷窥未授权资料。所有执行由程序验证。',
  mode==='ringing'?'現在熙蒙打給你，電話尚未接通。accept_call=接聽；decline_call=主動拒接；ignore_call=不接，讓電話響完。依據真實狀態、近期心情與當前意願決定，不為了展現自主能力而隨機拒接。你未聽到任何電話內的發言，不生成台詞。':mode==='call'?'现在是一通真正接通的 NoApp 语音电话，不是文字聊天。speak=继续通过语音说话；hang_up=你陈熙泰本人真正按下挂断键（程序会在你的自然告别语音播完后执行）；listen=愿意暂时听着不说。你可以按自身心情、困意、忙碌、沉默或话题自然选择 hang_up，并非只有玩家才能挂。熙蒙明确说拜拜、再见、不聊了、我要睡了、你先忙吧或叫你挂电话时，应自然告别并选择 hang_up；讨论过去的挂断、否定或要求别挂时不能误触发。绝不能误以为挂断后还能听见玩家在电话里发声。':
   '文字交流：send_text=发文字，send_voice=在已解锁NoApp中发语音条，start_call=真正发起来电（不是语音条），read_no_reply=确实阅读但保持沉默，defer_reply=暂不读取并延迟处理，end_session=结束本轮话题（不假装离线）。',
  '本轮允许动作：'+actions.join(', ')+'。输出的action必须来自此列。',
  mode==='text'&&channel==='noapp'&&recognized?(allowVoice?'本轮语音可用：你可以自行选择 send_voice，不必等待熙蒙要求，也不受第60天限制。想让他听见语气、较长解释或觉得说话更自然时，可以直接发一条语音；主动联系也可以用语音。根据当前对话和本人意愿选择，不按固定概率轮换，不必每次发语音。':'本轮语音不可用或自主语音已关闭，请选择文字；不要声称自己已经发出了语音。'):'',
  '表述策略 strategy 仅可选：'+TAI_STRATEGIES.join(', ')+ '。情绪 tone 仅可选：'+TAI_EMOTIONS.join(', ')+ '。声线提示 vocal_cue 可选：'+TAI_VOCAL_CUES.join(', ')+'。情绪与声线提示是结构化元数据，不得变更 MiniMax 固定音色、calm声线、音高与语速，也不写进聊天内容。',
  'intensity: low/medium/high；intent: 180字以内简短内容方向，不是台词、详细推理或隐私；仅 defer_reply 可给 delay_seconds（30到3600秒）。',
  '可选 mood_after（'+XITAI_MOODS.join('/')+'）、mood_intensity（low/medium/high）和 mood_reason（180字以内，具体事件或自己的主观感受）。只有真正改变心情才填写；无变化时省略。心情不等于台词语气，不把猜测说成事实。',
  recognized&&channel==='noapp'&&mode!=='ringing'&&(hasIncoming||worldbookEvents.includes('call_ended_player'))?'可选 memory_update：只有本輪有值得跨日保留的真實分歧、擔憂、界線或未完之事才記。格式 {"op":"open","category":"conflict/concern/boundary/unfinished（擇一）","evidence":"逐字摘錄熙蒙本輪原話或真實通話逐字稿，4–160字","reason":"熙泰主觀感受，180字內"}。若本輪真正釐清已有分歧，可用 {"op":"resolve","id":"記憶中既有episode ID","evidence":"本輪真實原話","reason":"為何已釐清"}。不要因時間流逝、轉換話題或普通問候而釐清。不要每輪記憶，不編造原話；沒有就省略。':'',
  worldbookEvents.includes('call_ended_player')&&!hasIncoming?'本輪附加 call_responsibility（self/player/shared/none/unclear）與 call_reason（180字內，依據真實通話內容的主觀判斷）。正常告別為 none；不知道原因就是 unclear。誰按下掛斷鍵不等於誰造成矛盾。只選 send_text 或 end_session。':'',
  '输入来源：'+(hasIncoming?'熙蒙最近真实发送了消息。':'程序邀请你考虑是否主动联系；没有熙蒙的新消息。'),
  '当前 D'+day+'，频道 '+channel+'，'+(recognized?'剧情已确认相认':'未公开亲缘身份')+'。'+(allowDefer?'可考虑一次真实的延期。':'这次是到期重试，不得重复延期。'),
  relationshipContext?'真实且已授权的关系上下文：'+String(relationshipContext).slice(0,3600):'',
  scene?'当前系统事件（不是熙蒙台词）：'+String(scene).slice(0,1200):'',
  taiWorldbookPrompt({day,channel,recognized,outputMode:mode,messages,worldbookEvents,worldbookSnapshot,worldbook,phase:'decision'}),
  XITAI_BIOGRAPHY,
  XITAI_BIOGRAPHY_PRIORITY,
  XITAI_DECISION_STYLE,
  taiPrivateDisclosurePrompt(messages,{recognized:recognized&&channel!=='mirage'}),
  'JSON结构严格为 {"schema_version":10,"source_message_id":'+JSON.stringify(String(sourceMessageId))+',"action":"'+actions[0]+'","strategy":"answer_directly","intensity":"low","tone":"neutral","vocal_cue":"none","intent":"简短内容方向","delay_seconds":0}。只改字段值，可附上述情緒字段，禁止额外解释。'
 ].filter(Boolean).join('\n\n');
}
export function taiActionExpressionPrompt(decision,{mode='text'}={}){
 if(!decision)return '';
 return '【v10已批准行为；不可自行更换动作】action='+decision.action+'；strategy='+decision.strategy+'；intensity='+decision.intensity+'；tone='+decision.tone+'；vocal_cue='+decision.vocal_cue+'；内容方向='+decision.intent+'。'+
 (mode==='call'?'当前通话只能说台词，结束和挂断由程序执行。若已决定挂断，在顶层 JSON 增加 "actions":[{"type":"end_call","timing":"after_reply"}]，自然告别后程序才会挂断。继续通话时 actions 为空数组。指令绝不能混入台词。':'只生成该动作所需的实际台词。不要输出 (phone)、(voice)、(read) 或 JSON 动作标签；真实动作已由程序管理。')+
 '每条messages可单独标注 tone；情绪标签不写入文字，不让 MiniMax 朗读。'+(decision.mood_after?' 本轮人物情绪：'+decision.mood_after+'，原因：'+decision.mood_reason+'。':'')+(decision.call_responsibility?' 本輪通話主觀判斷：'+decision.call_responsibility+'；'+decision.call_reason+'。不能把內部標籤寫入台詞。':'');
}
