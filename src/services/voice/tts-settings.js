// MiniMax Speech 2.8 controls; only validated synthesis options reach the API.
export const TTS_EMOTIONS=[['calm','冷静'],['auto','跟随文本'],['happy','开心'],['sad','难过'],['angry','生气'],['fearful','害怕'],['disgusted','嫌弃'],['surprised','惊讶']];
export const TTS_LANGUAGES=[['Chinese','普通话'],['Chinese,Yue','粤语'],['auto','自动 / 混合语种'],['English','英语'],['Portuguese','葡萄牙语'],['French','法语'],['Japanese','日语'],['Korean','韩语'],['Spanish','西班牙语'],['German','德语']];
export const TTS_CUES=[['none','无'],['chuckle','轻笑'],['laughs','笑声'],['sighs','叹气'],['emm','嗯'],['breath','换气'],['clear-throat','清嗓'],['coughs','咳嗽'],['groans','低哼'],['pant','喘气'],['inhale','吸气'],['exhale','呼气'],['gasps','倒吸气'],['sniffs','吸鼻子'],['snorts','鼻息'],['burps','打嗝'],['lip-smacking','咂嘴'],['humming','哼唱'],['hissing','嘶声'],['sneezes','喷嚏']];
export const TTS_EFFECTS=[['none','无'],['spacious_echo','空旷回音'],['auditorium_echo','礼堂广播'],['lofi_telephone','电话失真'],['robotic','电音']];
export const TTS_DEFAULTS=Object.freeze({speed:1,pitch:0,volume:1,emotion:'calm',language:'Chinese',cue:'none',sampleRate:32000,bitrate:128000,channel:1,modifyPitch:0,intensity:0,timbre:0,soundEffect:'none',normalization:'off'});
const numeric=(v,min,max,def,integer=false)=>{if(v==null||v==='')return def;const n=Number(v);return Number.isFinite(n)?(integer?Math.round(Math.max(min,Math.min(max,n))):Math.max(min,Math.min(max,n))):def;};
const pick=(v,list,def)=>list.includes(v)?v:def;
export function normalizeTtsSettings(input={},base=TTS_DEFAULTS){
 const d={...TTS_DEFAULTS,...base},v=input||{};
 return {speed:numeric(v.speed,.5,2,d.speed),pitch:numeric(v.pitch,-12,12,d.pitch,true),volume:numeric(v.volume,.01,10,d.volume),
  emotion:pick(v.emotion,TTS_EMOTIONS.map(x=>x[0]),d.emotion),language:pick(v.language,TTS_LANGUAGES.map(x=>x[0]),d.language),cue:pick(v.cue,TTS_CUES.map(x=>x[0]),d.cue),
  sampleRate:pick(Number(v.sampleRate),[8000,16000,22050,24000,32000,44100],d.sampleRate),bitrate:pick(Number(v.bitrate),[32000,64000,128000,256000],d.bitrate),channel:pick(Number(v.channel),[1,2],d.channel),
  modifyPitch:numeric(v.modifyPitch,-100,100,d.modifyPitch,true),intensity:numeric(v.intensity,-100,100,d.intensity,true),timbre:numeric(v.timbre,-100,100,d.timbre,true),
  soundEffect:pick(v.soundEffect,TTS_EFFECTS.map(x=>x[0]),d.soundEffect),normalization:pick(v.normalization,['off','basic','quality'],d.normalization)};
}
export function ttsProviderSettings(v){
 const s=normalizeTtsSettings(v),changed=s.modifyPitch||s.intensity||s.timbre||s.soundEffect!=='none';
 return {language_boost:s.language,
  voice_setting:{speed:s.speed,vol:s.volume,pitch:s.pitch,...(s.emotion==='auto'?{}:{emotion:s.emotion})},
  audio_setting:{sample_rate:s.sampleRate,bitrate:s.bitrate,format:'mp3',channel:s.channel},
  ...(changed?{voice_modify:{pitch:s.modifyPitch,intensity:s.intensity,timbre:s.timbre,...(s.soundEffect==='none'?{}:{sound_effects:s.soundEffect})}}:{}),
  ...(s.normalization==='off'?{}:{text_normalization_mode:s.normalization})};
}
export function ttsCueText(text,cue){return cue&&cue!=='none'&&TTS_CUES.some(x=>x[0]===cue)?'('+cue+')'+text:text;}
