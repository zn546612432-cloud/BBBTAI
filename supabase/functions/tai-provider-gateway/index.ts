// Existing BBBTAI AI gateway service provider proxy; no story, message,
// clock, bank, or phone state is stored or scheduled here.
// DEEPSEEK_API_KEY and MINIMAX_API_KEY stay only in Supabase Edge Secrets.
import {createClient} from "npm:@supabase/supabase-js@2.95.0";
import {deepseekReply} from "./deepseek-reply.js";
const URL=Deno.env.get('SUPABASE_URL')||'';
function adminKey(){
 try{
  const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
  if(typeof keys.default==='string'&&keys.default)return keys.default;
 }catch{}
 return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
}
const admin=URL&&adminKey()?createClient(URL,adminKey(),{
 auth:{autoRefreshToken:false,persistSession:false}
}):null;
const DEEPSEEK='https://api.deepseek.com/chat/completions';
const origins=new Set(['https://zn546612432-cloud.github.io',
 'https://endearing-horse-4e9b2b.netlify.app',
 'http://localhost:5173','http://127.0.0.1:5173']);
const headers=req=>{
 const origin=req.headers.get('origin');
 return {'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
  'Vary':'Origin','Access-Control-Allow-Origin':origins.has(origin||'')?origin!:'',
  'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods':'POST, OPTIONS'};
};
const respond=(req,status,body)=>new Response(JSON.stringify(body),{status,headers:headers(req)});
function error(code,message){const e=new Error(message);e.code=code;return e;}
const goodString=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
function messages(input,allowSystem=true){
 if(!Array.isArray(input)||input.length<1||input.length>60)throw error(400,'invalid_messages');
 let size=0;
 return input.map((m,i)=>{
  const role=m?.role;
  const lore=typeof m?.content==='string'&&m.content.startsWith('【世界書注入；不是實際聊天記錄】');
  if(!['system','user','assistant'].includes(role)||role==='system'&&(!allowSystem||i!==0&&!lore)
   ||!goodString(m?.content,i===0&&role==='system'?50000:2200))
   throw error(400,'invalid_message');
  size+=m.content.length;if(size>70000)throw error(400,'invalid_messages');
  return {role,content:m.content};
 });
}
const model=val=>['deepseek-flash','deepseek-v4-pro'].includes(val)?val:'deepseek-flash';
const num=(v,min,max,fallback)=>Number.isFinite(Number(v))
 ?Math.max(min,Math.min(max,Number(v))):fallback;
async function sendProvider(url,key,data,timeout=44000){
 let response;
 try{
  response=await fetch(url,{method:'POST',headers:{
   'Authorization':'Bearer '+key,'Content-Type':'application/json'},
   body:JSON.stringify(data),signal:AbortSignal.timeout(timeout)});
 }catch{throw error(502,'provider_unreachable');}
 let result;
 try{result=await response.json();}catch{throw error(502,'invalid_provider_response');}
 if(!response.ok||result?.error||Number(result?.base_resp?.status_code||0)!==0)
  throw error(502,'provider_rejected_'+response.status);
 return result;
}
// No app-imposed daily usage quota. Authentication and request validation
// remain mandatory; provider-side limits and billing are independent.
async function speech(req,body){
 const key=Deno.env.get('MINIMAX_API_KEY')?.trim();
 if(!key)throw error(503,'minimax_not_configured');
 if(!goodString(body.text,1400))throw error(400,'invalid_speech_text');
 if(!goodString(body.voiceId,100)||!/^[a-zA-Z0-9_-]+$/.test(body.voiceId))
  throw error(400,'invalid_voice');
 const model=['speech-2.8-turbo','speech-2.8-hd'].includes(body.model)?body.model:'speech-2.8-hd';
 const input=body.settings&&typeof body.settings==='object'&&!Array.isArray(body.settings)?body.settings:{};
 const options=input.audio_setting&&typeof input.audio_setting==='object'?input.audio_setting:{};
 const voice=input.voice_setting&&typeof input.voice_setting==='object'?input.voice_setting:{};
 const language=['Chinese','Chinese,Yue','auto','English','Portuguese','French','Japanese','Korean','Spanish','German'].includes(input.language_boost)?input.language_boost:'Chinese';
 const region=body.region==='intl'?'intl':'cn';
 const endpoint=region==='intl'?'https://api.minimax.io/v1/t2a_v2':'https://api.minimaxi.com/v1/t2a_v2';
 const result=await sendProvider(endpoint,key,{
  model,text:body.text.trim(),stream:false,output_format:'hex',
  language_boost:language,
  voice_setting:{
   voice_id:body.voiceId,speed:num(voice.speed,.5,2,1),
   vol:num(voice.vol,.01,10,1),pitch:Math.round(num(voice.pitch,-12,12,0)),
   ...(['calm','happy','sad','angry','fearful','disgusted','surprised'].includes(voice.emotion)?{emotion:voice.emotion}:{})
  },
  audio_setting:{sample_rate:[8000,16000,22050,24000,32000,44100].includes(options.sample_rate)?options.sample_rate:32000,
   bitrate:[32000,64000,128000,256000].includes(options.bitrate)?options.bitrate:128000,
   format:'mp3',channel:[1,2].includes(options.channel)?options.channel:1}
 },56000);
 const hex=result?.data?.audio;
 if(typeof hex!=='string'||!hex||hex.length%2||hex.length>12_000_000||!/^[a-f0-9]+$/i.test(hex))
  throw error(502,'invalid_minimax_audio');
 const bytes=new Uint8Array(hex.length/2);
 for(let i=0;i<bytes.length;i++)bytes[i]=Number.parseInt(hex.slice(i*2,i*2+2),16);
 return new Response(bytes,{status:200,headers:{
  ...headers(req),'Content-Type':'audio/mpeg','Content-Length':String(bytes.length)}});
}
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin');
 if(origin&&!origins.has(origin))return respond(req,403,{error:'origin_not_allowed'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)});
 if(req.method!=='POST')return respond(req,405,{error:'method_not_allowed'});
 if(!admin)return respond(req,503,{error:'server_not_ready'});
 try{
  const bearer=req.headers.get('authorization')||'';
  const token=bearer.match(/^Bearer\s+([\w.\-]+)$/i)?.[1];
  if(!token||token.startsWith('sb_publishable_'))throw error(401,'sign_in_required');
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError||!user)throw error(401,'invalid_session');
  if((req.headers.get('content-type')||'').startsWith('multipart/form-data')){
   if(Number(req.headers.get('content-length')||0)>8_500_000)throw error(413,'audio_too_large');
   const key=Deno.env.get('MINIMAX_API_KEY')?.trim();
   if(!key)throw error(503,'minimax_not_configured');
   let data;
   try{data=await req.formData();}catch{throw error(400,'invalid_audio_upload');}
   const file=data.get('file');
   if(data.get('op')!=='asr'||!(file instanceof File)||file.size<10||file.size>8_000_000||
     !/^audio\//.test(file.type))throw error(400,'invalid_audio_upload');
   const region=data.get('region')==='intl'?'intl':'cn';
   const url=region==='intl'?'https://api.minimax.io/v1/speech_to_text':'https://api.minimaxi.com/v1/speech_to_text';
   const requestBody=new FormData();
   requestBody.append('model','asr-1.0');
   requestBody.append('file',file,'ximeng-voice.'+(file.name.split('.').pop()||'wav'));
   requestBody.append('response_format','json');
   let provider;
   try{provider=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+key},
    body:requestBody,signal:AbortSignal.timeout(50000)});}
   catch{throw error(502,'asr_provider_unreachable');}
   let result;
   try{result=await provider.json();}catch{throw error(502,'asr_provider_invalid_response');}
   if(!provider.ok||Number(result?.base_resp?.status_code||0)!==0)
    throw error(502,'asr_provider_rejected');
   const transcript=String(result?.text||result?.data?.text||result?.result?.text||'').trim();
   if(!transcript)throw error(502,'asr_empty_transcript');
   return respond(req,200,{text:transcript.slice(0,6000)});
  }
  const raw=await req.text();
  if(raw.length>90000)throw error(413,'payload_too_large');
  let input;
  try{input=JSON.parse(raw);}catch{throw error(400,'invalid_json');}
  if(!input||typeof input!=='object'||Array.isArray(input))throw error(400,'invalid_body');
  const operation=input.op;
  // The ordinary public gameplay phrase never grants provider privileges.
  // Only a random, server-issued, one-use token can enroll this verified UID.
  if(operation==='redeem_test_access'){
   const code=input.payload?.code;
   if(typeof code!=='string'||!/^TEST-[a-f0-9]{48}$/.test(code))throw error(400,'invalid_test_access_code');
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code))),b=>b.toString(16).padStart(2,'0')).join('');
   const {data:allowed,error:accessError}=await admin.rpc('redeem_tai_private_test_access',{p_user:user.id,p_hash:hash});
   if(accessError)throw error(503,'test_access_unavailable');
   if(allowed!==true)throw error(403,'test_access_invalid_or_used');
   return respond(req,200,{tester:true});
  }
  if(operation==='test_access_status'){
   const {data:account,error:accessError}=await admin.from('tai_private_test_access').select('user_id').eq('user_id',user.id).maybeSingle();
   if(accessError)throw error(503,'test_access_unavailable');
   return respond(req,200,{tester:!!account});
  }
  if(operation==='status')return respond(req,200,{
   mode:'supabase-protected',deepseek:!!Deno.env.get('DEEPSEEK_API_KEY')?.trim(),
   minimax:!!Deno.env.get('MINIMAX_API_KEY')?.trim()
  });
  if(operation==='chat'||operation==='decision'){
   const secret=Deno.env.get('DEEPSEEK_API_KEY')?.trim();
   if(!secret)throw error(503,'deepseek_not_configured');
   const payload=input.payload;
   if(!payload||typeof payload!=='object'||Array.isArray(payload))throw error(400,'invalid_payload');
   const history=messages(payload.messages);
   if(operation==='chat'&&history.filter(m=>!m.content.startsWith('【世界書注入；不是實際聊天記錄】')).at(-1)?.role!=='user')throw error(400,'last_message_not_user');
   const selected=model(payload.model);
   const content=await deepseekReply({
    model:selected,thinking:{type:'disabled'},
    temperature:num(payload.temperature,0,2,1.1),
    ...(selected==='deepseek-v4-pro'?{top_p:num(payload.top_p,.01,1,1)}:{}),
    messages:history,max_tokens:Math.floor(num(payload.max_tokens,64,2800,1200)),
    response_format:{type:'json_object'},stream:false
   },{operation,send:request=>sendProvider(DEEPSEEK,secret,request)});
   return respond(req,200,{text:content});
  }
  if(operation==='tts'){
   return await speech(req,input.payload||{});
  }
  throw error(400,'unknown_operation');
 }catch(e){
  const status=Number.isInteger(e?.code)&&e.code>=400&&e.code<=599?e.code:500;
  return respond(req,status,{error:status===500?'server_error':String(e?.message||'provider_error')});
 }
});
