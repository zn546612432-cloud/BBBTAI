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
 globalThis.location={hostname:'zn546612432-cloud.github.io'};
 globalThis.localStorage=local;
 return Promise.resolve().then(()=>callback(local)).finally(()=>{
  globalThis.fetch=previous.fetch;
  if(previous.location===undefined)delete globalThis.location;else globalThis.location=previous.location;
  if(previous.localStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous.localStorage;
 });
}
test('cloud mode only on production GitHub Pages origin; publishable key is never a provider secret',()=>{
 assert.equal(isTaiCloudHost('zn546612432-cloud.github.io'),true);
 assert.equal(isTaiCloudHost('evil.github.io'),false);
 assert.equal(isTaiCloudHost('localhost'),false);
 assert.match(TAI_PUBLIC_KEY,/^sb_publishable_/);
 const client=readFileSync(new URL('../src/services/ai/supabase-gateway.js',import.meta.url),'utf8');
 assert.doesNotMatch(client,/DEEPSEEK_API_KEY\s*[:=]|MINIMAX_API_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]/);
});
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
 await assert.rejects(()=>taiCloudCall('chat',{messages:[]}),/今日 AI 使用额度/);
}));
test('no sensitive secrets or public unauthenticated paid calls are present in Edge source',()=>{
 const code=readFileSync(new URL('../supabase/functions/tai-provider-gateway/index.ts',import.meta.url),'utf8');
 assert.match(code,/admin\.auth\.getUser\(token\)/);
 assert.match(code,/reserve_tai_ai_gateway_quota/);
 assert.match(code,/origin_not_allowed/);
 assert.match(code,/daily_limit_reached/);
 assert.match(code,/DEEPSEEK_API_KEY/);
 assert.match(code,/MINIMAX_API_KEY/);
 assert.doesNotMatch(code,/sk-api-[a-zA-Z0-9_-]{16,}/);
});

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
