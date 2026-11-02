// The author prefers a single cool, recognisable Xitai voice over model-driven
// acting. Always request MiniMax's explicit "calm" emotion; OMITTING emotion
// allows auto-detection and can change the apparent speaker mid-call.
// The experimental Speech 2.8 sound-tag implementation remains in voice-regex.js
// for future offline research, but cannot leak into live calls or voice notes.
import {prepareXitaiSpeech} from './voice-regex.js';

export const VOICE_STYLES=Object.freeze(['calm']);
// Old preview saves can contain "expressive"; never let that override this
// author's newer instruction. Safe to leave the API keys in sessionStorage.
export const normalizeVoiceStyle=()=> 'calm';

export function prepareTaiVoicePerformance(text,{tone='neutral'}={}){
 const base=prepareXitaiSpeech(text,{tone:'neutral',autoTags:false});
 // Do not force automatic breathing/laughing/gasping after each generated
 // sentence: those marks can alter timbre for certain cloned voice IDs.
 // Retain only previously authored valid tags, never add speculative ones.
 return {...base,voiceStyle:'calm',speed:1,emotion:'calm',tone};
}
