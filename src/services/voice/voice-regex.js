// Speech-2.8-hd speech layer. Adapted from "MiniMax Speech 2.8 HD 中文语音世界书" by 仓鼠.
// Chat text and subtitles never contain performance tags: only this TTS layer adds them.
const TAGS=new Set(['laughs','chuckle','coughs','clear-throat','groans','breath','pant','inhale','exhale','gasps','sniffs','sighs','snorts','burps','lip-smacking','humming','hissing','emm','sneezes']);
const ALIASES={gasp:'gasps',sigh:'sighs',laugh:'laughs'};
const MOODS={
 neutral:{speed:1,emotion:null},dry:{speed:1,emotion:null},
 playful:{speed:1.03,emotion:null},soft:{speed:.97,emotion:null},
 serious:{speed:.98,emotion:null},danger:{speed:1.02,emotion:null},
 happy:{speed:1.03,emotion:'happy'},sad:{speed:.96,emotion:'sad'},
 angry:{speed:1.03,emotion:'angry'},fearful:{speed:1.04,emotion:'fearful'},
 surprised:{speed:1.05,emotion:'surprised'},disgusted:{speed:1,emotion:'disgusted'}
};
function hash(s){let n=2166136261;for(const ch of s)n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;return n;}
function withoutMarks(s){return s.replace(/\([a-z-]+\)/gi,'').replace(/<#\d+(?:\.\d+)?#>/g,'');}
function sanitize(raw){
 return String(raw||'')
  .replace(/\(([\w\s-]+)\)/gi,(_,s)=>{const tag=ALIASES[s.trim().toLowerCase()]||s.trim().toLowerCase();return TAGS.has(tag)?'('+tag+')':'';})
  .replace(/（[^（）]{1,50}）/g,'')
  .replace(/<#[^>#]{0,40}#>/g,m=>{const n=Number(m.slice(2,-2));return Number.isFinite(n)&&n>=.01&&n<=99.99&&/^\d+(?:\.\d{1,2})?$/.test(m.slice(2,-2))?m:'';})
  .replace(/(?:\s*<#(?:\d+(?:\.\d+)?)#>\s*){2,}/g,' <#0.35#> ')
  .trim();
}
// The uploaded 2.8 worldbook specifies exactly one (breath) at the opening
// and after each Chinese full stop, not after commas, questions or newlines.
function sentenceBreaths(text){
 return text.split('。').map(part=>{
  if(!withoutMarks(part).trim())return part;
  const leading=(part.match(/^\s*/)||[''])[0],body=part.slice(leading.length);
  return /^\(breath\)/.test(body)?part:leading+'(breath)'+body;
 }).join('。');
}
function dedupeEvents(text){
 return text
  .replace(/\((?:laughs|chuckle)\)\s*(?:哈哈+|呵呵+|嘿嘿+)/g,m=>m.match(/^\([^)]+\)/)[0])
  .replace(/\(emm\)\s*(?:嗯+|呃+)(?=[，,。！？?!\s]|$)/g,'(emm)')
  .replace(/\(sighs\)\s*(?:唉+|哎+)(?=[，,。！？?!\s]|$)/g,'(sighs)')
  .replace(/\(clear-throat\)\s*(?:咳咳+|咳咳)/g,'(clear-throat)')
  .replace(/(?:\(breath\)){2,}/g,'(breath)');
}
function countOtherSounds(s){
 return (s.match(/\((?!breath\))[a-z-]+\)/gi)||[]).length;
}
function addExpressiveCue(text,tone){
 const raw=withoutMarks(text),spoken=raw.replace(/\s/g,'');
 // A sound is meaningful only when grounded by words/tone; never add a random laugh.
 if(countOtherSounds(text)>0||spoken.length<8)return text;
 let label='';
 if((tone==='playful'||tone==='happy')&&/开玩笑|逗你|好笑|笑死|真有你的|有意思/.test(raw))label='chuckle';
 else if((tone==='sad'||tone==='soft')&&/唉|算了|没办法|好累|太累了|受不了/.test(raw))label='sighs';
 else if(tone==='surprised'&&/怎么会|真的假的|什么情况/.test(raw))label='gasps';
 if(!label)return text;
 return text.replace(/^\(breath\)/,'(breath)('+label+')');
}
function addThoughtPause(s,tone){
 if(/<#\d/.test(s)||withoutMarks(s).length<70)return s;
 // Max one additional brief pause; prefer a genuine clause boundary.
 const positions=[];const r=/[，；;、]/g;let match;
 while((match=r.exec(s)))if(match.index>s.length*.28&&match.index<s.length*.72)positions.push(match.index+1);
 if(!positions.length)return s;
 const selected=positions[hash(s+tone)%positions.length];
 const pause=tone==='serious'||tone==='soft'?'0.35':'0.20';
 return s.slice(0,selected)+'<#'+pause+'#>'+s.slice(selected);
}
export function prepareXitaiSpeech(input,{tone='neutral',autoTags=true}={}){
 const setting=MOODS[tone]||MOODS.neutral;
 let result=sanitize(input);
 if(!result)return {text:'',speed:setting.speed,emotion:setting.emotion,tagCount:0,characterCount:0,prosodyBeats:0};
 // Only the actual sound is kept, never the accompanying onomatopoeia.
 result=result.replace(/(?:木啊|木嘛|啵啵)/g,'(lip-smacking)');
 result=dedupeEvents(result);
 const spoken=withoutMarks(result),characterCount=spoken.length;
 if(autoTags&&spoken.trim()){
  result=sentenceBreaths(result);
  result=addExpressiveCue(result,tone);
  result=addThoughtPause(result,tone);
 }
 result=result
  .replace(/^\s*<#\d+(?:\.\d+)?#>/,'')
  .replace(/<#\d+(?:\.\d+)?#>\s*$/,'')
  .replace(/(?:\s*<#\d+(?:\.\d+)?#>\s*){2,}/g,' <#0.35#> ')
  .replace(/\(breath\)\s*\(breath\)/g,'(breath)');
 return {text:result,speed:setting.speed,emotion:setting.emotion,tone,
  tagCount:(result.match(/\([a-z-]+\)/g)||[]).length,characterCount,
  prosodyBeats:(result.match(/<#/g)||[]).length+1};
}
export const XITAI_SUPPORTED_TAGS=[...TAGS];
