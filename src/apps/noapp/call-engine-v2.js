// NoApp V2: deterministic guards around an otherwise autonomous call.
// This module is intentionally pure so provider failures cannot reset its rules.
import {taiCallFarewellIntent} from './call-hangup-intent.js';
const clean=value=>String(value||'').replace(/[\s，。！？!?、：:；;,.…"“”‘’（）()\-]/g,'').toLowerCase();
const grams=s=>{const result=new Set();for(let i=0;i<s.length-1;i++)result.add(s.slice(i,i+2));return result;};
export function taiCallReplyStatus(snapshot={},caption=''){
 if(snapshot.state!=='connected'||snapshot.scripted||caption||snapshot.audioReady||
    snapshot.listening||snapshot.transcribing||snapshot.requestingMic)return '';
 if(snapshot.replyPhase==='thinking')return '熙泰正在回覆…';
 if(snapshot.replyPhase==='voice')return '熙泰正在準備語音…';
 return '';
}
const comfort=text=>/(?:累|休息|缓过来|别说话|不想说话|没力气)/.test(text)&&/(?:陪|听你|先别|别费劲|放着|缓过来)/.test(text);
const promise=text=>/(?:等.{0,5}(?:事|事情).{0,4}(?:结|完)|等我见到|事情结束)/.test(text)&&/(?:见|找|抱|去|结束|完)/.test(text);
 // Two empty availability refusals are one thought, not two independent voice clips.
 // Reasons and constraints are never removed by this narrow match.
 const plainRefusal=value=>/^(?:現在|现在|目前|暫時|暂时|眼下)(?:還|还|也)?(?:不行|不可以|不合適|不合适|不是時候|不是时候|不能|去不了|來不了|来不了)[。.!！\s]*$/u.test(String(value||'').trim());
export function sameCallMeaning(a,b){
 const x=clean(a),y=clean(b);
 if(!x||!y)return false;
 if(x===y)return true;
 if(plainRefusal(a)&&plainRefusal(b))return true;
 if(Math.min(x.length,y.length)>=8&&(x.includes(y)||y.includes(x)))return true;
 if(Math.min(x.length,y.length)>=10){
  const gx=grams(x),gy=grams(y),intersection=[...gx].filter(t=>gy.has(t)).length;
  if(intersection/Math.max(1,Math.min(gx.size,gy.size))>=0.78)return true;
 }
 // High-confidence repeated emotional intentions; do not globally ban empathy.
 if(comfort(a)&&comfort(b))return true;
 if(promise(a)&&promise(b)&&/(?:事情|这件事|那件事)/.test(a)&&/(?:事情|这件事|那件事)/.test(b))return true;
 return false;
}
export function isQuietCallRequest(value){
 const s=String(value||'');
 return /(?:别|不要|先别)(?:再)?(?:问|说话|讲话|吵)|(?:不想|不愿|懒得)(?:再)?(?:说话|讲话)|(?:安静|静静)(?:陪|待|一会|一下)|(?:陪我|陪着我).{0,8}(?:安静|待会|不说话)|(?:让我|我想)(?:安静|静静)/.test(s);
}
// Explicit "speak more" is a per-turn request, not a persistent preference.
export function wantsMoreCallSpeech(value){
 const s=String(value||'').replace(/[\s，,。！？!?]/g,'');
 if(/(?:不要|別|别|不用|不必|不想|不需要).{0,5}(?:多[說说]|多[講讲])/.test(s))return false;
 return /(?:多[說说講讲][點点一幾几]|多[說说講讲](?:兩两|三|四|五|幾几)段|[說说講讲]多一[點点]|[說说講讲]詳細一[點点]|[說说講讲]久一[點点]|[繼继]續[說说講讲]|接[著着][說说講讲]|[別别]只[說说講讲]一句|[說说講讲]完整一[點点]|多[說说講讲]一[會会])/.test(s);
}
// If the model put several complete sentences in one item, retain its
// actual words and split only the natural boundaries, never invent content.
export function expandCallSegments(entries){
 if(entries.length!==1)return entries;
 const entry=entries[0];
 // Do not discard a valid MiniMax-directed performance to split it.
 if(entry.speechText&&entry.speechText!==entry.text)return entries;
 const parts=entry.text.match(/[^。！？!?]+[。！？!?]+|[^。！？!?]+$/g)?.map(s=>s.trim()).filter(Boolean)||[];
 if(parts.length<2)return entries;
 return parts.slice(0,5).map((text,i)=>({...entry,text:i===4?parts.slice(4).join(''):text,speechText:undefined}));
}
const callAddress=value=>String(value||'').replace(/(?:陈|陳)?熙蒙/g,'nya');
export function selectCallSegments(entries=[],{maxSegments=3,recent=[],dedupe=true}={}){
 const cap=Math.max(1,Math.min(5,Math.round(Number(maxSegments)||3)));
 const selected=[],blocked=[];
 for(const entry of (Array.isArray(entries)?entries:[]).slice(0,6)){
  const text=callAddress(entry?.text).trim();
  if(!text)continue;
  // A trailing comma/colon is an unfinished thought, not a standalone voice clip.
  if(/[，,、：:；;]$/.test(text)){blocked.push({text,reason:'unfinished'});continue;}
  if(dedupe&&[...selected.map(x=>x.text),...recent].some(prior=>sameCallMeaning(prior,text))){
   blocked.push({text,reason:'duplicate'});continue;
  }
  selected.push({...entry,text,...(entry.speechText?{speechText:callAddress(entry.speechText)}:{})});
  if(selected.length>=cap)break;
 }
 return {segments:selected,blocked};
}
// A complete spoken turn can contain several *different* thoughts. Short
// acknowledgements, privacy boundaries and explicit quiet are exceptions.
const briefTurn=/^(?:[嗯哦噢啊好行对對是收到]|好的|好吧|知道了|明白了|謝謝|谢谢|晚安|早安|喂|哈[哈]*|hi|hello)[。！？!?…\s]*$/i;
// Author-approved outgoing pickups. A windy outdoor moment is occasional,
// tied to an established outing rather than a claim about actual weather.
export function outgoingCallOpening(life,{sessionId=0}={}){
 return life?.activity?.startsWith('外出')&&sessionId%3===0
  ?['喂？我这边风很大，听得不是很清楚。等我一下。','好了，说吧。']
  :['怎么了？'];
}
// A requested callback starts with one natural pickup, never a generated recap.
export function incomingCallOpening({requestedByPlayer=false,sessionId=0,openingText=''}={}){
 return requestedByPlayer?[sessionId%2===0?'喂？':'怎么了？']:openingText;
}
export function callPersonaGuidance(life){
 const late=life&&(life.minute<90||life.minute>=1260);
 const sleep=late?'你所在地的伦敦当地时间是 '+life.local+'；如有困意可以自然结束通话。不得把伦敦深夜当成熙蒙的深夜，不能因此指责澳门清晨的熙蒙熬夜，也不要照抄时间示范句。':'只有真正的伦敦凌晨才提及自己正在过凌晨，不能把澳门时间当成自己的时间或编造钟点。';
 return '【作者确认的电话口吻】熙泰有自己的时间和脾气，不必每次陪聊到对方满意。熙蒙主动讨情话时可以从容、亲昵地轻轻调侃，有一点狡黠，但别油腻；不是固定冷笑话，不能逐字重复作者示例。双方的亲密阶段允许直接回应时，也不能一直用调侃逃避真心。'+sleep+' 真的累或准备休息时可说：「今天很累，有什么事情明天再说吧。」熟悉的吃醋语境、熙旺已经被提到或确有理由时可说：「你去找你的好哥哥熙旺聊吧，我要睡觉了。」不在无关情境突然提熙旺，不连续照搬范例。想结束就选 hang_up，台词说完由程序真实挂断，不再追加客套告别。';
}
const boundary=/[見见]面.{0,15}(?:[說说]|[聊谈談])|不想[說说談谈]|不方便[說说]|晚[點点]再[說说]|[先別别].{0,8}[問问]|[沒没]什[麼么]好[說说]/;
export function planCallSpeech({text='',history=[],behavior={},opening=false,event='',closing=false}={}){
 const max=Math.max(1,Math.min(5,Number(behavior.callMaxSegments)||5));
 const explicit=wantsMoreCallSpeech(text);
 const short=opening||event==='unheard'||event==='nudge'||briefTurn.test(String(text).trim())||isQuietCallRequest(text)||behavior.callDetail==='brief';
 const recent=history.filter(t=>t.role==='user').slice(-3);
 const smallTalk=recent.length>=3&&recent.every(t=>String(t.content||'').trim().length<=28);
 const close=closing;
 const cap=Math.min(max,close?2:explicit||opening?5:short?2:behavior.callDetail==='natural'?3:4);
 // Segment count is an upper bound, not a minimum to fill with another AI call.
 // A single substantial answer is often better and faster than three short denials.
 return {minSegments:1,maxSegments:cap,smallTalk,close,explicit};
}
export function needsCallContinuation(segments,plan){
 if(plan.close||segments.length>=plan.minSegments||!segments.length)return false;
 if(!plan.explicit&&segments.some(e=>boundary.test(e.text)||/[。！？!?].+[。！？!?]/.test(e.text)))return false;
 return true;
}
const farewell=/先掛|先挂|掛了|挂了|聊到[這这][裡里]|先聊到|晚安|再[見见]|拜拜|下次聊|(?:晚[點点]|明天)(?:再)?[聊說说談谈]|改天聊|先去忙|先這樣|先这样|去吃[飯饭]吧|我要睡[覺觉]/;
export function finalizeCallSegments(entries,{close=false,closingLine='好了，先聊到這裡吧。',maxSegments=5}={}){
 const endAfter=close;
 if(!endAfter)return {segments:entries,endAfter:false};
 const limit=maxSegments;
 const selected=entries.slice(0,limit);
 if(selected.length&&farewell.test(selected.at(-1).text)&&taiCallFarewellIntent(selected.at(-1).text)!=='warn')return {segments:selected,endAfter:true};
 // Reserve the final playable segment. Never cut away the actual goodbye.
 return {segments:[...selected.slice(0,Math.max(0,limit-1)),{text:closingLine,tone:'neutral',mode:'voice'}],endAfter:true};
}
export function nextNaturalCallIdleEvent(snapshot,now=Date.now(),settings={}){
 if(snapshot.state!=='connected'||snapshot.closingPending||snapshot.busy||snapshot.listening||snapshot.requestingMic||snapshot.transcribing||snapshot.audioReady||!snapshot.lastTaiEndAt)return '';
 if(snapshot.quietUntil&&now<snapshot.quietUntil)return '';
 const mode=settings.callIdleMode||'natural';
 const scale=mode==='active'?0.65:mode==='quiet'?2:1;
 const elapsed=now-snapshot.lastTaiEndAt;
 if(snapshot.warnedAt&&now-snapshot.warnedAt>=15000)return 'closing';
 if(snapshot.nudgeCount===0&&elapsed>=Math.max(10000,Number(settings.callNudgeSeconds||10)*1000*scale))return 'nudge';
 if(snapshot.nudgeCount===1&&elapsed>=Math.max(20000,Number(settings.callCloseSeconds||125)*1000*scale))return 'closing';
 return '';
}

// The call asks one model turn, based on the player's *actual* question.
// It may keep secrets, but cannot trade an answer for two versions of "not now".
export function callAnswerGuidance(text='',history=[]){
 const input=String(text||'').trim().slice(0,500);
 if(!input)return '';
 const why=/(?:為什麼|为什么|為何|为何|怎麼|怎么)(?:.{0,25})[？?]?/u.test(input);
 const explanation=/[？?]|(?:能不能|可不可以|到底|怎麼辦|怎么办|什麼原因|什么原因|為何|为何)/u.test(input);
 if(!why&&!explanation)return '';
 const focus='【本輪問題優先】熙蒙實際問的是「'+input.slice(0,180)+'」。先正面回應這個問題。'+(why?'這是追問原因：結合已經確定的事給出一項真正的原因、顧慮、打算，或具體說明現在不能透露哪部分；別用兩句拒絕代替理由。':'普通問題簡潔答就好，若沒有值得展開的內容不要硬加解釋。')+' 可以有情緒和文學性，但不能靠換詞重複、空泛反問或臨時編造行程、警方動向和已完成的承諾。一段完整話就夠，不必拆成多段。';
 if(!/(?:不來|不来|來不了|来不了|不去|去不了).{0,6}(?:澳門|澳门)|(?:澳門|澳门).{0,8}(?:不來|不来|不去|去不了)/u.test(input))return focus;
 const mentionedOutside=Array.isArray(history)&&history.some(t=>t?.role==='assistant'&&/(?:英國|英国|葡萄牙|安排|退路|離開|离开)/u.test(String(t.content||'')));
 return focus+' 【澳門來訪追問】不要連發「現在還不是時候」「現在不行」。如果此前真的提到能幫熙蒙和熙旺安排去英國或葡萄牙，請解釋自己留在外面能做什麼、和自己暫不來澳門的取捨；不要把這個推論冒充新增的劇情事實。'+(mentionedOutside?'前文確實談過外部協助，可以自然承接實際承諾。':'只有可核對的已說內容才能承接；若沒有根據，不要假稱有過這項承諾。');
}


// Only repair an explicit yesterday reference in *new free-call AI speech*.
// "剛才你問…" can truthfully refer to this ongoing call and stays intact.
// Never touch authored call lines, user transcripts, or an ordinary call with
// no explicit past-day reference; no new API request or second time service.
export function correctCallYesterdayReference(entries=[],playerText=''){
 if(!/(?:昨天|昨晚|昨日)/u.test(String(playerText||'')))return entries;
 const pastAction=/(?:剛才|刚才|剛剛|刚刚)(?=(?:\s*)(?:說過|说过|談過|谈过|提過|提过|答應|答应|約好|约好|發生|发生|的事|的安排|那件事|那個事|那个事))/gu;
 const repair=text=>String(text||'').replace(pastAction,'昨天');
 return entries.map(entry=>{
  if(!entry||typeof entry!=='object')return entry;
  const text=repair(entry.text),speechText=entry.speechText?repair(entry.speechText):undefined;
  return text!==entry.text||speechText!==entry.speechText?{...entry,text,...(speechText?{speechText}:{})}:entry;
 });
}
