// Explicit voice NOTES, distinct from a voice phone call or casual "say something".
const request=/(?:给我|发我|发一|发两|来一|来条|录一|发个|发条|听听你|想听你|能不能).{0,10}(?:语音|录音|声音)|(?:语音|录音).{0,8}(?:给我|发来|发一个|发条|发过来)/;
const decline=/(?:不要|别|先别|不用|取消|禁止).{0,8}(?:语音|录音)|(?:语音|录音).{0,6}(?:不要|别发|不用)/;
const phone=/(?:语音通话|打电话|拨电话|call me|ring me)/i;
export function taiExplicitVoiceRequest(text){
 const s=String(text||'');
 return !decline.test(s)&&!phone.test(s)&&request.test(s);
}
export function honorTaiVoiceRequest(decision,{text='',available=false}={}){
 if(!decision||!available||!taiExplicitVoiceRequest(text))return decision;
 if(decision.action!=='send_text'||decision.strategy==='set_boundary')return decision;
 // The model opted to speak rather than refuse; fulfil the requested medium.
 return {...decision,action:'send_voice'};
}

// One 'send_voice' action is one playable audio note, even when the v12
// expression planner selected 2-5 spoken thoughts. This avoids five MP3
// synthesis requests for a single voice-note request on iPhone.
export function combineTaiVoiceThoughts(entries=[]){
 if(!Array.isArray(entries)||entries.length<2||entries.some(m=>m?.action==='phone'))return entries;
 const contents=entries.map(m=>String(m?.speechText||m?.text||'').trim()).filter(Boolean);
 if(contents.length<2)return entries;
 const spoken=contents.map((part,i)=>{
  const stripped=part.replace(/[\s]+$/,'');
  // Preserve original punctuation, add a small breath only when needed.
  return i<contents.length-1&&!/[。！？!?…，,；;]$/.test(stripped)?stripped+'。':stripped;
 }).join(' ');
 return [{...entries[0],text:spoken,speechText:spoken,mode:'voice',
  // The entire voice note is one utterance by the same character.
  tone:entries.at(-1)?.tone||entries[0]?.tone||'neutral',
  vocalCue:entries.at(-1)?.vocalCue||entries[0]?.vocalCue||'none',
  // A partial translation of one line is not a translation of the whole audio.
  translation:undefined
 }];
}
