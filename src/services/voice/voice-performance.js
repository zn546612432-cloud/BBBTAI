// A consistent actor should keep the same timbre across dramatic turns.
// MiniMax's emotion control is optional, so use natural phrasing as the default.
// The expressive laboratory profile retains the full authored Speech 2.8
// performance tags for deliberate A/B comparisons, not the live default.
import {prepareXitaiSpeech} from './voice-regex.js';

export const VOICE_STYLES=Object.freeze(['stable','expressive']);
export const normalizeVoiceStyle=value=>VOICE_STYLES.includes(value)?value:'stable';

export function prepareTaiVoicePerformance(text,{tone='neutral',style='stable'}={}){
 const selected=normalizeVoiceStyle(style);
 if(selected==='expressive')
  return {...prepareXitaiSpeech(text,{tone,autoTags:true}),voiceStyle:selected};
 // Preserve supported explicitly authored sound events while avoiding
 // obligatory breath before every sentence and per-bubble emotional shifts.
 const base=prepareXitaiSpeech(text,{tone:'neutral',autoTags:false});
 let spoken=base.text;
 const words=spoken.replace(/\([a-z-]+\)/gi,'').replace(/<#\d+(?:\.\d+)?#>/g,'').trim();
 // A single subtle lead-in breath for an actual longer utterance is enough;
 // the model already performs punctuation on shorter clauses naturally.
 if(words.length>=25&&!/^\s*\((?:breath|inhale|exhale|sighs|chuckle|laughs)\)/.test(spoken))
  spoken='(breath)'+spoken;
 return {...base,text:spoken,voiceStyle:selected,speed:1,emotion:null,tagCount:(spoken.match(/\([a-z-]+\)/g)||[]).length};
}
