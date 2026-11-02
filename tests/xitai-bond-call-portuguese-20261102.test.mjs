import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {updateTaiBond,taiBond,taiBondPrompt} from '../src/services/ai/relationship-bond.js';
import {taiPlayerRequestedCall,taiShouldCallAfterText} from '../src/services/ai/call-intent.js';
import {unpackTaiReply} from '../src/services/ai/format.js';
import {chatView} from '../src/components/chat.js';
import {containsPortuguese,safeTaiTranslation} from '../src/services/ai/portuguese.js';
import {replyToTaiMessage} from '../src/services/ai/live-chat.js';
import {callState,callAction} from '../src/apps/noapp/voice-call.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';

test('trust grows from real NoApp interaction, not random short messages or repeated farming',()=>{
 const s=initialState();s.day=56;
 assert.equal(taiBond(s).score,30);
 assert.equal(updateTaiBond(s,{messageId:'1',text:'我想你了',now:1000000}),true);
 assert.equal(taiBond(s).score,33);
 assert.equal(updateTaiBond(s,{messageId:'1',text:'我想你了',now:2000000}),false);
 assert.equal(taiBond(s).score,33);
 assert.equal(updateTaiBond(s,{messageId:'2',text:'我想你了',now:1000100}),false);
 assert.equal(taiBond(s).score,33);
 assert.equal(updateTaiBond(s,{messageId:'3',text:'我想你了',now:4000000}),true);
 assert.equal(taiBond(s).score,36);
 assert.equal(updateTaiBond(s,{messageId:'4',text:'你能帮我看看吗，谢谢你',now:4000100}),true);
 assert.equal(taiBond(s).score,38);
 assert.equal(updateTaiBond(s,{messageId:'5',text:'hi',source:'mirage'}),false);
 assert.equal(taiBond(s).score,38);
 const old=structuredClone(s.aiDraft.taiBond);
 assert.deepEqual(taiBond(structuredClone(s)),taiBond(s));
 assert.deepEqual(s.aiDraft.taiBond,old);
});
test('unrecognized Ouroboros remains dominant regardless of saved bond',()=>{
 const s=initialState();s.day=28;s.aiDraft.taiBond={score:97};
 assert.match(taiBondPrompt(s,{channel:'mirage'}),/上位者/);
 assert.doesNotMatch(taiBondPrompt(s,{channel:'mirage'}),/温柔恋人.*可以/);
 s.day=56;
 assert.match(taiBondPrompt(s,{channel:'noapp'}),/97\/100/);
 assert.match(taiBondPrompt(s,{channel:'noapp'}),/纵容|坦率/);
});
test('text bubbles can be informal; serious text and voice keep punctuation',()=>{
 const text=unpackTaiReply({text:JSON.stringify({messages:[{text:'行，我现在打。',mode:'text',tone:'dry'},{text:'哦？',mode:'text',tone:'playful'},{text:'等我几分钟。',mode:'text',tone:'soft'},{text:'这件事情还是先解释清楚，资料涉及到三组不同的变量，需要分开处理。',mode:'text',tone:'serious'}]})});
 assert.deepEqual(text.map(x=>x.text),['行，我现在打','哦？','等我几分钟','这件事情还是先解释清楚，资料涉及到三组不同的变量，需要分开处理。']);
 const voice=unpackTaiReply({text:'{"messages":[{"text":"等我几分钟。","mode":"voice"}]}'},'noapp');
 assert.equal(voice[0].text,'等我几分钟。');
 assert.match(voice[0].speechText,/。$/);
});
test('only explicit current call request + immediate commitment rings; future and no are not commitments',()=>{
 const entries=[{mode:'text',text:'这么想听？'},{mode:'text',text:'行，我现在打'}];
 assert.equal(taiShouldCallAfterText({lastUser:'现在给我打电话',entries}),true);
 assert.equal(taiPlayerRequestedCall('给我打电话，我想听你说话'),true);
 assert.equal(taiPlayerRequestedCall('不要给我打电话'),false);
 assert.equal(taiShouldCallAfterText({lastUser:'现在给我打电话',entries,alreadyCalled:true}),false);
 assert.equal(taiShouldCallAfterText({lastUser:'我想你了',entries}),false);
 assert.equal(taiShouldCallAfterText({lastUser:'不要给我打电话',entries}),false);
 assert.equal(taiShouldCallAfterText({lastUser:'现在给我打电话',entries:[{text:'等我几分钟，洗完就给你打'}]}),false);
 assert.equal(taiShouldCallAfterText({lastUser:'请打过来',entries:[{text:'我现在不方便'}]}),false);
});
test('Portuguese gets optional player-requested translation; English hi does not',()=>{
 assert.equal(containsPortuguese('hi'),false);
 assert.equal(containsPortuguese('Não, estás a brincar?'),true);
 assert.equal(containsPortuguese('Claro，等我一下'),true);
 assert.equal(safeTaiTranslation('hi','你好'), '');
 const entries=unpackTaiReply({text:JSON.stringify({messages:[
  {text:'Não, estás a brincar?',mode:'text',translation:'不是吧，你在开玩笑吗？'},
  {text:'我现在打电话',mode:'text',translation:'我现在打电话'}
 ]})});
 assert.equal(entries[0].translation,'不是吧，你在开玩笑吗？');
 assert.equal(entries[1].translation,undefined);
 assert.match(buildTaiPrompt({day:56,channel:'noapp',messages:[{role:'user',content:'hi'}]}),/不要机械复制一个 hi/);
});
test('AI commitment after typed call request triggers a real ringing NoApp call',async()=>{
 // Match the existing NoApp integration harness, but avoid actual network requests.
 const state=initialState();state.day=56;state.clock='22:00';
 const chat=state.content.conversations.noapp.find(c=>c.id==='tai');
 chat.messages.push({id:'call-req-demo',from:'me',text:'现在给我打电话',kind:'text',actual:true,day:56,time:'22:00'});
 const store={get:()=>state,update(fn){fn(state);}};
 const oldFetch=globalThis.fetch,oldSession=globalThis.sessionStorage;
 const session=new Map();
 globalThis.sessionStorage={getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
 globalThis.fetch=async url=>new Response(JSON.stringify(String(url).endsWith('/status')
  ?{mode:'test',deepseek:true,minimax:false}
  :{text:JSON.stringify({messages:[{text:'(phone)行，我现在打。',mode:'text',tone:'dry'}]})}),{status:200,headers:{'Content-Type':'application/json'}});
 try{
  const response=await replyToTaiMessage(store,'call-req-demo',{wait:async()=>{}});
  assert.equal(response.status,'replied');
  assert.equal(chat.messages.at(-1).text,'行，我现在打');
  assert.ok(chat.messages.every(m=>!String(m.text||'').includes('(phone)')),'phone marker is internal, not visible');
  assert.equal(callState().state,'ringing');
  assert.equal(state.events.filter(e=>e.type==='tai_text_call_trigger').length,1);
  const ctx={store,refresh:()=>{},toast:()=>{},router:{open:()=>{}}};
  callAction('tai-decline',ctx);
 }finally{globalThis.fetch=oldFetch;if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;}
});


test('pure hi mirror is repaired once by DeepSeek instead of saving an echo',async()=>{
 const state=initialState();state.day=56;state.clock='22:00';
 const c=state.content.conversations.noapp.find(c=>c.id==='tai');
 c.messages.push({id:'hello-demo',from:'me',text:'hi',kind:'text',actual:true,day:56,time:'22:00'});
 const store={get:()=>state,update(fn){fn(state)}};
 const oldFetch=globalThis.fetch,oldSession=globalThis.sessionStorage;
 const session=new Map();globalThis.sessionStorage={getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
 let calls=0;
 globalThis.fetch=async(url)=>{
  if(String(url).endsWith('/status'))return new Response(JSON.stringify({deepseek:true,minimax:false}),{status:200});
  calls++;
  return new Response(JSON.stringify({text:JSON.stringify({messages:[{text:calls===1?'hi':'你怎么突然想起我了？',mode:'text'}]})}),{status:200});
 };
 try{
  const result=await replyToTaiMessage(store,'hello-demo',{wait:async()=>{}});
  assert.equal(result.status,'replied');
  assert.equal(calls,2);
  assert.equal(c.messages.at(-1).text,'你怎么突然想起我了？');
 }finally{globalThis.fetch=oldFetch;if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;}
});
test('everyday non-keyword conversations grow slow familiarity after eight meaningful turns',()=>{
 const s=initialState();s.day=56;
 for(let i=0;i<8;i++)updateTaiBond(s,{messageId:'ordinary-'+i,text:'今天我跟你聊了一件日常的小事 '+i,now:1e6+i*1e5});
 assert.equal(taiBond(s).score,31);
});

test('NoApp reveals Portuguese translation only upon expanding a native disclosure',()=>{
 const s=initialState();s.day=56;s.clock='22:00';
 const c=s.content.conversations.noapp.find(x=>x.id==='tai');
 c.messages.push({id:'pt-1',from:'tai',text:'Não, estás a brincar?',translation:'你在开玩笑吗？',kind:'text',day:56,actual:true,time:'22:00'});
 const html=chatView(s,'noapp','tai');
 assert.match(html,/class="tai-translation"/);
 assert.match(html,/<summary>翻译<\/summary>/);
 assert.match(html,/你在开玩笑吗？/);
 assert.ok(html.indexOf('你在开玩笑吗？')>html.indexOf('<details'));
});
