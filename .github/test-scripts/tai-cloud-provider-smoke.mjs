// One live provider-config check. Never prints tokens, providers' keys or chat.
import {taiCloudSession,taiCloudCall} from '../../src/services/ai/supabase-gateway.js';
const m=new Map();
globalThis.localStorage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v))};
const s=await taiCloudSession();
if(!s.access_token||!s.refresh_token)throw Error('anonymous_auth_session_unavailable');
const status=await taiCloudCall('status');
if(status.mode!=='supabase-protected'||!status.deepseek||!status.minimax)
 throw Error('provider_secrets_missing_or_gateway_not_configured');
console.log('Supabase AI JWT authentication + two provider secret flags: PASS (values never logged).');
const response=await taiCloudCall('chat',{
 model:'deepseek-flash',temperature:0.2,max_tokens:100,
 messages:[{role:'system',content:'仅返回一个 JSON 对象，例如 {"messages":[{"text":"OK"}]}。'},
  {role:'user',content:'回复「收到」'}]
});
if(!response.text||!response.text.trim())throw Error('deepseek_empty_response');
console.log('DeepSeek real short inference: PASS (reply not logged).');
let audio;
try{
 audio=await taiCloudCall('tts',{text:'你好。',voiceId:'moss_audio_708f60ef-d45e-11f1-ac36-1658c5812fe4',model:'speech-2.8-hd',region:'cn',
  settings:{language_boost:'Chinese',voice_setting:{speed:1,vol:1,pitch:0},audio_setting:{sample_rate:32000,bitrate:128000,channel:1}}});
}catch(error){
 // The same MiniMax account can be configured in either region.
 audio=await taiCloudCall('tts',{text:'你好。',voiceId:'moss_audio_708f60ef-d45e-11f1-ac36-1658c5812fe4',model:'speech-2.8-hd',region:'intl',
  settings:{language_boost:'Chinese',voice_setting:{speed:1,vol:1,pitch:0},audio_setting:{sample_rate:32000,bitrate:128000,channel:1}}});
}
if(audio.type!=='audio/mpeg'||audio.size<100)throw Error('minimax_invalid_audio');
console.log('MiniMax real short audio: PASS (no audio or key logged).');
// No paid API calls. The game feature uses the same endpoints.
