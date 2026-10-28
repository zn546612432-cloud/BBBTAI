import {validDate} from '../../../services/calendar.js';

export const DAY_FORMAT='ximeng-preset-day-v1';
export const BUNDLE_FORMAT='ximeng-preset-bundle-v1';
const CHANNELS=new Set(['wechat','noapp','mirage','messages']);
const CONDITIONS=new Set(['any','keywords-any','keywords-all','message-count']);
const TIME=/^([01]\d|2[0-3]):[0-5]\d$/;
const ID=/^[a-zA-Z0-9_:\-.]{1,100}$/;
const fail=(message)=>{throw new Error('剧情文件格式错误：'+message);};
const str=(value,max=120)=>typeof value==='string'&&value.length<=max;
const label=(value)=>typeof value==='string'&&value.trim().length>0&&value.length<=180;
const int=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
const unique=(seen,id,kind)=>{if(seen.has(id))fail(`${kind}编号重复：${id}`);seen.add(id);};

export function validatePresetPack(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.format!==DAY_FORMAT)fail(`文件格式必须是 ${DAY_FORMAT}`);
 if(!int(raw.day,1,90)||!CHANNELS.has(raw.channel))fail('游戏日或聊天软件无效');
 if(!Array.isArray(raw.rules)||raw.rules.length>500||!Array.isArray(raw.history||[])||(raw.history||[]).length>200)fail('规则或历史消息数量无效');
 const ruleIds=new Set(),historyIds=new Set();
 for(const r of raw.rules){
  if(!r||!ID.test(r.id||'')||!label(r.title)||!['reply','proactive'].includes(r.kind))fail('规则编号、标题或类型无效');
  unique(ruleIds,r.id,'规则');
  if(r.day!==raw.day||r.channel!==raw.channel||!label(r.conversationId))fail(`${r.id} 所属日期或聊天窗口与文件不一致`);
  if(!TIME.test(r.from||'')||!TIME.test(r.to||'')||r.from>r.to)fail(`${r.id} 时间范围无效`);
  if(r.kind==='proactive'&&!['scheduled','conditional'].includes(r.mode))fail(`${r.id} 主动发送模式无效`);
  if(!CONDITIONS.has(r.condition)||!int(r.minMessages,0,100)||!int(r.priority,0,999))fail(`${r.id} 触发条件或优先级无效`);
  if(typeof r.once!=='boolean'||typeof r.enabled!=='boolean')fail(`${r.id} 一次性与启用状态无效`);
  if(!['requiresFlag','setsFlag','group'].every(k=>str(r[k],100)))fail(`${r.id} 剧情标记无效`);
  if(!Array.isArray(r.keywords)||r.keywords.length>30||r.keywords.some(x=>!str(x,80)))fail(`${r.id} 关键词无效`);
  if(!Array.isArray(r.messages)||r.messages.length<1||r.messages.length>30||r.messages.some(x=>!str(x,1200)||!x.trim()))fail(`${r.id} 回复内容无效`);
 }
 for(const h of raw.history||[]){
  if(!h||!label(h.conversationId)||h.conversationName!==undefined&&!label(h.conversationName)||!Array.isArray(h.messages)||h.messages.length>1000)fail('聊天记录窗口无效');
  for(const m of h.messages){
   if(!m||!ID.test(m.id||'')||!label(m.from)||!str(m.text,3000)||!m.text.trim()||!TIME.test(m.time||''))fail('历史消息格式无效');
   unique(historyIds,`${raw.channel}:${h.conversationId}:${m.id}`,'历史消息');
   if(m.sentDate!==undefined&&!validDate(m.sentDate))fail(`${m.id} 历史消息日期无效`);
   if(m.appearance!==undefined&&!['immediate','game-time'].includes(m.appearance))fail(`${m.id} 出现方式无效`);
  }
 }
 return structuredClone({...raw,history:raw.history||[]});
}

export function parsePresetPayload(raw){
 let value=raw;
 if(typeof raw==='string'){try{value=JSON.parse(raw);}catch{fail('不是有效的 JSON 文件');}}
 const packs=value?.format===DAY_FORMAT?[value]:value?.format===BUNDLE_FORMAT?value.packs:Array.isArray(value)?value:null;
 if(!Array.isArray(packs)||!packs.length||packs.length>360)fail('请选择单日预设文件或剧情合集');
 const result=packs.map(validatePresetPack),seen=new Set();
 for(const pack of result)for(const rule of pack.rules)unique(seen,rule.id,'整个导入包内的规则');
 return result;
}
