#!/usr/bin/env node
// Run locally with --script <approved-config.json>. Never reads browser keys.
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {normalizeTtsSettings,ttsProviderSettings} from '../src/services/voice/tts-settings.js';
import {prepareTaiVoicePerformance} from '../src/services/voice/voice-performance.js';
import {XITAI_VOICE_DIRECTION} from '../src/services/voice/xitai-voice-direction.js';
import {XITAI_VOICE_ID} from '../src/services/ai/gateway.js';
import {canonicalPhoneAudioPath} from '../src/services/voice/asset-url.js';
const args=process.argv.slice(2),input=args[args.indexOf('--script')+1];
try{
 if(!args.includes('--script')||!input)throw Error('請用 --script 指定已核對的完整 D13 配置；不從舊 catalog 自動生成。');
 const config=JSON.parse(await readFile(input,'utf8'));
 const lines=config.scenes?.intrusion;
 if(!Array.isArray(lines)||lines[6]?.[0]!=='call'||lines[8]?.[0]!=='me'||[7,9].some(i=>!['tai','ouroboros'].includes(lines[i]?.[0])||!lines[i]?.[1]))throw Error('D13 來電及第7、8、9行配置不符合任務要求。');
 const key=process.env.MINIMAX_API_KEY;if(!key)throw Error('本機環境尚未設定 MINIMAX_API_KEY。');
 const voice=process.env.MINIMAX_VOICE_ID||XITAI_VOICE_ID;
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(voice))throw Error('音色 ID 無效。');
 // The shared direction requires a calm, stable young voice; prose direction
 // is not sent as speakable text or invented sound tags to MiniMax.
 if(!XITAI_VOICE_DIRECTION)throw Error('缺少熙泰聲音設定。');
 const outputs=[];
 for(const i of [7,9]){
  const text=lines[i][1],performance=prepareTaiVoicePerformance(text);
  const settings=ttsProviderSettings(normalizeTtsSettings({...performance,...config.voiceSettings?.intrusion?.[i]}));
  const path=canonicalPhoneAudioPath(`/assets/story55/d13/call-${i}.mp3`);
  const response=await fetch('https://api.minimax.io/v1/t2a_v2',{
   method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),
   body:JSON.stringify({model:'speech-2.8-hd',text,stream:false,output_format:'hex',...settings,voice_setting:{voice_id:voice,...settings.voice_setting}})
  });
  if(!response.ok)throw Error(`第${i}行配音請求失敗（HTTP ${response.status}）。`);
  const data=await response.json(),hex=data.data?.audio;
  if(Number(data.base_resp?.status_code||0)!==0||typeof hex!=='string'||!hex||hex.length%2||!/^[a-f0-9]+$/i.test(hex))throw Error(`第${i}行未取得有效音訊。`);
  const bytes=Buffer.from(hex,'hex');if(bytes.length>=1000000)throw Error(`第${i}行超過 1MB。`);
  outputs.push({i,path,textHash:createHash('sha256').update(text).digest('hex'),bytes});
 }
 const dir=new URL('../public/assets/story55/d13/',import.meta.url);await mkdir(dir,{recursive:true});
 for(const o of outputs){const target=new URL(`call-${o.i}.mp3`,dir),temp=new URL(`call-${o.i}.mp3.tmp`,dir);await writeFile(temp,o.bytes);await rename(temp,target);}
 await writeFile(new URL('voice-manifest.json',dir),JSON.stringify({voice,model:'speech-2.8-hd',clips:outputs.map(({i,path,textHash,bytes})=>({index:i,path,textHash,size:bytes.length}))},null,2)+'\n');
 console.log('D13 第7、9行 MP3 已生成；台詞修改後須重新生成。');
}catch(error){console.error(error instanceof Error?error.message:'D13 配音未完成。');process.exitCode=1;}
