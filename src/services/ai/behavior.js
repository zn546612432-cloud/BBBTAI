// Persisted gameplay preferences, independent of session-only provider keys.
export const DEFAULT_TAI_BEHAVIOR=Object.freeze({
 verbosity:'expansive',maxMessages:5,firstDelayMin:4,firstDelayMax:10,
 messageGapMin:3,messageGapMax:7,initiative:'natural',proactive:true,
 triggerClock:'real',idleMinutes:10,followupMinutes:5,cooldownMinutes:30,dailyLimit:3,
 callPause:1.7,callNudgeSeconds:45,callCloseSeconds:125
});
const limits={maxMessages:[1,6],firstDelayMin:[0,60],firstDelayMax:[0,120],
 messageGapMin:[0.5,30],messageGapMax:[0.5,60],idleMinutes:[1,1440],
 followupMinutes:[1,1440],cooldownMinutes:[1,1440],dailyLimit:[1,12],
 callPause:[0.3,4],callNudgeSeconds:[10,300],callCloseSeconds:[20,600]};
export function normalizeTaiBehavior(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))input={};
 const out={...DEFAULT_TAI_BEHAVIOR};
 for(const [key,[min,max]] of Object.entries(limits)){
  const n=Number(input[key]);if(input[key]!=null&&input[key]!==''&&Number.isFinite(n))out[key]=Math.min(max,Math.max(min,n));
 }
 out.maxMessages=Math.round(out.maxMessages);out.dailyLimit=Math.round(out.dailyLimit);
 for(const [key,values] of Object.entries({verbosity:['brief','balanced','expansive'],initiative:['off','natural','active'],triggerClock:['real','game']}))
  if(values.includes(input[key]))out[key]=input[key];
 if(typeof input.proactive==='boolean')out.proactive=input.proactive;
 out.firstDelayMax=Math.max(out.firstDelayMin,out.firstDelayMax);
 out.messageGapMax=Math.max(out.messageGapMin,out.messageGapMax);
 return out;
}
export const taiBehavior=s=>normalizeTaiBehavior(s?.aiDraft?.behavior);
export function replyDelayMs(text,config,{first=false,random=Math.random}={}){
 const c=normalizeTaiBehavior(config),min=first?c.firstDelayMin:c.messageGapMin,max=first?c.firstDelayMax:c.messageGapMax;
 const lengthWeight=Math.min(1,String(text||'').length/100);
 return Math.round(1000*(min+(max-min)*(lengthWeight*.6+random()*.4)));
}
export function taiBehaviorPrompt(input){
 const c=normalizeTaiBehavior(input);
 const length={brief:'倾向简短，但需要解释时仍可以多说。',balanced:'长短由内容和心情决定，普通聊天经常是两三条实质内容。',expansive:'普通聊天优先连续发2至5条有实质信息的消息：先接话，再补自己的具体生活细节、观察或态度，可以延续没有聊完的话题，不要总只发一句敷衍话。确实只需一句时允许一句；绝不能为了凑数分裂同一短句。'}[c.verbosity];
 return `当前作者设置（覆盖通用世界书的字数和条数限制）：${length}一次允许1—${c.maxMessages}条独立消息，不强制凑满；没有12字、两句或两条的上限。不逐标点拆气泡。${c.initiative==='off'?'这轮顺着已有内容交流，不额外另起话题。':c.initiative==='active'?'有表达欲时主动带出自己的具体发现、看法、近况或之前没说完的话，别一直只答问题。':'可以主动聊自己想说的事，或延续以前没聊完的真实话题，不必等对方提问。'}话题来自你今天的具体生活：运动、学习、出游、看展看秀、酒店、饮食、小酌、电影、社交与个人看法；研究、程序和金融只在相关时自然提及；棋局只是其中一项。对方明显在倾诉时先听完。不要每轮固定反问、报备、送礼或告别。`;
}
