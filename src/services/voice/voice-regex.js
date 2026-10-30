// MiniMax Speech 2.8 text composer inspired by the uploaded "语音世界书3.0"
// (original document credited to N1001; full text archived separately).
// Structured transformations, not a verbatim prompt pasted into an API body.
const TAGS=new Set(['laughs','chuckle','coughs','clear-throat','groans','breath','pant','inhale','exhale','gasps','sniffs','sighs','snorts','burps','lip-smacking','humming','hissing','emm','sneezes']);
const ALIASES={gasp:'gasps',sigh:'sighs',laugh:'laughs',crying:'sniffs',yawns:'sighs',whispers:'breath'};
const EMOTION={
 neutral:{speed:0.92,emotion:'',tag:'breath'},
 dry:{speed:0.91,emotion:'',tag:'snorts'},
 playful:{speed:0.96,emotion:'fluent',tag:'chuckle'},
 soft:{speed:0.87,emotion:'calm',tag:'exhale'},
 serious:{speed:0.90,emotion:'calm',tag:'breath'},
 danger:{speed:0.91,emotion:'calm',tag:'inhale'},
 happy:{speed:0.99,emotion:'happy',tag:'chuckle'},
 sad:{speed:0.86,emotion:'sad',tag:'sighs'},
 angry:{speed:0.91,emotion:'angry',tag:'snorts'},
 fearful:{speed:1.00,emotion:'fearful',tag:'inhale'},
 surprised:{speed:0.97,emotion:'surprised',tag:'gasps'},
 disgusted:{speed:0.95,emotion:'disgusted',tag:'snorts'}
};
function hash(s){let n=2166136261;for(const ch of s)n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;return n;}
const cleanTags=input=>String(input||'')
 .replace(/\(([\w\s-]+)\)/gi,(m,v)=>{
   const t=v.trim().toLowerCase();
   const tag=ALIASES[t]||t;
   return TAGS.has(tag)?'('+tag+')':'';
 })
 .replace(/[（][^（）]{1,40}[）]/g,'')
 .replace(/(?:<#[\d.]+#>\s*){2,}/g,'<#0.35#> ')
 .replace(/<#[^>#]{0,30}#>/g,m=>{
   const n=Number(m.slice(2,-2));
   return Number.isFinite(n)&&n>=0.01&&n<=99.99?m:'';
 });
function insertBreath(s,tag){
 let boundary=-1;
 const clauses=/[，、；;。.!！？?]/g;let m;
 while((m=clauses.exec(s))&&m.index<s.length*.75){if(m.index>s.length*.22)boundary=m.index+1;}
 if(boundary<0){boundary=Math.max(1,Math.floor(s.length*.60));}
 return s.slice(0,boundary)+'('+tag+')'+s.slice(boundary);
}
function countTags(s){return (s.match(/\((?:[a-z-]+)\)/gi)||[]).length;}
function capTags(s,budget){
 let seen=0;
 return s.replace(/\((?:[a-z-]+)\)/gi,x=>++seen<=budget?x:'');
}
export function prepareXitaiSpeech(text,{tone='neutral',autoTags=true}={}){
 const mood=EMOTION[tone]||EMOTION.neutral;
 let result=cleanTags(text).trim();
 if(!result)return {text:'',speed:mood.speed,emotion:mood.emotion};
 const originalNoTags=result.replace(/\([a-z-]+\)/gi,'');
 const charCount=originalNoTags.length;
 const budget=Math.min(Math.max(1,Math.ceil(charCount/31)),Math.max(1,Math.floor(charCount/25)+1),8);
 // BRE-01/05/07: semantic breathing only in sufficiently long lines.
 // 2.8 has native sound tags, but (gasps) is the supported spelling.
 const seed=hash(result+tone);
 if(autoTags&&charCount>31&&countTags(result)<budget){
  result=insertBreath(result, charCount>85&&seed%3===0?'exhale':'breath');
 }
 // B4 / light scoffing, when the sentence actually sounds teasing.
 if(autoTags&&countTags(result)<budget&&charCount>=8&&charCount<160
   &&!['danger','serious','fearful','sad'].includes(tone)
   &&tone==='dry'&&seed%7===2&&!/跟踪|危险|救命|出事|失踪|死亡/.test(result)){
   result=result.replace(/([。？！!?])/,'(chuckle)$1');
 }
 if(autoTags&&countTags(result)<budget&&tone==='playful'&&charCount>=10&&seed%5===1){
  result=result.replace(/([。？！!?])/,'(chuckle)$1');
 }
 // KIS rules: only if the message really includes a kiss action; avoid
 // saying "木啊" as spoken text. Never rewrite normal "亲" in ordinary usage.
 if(/(?:木啊|木嘛|啵啵)/.test(result)){
   result=result.replace(/(?:木啊|木嘛|啵啵)/g,'(lip-smacking)');
 }
 // Limit artificial breathing and laugh spam; long speeches get some breaths,
 // short messages can be entirely plain.
 result=capTags(result,budget);
 // Remove pause tokens at start/end, and prevent unpronounceable double pauses.
 result=result.replace(/^\s*<#(?:\d+(?:\.\d+)?)#>\s*/,'').replace(/\s*<#(?:\d+(?:\.\d+)?)#>\s*$/,'');
 result=result.replace(/(?:\s*<#(?:\d+(?:\.\d+)?)#>\s*){2,}/g,' <#0.35#> ');
 return {text:result, speed:mood.speed,emotion:mood.emotion,tone,tagCount:countTags(result),characterCount:charCount};
}
export const XITAI_SUPPORTED_TAGS=[...TAGS];
