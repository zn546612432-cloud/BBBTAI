// Read-only NoApp dialogue matching. It uses the existing R1–R6 verdict and
// current live conversation; it never increments affinity, invents Xi Meng's
// next turn, or sends a bubble. Authored lines stay verbatim in ./lines.js.
import {XITAI_CINEMATIC_NOAPP_LINES} from './lines.js';

const isNight=clock=>/^\d\d:\d\d$/.test(clock)&&
 (Number(clock.slice(0,2))>=21||Number(clock.slice(0,2))<5);
const isMacauMorning=clock=>/^\d\d:\d\d$/.test(clock)&&
 Number(clock.slice(0,2))>=5&&Number(clock.slice(0,2))<11;

const CONFESSION=/^(?:(?:熙泰|nya)[，,！!\s]*)?我(?:真的|也|好|一直|很|越來越|越来越)*[愛爱]你(?:了|啊|呀|呢)?[。！!~\s]*$/iu;
const MEAL=/我(?:還|还)?欠你(?:一頓|一顿)?飯|(?:說好|说好|約好|约好).{0,15}(?:吃飯|吃饭)|(?:我請你|我请你).{0,6}(?:吃飯|吃饭)/u;
const CRISIS_CONTEXT=/警察|追捕|被抓|受傷|受伤|逃跑|逃命|醫院|医院|救我|有人要殺|有人要杀|真的會死|真的会死/u;
const repeatedOtherPerson=/最近.{0,5}(?:常|一直).{0,5}(?:提|說|说).{0,4}(?:他|她)|(?:他|她)比你|總跟我說他|总跟我说他/u;

function eligible(entry,{relationshipPlan,input,messages,macauClock,londonClock}){
 if(entry.stage>relationshipPlan.stage)return false;
 if(relationshipPlan.rejected&&entry.stage>=3)return false;
 if(entry.gate==='like-allowed'&&!relationshipPlan.canDeclareLike)return false;
 if(entry.gate==='mutual-love'&&(!relationshipPlan.canDeclareLove||!CONFESSION.test(input)))return false;
 if(entry.gate==='london-night'&&(!isNight(londonClock)||(entry.id==='13'&&!isMacauMorning(macauClock))))return false;
 if(entry.gate==='london-location'&&!/(?:倫敦|伦敦|英國|英国|london|uk)/i.test(input))return false;
 if(entry.gate==='meal-promise'&&!messages.some(m=>m.role==='user'&&MEAL.test(m.content)))return false;
 if(entry.gate==='past-days-contact'&& !/前幾天|前几天|幾天沒|几天没|好久|很久沒|很久没/.test(input))return false;
 if(entry.gate==='repeated-other-person'&&!repeatedOtherPerson.test(input))return false;
 if(entry.gate==='actual-danger'&&(!relationshipPlan.crisis||!CRISIS_CONTEXT.test(input)))return false;
 if(entry.gate==='demonstrated-independence'&&!/不用再問你|不用再问你|我自己.*決定|我自己.*决定|不需要你替我|不需要你帮我决定/.test(input))return false;
 if(entry.gate==='fear-of-loss'&& !/(?:失去你|失去我|失去熙泰|怕.{0,8}(?:你|我).{0,4}離開|怕.{0,8}(?:你|我).{0,4}离开|別離開我|别离开我|害怕.{0,8}你離開|害怕.{0,8}你离开)/.test(input))return false;
 return true;
}

export function selectNoAppCinematicDialogue({channel='noapp',recognized=false,relationshipPlan=null,
 messages=[],macauClock='',londonClock=''}={}){
 if(channel!=='noapp'||recognized!==true||!relationshipPlan||relationshipPlan.stage<1)return null;
 const turns=Array.isArray(messages)?messages:[],last=[...turns].reverse().find(m=>m?.role==='user'&&typeof m.content==='string');
 const input=last?.content?.slice(0,420).trim()||'';
 if(!input||/^\[(?:电话系统事件|電話系統事件|游戏系统事件|遊戲系統事件)/.test(input))return null;
 const recentTai=turns.filter(m=>m?.role==='assistant'&&typeof m.content==='string').slice(-14).map(m=>m.content);
 const matches=XITAI_CINEMATIC_NOAPP_LINES.filter(entry=>entry.cues.test(input)&&
  eligible(entry,{relationshipPlan,input,messages:turns,macauClock,londonClock})&&
  !recentTai.some(t=>entry.lines.some(line=>line.length>10&&t.includes(line))));
 if(!matches.length)return null;
 // Select the narrowest actual cue. A rotating tie-breaker avoids a fixed
 // phrase whenever the same question is asked in different real conversations.
 const ranked=matches.map(entry=>{
  const longest=[...input.matchAll(new RegExp(entry.cues.source,entry.cues.flags.replace('g','')+'g'))]
   .reduce((max,m)=>Math.max(max,m[0]?.length||0),0);
  return {entry,score:longest};
 }).sort((a,b)=>b.score-a.score||a.entry.id.localeCompare(b.entry.id));
 const top=ranked.filter(x=>x.score===ranked[0].score);
 const chosen=top[turns.length%top.length].entry;
 return chosen;
}

export function noAppCinematicDirection(context={}){
 if(context.channel!=='noapp'||context.recognized!==true||!context.relationshipPlan)return '';
 const r=context.relationshipPlan;
 const introduction='【NoApp｜作者已確認的熙泰文藝對白】\n'
  +'這是已相認的陳熙泰，不是匿名 Dr Ouroboros。沿用唯一的 R1–R6 關係判定，不額外製造好感度、日期或事件。\n'
  +'他平時自然、聰明、帶點傲慢；在談到失散的歲月、孤獨、選擇、信任和真正的感情時，可以突然深刻、富有文學性。少用逗號堆積長句，少用「我不是……而是……」式說教。不要每輪都變成抒情獨白。\n'
  +'只回應熙蒙實際說過的話。不替熙蒙寫台詞，不預設他接下來害羞、答應或告白。沒有實際經歷和承諾的事不能憑空宣稱發生。\n'
  +'R1–R3 可以討論孤獨、童年和哲學，但不可明確認愛。只有 R4 且已有 canDeclareLike 許可時能直接說喜歡；只有 R6 且已有 canDeclareLove 許可時能直接說愛。對方只是問「你喜歡我嗎」不等於他已經表白。';
 const selected=selectNoAppCinematicDialogue(context);
 if(!selected)return introduction;
 return introduction+
  '\n【本輪話題可能適合的作者定稿，台詞 #'+selected.id+'｜'+selected.topic+'｜R'+selected.stage+' 起】\n'+
  selected.lines.map(line=>'「'+line+'」').join('\n')+
  '\n只有當這組台詞恰好回答當下真正的問題、感情和事實都成立時才使用；若採用則沿用原句，不要擅自改寫。也可以不引用，先解決熙蒙真正提出的事。台詞只屬於熙泰，不能要求玩家配合劇本。一次不必說完全部，多餘的句子不要硬塞到聊天。';
}
