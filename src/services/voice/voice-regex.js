// MiniMax Speech 2.8 text composer inspired by the uploaded "语音世界书3.0"
// (original document credited to N1001; full text archived separately).
// Structured transformations, not a verbatim prompt pasted into an API body.
const TAGS=new Set(['laughs','chuckle','coughs','clear-throat','groans','breath','pant','inhale','exhale','gasps','sniffs','sighs','snorts','burps','lip-smacking','humming','hissing','emm','sneezes']);
const ALIASES={gasp:'gasps',sigh:'sighs',laugh:'laughs',crying:'sniffs',yawns:'sighs',whispers:'breath'};
// The character's baseline is calm and slow. Model 'angry'/'happy' presets
// exaggerate intonation; communicate emotion through wording and pauses instead.
const EMOTION={
 neutral:{speed:0.87,emotion:'fluent'},
 dry:{speed:0.83,emotion:'calm'},
 playful:{speed:0.89,emotion:'fluent'},
 soft:{speed:0.82,emotion:'calm'},
 serious:{speed:0.82,emotion:'calm'},
 danger:{speed:0.83,emotion:'calm'},
 happy:{speed:0.87,emotion:'fluent'},
 sad:{speed:0.80,emotion:'sad'},
 angry:{speed:0.83,emotion:'angry'},
 fearful:{speed:0.82,emotion:'fearful'},
 surprised:{speed:0.88,emotion:'surprised'},
 disgusted:{speed:0.83,emotion:'calm'}
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
 // Never place a synthetic breath in the middle of a Chinese word.
 // Natural punctuation already gives TTS a pause when there is no boundary.
 if(boundary<0)return s;
 return s.slice(0,boundary)+'('+tag+')'+s.slice(boundary);
}
function countTags(s){return (s.match(/\((?:[a-z-]+)\)/gi)||[]).length;}
function capTags(s,budget){
 let seen=0;
 return s.replace(/\((?:[a-z-]+)\)/gi,x=>++seen<=budget?x:'');
}
// Add up to three naturally distinct prosodic beats to a *long* speech
// segment: entry, inflection, and landing. Short phrases must remain intact;
// fabricating three reactions inside "嗯" would sound absurd.
function cadence(text,{tone='neutral'}={}){
 const raw=text.replace(/\([a-z-]+\)/gi,'').replace(/<#\d+(?:\.\d+)?#>/g,'');
 if(raw.length<28)return text;
 const points=[];const regex=/[，、；;。！？?!]/g;let match;
 while((match=regex.exec(text))!==null){
  const end=match.index+match[0].length;
  if(end>text.length*.18&&end<text.length*.84&&
   !/^\s*(?:<#|\()/.test(text.slice(end,end+5)))points.push(end);
 }
 // Prefer real clause boundaries, not arbitrary syllable slicing.
 if(points.length<2)return text;
 const left=points.find(n=>n>=text.length*.23&&n<=text.length*.55)??points[0];
 const right=points.find(n=>n>=text.length*.56&&n<=text.length*.83&&n>left+4);
 if(!right)return text;
 const pauseA=tone==='serious'||tone==='soft'?'0.28':'0.20';
 const pauseB=tone==='playful'?'0.16':'0.32';
 return text.slice(0,left)+'<#'+pauseA+'#>'+text.slice(left,right)+'<#'+pauseB+'#>'+text.slice(right);
}
export function prepareXitaiSpeech(text,{tone='neutral',autoTags=true}={}){
 const mood=EMOTION[tone]||EMOTION.neutral;
 let result=cleanTags(text).trim();
 if(!result)return {text:'',speed:mood.speed,emotion:mood.emotion};
 const originalNoTags=result.replace(/\([a-z-]+\)/gi,'');
 const charCount=originalNoTags.length;
 const budget=Math.min(Math.max(1,Math.ceil(charCount/65)),3);
 const seed=hash(result+tone);
 // Sound tags only if the actual semantics justify them; do not add
 // three chuckles, sniffs or gasps merely to make a voice sound "expressive".
 if(autoTags&&charCount>68&&countTags(result)<budget&&!/\(breath\)|\(inhale\)|\(exhale\)/.test(result)){
  result=insertBreath(result,'breath');
 }
 if(autoTags&&tone==='playful'&&charCount>=28&&seed%5===0&&countTags(result)<budget&&/笑|逗|好玩|厉害|吃醋|开玩笑/.test(result)){
  result=insertBreath(result,'chuckle');
 }
 if(/(?:木啊|木嘛|啵啵)/.test(result))result=result.replace(/(?:木啊|木嘛|啵啵)/g,'(lip-smacking)');
 result=capTags(result,budget);
 if(autoTags&&!/<#\d/.test(result))result=cadence(result,{tone});
 result=result.replace(/^\s*<#(?:\d+(?:\.\d+)?)#>\s*/,'')
  .replace(/\s*<#(?:\d+(?:\.\d+)?)#>\s*$/,'')
  .replace(/(?:\s*<#(?:\d+(?:\.\d+)?)#>\s*){2,}/g,' <#0.35#> ');
 return {text:result,speed:mood.speed,emotion:mood.emotion,tone,tagCount:countTags(result),characterCount:charCount,
  prosodyBeats:Math.min(3,(result.match(/<#/g)||[]).length+1)};
}
export const XITAI_SUPPORTED_TAGS=[...TAGS];
