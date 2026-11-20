import {SCRIPTED_VOICE_CLIPS,scriptedVoiceClip} from '../../story/d34-d42/voice-assets.js';
import {resolvePhoneAudioPath} from './asset-url.js';
import {apiConfig,voicePreview} from '../ai/gateway.js';
import {loadClip,saveClip} from './audio-store.js';

const clips=new Map(),warmed=new Map();
const cacheKey=clip=>'scripted-v1-'+apiConfig().voiceId+'-'+clip.id+'-'+clip.text;
async function prepareClip(clip,key){
 const saved=await loadClip(key).catch(()=>null);
 if(saved?.size)return saved;
 // The optional published recording takes precedence; a configured game
 // voice can prepare the same asset even when the repository has no API key.
 const bundled=await fetch(resolvePhoneAudioPath(clip.path)).then(async response=>{
  if(!response.ok)return null;
  const blob=await response.blob();
  return blob.size&&/^audio\//i.test(blob.type)?blob:null;
 }).catch(()=>null);
 if(bundled)return bundled;
 const blob=await voicePreview({text:clip.text.replace(/\bnya\b/gi,'奈亞'),tone:'neutral',directed:true});
 if(!blob?.size)throw Error('Empty authored recording');
 void saveClip(key,blob);
 return blob;
}
export function loadScriptedVoice(text){
 const clip=scriptedVoiceClip(text);
 if(!clip)return Promise.reject(Error('Missing authored recording'));
 const key=cacheKey(clip);
 if(!clips.has(key)){
  const pending=prepareClip(clip,key).catch(error=>{clips.delete(key);throw error;});
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
 void (async()=>{for(const clip of recordings){try{await loadScriptedVoice(clip.text);}catch{break;}}})();
}
