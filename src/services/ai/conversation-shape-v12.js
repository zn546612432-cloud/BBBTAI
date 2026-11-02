// Author-directed turn rhythm. Distribution is sampled by the PROGRAM,
// not a vague probability sentence sent to a language model.
//
// Author supplied 3:45, 2:30, 1:30, 4-5:30. These sum to 135, so use
// them as RELATIVE WEIGHTS (33.33%, 22.22%, 22.22%, 22.22%).
// The separate 30% "guide" choice is an independent random draw.
// One "message" means a text bubble, or a spoken thought during a call.
export const TAI_TURN_WEIGHTS=Object.freeze([
 Object.freeze({count:3,weight:45}),
 Object.freeze({count:2,weight:30}),
 Object.freeze({count:1,weight:30}),
 Object.freeze({count:'4-5',weight:30})
]);
export const TAI_GUIDE_CHANCE=0.30;
// 40% of non-scripted NoApp TEXT replies may be written as one semicolon-separated burst.
// The program then splits the text into real, separately paced message bubbles.
export const TAI_SEMICOLON_BURST_CHANCE=0.40;
const total=TAI_TURN_WEIGHTS.reduce((sum,x)=>sum+x.weight,0);
const stop=/^(?:不聊了|别说了|闭嘴|别烦我|别问了|先别聊|不想聊|不用回复|不用回|晚安|去睡了|再见|拜拜|挂了|我要挂了|先挂了)[！!。\s]*$/;
const nowish=/^(?:在吗|hi|hello|hey|嗨|你好|嗯|哦|喂)[？！!?。\s]*$/i;
const personalLimit=/^(?:别问我|不要问我|别再问|不许问|别追问|不想回答|不想聊这个)/;
const fromUser=m=>m&&(m.role==='user'||m.from==='me');
const contentOf=m=>String(m?.content??m?.text??'').trim();
const clampRandom=n=>Number.isFinite(Number(n))?Math.min(1-Number.EPSILON,Math.max(0,Number(n))):0.5;
export function taiTurnProbabilities(){
 return TAI_TURN_WEIGHTS.map(x=>({count:x.count,probability:x.weight/total}));
}
export function taiGuideEligible(messages=[],{mode='text'}={}){
 if(!Array.isArray(messages))return false;
 const recent=messages.filter(fromUser).slice(-1)[0];
 const last=contentOf(recent);
 if(!last||stop.test(last)||personalLimit.test(last))return false;
 if(/^\s*\[(?:系统记录|游戏系统事件|电话系统事件)/.test(last))return false;
 // A generic hello may receive a warm, playful response without the
 // model inventing a thing the player supposedly did.
 if(nowish.test(last)&&!messages.slice(-12).some(m=>fromUser(m)&&contentOf(m)!==last&&!nowish.test(contentOf(m))))return false;
 return mode==='text'||mode==='call'||mode==='voice';
}
export function sampleTaiTurnPlan({
 random=Math.random,maxMessages=5,messages=[],mode='text',allowed=true
}={}){
 if(!allowed)return {target:0,guide:false,mode,eligible:false};
 const roll=clampRandom(random())*total;
 let cursor=0,chosen=TAI_TURN_WEIGHTS.at(-1);
 for(const item of TAI_TURN_WEIGHTS){cursor+=item.weight;if(roll<cursor){chosen=item;break;}}
 const count=chosen.count==='4-5'?(clampRandom(random())<0.5?4:5):chosen.count;
 // Always sample the guide draw separately from the length draw;
 // a long burst need not be a question, and a one-line question is valid.
 const eligible=taiGuideEligible(messages,{mode});
 const guide=clampRandom(random())<TAI_GUIDE_CHANCE&&eligible;
 const cap=Math.min(5,Math.max(1,Math.round(Number(maxMessages)||5)));
 // Draw independently of v12 length and guidance; the 40% branch genuinely
 // permits a multi-bubble burst (even when the previous draw was one line).
 // Respect a developer's explicit maxMessages=1 restriction.
 const semicolonBurst=mode==='text'&&cap>=2&&eligible&&!/(?:别发那么多|不要发那么多|只说一句|一句话就行|一句就够|少说点)/.test(contentOf(messages.filter(fromUser).at(-1)))&&clampRandom(random())<TAI_SEMICOLON_BURST_CHANCE;
 return {target:Math.min(cap,semicolonBurst?Math.max(2,count):count),guide,mode,eligible,
  semicolonBurst,weight:chosen.weight,requested:chosen.count};
}
export function taiTurnShapePrompt(plan,{continued=false}={}){
 if(!plan||plan.target<1)return '';
 const what=plan.mode==='call'?'段自然可朗读的连续话意（不是独立问答）':plan.mode==='voice'?'个自然说话意群（可合成为同一条语音）':'条独立聊天气泡';
 const parts=[
  '【v12｜本轮已抽签的表达节奏，优先于旧世界书“不设最低条数/不强制连发”的一般说明】',
  '本轮要表达'+plan.target+what+'。此数字由程序随机决定，不是要求你每条写短、不通顺或凑废话。允许第一句简短、后面深入；也允许中间停顿、改口、吐槽，内容必须实际推进熙蒙正在谈的事。',
  '每个 messages 元素只装一条独立内容；短句与有信息量的长句混合。避免同义重复、复制上一条的态度、一个完整句子机械切成许多无意义碎片。没被询问时不主动汇报行程。',
  '这是表达风格的抽签，不覆盖剧情锁、真实拒绝、紧急挂断、已读不回和“别再聊了”等边界；真正决定不回复时行为层根本不会进入这里。'
 ];
 if(plan.semicolonBurst&&plan.mode==='text')parts.push('【v13｜40%分号连发模式已触发】这一轮请优先返回一个JSON对象，messages数组中只有一个元素，mode=text，text写成'+plan.target+'段有不同信息的自然口语，使用中文全角分号「；」连接。游戏会按分号分成'+plan.target+'条真正独立、依次出现的聊天气泡。段落要承上启下，长短交错，不要把同一句话换个说法再讲一遍；不需要在气泡里写角色名、JSON或动作标签。避免把一个正在讲的完整事实机械重复两次。不得把分号当做剧情触发标记。');
 if(plan.guide)parts.push('【本轮30%引导型人格已经触发】先接住熙蒙的真实提问或情绪，然后选一个令熙泰本人感兴趣、和对方刚才提供的真实事实有关的细节，主动抛出自然且具体的问题，引导哥哥接着谈。疑问可以带有毒舌、兴趣、好奇、挑衅或罕见的关心，但不能空泛地问“你在干什么”“还有呢”或重复对方已经回答的事。不要为了反问而忽略刚才的问题。');
 else parts.push('【本轮未触发主动引导】照样有温度、有主见、有趣，不用强制提出问题；可以自然补充观点、戏谑、讲完整事情或收尾。');
 if(continued)parts.push('本轮是补齐已有表达，不要重发已拟好的消息，不要新造无关话题。');
 return parts.join('\n');
}
export function taiTurnNeedsMore({plan,entries=[],messages=[],action='send_text'}={}){
 if(!plan||plan.target<2||!['send_text','send_voice','speak'].includes(action))return false;
 if(!Array.isArray(entries)||entries.length===0||entries.length>=plan.target)return false;
 // Respect real character boundaries and explicit conversation endings.
 const last=contentOf((Array.isArray(messages)?messages:[]).filter(fromUser).at(-1));
 if(stop.test(last)||personalLimit.test(last)||nowish.test(last))return false;
 if(entries.some(e=>e?.action==='phone'))return false;
 const text=entries.map(e=>String(e.text||'')).join(' ');
 if(/(?:我不想聊|没空|不方便|先挂了|晚点说|明天再聊|我先忙了|不愿意谈这个|这是我的私事|到此为止|不谈这个)[。！？!?~\s]*$/.test(text.trim()))return false;
 return true;
}
// The model can repeat facts across a first response and its "continue" pass.
// Compare *clauses* rather than only exact whole messages: e.g. "哈佛，计算机博士，
// 早不上教室了" / "哈佛，计算机博士。不过早就不上教室了。你在意？"
// must yield ONLY "你在意？" as the second bubble.
const statementUnits=text=>[...String(text||'').matchAll(/([^，,。！？!?；;\n]+)([，,。！？!?；;\n]*)/g)]
 .map(m=>({body:m[1].trim(),ending:m[2]})).filter(x=>x.body);
const normalizedUnit=value=>String(value||'').normalize('NFKC').toLowerCase()
 .replace(/^[\s]*(?:不过|但是|其实|说真的|老实说|嗯|哦)[，,\s]*/,'')
 .replace(/[，,。！？!?；;：:、…“”‘’'"（）()\s]/g,'')
 .replace(/就/g,'');
function similarUnit(left,right){
 const a=normalizedUnit(left),b=normalizedUnit(right);
 if(!a||!b)return false;
 if(a===b)return true;
 if(Math.min(a.length,b.length)<4)return false;
 if((a.includes(b)||b.includes(a))&&Math.min(a.length,b.length)>=5)return true;
 // Dice similarity catches small variations without merging distinct claims.
 const pairs=s=>Array.from({length:s.length-1},(_,i)=>s.slice(i,i+2));
 const first=pairs(a),second=pairs(b);let shared=0;
 const spare=[...second];
 for(const x of first){const index=spare.indexOf(x);if(index>=0){shared++;spare.splice(index,1);}}
 return 2*shared/(first.length+second.length)>=.79;
}
export function stripRepeatedTaiClauses(candidate,previous=[]){
 const text=String(candidate||'').trim(),units=statementUnits(text);
 if(!text||!units.length)return text;
 const known=(Array.isArray(previous)?previous:[]).flatMap(x=>statementUnits(x?.text??x));
 if(!known.length)return text;
 const kept=units.filter(part=>!known.some(earlier=>similarUnit(part.body,earlier.body)));
 if(kept.length===units.length)return text;
 if(!kept.length)return '';
 // Keep the original question/exclamation punctuation on genuine new clauses.
 return kept.map(x=>x.body+x.ending).join('').replace(/^[，,。！？!?；;\s]+/,'').trim();
}
export function dedupeTaiTurnEntries(entries=[],limit=6){
 const result=[];
 for(const item of (Array.isArray(entries)?entries:[])){
  if(result.length>=Math.max(1,limit))break;
  if(!item||typeof item.text!=='string')continue;
  if(item.action==='phone'){result.push(item);continue;} // executable game command is never rewritten
  const original=item.text.trim();
  const novel=stripRepeatedTaiClauses(original,result.filter(x=>x.action!=='phone'));
  if(!novel)continue;
  if(novel===original){result.push(item);continue;}
  // Translated captions and speech text must match the actual filtered line.
  const updated={...item,text:novel};
  if(typeof item.speechText==='string')updated.speechText=novel;
  delete updated.translation;
  result.push(updated);
 }
 return result;
}
export function mergeTaiTurnEntries(previous=[],extra=[],limit=5){
 // A continuation must not create a second executable phone command.
 return dedupeTaiTurnEntries([
  ...(Array.isArray(previous)?previous:[]),
  ...(Array.isArray(extra)?extra:[]).filter(x=>x?.action!=='phone')
 ],limit);
}

const genericQuestion=/^(?:你呢|还有呢|还有什么|你想听什么|你想知道什么|你在干什么|你在做什么|有问题吗|还有事吗|什么事)[呢啊么吧？！?!。\s]*$/;
export function taiContainsGroundedQuestion(entries=[]){
 return (Array.isArray(entries)?entries:[]).some(m=>{
  const t=String(m?.text||'').trim();
  const clauses=t.split(/[。！!；;\n]/).map(x=>x.trim()).filter(Boolean);
  return clauses.some(x=>/[？?]$/.test(x)&&x.length>=5&&!genericQuestion.test(x));
 });
}
export function taiGuidanceNeedsRepair({plan,entries=[],messages=[]}={}){
 if(!plan?.guide||!taiGuideEligible(messages,{mode:plan.mode})||!entries.length)return false;
 if(entries.some(x=>x.action==='phone'))return false;
 const text=entries.map(x=>String(x.text||'')).join(' ');
 if(/我不想谈|我不想聊|先挂了|我先忙|稍后说|晚安|到此为止|别问了/.test(text))return false;
 return !taiContainsGroundedQuestion(entries);
}
export function taiIntegrateGuidingQuestion(entries=[],candidate,limit=5){
 const copied=entries.map(x=>({...x})),q=String(candidate?.text||'').trim();
 if(!taiContainsGroundedQuestion([{text:q}])||!copied.length)return copied;
 if(copied.length<Math.max(1,limit)){
  if(copied.some(x=>x.text===q))return copied;
  copied.push({...candidate,text:q});
 }else{
  const last=copied.at(-1);
  if(last.text===q||last.text.includes(q))return copied;
  last.text=String(last.text||'').replace(/\s+$/,'')+' '+q;
  if(last.mode==='voice')last.speechText=last.text;
  // A previously accurate Portuguese translation must not be attached to
  // a new question in Chinese. Leave just the visible dialogue.
  delete last.translation;
 }
 return copied;
}
