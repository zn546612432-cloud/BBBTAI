// One new D13 phone sentence for author audition. Production script and existing MP3s remain untouched.
import {XITAI_VOICE_ID} from '../src/services/ai/gateway.js';
import {normalizeTtsSettings,ttsProviderSettings} from '../src/services/voice/tts-settings.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const text='好了，今天不逗你了。明天有份東西給你，記得看郵箱。';
const key=process.env.MINIMAX_API_KEY;
if(!key)throw Error('MINIMAX_API_KEY not configured');
const options=ttsProviderSettings(normalizeTtsSettings({speed:0.94,emotion:'calm',language:'Chinese',sampleRate:32000,bitrate:128000,channel:1}));
const response=await fetch('https://api.minimaxi.com/v1/t2a_v2',{method:'POST',
 headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),
 body:JSON.stringify({model:'speech-2.8-hd',text,stream:false,output_format:'hex',
 ...options,voice_setting:{voice_id:XITAI_VOICE_ID,...options.voice_setting}})});
if(!response.ok)throw Error('MiniMax HTTP '+response.status);
const payload=await response.json(),hex=payload.data?.audio;
if(Number(payload.base_resp?.status_code||0)!==0||typeof hex!=='string'||hex.length<2000||hex.length%2||!/^[a-f0-9]+$/i.test(hex))
 throw Error('Invalid MiniMax audio '+String(payload.base_resp?.status_msg||''));
const mp3=Buffer.from(hex,'hex');
if(mp3.length<3000||!((mp3[0]===255&&mp3[1]>=224)||mp3.subarray(0,3).toString()==='ID3'))throw Error('Invalid MP3 header');
const target=new URL('../artifacts/d13-new-mail-line-audition/',import.meta.url);
await mkdir(target,{recursive:true});
await writeFile(new URL('D13-新增-今天不逗你了-试听.mp3',target),mp3);
await writeFile(new URL('manifest.json',target),JSON.stringify({text,voiceId:XITAI_VOICE_ID,model:'speech-2.8-hd',emotion:'calm',speed:0.94,size:mp3.length,sha256:createHash('sha256').update(mp3).digest('hex')},null,2));
console.log('Generated only newly requested phone line, '+mp3.length+' MP3 bytes');
