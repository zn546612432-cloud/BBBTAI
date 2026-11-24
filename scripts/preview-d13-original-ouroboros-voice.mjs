// Preview only: preserve the original approved scene verbatim.
import {D13_LINES} from '../src/story/d13/content.js';
import {XITAI_VOICE_ID} from '../src/services/ai/gateway.js';
import {normalizeTtsSettings,ttsProviderSettings} from '../src/services/voice/tts-settings.js';
import {taiCloudCall} from '../src/services/ai/supabase-gateway.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const ids=[3,5,6],key=process.env.MINIMAX_API_KEY,region=process.env.MINIMAX_REGION||'cn';
const endpoint=region==='intl'?'https://api.minimax.io/v1/t2a_v2':'https://api.minimaxi.com/v1/t2a_v2';
const voice=XITAI_VOICE_ID,dir=new URL('../artifacts/voice-preview-d13/',import.meta.url);
await mkdir(dir,{recursive:true});
if(!key){
  const sessionStore=new Map();
  Object.defineProperty(globalThis,'localStorage',{value:{getItem:k=>sessionStore.get(k)||null,setItem:(k,v)=>sessionStore.set(k,v)},configurable:true});
}
const clips=[];
for(const i of ids){
 const [who,text]=D13_LINES[i]||[];
 if(who!=='ouroboros'||!text)throw Error('Not an original Dr Ouroboros line: '+i);
 const settings=normalizeTtsSettings({speed:0.94,emotion:'calm',language:'Chinese',sampleRate:32000,bitrate:128000,channel:1});
 const provider=ttsProviderSettings(settings);
 let bytes;
 if(key){
  const r=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),
   body:JSON.stringify({model:'speech-2.8-hd',text,stream:false,output_format:'hex',...provider,voice_setting:{voice_id:voice,...provider.voice_setting}})});
  if(!r.ok)throw Error('MiniMax HTTP '+r.status+' for line '+i);
  const j=await r.json(),hex=j.data?.audio;
  if(Number(j.base_resp?.status_code||0)!==0||typeof hex!=='string'||hex.length<2000||hex.length%2)throw Error('MiniMax invalid audio for line '+i+': '+j.base_resp?.status_msg);
  bytes=Buffer.from(hex,'hex');
 }else{
  const blob=await taiCloudCall('tts',{model:'speech-2.8-hd',text,voiceId:voice,region,settings});
  bytes=Buffer.from(await blob.arrayBuffer());
 }
 if(bytes.length<5000||bytes.slice(0,3).toString()!=='ID3'&&bytes[0]!==0xff)throw Error('Invalid MP3 bytes for line '+i);
 const file='d13-ouroboros-original-'+i+'.mp3';
 await writeFile(new URL(file,dir),bytes);
 clips.push({index:i,actor:who,text,voice,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),file});
 console.log('Generated original line '+i+': '+bytes.length+' bytes');
}
await writeFile(new URL('manifest.json',dir),JSON.stringify({source:'src/story/d13/content.js',originalLines:true,model:'speech-2.8-hd',voice,clips},null,2)+'\n');
