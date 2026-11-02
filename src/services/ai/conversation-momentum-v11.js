// V11: follow the player's persistence instead of forcing a fixed reply length.
// The source is ONLY the actual shared dialogue passed to DeepSeek.
const personal=/童年|小时候|养父母|父母|学校|高中|大学|学生时代|教育|恋爱|感情史|以前的事|你的过去|你小时候|你以前|你的生活|你的事|你在哪|你在干嘛|你干什么|最近在做什么|聊聊你|多讲讲你|说说你|你的经历/;
const insist=/我要听|想听|我想知道|我就是要|我偏要|不行.*(说|讲)|多说|多讲|说下去|继续说|别敷衍|别转移|不要转移|别问我|我就问你|快说|告诉我|讲给我|再讲|不准敷衍|为什么不说/;
const shopping=/代购|帮我买|给我买|买给我|带给我|帮我带|寄给我|想要.*(鞋|衣服|包|礼物)|给我带点/;
const notShared=/^\s*\[(?:电话系统事件|游戏系统事件|系统记录|语音消息)/;
const extract=message=>String(message?.content??message?.text??'').trim();
const user=m=>m&&(m.role==='user'||m.from==='me')&&!notShared.test(extract(m));
export function taiConversationMomentum(messages=[]){
 const actual=(Array.isArray(messages)?messages:[]).filter(m=>m&&(user(m)||m.role==='assistant'||m.from==='tai')).slice(-20);
 const last=actual.at(-1),lastText=user(last)?extract(last):'';
 const userTexts=actual.filter(user).slice(-7).map(extract);
 const personalCount=userTexts.filter(t=>personal.test(t)).length;
 const insistence=insist.test(lastText);
 const topic=personal.test(lastText)||personalCount>=1&&insistence?'personal':shopping.test(lastText)?'shopping':'general';
 const previous=actual.slice(-5,-1).filter(m=>m.role==='assistant'||m.from==='tai').map(extract).join(' ');
 const evasion=/没什么好|不值得|没什么可说|说什么|哪部分|你想听什么|你想知道什么|别问|换个话题|不想聊/.test(previous);
 const persistence=topic==='personal'?(personalCount>=2||insistence&&personalCount>=1?2:1):0;
 const shouldElaborate=topic==='personal'&&persistence>=2;
 return {topic,persistence,shouldElaborate,evasion,shopping:topic==='shopping'};
}
export function taiMomentumPrompt(messages=[],{mode='text'}={}){
 const m=taiConversationMomentum(messages);
 const base=[
  '【v11：言语主动性】你有自己的私生活，不主动报备。但是熙蒙主动询问你的经历、童年、养父母或日常，与你主动汇报完全不同：可以真实地多讲一点，由你选择边界。',
  '不要连续几轮以「没什么好说的」「你想知道什么」「还有什么问题」挡住熙蒙；问过一次以后，若他继续追问，就必须推进话题，或者给出有具体理由的边界。不是强迫你交代一切。',
  '允许无伤大雅的日常回忆、具体小细节、偏爱与糗事作为角色自传式叙述；不得凭空制造重大正典事实、具体学校履历、实际交易或与熙蒙共同成长的记忆。故事与对话示范不算已经发生的事实。',
  '可以聪明地取笑熙蒙、偶尔葡萄牙本土葡语或英语夹一句、说反话、嘴硬、忽然补充；外语不设配额，不要照抄范例。幽默来自双方实际语境，而不是每句都讲冷笑话。',
  '熙蒙央求你代购时，心情好可以调侃 Mirage 账户扣代购费、挑剔他的眼光、问他要什么；这只是玩笑。真正扣款、下单、寄送必须由游戏事件执行，绝不假称已经付款。'
 ];
 if(m.shouldElaborate)base.push('【本轮优先】熙蒙已经不止一次要求你谈自己的经历，他不是客套。可以先假装不耐烦甚至说「你怎么这么关心我」，随后给出至少一个有内容的具体方向、细节或坦白；若你仍不愿讲，请明确说清边界与原因，不要再丢一个空泛的反问让熙蒙尴尬。愿意聊时自然长短交错，短反应加完整说法；不设字数配额。'+(m.evasion?'你上一轮已经回避或反问过，现在尤其不要把问题再次抛回去。':''));
 else if(m.topic==='personal')base.push('熙蒙开始问你的私事。可以挑衅、试探、有限透露一点，保持你的意愿；如果他后续坚持，会逐步松口。');
 if(m.shopping)base.push('熙蒙正在提出代买或礼物请求。你可以乐于逗他、挑条件、顺势聊想买什么，但不能真实花费游戏资金。');
 if(mode==='call')base.push('【电话的完整表达】通话输出的一轮是你接下来打算说完整的话，而非一句开头就结束。自然时可说一句；遇到故事、追问、解释、争执或分享，允许连贯说两三段，穿插短句、转折和具体内容；不要说半句就停下要熙蒙不断挤牙膏。逐段播放完再给他接话空隙。');
 return base.join('\n');
}
export function needsTaiMomentumRepair({messages=[],entries=[],mode='text'}={}){
 const m=taiConversationMomentum(messages);
 if(!m.shouldElaborate||!Array.isArray(entries)||!entries.length)return false;
 const output=entries.map(x=>String(x?.text||'')).join('').replace(/\s/g,'');
 if(!output||output.length>=34)return false;
 // A firm, substantive personal boundary is still a real answer.
 if(/不愿意谈|不想告诉|不想讲这件|这件事我不想|不方便说/.test(output)&&output.length>=14)return false;
 return /问|什么|哪部分|没什么|不知道|不想说|你说|你想|你先|我才/.test(output)||output.length<16;
}
