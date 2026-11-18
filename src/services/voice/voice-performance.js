// The author prefers a single cool, recognisable Xitai voice over model-driven
// acting. Always request MiniMax's explicit "calm" emotion; OMITTING emotion
// allows auto-detection and can change the apparent speaker mid-call.
// Live direction uses the approved light-density MiniMax skill rules.
// Authoring/preview retains independent explicit controls.
import {prepareXitaiSpeech,XITAI_DIRECTED_SPEED} from './voice-regex.js';

export const VOICE_STYLES=Object.freeze(['calm']);
// Old preview saves can contain "expressive"; never let that override this
// author's newer instruction. Safe to leave the API keys in sessionStorage.
export const normalizeVoiceStyle=()=> 'calm';

export function prepareTaiVoicePerformance(text,{tone='neutral',directed=false}={}){
 const base=prepareXitaiSpeech(text,{tone:'neutral',autoTags:false,directed});
 // Do not force automatic breathing/laughing/gasping after each generated
 // sentence: those marks can alter timbre for certain cloned voice IDs.
 // Retain only previously authored valid tags, never add speculative ones.
 return {...base,voiceStyle:'calm',speed:directed?XITAI_DIRECTED_SPEED:1,emotion:'calm',tone};
}
