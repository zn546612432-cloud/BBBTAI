import {D55_OPENING_CALL,D55_WARNING_CALL,D55_FINAL_CALL} from './calls.js';

// Older builds advanced these checkpoints even when no recording existed.
// Repair the current phase once; never rewind the clock, native Father call,
// disconnected finale or already-sent player lines.
export function recoverD55SilentVoice(s){
 const story=s.story55;
 if(s.day!==55||!story||story.d55RecordedVoiceRevision>=1)return false;
 story.d55RecordedVoiceRevision=1;
 if(story.ended||story.d55Disconnected)return true;
 let script;
 if(story.d55FatherEndedAt)script=D55_FINAL_CALL;
 else if(story.d55FatherReady)return true;
 else if(story.d55CallProgress?.[D55_WARNING_CALL.id]>0)script=D55_WARNING_CALL;
 else script=D55_OPENING_CALL;
 const previous=story.d55CallProgress?.[script.id]||0;
 const firstVoice=script.steps.findIndex(([role])=>role==='tai');
 if(previous>firstVoice){
  story.d55VoiceRecoveryThrough??={};story.d55VoiceRecoveryThrough[script.id]=previous;
  story.d55CallProgress[script.id]=firstVoice;
  if(story.scriptedCallCompleted)delete story.scriptedCallCompleted[script.id];
 }
 return true;
}
