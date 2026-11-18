// V11: follow the player's persistence instead of forcing a fixed reply length.
// The source is ONLY the actual shared dialogue passed to DeepSeek.
const personal=/童年|小[時时]候|[養养]父母|[養养][父母]|父母|[學学]校|高中|大[學学]|[學学]生[時时]代|教育|[戀恋][愛爱]|感情史|以前的事|你的[過过]去|你以前|你的生活|你的事|你的家|你在哪|你在[幹干]嘛|你[幹干][什甚][麼么]|最近在做[什甚][麼么]|聊聊你|多[講讲][講讲]你|[說说][說说]你|你的[經经][歷历]|第一次接[觸触][電电][腦脑]|你被[誰谁]收[養养]|你.*(?:[長长]大|[讀读][書书]|[國国]籍|母[語语]|[親亲]生父母|父[親亲]|母[親亲]|哈佛|帝[國国]理工)|你是(?:哪[國国]|哪[裡里]|葡萄牙)人|你的(?:船|[艦舰]艇|[據据][點点])/;
const insist=/我要[聽听]|想[聽听]|我想知道|我就是要|我偏要|不行.*([說说]|[講讲])|多[說说]|多[講讲]|[說说]下去|[繼继][續续][說说]|[別别]敷衍|[別别]轉移|不要[轉转]移|[別别][問问]我|我就[問问]你|快[說说]|告[訴诉]我|[講讲][給给]我|再[講讲]|不准敷衍|[為为][什甚][麼么]不[說说]|[說说]嘛|[講讲]嘛|拜[託托]|求你|就一點|就一点|[說说]一點|[講讲]一點/;
const affirm=/^(?:[對对]|是|是啊|嗯|嗯嗯|[對对]啊|[當当]然|想|想啊|好啊)[。！!？?\s]*$/;
const shopping=/代购|帮我买|给我买|买给我|带给我|帮我带|寄给我|想要.*(鞋|衣服|包|礼物)|给我带点/;
const notShared=/^\s*\[(?:电话系统事件|游戏系统事件|系统记录|语音消息)/;
const extract=message=>String(message?.content??message?.text??'').trim();
const user=m=>m&&(m.role==='user'||m.from==='me')&&!notShared.test(extract(m));
export function taiConversationMomentum(messages=[]){
 const actual=(Array.isArray(messages)?messages:[]).filter(m=>m&&(user(m)||m.role==='assistant'||m.from==='tai')).slice(-20);
 const last=actual.at(-1),lastText=user(last)?extract(last):'';
 // Only a continuous thread counts. Earlier unrelated conversations never
 // fast-forward today's privacy boundary; a short yes can continue a real question.
 let persistence=0;
 for(const m of actual.filter(user).slice(-7)){
  const text=extract(m);
  if(personal.test(text))persistence++;
  else if(persistence>0&&(insist.test(text)||affirm.test(text)))persistence++;
  else persistence=0;
 }
 const topic=lastText&&persistence>0?'personal':shopping.test(lastText)?'shopping':'general';
 const previous=actual.slice(-5,-1).filter(m=>m.role==='assistant'||m.from==='tai').map(extract).join(' ');
 const evasion=/没什么好|不值得|没什么可说|说什么|哪部分|你想听什么|你想知道什么|别问|换个话题|不想聊/.test(previous);
 const stage=topic!=='personal'?'none':persistence===1?'first':persistence<4?'hold':'limited';
 const shouldElaborate=stage==='limited';
 return {topic,persistence:topic==='personal'?persistence:0,stage,shouldElaborate,evasion,shopping:topic==='shopping'};
}
export function taiPrivateDisclosurePrompt(messages=[],{recognized=true}={}){
 const m=taiConversationMomentum(messages);
 if(!recognized||m.topic!=='personal')return '';
 const base='【作者最新的私事披露節奏，優先於舊例句、行為意圖及連發要求】熙泰不太願意在手機上談自己的經歷；他期待有一天與熙蒙見面，再親自帶哥哥去看看自己的生活。這不是故意冷落或測試他。完整人物履歷只是人格底色，不能任憑一次詢問就當成資料庫回答。已經實際向熙蒙說過的事可正常承接，不裝失憶；本規則限制尚未披露的新私事。每輪可只說一句，勿為了凑消息提前披露，也不許把見面期待說成已訂好的日期、行程或承諾。';
 if(m.stage==='first')return base+'\n【首次問私事】先自然確認他是否真的好奇，或溫和表示想留到見面，不提供所問的具體履歷。可以用一個簡短、真誠的問句，不帶刺。';
 if(m.stage==='hold')return base+'\n【仍在追問】對他想聽的心情給予回應，留到見面親自說或帶他看看，仍不要透露所問的具體童年、家庭或學業細節。不機械重複問句，不為了顯得神秘故意挖苦。';
 return base+'\n【連續多次追問，才可以有限鬆口】熙蒙已多次認真追問。此時可以略帶無奈地分享一項與原問題直接相符的已確認事實，簡短自然即可；仍可保留真正不願談的事，不趁機提供完整履歷或敏感地下業務。不要把問題再次拋回去。';
}
// The intent model must not pass a biography answer to the expression layer
// while the current turn is still holding the boundary. Action/mood stay intact.
export function applyTaiPrivacyDecision(decision,{messages=[],recognized=false,channel='noapp',day=0}={}){
 if(!decision||!recognized||channel==='mirage'||day<30||!['send_text','send_voice','speak'].includes(decision.action))return decision;
 const {stage}=taiConversationMomentum(messages);
 if(stage==='none')return decision;
 const intent=stage==='first'?'自然確認熙蒙是否真的好奇自己的經歷，或表示想留到見面親自說。現在不披露新履歷。':stage==='hold'?'回應他的好奇與親近，表示期待見面時親自說或帶他看看。現在不披露新履歷。':'連續多次真實追問後，可略帶無奈地給一個與原問題相符的已確認事實，保留其他私事。';
 return {...decision,strategy:'answer_directly',intent};
}
const privateFactPatterns=[
 /(?:被|就|後|后)[^。！？!?]{0,12}(?:收[養养]|[領领][養养])/, /(?:[三3][個个]月大|[三3][個个]月[時时])/, /(?:澳[門门]|葡萄牙|里斯本)[^。！？!?]{0,15}(?:出生|長大|长大|讀[書书]|读书)/,
 /[養养]父[^。！？!?]{0,20}[領领]事/, /[養养]母[^。！？!?]{0,20}律[師师]/, /[十1][三3][歲岁][^。！？!?]{0,25}(?:[蘋苹]果|[電电][腦脑]|[筆笔][記记]本)/,
 /帝[國国]理工|哈佛|Imperial College/i, /(?:馬術|马术|拳[擊击])/, /(?:公海|[艦舰]艇|[義意]大利黑手黨|意大利黑手党|Azathoth)/i, /(?:是葡萄牙人|葡萄牙[國国]籍)/
];
export function hasPrematureTaiDisclosure(lines,{messages=[],recognized=false,channel='noapp',day=0}={}){
 if(!recognized||channel==='mirage'||day<30||!['first','hold'].includes(taiConversationMomentum(messages).stage))return false;
 const previous=(Array.isArray(messages)?messages:[]).filter(m=>m?.role==='assistant'||m?.from==='tai').map(extract).join('\n');
 const reply=lines.map(String).join('\n');
 return privateFactPatterns.some(pattern=>pattern.test(reply)&&!pattern.test(previous));
}
export function taiMomentumPrompt(messages=[],{mode='text'}={}){
 const m=taiConversationMomentum(messages);
 const base=[
  '【v11：言语主动性】你有自己的私生活，不主动报备。即使熙蒙主动询问你的经历、童年、养父母或日常，也不默认披露；私事遵循见面期待及逐步松口的最新规则。',
  '不要连续几轮用同一句问话打发熙蒙；可以表达希望见面再谈，或认真说明自己的边界。普通对话仍自然回应。',
  '允许无伤大雅的日常回忆、具体小细节、偏爱与糗事作为角色自传式叙述；不得凭空制造重大正典事实、具体学校履历、实际交易或与熙蒙共同成长的记忆。故事与对话示范不算已经发生的事实。',
  '可以聪明地取笑熙蒙、偶尔葡萄牙本土葡语或英语夹一句、说反话、嘴硬、忽然补充；外语不设配额，不要照抄范例。幽默来自双方实际语境，而不是每句都讲冷笑话。',
  '熙蒙央求你代购时，心情好可以调侃 Mirage 账户扣代购费、挑剔他的眼光、问他要什么；这只是玩笑。真正扣款、下单、寄送必须由游戏事件执行，绝不假称已经付款。'
 ];
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
 if(/不[願愿]意[談谈]|不想告[訴诉]|不想[講讲][這这]件|[這这]件事我不想|不方便[說说]|[見见]面|[親亲]眼/.test(output))return false;
 return /^(?:你想[聽听]|你想知道|你[說说]|你先|[沒没][什甚][麼么]|不知道|不想[說说]|哪部分)/.test(output)||/[？?]$/.test(output);
}
