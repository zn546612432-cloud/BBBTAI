import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareTaiVoicePerformance,normalizeVoiceStyle} from '../src/services/voice/voice-performance.js';
import {voicePreview,saveApiConfig,clearApiConfig,XITAI_VOICE_ID} from '../src/services/ai/gateway.js';
import {callScene} from '../src/apps/noapp/voice-call.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';

test('normal phone reply keeps one consistent voice without forcing dramatic emotion',()=>{
 assert.equal(normalizeVoiceStyle('unknown'),'stable');
 const angry=prepareTaiVoicePerformance('你说什么？我不是在跟你吵。我只是不喜欢这个决定，因为你根本没有给我看过完整的资料。',{tone:'angry'});
 const happy=prepareTaiVoicePerformance('你居然做到了，我现在倒是有点想笑。',{tone:'happy'});
 assert.equal(angry.emotion,null);
 assert.equal(happy.emotion,null);
 assert.equal(angry.speed,1);
 assert.equal(happy.speed,1);
 assert.equal((angry.text.match(/\(breath\)/g)||[]).length,1);
 assert.doesNotMatch(angry.text,/\(gasps\)|\(snorts\)|\(groans\)/);
 assert.equal(prepareTaiVoicePerformance('真的吗？',{tone:'surprised'}).text,'真的吗？');
});
test('optional deliberate expression experiment remains available',()=>{
 const p=prepareTaiVoicePerformance('你开什么玩笑？',{tone:'angry',style:'expressive'});
 assert.equal(p.emotion,'angry');
 assert.equal(p.voiceStyle,'expressive');
 assert.ok(p.speed>1);
 assert.match(p.text,/^\(breath\)/);
});
test('actual MiniMax payload keeps the exact same speaker ID and pitch across emotions by default',async()=>{
 const oldFetch=globalThis.fetch,oldSession=globalThis.sessionStorage;
 const values=new Map();
 globalThis.sessionStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 let bodies=[];
 globalThis.fetch=async(_url,opts)=>{
  bodies.push(JSON.parse(opts.body));
  return new Response(JSON.stringify({base_resp:{status_code:0},data:{audio:'fffb'}}),{status:200});
 };
 try{
  saveApiConfig({minimax:'stub-test-key',region:'cn',ttsModel:'speech-2.8-hd'});
  await voicePreview({text:'你到底想什么？',tone:'angry'});
  await voicePreview({text:'你在逗我笑吧？',tone:'happy'});
  assert.equal(bodies.length,2);
  for(const body of bodies){
   assert.equal(body.voice_setting.voice_id,XITAI_VOICE_ID);
   assert.equal(body.voice_setting.pitch,0);
   assert.equal(body.voice_setting.speed,1);
   assert.equal('emotion' in body.voice_setting,false);
   assert.equal(body.model,'speech-2.8-hd');
  }
  saveApiConfig({minimax:'stub-test-key',region:'cn',voiceStyle:'expressive'});
  await voicePreview({text:'你在开玩笑吗？',tone:'angry'});
  assert.equal(bodies.at(-1).voice_setting.emotion,'angry');
  assert.equal(bodies.at(-1).voice_setting.voice_id,XITAI_VOICE_ID);
 }finally{clearApiConfig();globalThis.fetch=oldFetch;if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;}
});
test('accepted text-call promise is context for first spoken line, not a fresh stranger call',()=>{
 const reason='【刚才的通话约定】熙蒙说「现在打给我」，你答应了「我现在打」';
 const opening=callScene({opening:true,direction:'incoming',reason});
 assert.match(opening,/电话现在已接通/);
 assert.match(opening,/承诺/);
 assert.match(opening,/不要没来由地夸自己的声音/);
 assert.match(callScene({opening:true,direction:'incoming'}),/先说明自己为何找他/);
 const followup=callScene({opening:false});
 assert.match(followup,/承接上一句话的具体意思/);
 const prompt=buildTaiPrompt({day:42,channel:'noapp',recognized:true,outputMode:'call',
   messages:[{role:'user',content:'你刚才在说什么？'}]});
 assert.match(prompt,/禁止随口说无因果的挑衅/);
 assert.match(prompt,/连贯、有内容/);
 assert.match(prompt,/清冷/);
});
