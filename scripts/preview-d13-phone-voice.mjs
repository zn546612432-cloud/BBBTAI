// One-time audition: the seven existing D13 phone lines, not the Mirage text chat.
// Never modifies game dialogue, voice settings, scripted assets, or production.
import {D13_LINES,D13_VOICE_INDICES} from '../src/story/d13/content.js';
import {XITAI_VOICE_ID} from '../src/services/ai/gateway.js';
import {taiCloudCall} from '../src/services/ai/supabase-gateway.js';
import {normalizeTtsSettings,ttsProviderSettings} from '../src/services/voice/tts-settings.js';
import {prepareTaiVoicePerformance} from '../src/services/voice/voice-performance.js';
import {writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const indices=D13_VOICE_INDICES,region=process.env.MINIMAX_REGION||'cn';
const key=process.env.MINIMAX_API_KEY,dir=new URL('../artifacts/d13-original-phone-audition/',import.meta.url);
if(indices.join(',')!=='8,10,12,14,16,18,20')throw Error('D13 telephone source changed; abort');
await mkdir(dir,{recursive:true});
if(!key){
 const sessionStore=new Map();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:k=>sessionStore.get(k)||null,setItem:(k,v)=>sessionStore.set(k,v),
 }});
}
const clips=[];
for(const index of indices){
 const [actor,original]=D13_LINES[index];
 if(actor!=='ouroboros'||!original)throw Error('D13 line '+index+' is not the original caller');
 const spoken=original.replace(/\bnya\b/gi,'奈亞'); // Same words, established pronunciation.
 const performance=prepareTaiVoicePerformance(spoken);
 const settings=normalizeTtsSettings({...performance,speed:0.94,emotion:'calm',language:'Chinese',
  sampleRate:32000,bitrate:128000,channel:1});
 const provider=ttsProviderSettings(settings);
 let bytes;
 if(key){
  const endpoint=region==='intl'?'https://api.minimax.io/v1/t2a_v2':'https://api.minimaxi.com/v1/t2a_v2';
  const r=await fetch(endpoint,{method:'POST',
   headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),
   body:JSON.stringify({model:'speech-2.8-hd',text:performance.text,stream:false,output_format:'hex',
    ...provider,voice_setting:{voice_id:XITAI_VOICE_ID,...provider.voice_setting}})});
  if(!r.ok)throw Error('MiniMax original telephone line '+index+': HTTP '+r.status);
  const d=await r.json(),hex=d.data?.audio;
  if(Number(d.base_resp?.status_code||0)!==0||typeof hex!=='string'||hex.length<2000
     ||hex.length%2||!/^[0-9a-f]+$/i.test(hex))throw Error('MiniMax line '+index+': invalid audio '+(d.base_resp?.status_msg||''));
  bytes=Buffer.from(hex,'hex');
 }else{
  const audio=await taiCloudCall('tts',{model:'speech-2.8-hd',text:performance.text,
   voiceId:XITAI_VOICE_ID,region,settings});
  bytes=Buffer.from(await audio.arrayBuffer());
 }
 if(bytes.length<1500||!(bytes.toString('utf8',0,3)==='ID3'||bytes[0]===255))throw Error('Line '+index+': not valid MP3');
 const filename='d13-phone-line-'+index+'.mp3';await writeFile(new URL(filename,dir),bytes);
 clips.push({index,original,filename,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 console.log('Original Dr Ouroboros telephone line '+index+' generated: '+bytes.length+' bytes');
}
await writeFile(new URL('manifest.json',dir),JSON.stringify({
 source:'src/story/d13/content.js',indices,originalLines:true,model:'speech-2.8-hd',
 voiceId:XITAI_VOICE_ID,settings:{speed:0.94,emotion:'calm',language:'Chinese'},clips
},null,2)+'\n');
const args=[];
for(const c of clips)args.push('-i',new URL(c.filename,dir).pathname);
const filter=clips.map((_,i)=>'['+i+':a]aresample=24000,asetpts=PTS-STARTPTS[a'+i+']').join(';')
 +';'+clips.map((_,i)=>'[a'+i+']').join('')+'concat=n='+clips.length+':v=0:a=1[out]';
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args,'-filter_complex',filter,
 '-map','[out]','-ar','24000','-ac','1','-b:a','64k',new URL('d13-phone-all-seven.mp3',dir).pathname],
 {timeout:60000});
console.log('Finished 7 original scripted telephone voice lines and combined listening sample');
