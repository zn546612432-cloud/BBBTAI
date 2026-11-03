// Persisted gameplay preferences, independent of session-only provider keys.
export const DEFAULT_TAI_BEHAVIOR=Object.freeze({
 verbosity:'expansive',maxMessages:5,firstDelayMin:4,firstDelayMax:10,
 messageGapMin:3,messageGapMax:7,initiative:'natural',proactive:true,autonomousVoice:true,
 triggerClock:'real',idleMinutes:10,followupMinutes:5,cooldownMinutes:30,dailyLimit:3,
 callPause:1.7,callNudgeSeconds:45,callCloseSeconds:125,
  callMaxSegments:5,callQuietSeconds:240,callDedupe:true,callInterrupt:true,callIdleMode:'natural',callDetail:'detailed'
});
const limits={maxMessages:[1,6],firstDelayMin:[0,60],firstDelayMax:[0,120],
 messageGapMin:[0.5,30],messageGapMax:[0.5,60],idleMinutes:[1,1440],
 followupMinutes:[1,1440],cooldownMinutes:[1,1440],dailyLimit:[1,12],
 callPause:[0.3,4],callNudgeSeconds:[10,300],callCloseSeconds:[20,600],
  callMaxSegments:[1,5],callQuietSeconds:[30,900]};
export function normalizeTaiBehavior(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))input={};
 const out={...DEFAULT_TAI_BEHAVIOR};
 for(const [key,[min,max]] of Object.entries(limits)){
  const n=Number(input[key]);if(input[key]!=null&&input[key]!==''&&Number.isFinite(n))out[key]=Math.min(max,Math.max(min,n));
 }
 out.maxMessages=Math.round(out.maxMessages);out.dailyLimit=Math.round(out.dailyLimit);out.callMaxSegments=Math.round(out.callMaxSegments);
 for(const [key,values] of Object.entries({verbosity:['brief','balanced','expansive'],initiative:['off','natural','active'],triggerClock:['real','game'],callIdleMode:['active','natural','quiet'],callDetail:['brief','natural','detailed']}))
  if(values.includes(input[key]))out[key]=input[key];
 if(typeof input.proactive==='boolean')out.proactive=input.proactive;
 if(typeof input.autonomousVoice==='boolean')out.autonomousVoice=input.autonomousVoice;
  if(typeof input.callDedupe==='boolean')out.callDedupe=input.callDedupe;
  if(typeof input.callInterrupt==='boolean')out.callInterrupt=input.callInterrupt;
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
 const length={brief:'聚焦要点，可以自然简短，不因字数被迫扩写。',balanced:'自然长短交错，按聊天场景给出必要内容。',expansive:'有兴致时深入讨论熙蒙正在谈的事，也可以拒绝或结束话题；不主动汇报自己的活动。'}[c.verbosity];
 return '作者偏好：'+length+'每轮最多'+c.maxMessages+'条独立消息（只是 UI 安全上限，**不是最低条数或目标**）。每条都有自己的态度或内容；不要把上一条解释一遍当新消息。'
 + (c.initiative==='off'?'这一轮以现有话题为主。':c.initiative==='active'?'可以主动关心熙蒙已有的近况和实际问题，不主动谈自己的行程。':'可以延续熙蒙提过的事，也可以表达态度后收住，不主动报备。')
 +'熙泰有独立生活，但他的好奇心更多放在熙蒙身上；没被问到时不主动讲自己在干什么，也不反复询问熙蒙在干什么。自由对话优先人物意愿，不强制连发，不采用通用世界书的字数和条数配额。';
}
