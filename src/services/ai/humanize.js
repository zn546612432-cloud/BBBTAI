// 活人感：口语规则、话题闸门、输出清理。只处理"怎么说"，不改剧情与人物事实。
// 语气参考来自作者提供的通话/聊天样稿：只学节奏和用词，禁止照抄原句。

const HOBBY_TOPICS=[
 {key:'莎士比亚',re:/莎士比亚|麦克白|哈姆雷特|奥赛罗|李尔王|罗密欧|戏剧|台词|女巫/},
 {key:'国际象棋',re:/象棋|下棋|棋局|棋盘|将军|开局|残局|来一盘|对弈/},
 {key:'代码和技术',re:/代码|编程|程序|bug|写个|服务器|算法|模型|漏洞|加密|架构|部署|论文|研究/i}
];
const textOf=m=>String(m?.content??m?.text??'');
// The player's recent messages are evidence, not a veto on the character's life.
// Tai may raise a topic of his own, while continuity limits invented shared events.
export function taiTopicGate(messages=[],scene=''){
 const recent=(Array.isArray(messages)?messages:[]).filter(m=>m?.role==='user'||m?.from==='me')
  .filter(m=>!/^\s*\[(?:游戏系统事件|电话系统事件|系统记录|语音消息)/.test(textOf(m)))
  .slice(-4).map(textOf).join('\n');
 const open=HOBBY_TOPICS.filter(t=>t.re.test(recent)).map(t=>t.key);
 return '话题自主性：熙泰不是客服，也不需要等熙蒙点名兴趣才准说自己的事。'+
  (open.length?'熙蒙最近提过'+open.join('、')+'，可以顺着这件事，但不必死守。':'')+
  '可以因为健身后的疲惫、突然想到的琐事、课程、时装、美食、旅行、电影、个人判断而改聊自己的近况；不得胡编已发生的共同回忆。';
}
export const TAI_HUMAN_SPEECH=["【熙泰本人语气｜作者新人设v5】", "聪明、自负、带刺、好胜、掌控欲强，渴望亲情却不肯低头；不把他写成客服、心理咨询师或无条件宽慰的恋人。傲慢通过具体判断和逻辑展开，而非空泛宣示权力。", "使用语法完整的连贯长句和复合句，禁止网络用语、缩字、碎片以及三个字以内的独立短句；语气词只能嵌入完整句子。需要结束话题也把理由或态度完整说清，不用单字应付。", "葡萄牙成长背景和英语教育可影响措辞，但外语不设配额、不独立替代完整表达。所有范例只供作者理解生成逻辑，不照抄、不套比喻。", "关心通常被包装成投资、效率或不愿浪费天赋；不每轮强调投资，不用霸总模板，不替熙蒙决定，不虚构他已经接受安排。", "说清本轮想表达的事情，不能故意只丢碎片等对方追问。条数不设最低数量，不强制补第二条；完整回应可以在一个气泡内展开，多条各有实际内容，不按标点拆句。", "多话题连发先整体理解，不能只接最后一句。可以主动分享健身、学习、旅行、展览、酒店、饮食或自己的判断，生活连续，不把所有事情都比作代码。", "只用真实已分享内容推断，不替对方脑补环境、动作、心理、遭遇或未发草稿。知道亲缘不等于可以提前揭露，也不等于知道未来。", "文字、语音、电话均只有本人台词，禁止任何场景、动作、神态与心理旁白，禁止表演标签、Sound Tags与停顿控制码；内部自检不输出。"].join('\n');
export const TAI_STYLE_EXAMPLES='【示范不直接下发模型】语气示例只供作者审阅，不允许当作候选台词复用。';
export function taiHumanPrompt({messages=[],scene='',outputMode='text'}={}){
 return [TAI_HUMAN_SPEECH,taiTopicGate(messages,scene),
  outputMode==='voice'||outputMode==='call'
   ?'语音和电话：完整长句随内容自然停顿，情绪只能通过可说出口的台词表达，发声层处理声音变化，不写舞台说明。'
   :'文字聊天：只发纯台词，使用完整长句，情绪来自措辞、标点和段落，不发动作或声音标签。'
 ].join('\n');
}

// 输出清理：模型偶尔仍会写破折号或舞台动作，这里兜底。
export function humanizeTaiText(value,{stripStage=true}={}){
 let t=String(value??'');
 t=t.replace(/\s*[—–－]{1,}\s*/g,'，').replace(/，{2,}/g,'，').replace(/，\s*([。！？!?，])/g,'$1');
 if(stripStage)t=t.replace(/[（(][^()（）\n]{0,24}[)）]/g,m=>/^\((?:laughs|chuckle|coughs|clear-throat|groans|breath|pant|inhale|exhale|gasps|sniffs|sighs|snorts|burps|lip-smacking|humming|hissing|emm|sneezes)\)$/i.test(m)?m:'')
   .replace(/\*[^*\n]{1,20}\*/g,'');
 return t.replace(/[ \t]{2,}/g,' ').replace(/^[，。\s]+/,'').trim();
}

// 通话记录接回文字聊天：交给模型的一条系统式说明。
export function isRecentTaiCall(entry,current={}){
 const minutes=value=>{
  if(!Number.isInteger(value?.day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time||value.clock||''))return NaN;
  const [h,m]=(value.time||value.clock).split(':').map(Number);
  return value.day*1440+h*60+m;
 };
 const age=minutes(current)-minutes(entry);
 return Number.isFinite(age)&&age>=0&&age<=15;
}
export function callBridgeNote(entry,current={}){
 if(typeof entry?.transcript!=='string'||!entry.transcript.trim())return '';
 const recent=isRecentTaiCall(entry,current);
 const when=recent?'刚结束一通语音电话':`曾在 D${entry.day??'?'} ${entry.time||'时间未记录'} 进行的一通语音电话`;
 return '[系统记录：'+when+'（'+(entry.text||'语音通话')+'）。通话内容：\n'+entry.transcript.slice(0,900)+
  (recent?'\n这是已发生的通话；话题尚未结束时自然承接，对方换话题后不必强行拉回。]':'\n这是较早的真实记忆，不是刚发生的电话；仅在当前话题相关时引用。]');
}
