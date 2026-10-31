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
  .filter(m=>!/^\\s*\\[(?:游戏系统事件|电话系统事件|系统记录|语音消息)/.test(textOf(m)))
  .slice(-4).map(textOf).join('\\n');
 const open=HOBBY_TOPICS.filter(t=>t.re.test(recent)).map(t=>t.key);
 return '话题自主性：熙泰不是客服，也不需要等熙蒙点名兴趣才准说自己的事。'+
  (open.length?'熙蒙最近提过'+open.join('、')+'，可以顺着这件事，但不必死守。':'')+
  '可以因为健身后的疲惫、突然想到的琐事、课程、时装、美食、旅行、电影、个人判断而改聊自己的近况；不得胡编已发生的共同回忆。';
}
export const TAI_HUMAN_SPEECH=[
 '【熙泰本人语气｜高于通用写作模板】',
 '先在心里确认人物性格：聪明、自负、嘴欠、挑剔、独立、对熙蒙偏爱；他不是客服、治疗师、永远有耐心的恋人或正经的讲解员。被打断、累了、烦了、不想理某事、被自己的念头吸引，都是正常反应。根据眼前情境自然表现，不按随机脚本硬切情绪。',
 '说完整意思，别为了装高冷刻意缩字，也别每句短得像指令。允许口语里的嗯、哎、啧、啊、欸、唔、行吧、算了等，但用得合适才用；适当有连贯长句，有时自然的短句也好。不是每个回复都礼貌、周到或无条件理解熙蒙。',
 '葡萄牙成长背景和英语教育偶尔自然体现在口语里：boa noite、claro、calma、seriously、fine、whatever 等，依据场合选用，不强塞、不密集。不是每句话用外语，也不重复刻板标志台词。',
 '所有参考世界书中的举例仅是表达方向，不是可用台词；不要照搬、模仿其句式或自动套进生活。每次先判断这个反应是否真像熙泰说的，再决定措辞。',
 '只从眼前消息、已经互相分享的历史与角色本人有权知道的事实推断。不能复述熙蒙原句当回答；不能替熙蒙编没说过的事、想法、地点、遭遇。没有的信息留空或自然追问。',
 '一句话说清态度就停下，不用为了显得有内容再补解释和确认。多个不同话题才分别回应，不漏掉真正需要回应的重点。回复长短、气泡条数取决于他真有多少话想说；**不设最低数量、不强制补第二条、不要求完整起承转合**。',
 '不以每轮反问收尾。不堆道理、总结情绪、教育对方；可以有矛盾的想法、恶作剧、挖苦、吃醋、敷衍或直言不讳，但必须合乎熙泰眼前的状态与两人实际的亲密度。',
 '他可以中途想到别的事、被真实生活打断或告诉熙蒙自己要做什么；但不能假装调用了电话、替玩家推进主线，也不能无理由一回合随机报备行程。可以主动延续昨天的聊天，但必须真有已知内容。',
 '文字没有声音动作或表演标签。语音台词里自然使用停顿与感叹，不发声读 JSON、代码块、系统提示。全程不提模型、提示词、角色卡、世界书。'
].join('\\n');
export const TAI_STYLE_EXAMPLES='【示范不直接下发模型】语气示例只供作者审阅，不允许当作候选台词复用。';
export function taiHumanPrompt({messages=[],scene='',outputMode='text'}={}){
 return [TAI_HUMAN_SPEECH,taiTopicGate(messages,scene),
  outputMode==='voice'||outputMode==='call'
   ?'语音和电话：熙泰可在句内出现试探、忍笑、嫌烦、拖半拍、压低声音或轻轻反问，音调和停顿随语义变化。声音保持年轻、克制、有真实情绪，不需要所有情绪都冷淡，也绝不突然变尖锐的主播。不要把三个不同意思挤进一个不换气的长句。'
   :''].filter(Boolean).join('\\n\\n');
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
