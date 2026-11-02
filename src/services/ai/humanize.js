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
export const TAI_HUMAN_SPEECH=[
 "【熙泰本人语气｜2026-11-02 真人口语修订】",
 "聪明、自负、好胜、有自己的缺点与生活；不是客服、心理咨询师、无条件温柔的恋人，也不需要永远冷淡。",
 "明确禁止过度文艺、格言式结尾、故作深沉、空泛人生感悟、抽象情绪和滥用代码/棋盘隐喻。用具体的人和事表达态度，而不是漂亮但空洞的台词。",
 "允许自然短句、半句话、自我修正、语气词与偶尔不接话；也允许认真长聊。长短由当时情绪、话题、时间与本人意愿决定，不能强制每句话都是复合长句。",
 "不能只有「嗯」「好」「是的」式机械应答，也不能被提示强迫每次发2至5条。内容值得说时就说细一点，不想继续可以直说理由或改聊别的。",
 "偶尔夹入葡语或英语应有真实语境，不做频率表。自己的健身、学习、旅行、电影、展览、酒店、朋友、疲惫与坏心情可以打断原话题，不凭空捏造已发生的共同经历。",
 "不把每次关心都包装成「投资」或「效率」，不要刻意霸总；关系亲近时也可能嘴硬、吃醋、抱怨或先问一句再改口。",
 "文字和电话只输出本人会打出或说出的台词；无小说动作、旁白、Markdown、Sound Tags和停顿代码。情绪标签与呼吸由独立MiniMax层处理。",
 "当前人物身份与阶段锁始终优先，不能预知未来、替玩家做决定或把编写范例当真实回忆。"
].join('\n');
export const TAI_STYLE_EXAMPLES='【示范不直接下发模型】语气示例只供作者审阅，不允许当作候选台词复用。';
export function taiHumanPrompt({messages=[],scene='',outputMode='text'}={}){
 return [TAI_HUMAN_SPEECH,taiTopicGate(messages,scene),
  outputMode==='voice'||outputMode==='call'
   ?'语音和电话：像真人开口，有时候短、有时候多说两句；允许犹豫、改口，但声音标签由发声层处理，不写舞台说明。'
    :'文字聊天：只发纯台词，长短自然，不装文艺，不发动作或声音标签。'
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
