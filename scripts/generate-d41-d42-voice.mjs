import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SCRIPTED_VOICE_CLIPS} from '../src/story/d34-d42/voice-assets.js';
import {prepareTaiVoicePerformance} from '../src/services/voice/voice-performance.js';
import {normalizeTtsSettings,ttsProviderSettings} from '../src/services/voice/tts-settings.js';
import {XITAI_VOICE_ID} from '../src/services/ai/gateway.js';
import {taiCloudCall,taiCloudSession} from '../src/services/ai/supabase-gateway.js';

const key=process.env.MINIMAX_API_KEY;
const region=process.env.MINIMAX_REGION||'cn',voice=XITAI_VOICE_ID;
const endpoint=region==='intl'?'https://api.minimax.io/v1/t2a_v2':'https://api.minimaxi.com/v1/t2a_v2';
const dir=new URL('../public/assets/story55/d41-d42/',import.meta.url);
await mkdir(dir,{recursive:true});
const clips=[];
const day=Number(process.env.SCRIPTED_VOICE_DAY||41);
const targets=SCRIPTED_VOICE_CLIPS.filter(c=>c.id.startsWith('d'+day+'-'));
if(!targets.length||targets.length>10)throw Error('Invalid fixed recording batch');
// One approved publication batch uses the existing authenticated cloud
// gateway and its normal quota. Never create another session to retry.
if(!key){
 const sessionStore=new Map();
 Object.defineProperty(globalThis,'localStorage',{value:{getItem:k=>sessionStore.get(k)||null,setItem:(k,v)=>sessionStore.set(k,v)},configurable:true});
 await taiCloudSession();
}
// Keep the character's original calm clone; use English pronunciation only
// for the actual English cues, rather than changing the voice itself.
for(const clip of targets){
 const performance=prepareTaiVoicePerformance(clip.text.replace(/\bnya\b/gi,'奈亞'),{directed:true});
 const language=/[\u3400-\u9fff]/u.test(clip.text)?'Chinese':'English';
 const settings=ttsProviderSettings(normalizeTtsSettings({...performance,language}));
 let bytes;
 if(key){
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),body:JSON.stringify({model:'speech-2.8-hd',text:performance.text,stream:false,output_format:'hex',...settings,voice_setting:{voice_id:voice,...settings.voice_setting}})});
  if(!response.ok)throw Error(`${clip.id}: HTTP ${response.status}`);
  const data=await response.json(),hex=data.data?.audio;
  if(Number(data.base_resp?.status_code||0)!==0||typeof hex!=='string'||hex.length<2000||hex.length%2||!/^[a-f0-9]+$/i.test(hex))throw Error(`${clip.id}: invalid audio (${Number(data.base_resp?.status_code)||0})`);
  bytes=Buffer.from(hex,'hex');
 }else{
  const blob=await taiCloudCall('tts',{model:'speech-2.8-hd',text:performance.text,voiceId:voice,region,settings});
  bytes=Buffer.from(await blob.arrayBuffer());
 }
 if(bytes.length<1000)throw Error(`${clip.id}: invalid audio size`);
 await writeFile(new URL(`${clip.id}.mp3`,dir),bytes);
 clips.push({...clip,textHash:createHash('sha256').update(clip.text).digest('hex'),audioHash:createHash('sha256').update(bytes).digest('hex'),size:bytes.length});
 console.log(`${clip.id}: ${bytes.length} bytes`);
}
const manifestPath=new URL('manifest.json',dir);
const previous=await readFile(manifestPath,'utf8').then(JSON.parse).catch(()=>({clips:[]}));
await writeFile(manifestPath,JSON.stringify({voice,region,model:'speech-2.8-hd',clips:[...previous.clips.filter(c=>!c.id.startsWith('d'+day+'-')), ...clips]},null,2)+'\n');
