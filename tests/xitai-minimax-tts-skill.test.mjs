import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareTaiVoicePerformance} from '../src/services/voice/voice-performance.js';
import {validateXitaiSpeechDirection} from '../src/services/voice/voice-regex.js';
import {unpackTaiReply,readableTaiVoiceText} from '../src/services/ai/format.js';
import {combineTaiVoiceThoughts} from '../src/services/ai/voice-request-v11.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {voicePreview,saveApiConfig,clearApiConfig,apiConfig,XITAI_VOICE_ID} from '../src/services/ai/gateway.js';
import {composeCallSpeech} from '../src/services/voice/call-speech.js';

// User accepted the exact audio round-15 inputs 96–103, with 93 as
// the preceding acceptable question. Preserve these inputs byte-for-byte.
const approved=[
 ['還沒，想我了？','還沒<#0.5#>想我(le5)？'],
 ['怎麼了？','(emm)怎麼(le5)？'],
 ['叫聲老闆。','(snorts)叫聲老闆。'],
 ['你倒是挺聰明。','(chuckle)你倒是挺聰明。'],
 ['你又沒睡覺？','(sighs)你又沒睡覺？'],
 ['先別急，我看看。','(breath)先別急，我看看。'],
 ['你先別動，我來。','你先別動<#0.2#>我來。'],
 ['這就急了？','這就急(le5)？'],
 ['行，這回信我了？','行<#0.5#>這回信我(le5)？']
];
test('round 15 native marks travel from JSON to call and note without changing captions',()=>{
 for(const [text,speech_text] of approved){
  for(const channel of ['call','noapp']){
   const [entry]=unpackTaiReply({messages:[{text,speech_text,mode:'voice'}]},channel);
   assert.equal(entry.text,text);
   assert.equal(entry.speechText,speech_text);
   const prepared=prepareTaiVoicePerformance(composeCallSpeech([entry]),{directed:true,tone:'angry'});
   assert.equal(prepared.text,speech_text);
   assert.equal(prepared.speed,.86);
   assert.equal(prepared.emotion,'calm');
  }
 }
 const entries=approved.slice(1,5).map(([text,speech_text])=>unpackTaiReply({messages:[{text,speech_text,mode:'voice'}]})[0]);
 const [combined]=combineTaiVoiceThoughts(entries);
 assert.doesNotMatch(combined.text,/\(|<#|le5/);
 assert.equal(prepareTaiVoicePerformance(combined.speechText,{directed:true}).text,combined.speechText);
 assert.equal(readableTaiVoiceText('想我(le5)？'),'想我了？');
});
test('optional direction cannot change words, punctuation, or leak unapproved tags',()=>{
 const text='還沒，想我了？';
 for(const speech_text of ['還沒，想你(le5)？','還沒，想我(le5)。','(gasps)還沒，想我(le5)？','<#0.5#>還沒，想我(le5)？','還沒<#0.5#><#0.2#>想我(le5)？','還沒，<#0.5#>想我(le5)？','(emm)(emm)還沒，想我(le5)？','(emm)(breath)(snorts)還沒，想我(le5)？','還沒～～想我(le5)？']){
  assert.equal(validateXitaiSpeechDirection(text,speech_text),null,speech_text);
  const [r]=unpackTaiReply({messages:[{text,speech_text,mode:'voice'}]});
  assert.equal(r.speechText,text);
 }
 assert.equal(validateXitaiSpeechDirection('熙蒙，你來了？','熙<#0.2#>蒙，你來(le5)？'),null);
 const [plain]=unpackTaiReply({messages:[{text:'怎麼了？',speech_text:'(emm)怎麼(le5)？',mode:'text'}]});
 assert.equal(plain.speechText,undefined);assert.equal(plain.text,'怎麼了？');
 assert.equal(prepareTaiVoicePerformance('還沒，想我了？',{directed:true}).text,'還沒，想我(le5)？');
 assert.equal(prepareTaiVoicePerformance('想我了。',{directed:true}).text,'想我了。');
 assert.equal(prepareTaiVoicePerformance('你先別急。',{directed:true,tone:'angry'}).text,'你先別急。');
 assert.equal(prepareTaiVoicePerformance('啵啵。',{directed:true}).text,'啵啵。');
});
test('prompt permits speech-only direction for calls and free NoApp voice, but never markup in chat',()=>{
 for(const outputMode of ['voice','call','text']){
  const prompt=buildTaiPrompt({channel:'noapp',day:56,recognized:true,allowVoice:true,outputMode});
  assert.match(prompt,/speech_text/);
  assert.match(prompt,/\(le5\)/);
  assert.match(prompt,/不要为了亲昵反复叫熙蒙的名字/);
  assert.match(prompt,/禁止在text中写JSON/);
 }
});
test('real gateway sends approved voice configuration and exact text without changing authoring preferences',async()=>{
 const old=Object.fromEntries(['sessionStorage','localStorage','fetch'].map(k=>[k,globalThis[k]]));
 const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
 globalThis.sessionStorage=storage();globalThis.localStorage=storage();
 const sent=[];
 globalThis.fetch=async(_url,opts)=>{sent.push(JSON.parse(opts.body));return Response.json({base_resp:{status_code:0},data:{audio:'494433'}});};
 try{
  saveApiConfig({minimax:'stub-only-not-a-real-key',ttsModel:'speech-2.8-turbo',speed:1.2,pitch:-4,emotion:'angry',cue:'sighs',timbre:25});
  for(const [,speech] of approved){
   await voicePreview({text:speech,tone:'angry',directed:true});
   const payload=sent.at(-1);
   assert.equal(payload.text,speech);assert.equal(payload.model,'speech-2.8-hd');
   assert.deepEqual(payload.voice_setting,{voice_id:XITAI_VOICE_ID,speed:.86,vol:1,pitch:0,emotion:'calm'});
   assert.equal(payload.language_boost,'Chinese');assert.equal(payload.voice_modify,undefined);
  }
  assert.equal(apiConfig().speed,1.2);
  await voicePreview({text:'手動試音。',emotion:'happy',pitch:2});
  assert.equal(sent.at(-1).voice_setting.speed,1.2);
  assert.equal(sent.at(-1).voice_setting.pitch,2);
  assert.equal(sent.at(-1).voice_setting.emotion,'happy');
 }finally{clearApiConfig();for(const [k,v] of Object.entries(old)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});
test('production Edge gateway forwards explicit calm and native speech to MiniMax',async()=>{
 const source=readFileSync(new URL('../supabase/functions/tai-provider-gateway/index.ts',import.meta.url),'utf8');
 const start=source.indexOf('async function speech(req,body){');
 const end=source.indexOf('\nDeno.serve(',start);
 assert.ok(start>=0&&end>start);
 // Run the real Edge speech function in isolation from secrets, auth, quota
 // and network. Its dependencies are harmless local stubs.
 let sent;
 const speech=new Function('Deno','error','goodString','num','sendProvider','headers',
  source.slice(start,end)+'\nreturn speech;')(
   {env:{get:()=> 'stub-only'}},(code,message)=>Error(message),
   (value,max)=>typeof value==='string'&&value.trim()&&value.length<=max,
   (value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback,
   async(_endpoint,_key,payload)=>{sent=payload;return {data:{audio:'494433'}};},()=>({}));
 const expected='還沒<#0.5#>想我(le5)？';
 const response=await speech({},{
  text:expected,voiceId:XITAI_VOICE_ID,model:'speech-2.8-hd',
  settings:{voice_setting:{speed:.86,vol:1,pitch:0,emotion:'calm'},language_boost:'Chinese'}
 });
 assert.equal(response.status,200);assert.equal(sent.text,expected);
 assert.deepEqual(sent.voice_setting,{voice_id:XITAI_VOICE_ID,speed:.86,vol:1,pitch:0,emotion:'calm'});
});
