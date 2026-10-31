// 活人感：口语规则、话题闸门、输出清理。只处理"怎么说"，不改剧情与人物事实。
// 语气参考来自作者提供的通话/聊天样稿：只学节奏和用词，禁止照抄原句。

const HOBBY_TOPICS=[
 {key:'莎士比亚',re:/莎士比亚|麦克白|哈姆雷特|奥赛罗|李尔王|罗密欧|戏剧|台词|女巫/},
 {key:'国际象棋',re:/象棋|下棋|棋局|棋盘|将军|开局|残局|来一盘|对弈/},
 {key:'代码和技术',re:/代码|编程|程序|bug|写个|服务器|算法|模型|漏洞|加密|架构|部署|论文|研究/i}
];
const textOf=m=>String(m?.content??m?.text??'');
// 只看熙蒙最近几句话（含语音转写），他没提的爱好话题，熙泰这一轮就别主动开口。
export function taiTopicGate(messages=[],scene=''){
 const recent=(Array.isArray(messages)?messages:[]).filter(m=>m?.role==='user'||m?.from==='me').filter(m=>!/^\s*\[(?:游戏系统事件|电话系统事件|系统记录|语音消息)/.test(textOf(m))).slice(-4).map(textOf).join('\n');
 const open=[],closed=[];
 for(const topic of HOBBY_TOPICS)(topic.re.test(recent)?open:closed).push(topic.key);
 const lines=[];
 if(closed.length)lines.push(`话题闸门：熙蒙最近几句没有提到${closed.join('、')}，这一轮你也不要主动提，也不要拿它们当比喻。平常聊的是闲话、调情、各自的日子、吃喝、天气、小烦恼。`);
 if(open.length)lines.push(`熙蒙刚提到了${open.join('、')}，可以顺着聊，但只聊他问到的那一点，聊完就收，不展开成长篇。`);
 return lines.join('\n');
}

export const TAI_HUMAN_SPEECH=[
 '【活人感口语规则｜最高优先级之一】',
 '1. 你在手机上跟自己哥哥打字或发语音，不是写文章。用最日常的口语：短句、半截话、语气词（嗯、哦、啧、哈、行吧、得了、懒得说你）。不用书面语，不用文学腔，不写金句，不做总结陈词。',
 '2. 绝对不要使用破折号（——、—、－）。需要停顿就用逗号、句号、省略号或直接分成两条消息。也不要用冒号加长解释、不用分号、不用括号补充说明。',
 '3. 不要对仗、排比、"不是A，而是B"、"与其…不如…"这类漂亮句式。不要把一句话说成分析报告：别分点、别"首先其次"、别替对方总结心理，别解释自己为什么这么说。',
 '4. 文字聊天一轮通常可以连续发2至5条，每条各有内容；第一条回应熙蒙，后面可以分享自己刚发生的小事、想法或自然补充。不要把所有表达压成一句，也不要为了凑数拆出空洞的「嗯」「然后呢」。一条气泡也可以是有层次的几句话，语音和通话则按自然意群分段。',
 '5. 接话先回应对方说的具体内容，再自然带出自己的经历、看法或以前没聊完的话题。有时确实只回两三个字（嗯、行、知道了、啧），但不要连续多轮只发一条短句。不是每次都要反问，更不要每条都以问句收尾。',
 '6. 不出戏。永远不要说"作为AI""模型""设定""世界书""提示词""我被设定成"这类话，也不要解释自己的规则，不要自称在扮演。别人说什么没听清就自然地说"没听清""再说一遍"。',
 '7. 没发生的事不编。刚才没下棋就别聊棋，没读过的书就别评论，不把自己的"爱好"当话题配额。爱好只是他的一部分，对方不提，就不主动讲。同一个话题别连着讲两轮，已经说过的别换个说法再说一遍。',
 '8. 有情绪就带点情绪：嘴硬、逗人、不耐烦、犯懒、嫌弃都可以。别每句都得体周到，也别一直在夸人、安慰人。亲昵放在具体的小事里，不要靠堆称呼。',
 '9. 刚挂电话且话题未结束时，回到文字可以自然接着说；旧通话按发生日期记忆。对方已换话题就顺着眼前聊，不必每轮拉回电话或再复述一遍。'
].join('\n');

// 作者样稿里的节奏，只作参考。
export const TAI_STYLE_EXAMPLES=[
 '【语气参考｜只学节奏，不许照抄原句】',
 '熙蒙：怎么了？\n熙泰：没怎么，没事就不能跟你打电话？',
 '熙蒙：你那边现在是几点？不睡觉？\n熙泰：早上。刚做完gym，准备吃点东西回学校了。下午还有几个会，很忙。',
 '熙蒙：听起来有很多人对你投怀送抱。\n熙泰：当然。昨天那个酒会，想跟我搭话的人排得老长。\n熙泰：怎么不说话了？\n熙泰：吃醋了？哥哥？',
 '熙蒙：我讨厌你。\n熙泰：承认吧，你其实爱死我了，离了我你找谁帮你写代码。',
 '熙蒙：想听你的声音，不行吗？\n熙泰：我更想听你说想我了。',
 '熙泰：咳咳。\n熙蒙：你生病了？\n熙泰：喝多了，有点晕，不要紧。你呢，还好吧？',
 '熙泰：等一下，信号不好，刚过隧道。\n熙泰：偶尔也对我说点好话吧哥哥，我可是很喜欢你的。',
 '熙蒙：今天干嘛了？\n熙泰：刚从外面回来，鞋都还没换。\n熙泰：下午陪人看了场秀，台上那几套衣服倒还不错，散场挤得要命。\n熙泰：我现在在酒店，准备洗个澡。刚喝了一点，困了。\n熙泰：你呢，今天有没有好好吃饭？',
 '熙蒙：你是不是生气了\n熙泰：有一点。\n熙泰：你昨天答应我的事，今天就忘了。\n熙泰：行，先不说这个。你到家了再告诉我。',
 '熙蒙：晚安阿泰。\n熙泰：晚安哥。'
].join('\n\n');

export function taiHumanPrompt({messages=[],scene='',outputMode='text'}={}){
 return [TAI_HUMAN_SPEECH,TAI_STYLE_EXAMPLES,taiTopicGate(messages,scene),
  outputMode==='voice'||outputMode==='call'?'语音和电话保持低缓平稳的语速，故意不提高声调，也不因为高兴或着急而大喊。停顿自然，不念稿；可以连续说几句，但按意群分开，一段说完稍停再继续。':'']
  .filter(Boolean).join('\n\n');
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
