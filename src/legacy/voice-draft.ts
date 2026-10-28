// Deploy with JWT verification enabled. Keys are Supabase server secrets only.
import { createClient } from 'npm:@supabase/supabase-js@2';
const origin=Deno.env.get('APP_ORIGIN')||'';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Vary':'Origin'};
const reply=(status:number,error:string)=>new Response(JSON.stringify({error}),{status,headers:{...headers,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(!origin||req.headers.get('origin')!==origin)return reply(403,'Origin not allowed');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,'Method not allowed');
 const key=Deno.env.get('MINIMAX_API_KEY'); if(!key)return reply(503,'Voice is not configured');
 const auth=req.headers.get('authorization')||'';
 if(!auth.startsWith('Bearer '))return reply(401,'Authentication required');
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const {data:{user},error}=await db.auth.getUser(auth.slice(7));
 if(error||!user)return reply(401,'Invalid session');
 let body;try{const raw=await req.text();if(raw.length>512)return reply(413,'Request too large');body=JSON.parse(raw);}catch{return reply(400,'Invalid request');}
 if(typeof body.scriptId!=='string'||body.scriptId.length>100)return reply(400,'Invalid script');
 const {data:script}=await db.from('voice_scripts').select('text,voice_id,minimum_day').eq('id',body.scriptId).single();
 if(!script)return reply(404,'Script unavailable');
 // Preview service deliberately allows only day-one UI samples. Story entitlement must
 // be derived from an authoritative server event log before later scripts are enabled.
 if(script.minimum_day!==1)return reply(403,'Story voice not enabled');
 const {data:allowed,error:quotaError}=await db.rpc('consume_voice_quota',{p_user:user.id});
 if(quotaError||!allowed)return reply(429,'Voice quota exceeded');
 try{
 const upstream=await fetch('https://api.minimax.io/v1/t2a_v2',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(25000),body:JSON.stringify({model:Deno.env.get('MINIMAX_MODEL')||'speech-2.8-hd',text:script.text,stream:false,output_format:'hex',voice_setting:{voice_id:script.voice_id,speed:1,vol:1,pitch:0},audio_setting:{sample_rate:32000,bitrate:128000,format:'mp3',channel:1}})});
 if(!upstream.ok)return reply(502,'Provider unavailable');const result=await upstream.json();
 const hex=result.data?.audio;if(result.base_resp?.status_code!==0||typeof hex!=='string'||!hex.length||hex.length%2||!/^[\da-f]+$/i.test(hex))return reply(502,'Invalid audio response');
 const audio=Uint8Array.from(hex.match(/.{2}/g)!,byte=>parseInt(byte,16));
 return new Response(audio,{headers:{...headers,'Content-Type':'audio/mpeg','Cache-Control':'private, no-store'}});
 }catch{return reply(502,'Voice generation failed');}
});
