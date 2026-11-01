// DeepSeek may return a JSON object, a JSON array, a double-encoded JSON
// string, or a fenced JSON snippet. None of that syntax is a voice transcript.
import {humanizeTaiText} from './humanize.js';
const voiceMarks=/\((?:laughs|chuckle|coughs|clear-throat|groans|breath|pant|inhale|exhale|gasps|sniffs|sighs|snorts|burps|lip-smacking|humming|hissing|emm|sneezes)\)/gi;
const cleanedText=value=>String(value||'').replace(voiceMarks,'').replace(/<#\d+(?:\.\d+)?#>/g,'').replace(/[ \t]{2,}/g,' ').trim();
const structural=s=>/^\s*(?:```(?:json)?|\{\s*"(?:messages|text|reply|mode)"|\[\s*\{|\\"|\[\s*\")/i.test(s);
function decodeJSON(value){
 let v=value;
 for(let i=0;i<4;i++){
  if(typeof v!=='string')break;
  const str=v.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  let parsed;
  try{parsed=JSON.parse(str);}catch{
   const start=Math.min(...['{','['].map(ch=>{const at=str.indexOf(ch);return at<0?Infinity:at;}));
   const end=Math.max(str.lastIndexOf('}'),str.lastIndexOf(']'));
   if(!Number.isFinite(start)||end<=start)return v;
   try{parsed=JSON.parse(str.slice(start,end+1));}catch{return v;}
  }
  v=parsed;
 }
 return v;
}
function extractEntries(value){
 const parsed=decodeJSON(value);
 if(Array.isArray(parsed))return parsed;
 if(parsed&&typeof parsed==='object'){
  if(Array.isArray(parsed.messages))return parsed.messages;
  if(Array.isArray(parsed.replies))return parsed.replies;
  if(Array.isArray(parsed.content))return parsed.content;
  if(typeof parsed.text==='string'||typeof parsed.reply==='string')return [parsed];
  if(typeof parsed.content==='string')return extractEntries(parsed.content);
 }
 if(typeof parsed==='string'&&!structural(parsed))return [{text:parsed}];
 throw Error('AI 返回了无法解析的结构化内容；已阻止将 JSON 当作台词或语音播放');
}
export function unpackTaiReply(response,channel='noapp'){
 const source=typeof response==='string'?response:typeof response?.text==='string'?response.text:response;
 const initial=extractEntries(source);
 const entries=initial.flatMap(item=>{
  if(typeof item==='string')return extractEntries(item);
  if(item&&typeof item==='object'){
   const txt=item.text??item.reply??item.content??'';
   if(typeof txt==='string'&&structural(txt)){
    const inner=decodeJSON(txt);
    if(typeof inner!=='string')return extractEntries(inner);
    throw Error('AI 的消息文字包含未能解析的 JSON');
   }
   return [{...item,text:txt}];
  }
  return [];
 });
 const normalized=entries.slice(0,6).flatMap(x=>{
  const mode=channel==='call'||channel==='noapp'&&x?.mode==='voice'?'voice':'text';
  const speechText=humanizeTaiText(String(x?.text||'').trim().slice(0,3000),{stripStage:false});
  const display=humanizeTaiText(cleanedText(speechText));
  const tone=['dry','playful','soft','serious','neutral'].includes(x?.tone)?x.tone:'neutral';
  if(!display)return [];
  // Free text is sent as distinct chat bubbles at semicolons and line breaks;
  // audio remains one uninterrupted speech segment.
  const split=mode==='text'?display.split(/[；;]|\n\s*\n|\n+/).map(v=>v.trim()).filter(Boolean):[display];
  const parts=split.length>1?(/[；;]/.test(display)?split.map(v=>v.replace(/[，,。．]+$/u,'').trim()).filter(Boolean):split):[display];
  const pieces=parts.length>6?[...parts.slice(0,5),parts.slice(5).join('，')]:parts;
  return pieces.map(text=>({text,mode,tone,...(mode==='voice'?{speechText}:{} )}));
 }).slice(0,6).filter(x=>x.text);
 if(!normalized.length)throw Error('AI 没有返回可显示的消息');
 return normalized;
}
// Legacy saves created before the fix may contain serialized JSON inside voiceCaption.
export function readableTaiVoiceText(value){
 const raw=String(value??'').trim();
 if(!raw)return '';
 if(!structural(raw))return cleanedText(raw);
 try{return unpackTaiReply(raw,'call').map(x=>x.text).join(' ');}
 catch{return '语音转写异常，原始数据已隐藏';}
}
