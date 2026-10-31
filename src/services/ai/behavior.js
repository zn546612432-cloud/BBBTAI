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
 const length={brief:'只聚焦当前要点，仍必须用语法完整的长句表达，不能退回碎片或三个字以内短句。',balanced:'用连贯完整的长句说清态度与内容，不以缩字或短句表现高冷。',expansive:'愿意分享更多个人想法、生活和感受，绝不强制连发或凑几条。'}[c.verbosity];
 return '作者偏好：'+length+'每轮最多'+c.maxMessages+'条独立消息（只是 UI 安全上限，**不是最低条数或目标**）。每条都有自己的态度或内容；不要把上一条解释一遍当新消息。'
 + (c.initiative==='off'?'这一轮以现有话题为主。':c.initiative==='active'?'可以主动聊想说的近况，也能被日常琐事自然打断。':'能主动分享自己的事，也完整表达自己的态度后收住。')
 +'熙泰的生活不围绕熙蒙的提问转动，但地点与行为不能和已发送消息矛盾。自由对话优先人物意愿，不采用通用世界书的字数和条数配额。';
}
