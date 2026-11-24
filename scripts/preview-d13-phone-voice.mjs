// D13 original phone line 16 ONLY. Production script/dialogue/audio are unchanged.
import {D13_LINES} from '../src/story/d13/content.js';
import {XITAI_VOICE_ID} from '../src/services/ai/gateway.js';
import {taiCloudCall} from '../src/services/ai/supabase-gateway.js';
import {normalizeTtsSettings,ttsProviderSettings} from '../src/services/voice/tts-settings.js';
import {writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [actor,original]=D13_LINES[16]||[];
if(actor!=='ouroboros'||original!=='別急著追蹤我。放心，我沒有惡意，只是想看看，大名鼎鼎的 nya 究竟能走多遠。')
 throw Error('Original D13 telephone copy changed; stop rather than reword.');
const spoken=original.replace(/\bnya\b/gi,'奈亞');
const candidates=[
 {id:'A-calm',label:'冷静、自然',speed:0.96,
  text:spoken.replace('大名鼎鼎的 奈亞 究竟','大名鼎鼎的奈亞究竟')},
 {id:'B-pause',label:'较慢、轻嘲',speed:0.88,
  text:spoken.replace('我沒有惡意，只是想看看，','我沒有惡意。只是想看看……')}
];
const clean=t=>t.replace(/[，。！？…、\s]/g,'');
for(const c of candidates)if(clean(c.text)!==clean(spoken))throw Error('A retake changed a word.');
const dir=new URL('../artifacts/d13-line16-retakes/',import.meta.url);
await mkdir(dir,{recursive:true});
const key=process.env.MINIMAX_API_KEY,region=process.env.MINIMAX_REGION||'cn';
if(!key){
 const cache=new Map();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)
 }});
}
const clips=[];
for(const c of candidates){
 const settings=normalizeTtsSettings({speed:c.speed,emotion:'calm',language:'Chinese',
  sampleRate:32000,bitrate:128000,channel:1});
 const options=ttsProviderSettings(settings);
 let bytes;
 if(key){
  const endpoint=region==='intl'?'https://api.minimax.io/v1/t2a_v2':'https://api.minimaxi.com/v1/t2a_v2';
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
   signal:AbortSignal.timeout(90000),
   body:JSON.stringify({model:'speech-2.8-hd',text:c.text,stream:false,output_format:'hex',
    ...options,voice_setting:{voice_id:XITAI_VOICE_ID,...options.voice_setting}})});
  if(!response.ok)throw Error('MiniMax TTS failed: HTTP '+response.status);
  const result=await response.json(),hex=result.data?.audio;
  if(Number(result.base_resp?.status_code||0)!==0||typeof hex!=='string'||hex.length<2000
   ||hex.length%2||!/^[0-9a-f]+$/i.test(hex))throw Error('MiniMax returned invalid audio: '+result.base_resp?.status_msg);
  bytes=Buffer.from(hex,'hex');
 }else{
  const blob=await taiCloudCall('tts',{model:'speech-2.8-hd',text:c.text,voiceId:XITAI_VOICE_ID,region,settings});
  bytes=Buffer.from(await blob.arrayBuffer());
 }
 if(bytes.length<3000||!(bytes.toString('utf8',0,3)==='ID3'||bytes[0]===255))throw Error('Invalid MP3 for '+c.id);
 const filename='D13-line16-'+c.id+'.mp3';
 await writeFile(new URL(filename,dir),bytes);
 clips.push({...c,filename,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 console.log('Recorded '+filename+': '+bytes.length+' bytes');
}
await writeFile(new URL('manifest.json',dir),JSON.stringify({
 scene:'D13 telephone',lineIndex:16,original,voiceId:XITAI_VOICE_ID,model:'speech-2.8-hd',
 clips},null,2)+'\n');
