import test from 'node:test';
import assert from 'node:assert/strict';
import {saveApiConfig,apiConfig,clearApiConfig,askTai,voicePreview,AI_PREFERENCES} from '../src/services/ai/gateway.js';
import {normalizeTtsSettings,ttsProviderSettings} from '../src/services/voice/tts-settings.js';
import {deepseekModelOptions} from '../src/services/ai/model-config.js';
import {render} from '../src/apps/noapp/index.js';
import {voicePanel} from '../src/apps/developer/features/voice-authoring/index.js';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
const parameters={temperature:.75,topP:.85,maxTokens:1536,speed:.8,pitch:-3,volume:1.4,emotion:'sad',cue:'sighs',language:'Portuguese',modifyPitch:-15,intensity:20,timbre:-25,soundEffect:'lofi_telephone',sampleRate:24000,bitrate:64000,channel:2,normalization:'basic'};
async function configured(run){
 const originals=Object.fromEntries(['sessionStorage','localStorage','fetch'].map(k=>[k,globalThis[k]]));
 const session=new Map(),prefs=new Map(),requests=[];
 const storage=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)});
 globalThis.sessionStorage=storage(session);globalThis.localStorage=storage(prefs);
 globalThis.fetch=async(url,init)=>{requests.push({url:String(url),body:JSON.parse(init.body)});
  return String(url).includes('t2a_v2')?Response.json({base_resp:{status_code:0},data:{audio:'494433'}}):Response.json({choices:[{message:{content:'{"messages":[{"text":"听着呢。"}]}'}}]});};
 saveApiConfig({model:'deepseek-v4-pro',deepseek:'test-secret-deepseek',minimax:'test-secret-minimax',...parameters});
 try{await run({requests,session,prefs});}finally{for(const [k,v] of Object.entries(originals)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
}
test('AI sampling controls and all MiniMax voice controls actually reach provider payloads',async()=>{
 await configured(async({requests})=>{
  await askTai({channel:'noapp',day:34,recognized:true,messages:[{role:'user',content:'我听听'}]});
  assert.equal(requests[0].body.temperature,.75);assert.equal(requests[0].body.top_p,.85);assert.equal(requests[0].body.max_tokens,1536);
  await voicePreview({text:'Olá, meu irmão.'});const voice=requests.at(-1).body;
  assert.deepEqual(voice.voice_setting,{voice_id:apiConfig().voiceId,speed:.8,vol:1.4,pitch:-3,emotion:'sad'});
  assert.match(voice.text,/^\(sighs\)/);assert.equal(voice.language_boost,'Portuguese');
  assert.deepEqual(voice.voice_modify,{pitch:-15,intensity:20,timbre:-25,sound_effects:'lofi_telephone'});
  assert.deepEqual(voice.audio_setting,{sample_rate:24000,bitrate:64000,format:'mp3',channel:2});
  assert.equal(voice.text_normalization_mode,'basic');
  await voicePreview({text:'单句覆盖',speed:1.2,pitch:2,emotion:'happy',cue:'chuckle'});
  const override=requests.at(-1).body;assert.equal(override.voice_setting.speed,1.2);assert.equal(override.voice_setting.pitch,2);assert.equal(override.voice_setting.emotion,'happy');assert.match(override.text,/^\(chuckle\)/);
  assert.equal(apiConfig().speed,.8,'per-line tuning never changes global defaults');
 });
});
test('non-secret preferences persist while API keys stay only in session',async()=>{
 await configured(async({prefs,session})=>{
  const persisted=prefs.get(AI_PREFERENCES);assert.doesNotMatch(persisted,/test-secret|deepseek"|minimax"/);
  session.clear();const c=apiConfig();assert.equal(c.minimax,undefined);assert.equal(c.deepseek,undefined);assert.equal(c.temperature,.75);assert.equal(c.pitch,-3);
 });
});
test('unsupported MiniMax emotions and unsafe ranges never leave validation',()=>{
 const c=normalizeTtsSettings({speed:100,pitch:-100,volume:0,emotion:'whisper',cue:'evil',modifyPitch:500,channel:10});
 assert.equal(c.speed,2);assert.equal(c.pitch,-12);assert.equal(c.volume,.01);assert.equal(c.emotion,'calm');assert.equal(c.cue,'none');assert.equal(c.modifyPitch,100);assert.equal(c.channel,1);
 assert.equal(Object.hasOwn(ttsProviderSettings({emotion:'auto'}).voice_setting,'emotion'),false);
 assert.equal(Object.hasOwn(deepseekModelOptions('deepseek-flash',parameters),'top_p'),false);
});
test('NoApp and per-line authoring expose real controls and cue shortcuts',async()=>{
 await configured(async()=>{
  const s=activateStory55(initialState()),html=render({store:{get:()=>s}},{route:'/settings-ai'});
  for(const name of ['temperature','topP','maxTokens','speed','pitch','emotion','volume','cue','timbre','soundEffect'])assert.match(html,new RegExp('name="'+name+'"'));
  const editor=voicePanel(s);assert.match(editor,/name="clip\d+_speed"/);assert.match(editor,/name="clip\d+_pitch"/);assert.match(editor,/data-action="tai-voice-cue"/);
  assert.doesNotMatch(html,/固定冷静.*音高 0.*语速 1.0/);
 });
});

test('HTML number constraints accept defaults and supported decimals in both settings and preset voice forms',async()=>{
 const {aiParameterFields,ttsParameterFields}=await import('../src/apps/noapp/settings/parameters.js');
 const fields=html=>[...html.matchAll(/<input\b[^>]*type="number"[^>]*>/g)].map(([tag])=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]])));
 const valid=(f,value)=>{
  const n=Number(value);if(!Number.isFinite(n)||n<Number(f.min)||n>Number(f.max))return false;
  if(f.step==='any')return true;
  const offset=(n-Number(f.min))/Number(f.step||1);
  return Math.abs(offset-Math.round(offset))<1e-7;
 };
 for(const prefix of ['', 'clip7_']){
  const controls=fields(ttsParameterFields({},prefix));
  for(const field of controls)assert.equal(valid(field,field.value),true,field.name+' default must be submittable');
  const volume=controls.find(f=>f.name===prefix+'volume');
  for(const value of [.01,1,1.25,1.4,10])assert.equal(valid(volume,value),true,'volume '+value);
  assert.equal(valid(volume,0),false);assert.equal(valid(volume,10.01),false);
  assert.equal(valid(controls.find(f=>f.name===prefix+'speed'),.83),true);
  assert.equal(valid(controls.find(f=>f.name===prefix+'pitch'),1.5),false,'pitch still requires whole semitones');
 }
 const ai=fields(aiParameterFields({}));
 assert.equal(valid(ai.find(f=>f.name==='temperature'),1.37),true);
 assert.equal(valid(ai.find(f=>f.name==='topP'),.925),true);
 assert.equal(valid(ai.find(f=>f.name==='maxTokens'),1000),true);
 assert.equal(valid(ai.find(f=>f.name==='maxTokens'),1000.5),false);
});

test('additional MiniMax voice is selectable and honored by synthesis, without changing default',async()=>{
 await configured(async({requests})=>{
  const {XITAI_VOICE_ID,XITAI_VOICE_OPTIONS}=await import('../src/services/ai/gateway.js');
  const extra='moss_audio_4e461be0-d6d5-11f1-9dac-d60bed5a35f4';
  assert.ok(XITAI_VOICE_OPTIONS.some(([id])=>id===extra));
  assert.equal(apiConfig().voiceId,XITAI_VOICE_ID);
  const {saveApiConfig}=await import('../src/services/ai/gateway.js');
  saveApiConfig({...apiConfig(),voiceId:extra});
  assert.equal(apiConfig().voiceId,extra);
  await voicePreview({text:'测试另一个音色'});
  assert.equal(requests.at(-1).body.voice_setting.voice_id,extra);
  await voicePreview({text:'临时换回原音色',voiceId:XITAI_VOICE_ID});
  assert.equal(requests.at(-1).body.voice_setting.voice_id,XITAI_VOICE_ID);
  assert.equal(apiConfig().voiceId,extra,'per-clip override does not change saved voice');
  const html=render({store:{get:()=>activateStory55(initialState())}},{route:'/settings-ai'});
  assert.match(html,/name="voiceId"/);
  assert.match(html,/moss_audio_4e461be0-d6d5-11f1-9dac-d60bed5a35f4/);
 });
});
