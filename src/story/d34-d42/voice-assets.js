import {D41_CALL,D42_CALL} from './definition.js';
import {D41_CHESS_CUES} from './d41-chess.js';

// Fixed speech is authored once and recorded before the game is published.
export const SCRIPTED_VOICE_CLIPS=Object.freeze([
 ...D41_CALL.steps.flatMap(([role,text],i)=>role==='tai'?[{id:`d41-call-${i}`,text}]:[]),
 ...D42_CALL.lines.map((text,i)=>({id:`d42-call-${i}`,text})),
 ...Object.entries(D41_CHESS_CUES).map(([ply,text])=>({id:`d41-chess-${ply}`,text}))
].map(clip=>Object.freeze({...clip,path:`/assets/story55/d41-d42/${clip.id}.mp3`})));
export const scriptedVoiceClip=text=>SCRIPTED_VOICE_CLIPS.find(c=>c.text===text);
