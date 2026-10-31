// AI output normalization shared by NoApp, MIRAGE and Chess.
// Text messages are NEVER TTS input: stage directions and breathing tags
// belong only in the optional voice payload.
const voiceMarks=/\((?:laughs|chuckle|coughs|clear-throat|groans|breath|pant|inhale|exhale|gasps|sniffs|sighs|snorts|burps|lip-smacking|humming|hissing|emm|sneezes)\)/gi;
const cleanedText=value=>String(value||'').replace(voiceMarks,'').replace(/<#\d+(?:\.\d+)?#>/g,'').replace(/[ \t]{2,}/g,' ').trim();
export function unpackTaiReply(response,channel='noapp'){
 const raw=typeof response==='string'?response:String(response?.text||'');
 let parsed;
 try{parsed=JSON.parse(raw.replace(/^\s*```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim());}catch{parsed=null;}
 const entries=Array.isArray(parsed?.messages)?parsed.messages:parsed?.reply?[{text:parsed.reply,mode:parsed.mode,tone:parsed.tone}]:[{text:raw}];
 const normalized=entries.slice(0,6).flatMap(x=>{
  const mode=channel==='call'||channel==='noapp'&&x?.mode==='voice'?'voice':'text';
  const speechText=String(x?.text||'').trim().slice(0,3000);
  const display=cleanedText(speechText);
  const tone=['dry','playful','soft','serious','neutral'].includes(x?.tone)?x.tone:'neutral';
  if(!display)return [];
  // A paragraph break in a short written reply indicates distinct send events.
  // Never split one long technical explanation or a voice recording.
  const chunks=mode==='text'&&display.length<950?display.split(/\n\s*\n|(?<=。)[\n]+/).map(v=>v.trim()).filter(Boolean):[display];
  const pieces=chunks.length>=2&&chunks.length<=6&&chunks.every(v=>v.length<=400)?chunks:[display];
  return pieces.map(text=>({text,mode,tone,...(mode==='voice'?{speechText}:{} )}));
 }).slice(0,6).filter(x=>x.text);
 if(!normalized.length)throw Error('AI 没有返回可显示的消息');
 return normalized;
}
