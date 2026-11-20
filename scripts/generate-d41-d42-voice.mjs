import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SCRIPTED_VOICE_CLIPS} from '../src/story/d34-d42/voice-assets.js';
import {prepareTaiVoicePerformance} from '../src/services/voice/voice-performance.js';
import {normalizeTtsSettings,ttsProviderSettings} from '../src/services/voice/tts-settings.js';
import {XITAI_VOICE_ID} from '../src/services/ai/gateway.js';

const key=process.env.MINIMAX_API_KEY;
if(!key)throw Error('MINIMAX_API_KEY is not configured in Actions');
const region=process.env.MINIMAX_REGION||'cn',voice=XITAI_VOICE_ID;
const endpoint=region==='intl'?'https://api.minimax.io/v1/t2a_v2':'https://api.minimaxi.com/v1/t2a_v2';
const dir=new URL('../public/assets/story55/d41-d42/',import.meta.url);
await mkdir(dir,{recursive:true});
const clips=[];
// Keep the character's original calm clone; use English pronunciation only
// for the actual English cues, rather than changing the voice itself.
for(const clip of SCRIPTED_VOICE_CLIPS){
 const performance=prepareTaiVoicePerformance(clip.text.replace(/\bnya\b/gi,'奈亞'),{directed:true});
 const language=/[\u3400-\u9fff]/u.test(clip.text)?'Chinese':'English';
 const settings=ttsProviderSettings(normalizeTtsSettings({...performance,language}));
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),body:JSON.stringify({model:'speech-2.8-hd',text:performance.text,stream:false,output_format:'hex',...settings,voice_setting:{voice_id:voice,...settings.voice_setting}})});
 if(!response.ok)throw Error(`${clip.id}: HTTP ${response.status}`);
 const data=await response.json(),hex=data.data?.audio;
 if(Number(data.base_resp?.status_code||0)!==0||typeof hex!=='string'||hex.length<2000||hex.length%2||!/^[a-f0-9]+$/i.test(hex))throw Error(`${clip.id}: invalid audio (${Number(data.base_resp?.status_code)||0})`);
 const bytes=Buffer.from(hex,'hex');
 await writeFile(new URL(`${clip.id}.mp3`,dir),bytes);
 clips.push({...clip,textHash:createHash('sha256').update(clip.text).digest('hex'),audioHash:createHash('sha256').update(bytes).digest('hex'),size:bytes.length});
 console.log(`${clip.id}: ${bytes.length} bytes`);
}
await writeFile(new URL('manifest.json',dir),JSON.stringify({voice,region,model:'speech-2.8-hd',clips},null,2)+'\n');
