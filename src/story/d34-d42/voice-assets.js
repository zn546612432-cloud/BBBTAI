import {D41_CALL,D42_CALL} from './definition.js';
import {D41_CHESS_CUES} from './d41-chess.js';
import {D45_CALL} from '../d45/definition.js';
import {RECOGNITION_STEPS} from '../d29/recognition-call.js';

// Fixed speech is authored once and recorded before the game is published.
export const SCRIPTED_VOICE_CLIPS=Object.freeze([
 ...RECOGNITION_STEPS.flatMap(([role,text],i)=>role==='tai'?[{id:`d33-recognition-${i}`,text,path:`/assets/story55/d33/d33-recognition-${i}.mp3`}]:[]),
 ...D41_CALL.steps.flatMap(([role,text],i)=>role==='tai'?[{id:`d41-call-${i}`,text}]:[]),
 ...D42_CALL.lines.map((text,i)=>({id:`d42-call-${i}`,text})),
 ...D45_CALL.steps.flatMap(([role,text],i)=>role==='tai'?[{id:`d45-call-${i}`,text,path:`/assets/story55/d45/d45-call-${i}.mp3`}]:[]),
 ...Object.entries(D41_CHESS_CUES).map(([ply,text])=>({id:`d41-chess-${ply}`,text}))
].map(clip=>Object.freeze({...clip,path:clip.path||`/assets/story55/d41-d42/${clip.id}.mp3`})));
export const scriptedVoiceClip=text=>SCRIPTED_VOICE_CLIPS.find(c=>c.text===text);
