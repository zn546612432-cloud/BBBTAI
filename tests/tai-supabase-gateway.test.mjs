import test from 'node:test';
import assert from 'node:assert/strict';
import {isTaiCloudHost,taiCloudSession,taiCloudCall,TAI_PROVIDER_ENDPOINT,TAI_PUBLIC_KEY} from '../src/services/ai/supabase-gateway.js';
import {aiStatus,askTai,voicePreview} from '../src/services/ai/gateway.js';
import {readFileSync} from 'node:fs';

function mockStorage(){
 const items=new Map();
 return {getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,String(v)),removeItem:k=>items.delete(k),items};
}
function installMocks(callback){
 const previous={fetch:globalThis.fetch,location:globalThis.location,localStorage:globalThis.localStorage};
 const local=mockStorage();
 globalThis.location={hostname:'bbbtai.pages.dev'};
 globalThis.localStorage=local;
 return Promise.resolve().then(()=>callback(local)).finally(()=>{
  globalThis.fetch=previous.fetch;
  if(previous.location===undefined)delete globalThis.location;else globalThis.location=previous.location;
  if(previous.localStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous.localStorage;
 });
}
test('production and this project previews use cloud mode without admitting unrelated hosts',()=>{
 assert.equal(isTaiCloudHost('zn546612432-cloud.github.io'),true);
 assert.equal(isTaiCloudHost('bbbtai.pages.dev'),true);
 assert.equal(isTaiCloudHost('fix-noapp.bbbtai.pages.dev'),true);
 assert.equal(isTaiCloudHost('bbbtai.pages.dev.evil.test'),false);
 assert.equal(isTaiCloudHost('evilbbbtai.pages.dev'),false);
 assert.equal(isTaiCloudHost('other.pages.dev'),false);
 assert.equal(isTaiCloudHost('evil.github.io'),false);
 assert.equal(isTaiCloudHost('localhost'),false);
 assert.match(TAI_PUBLIC_KEY,/^sb_publishable_/);
 const client=readFileSync(new URL('../src/services/ai/supabase-gateway.js',import.meta.url),'utf8');
 assert.doesNotMatch(client,/DEEPSEEK_API_KEY\s*[:=]|MINIMAX_API_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]/);
});

test('deployed gateway handles this project CORS preflight while preserving authentication',async()=>{
 let handler;
 const source=readFileSync(new URL('../supabase/functions/tai-provider-gateway/index.ts',import.meta.url),'utf8')
  .replace(/^import .*;$/gm,'').replace('origin!:','origin:');
 const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'server-test-only'};
 new Function('Deno','createClient','deepseekReply',source)(
  {env:{get:k=>env[k]},serve:fn=>{handler=fn;}},
  ()=>({auth:{getUser:async()=>({data:{user:null},error:true})}}),()=>{});
 for(const origin of ['https://bbbtai.pages.dev','https://fix-noapp.bbbtai.pages.dev']){
  const response=await handler(new Request('https://example.test',{method:'OPTIONS',headers:{origin}}));
  assert.equal(response.status,204);assert.equal(response.headers.get('access-control-allow-origin'),origin);
 }
 for(const origin of ['https://other.pages.dev','https://bbbtai.pages.dev.evil.test']){
  assert.equal((await handler(new Request('https://example.test',{method:'OPTIONS',headers:{origin}}))).status,403);
 }
 const unauth=await handler(new Request('https://example.test',{method:'POST',headers:{origin:'https://bbbtai.pages.dev'},body:'{"op":"status"}'}));
 assert.equal(unauth.status,401);
});

test('a failed cloud text request creates no NPC reply and the same message can be retried',async()=>installMocks(async()=>{
 const {initialState}=await import('../src/services/storage.js');
 const {replyToTaiMessage}=await import('../src/services/ai/live-chat.js');
 const s=initialState();s.day=56;s.clock='21:20';
 const chat=s.content.conversations.noapp.find(c=>c.id==='tai');
 chat.messages=[{id:'failed-source',from:'me',text:'在幹什麼',kind:'text',actual:true,day:56,time:'21:20'}];
 const store={get:()=>s,update:fn=>fn(s)};
 globalThis.fetch=async url=>String(url).endsWith('/auth/v1/signup')
  ?Response.json({session:{access_token:'jwt-retry',refresh_token:'refresh-retry',expires_in:3600}})
  :Response.json({error:'provider_unreachable'},{status:502});
 const result=await replyToTaiMessage(store,'failed-source',{wait:async()=>{},random:()=>0});
 assert.equal(result.status,'error');assert.equal(result.count,0);
 assert.equal(chat.messages.length,1);assert.equal(chat.messages[0].taiPending,undefined);
 assert.ok(s.events.some(e=>e.type==='tai_reply_failed'&&e.sourceId==='failed-source'));
 globalThis.fetch=async(url,init)=>{
  if(String(url).includes('/tai-v8-persona'))return Response.json({},{status:404});
  const body=JSON.parse(init.body);
  if(body.op==='status')return Response.json({deepseek:true,minimax:false});
  return Response.json({text:JSON.stringify({messages:[{text:'在忙，等會兒聊。'}]})});
 };
 const retry=await replyToTaiMessage(store,'failed-source',{wait:async()=>{},random:()=>0});
 assert.equal(retry.status,'replied');assert.equal(chat.messages.at(-1).replySourceId,'failed-source');
}));
test('anonymous user signs in once and uses the same JWT for chat/status/TTS navigation',async()=>installMocks(async storage=>{
 let signups=0,cloudRequests=0;
 globalThis.fetch=async(url,init)=>{
  const u=String(url);
  if(u.endsWith('/auth/v1/signup')){
   signups++;
   assert.equal(init.headers.apikey,TAI_PUBLIC_KEY);
   return new Response(JSON.stringify({session:{access_token:'jwt-test',refresh_token:'refresh-test',expires_in:3600}}),{status:200});
  }
  if(u===TAI_PROVIDER_ENDPOINT){
   cloudRequests++;
   assert.equal(init.headers.Authorization,'Bearer jwt-test');
   assert.equal(init.headers.apikey,TAI_PUBLIC_KEY);
   const b=JSON.parse(init.body);
   if(b.op==='tts')return new Response(Uint8Array.from([73,68,51]),{status:200,headers:{'Content-Type':'audio/mpeg'}});
   if(b.op==='status')return new Response(JSON.stringify({mode:'supabase-protected',deepseek:true,minimax:true}));
   return new Response(JSON.stringify({text:'{"messages":[{"text":"好。"}]}'}));
  }
  if(u.includes('/tai-v8-persona'))return new Response('{}',{status:404});
  throw new Error('unexpected: '+u);
 };
 const status=await aiStatus();
 assert.equal(status.deepseek,true);
 const result=await askTai({day:16,channel:'mirage',messages:[{role:'user',content:'還在嗎？'}]});
 assert.match(result.text,/好。/);
 const sound=await voicePreview({text:'你好。',tone:'neutral'});
 assert.equal(sound.type,'audio/mpeg');
 assert.deepEqual([...new Uint8Array(await sound.arrayBuffer())],[73,68,51]);
 assert.equal(signups,1);
 assert.equal(cloudRequests,3);
 assert.ok(storage.getItem('ximeng-tai-gateway-auth-v1'));
 assert.equal(await taiCloudSession().then(s=>s.access_token),'jwt-test');
}));
test('provider errors, daily limits and missing identity do not fabricate NPC messages',async()=>installMocks(async()=>{
 globalThis.fetch=async(url)=>{
  if(String(url).endsWith('/auth/v1/signup'))
   return new Response(JSON.stringify({session:{access_token:'jwt-limited',refresh_token:'refresh-limited',expires_in:3600}}),{status:200});
  return new Response(JSON.stringify({error:'daily_limit_reached'}),{status:429});
 };
 await assert.rejects(()=>taiCloudCall('chat',{messages:[]}),{code:'TAI_CLOUD_LIMIT',message:'云端 AI 服务暂时达到保护上限'});
 await assert.rejects(()=>taiCloudCall('tts',{}),{code:'TAI_CLOUD_LIMIT'});
}));
test('no sensitive secrets or public unauthenticated paid calls are present in Edge source',()=>{
 const code=readFileSync(new URL('../supabase/functions/tai-provider-gateway/index.ts',import.meta.url),'utf8');
 assert.match(code,/admin\.auth\.getUser\(token\)/);
 assert.doesNotMatch(code,/reserve_tai_ai_gateway_quota|await reserve\(/);
 assert.match(code,/origin_not_allowed/);
 assert.doesNotMatch(code,/daily_limit_reached|quota_service_unavailable/);
 assert.match(code,/DEEPSEEK_API_KEY/);
 assert.match(code,/MINIMAX_API_KEY/);
 assert.doesNotMatch(code,/sk-api-[a-zA-Z0-9_-]{16,}/);
});
test('private test activation uses only the existing authenticated gateway, not a public client-side bypass',async()=>installMocks(async()=>{
 globalThis.fetch=async(url,init)=>{
  if(String(url).endsWith('/auth/v1/signup'))return Response.json({session:{access_token:'jwt-owner',refresh_token:'refresh-owner',expires_in:3600}});
  assert.equal(String(url),TAI_PROVIDER_ENDPOINT);assert.equal(init.headers.Authorization,'Bearer jwt-owner');
  const body=JSON.parse(init.body);
  assert.equal(body.op,'redeem_test_access');assert.equal(body.payload.code,'TEST-'+'a'.repeat(48));
  return Response.json({tester:true});
 };
 const {activateTaiPrivateTest}=await import('../src/services/ai/supabase-gateway.js');
 assert.deepEqual(await activateTaiPrivateTest('TEST-'+'a'.repeat(48)),{tester:true});
}));

test('cloud MiniMax ASR uses the same user JWT, no browser key, and preserves text',async()=>installMocks(async()=>{
 globalThis.fetch=async(url,init)=>{
  if(String(url).endsWith('/auth/v1/signup'))
   return new Response(JSON.stringify({session:{access_token:'jwt-asr',refresh_token:'refresh-asr',expires_in:3600}}),{status:200});
  if(String(url)!==TAI_PROVIDER_ENDPOINT)throw Error('unexpected endpoint');
  assert.equal(init.headers.Authorization,'Bearer jwt-asr');
  assert.equal(init.headers.apikey,TAI_PUBLIC_KEY);
  assert.ok(init.body instanceof FormData);
  assert.equal(init.body.get('op'),'asr');
  assert.equal(init.body.get('region'),'cn');
  assert.ok(init.body.get('file').size>0);
  return new Response(JSON.stringify({text:'測試完成'}));
 };
 const {taiCloudTranscribe}=await import('../src/services/ai/supabase-gateway.js');
 const result=await taiCloudTranscribe(new Blob(['some-audio'],{type:'audio/webm'}));
 assert.equal(result,'測試完成');
}));
test('existing Tai character system prompt stays under the protected backend length cap',async()=>{
 const {buildTaiPrompt}=await import('../src/services/ai/tai-profile.js');
 const text=buildTaiPrompt({channel:'mirage',day:16,recognized:false,
  messages:[{role:'user',content:'繼續'}]});
 assert.ok(text.length+14500<50000,'V8 and the existing character/worldbook must both fit');
});
