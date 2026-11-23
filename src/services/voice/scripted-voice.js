import {SCRIPTED_VOICE_CLIPS,scriptedVoiceClip} from '../../story/d34-d42/voice-assets.js';
import {resolvePhoneAudioPath} from './asset-url.js';
import {apiConfig,voicePreview} from '../ai/gateway.js';
import {loadClip,saveClip} from './audio-store.js';

const clips=new Map(),warmed=new Map();
const cacheKey=clip=>clip.bundledOnly?'scripted-recorded-v2-'+clip.id+'-'+clip.text:'scripted-v1-'+apiConfig().voiceId+'-'+clip.id+'-'+clip.text;
async function prepareClip(clip,key,{prewarm=false}={}){
 // The optional published recording takes precedence; a configured game
 // voice can prepare the same asset even when the repository has no API key.
 const bundled=fetch(resolvePhoneAudioPath(clip.path)).then(async response=>{
  if(!response.ok)throw Error('No bundled recording');
  const blob=await response.blob();
  if(!blob.size||!/^audio\//i.test(blob.type))throw Error('Invalid bundled recording');
  return blob;
 });
 const saved=loadClip(key).then(blob=>{if(!blob?.size)throw Error('No cached recording');return blob;});
 const recording=await Promise.any([bundled,saved]).catch(()=>null);
 if(clip.bundledOnly){
  if(!recording)throw Error('Missing fixed recording: '+clip.id);
  void saveClip(key,recording).catch(()=>{});
  return recording;
 }
 if(recording)return recording;
 // D55's fixed voice must be rendered before the call, never synthesized
 // from live dialogue during the cinematic. Missing prep only shows captions.
 if(clip.prewarmRequired&&!prewarm)throw Error('D55_FIXED_RECORDING_NOT_READY');
 const blob=await voicePreview({text:clip.text.replace(/\bnya\b/gi,'奈亞'),tone:'neutral',directed:true});
 if(!blob?.size)throw Error('Empty authored recording');
 void saveClip(key,blob).catch(()=>{});
 return blob;
}
export function loadScriptedVoice(text,{prewarm=false}={}){
 const clip=scriptedVoiceClip(text);
 if(!clip)return Promise.reject(Error('Missing authored recording'));
 const key=cacheKey(clip);
 if(!clips.has(key)){
  const pending=prepareClip(clip,key,{prewarm}).catch(error=>{clips.delete(key);throw error;});
  clips.set(key,pending);
 }
 return clips.get(key);
}
export function preloadScriptedVoice(day){
 if(!globalThis.document)return;
 const config=apiConfig(),key=day+'-'+config.voiceId;
 // Allow a fresh attempt after the player configures their existing voice.
 const now=Date.now();if(now-(warmed.get(key)||0)<120000)return;
 warmed.set(key,now);
 const recordings=SCRIPTED_VOICE_CLIPS.filter(c=>c.id.startsWith('d'+day+'-'));
 // Prioritize the opening line; never bombard the provider with 11 simultaneous
 // requests. The actual scene can reuse an in-flight promise at any time.
 const queue=recordings.map(clip=>({clip,attempt:0}));
 const worker=async()=>{while(queue.length){const {clip,attempt}=queue.shift();try{await loadScriptedVoice(clip.text,{prewarm:true});}catch(error){if(attempt<1&&error?.code!=='TAI_CLOUD_LIMIT')queue.push({clip,attempt:attempt+1});}}};
 void worker();void worker();
}
