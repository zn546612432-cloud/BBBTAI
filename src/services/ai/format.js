// AI output normalization shared by NoApp, MIRAGE and Chess.
// Never trust the model's requested channel or inserted markup.
export function unpackTaiReply(response,channel='noapp'){
 const raw=typeof response==='string'?response:String(response?.text||'');
 let parsed;
 try{parsed=JSON.parse(raw.replace(/^\s*```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim());}catch{parsed=null;}
 let entries=Array.isArray(parsed?.messages)?parsed.messages:parsed?.reply?[{text:parsed.reply,mode:parsed.mode,tone:parsed.tone}]:[{text:raw}];
 const clean=entries.slice(0,6).map(x=>({
  text:String(x?.text||'').trim().slice(0,3000),
  mode:channel==='noapp'&&x?.mode==='voice'?'voice':'text',
  tone:['dry','playful','soft','serious','neutral'].includes(x?.tone)?x.tone:'neutral'
 })).filter(x=>x.text);
 if(!clean.length)throw Error('AI 没有返回可显示的消息');
 return clean;
}
