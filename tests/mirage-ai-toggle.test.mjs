import test from 'node:test';
import assert from 'node:assert/strict';
import {PhoneStore,initialState} from '../src/services/storage.js';
import {mirageAIEnabled,setMirageAIEnabled} from '../src/services/ai/channel-controls.js';
import {replyToOuroboros} from '../src/apps/mirage/features/ai-replies/index.js';
import {setMirageAuthenticated} from '../src/apps/mirage/session.js';
import {change} from '../src/apps/developer/index.js';
import {aiVoicePanel} from '../src/apps/developer/features/ai-voice/index.js';
import {activateStory55,advanceScene55} from '../src/services/story55/runtime.js';
import {previewNode55} from '../src/services/story55/controller.js';

const cid='mirage-ai-test',source='player-source';
function fixture(){
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},store=new PhoneStore(storage);
 store.update(s=>s.content.conversations.mirage.push({id:cid,name:'Dr Ouroboros',messages:[{id:source,from:'me',text:'你在忙什么？',kind:'text',actual:true,day:s.day,time:s.clock}]}));
 setMirageAuthenticated(true);
 return {store,storage,toast:message=>assert.fail(message)};
}
const response=text=>new Response(JSON.stringify({text:JSON.stringify({messages:[{text,mode:'text'}]})}));
const status=()=>new Response(JSON.stringify({deepseek:true,minimax:false}));
test('old and new phones default OFF; the developer switch persists without changing NoApp settings',()=>{
 const ctx=fixture(),before=structuredClone(ctx.store.get().aiDraft);
 assert.equal(mirageAIEnabled(initialState()),false);assert.equal(mirageAIEnabled(ctx.store.get()),false);
 assert.match(aiVoicePanel(ctx.store.get()),/data-mirage-ai\s*>/);
 change({dataset:{mirageAi:''},checked:true},ctx);
 assert.equal(mirageAIEnabled(ctx.store.get()),true);
 assert.equal(mirageAIEnabled(new PhoneStore(ctx.storage).get()),true);
 assert.deepEqual(ctx.store.get().aiDraft,before);
 change({dataset:{mirageAi:''},checked:false},ctx);
 assert.equal(mirageAIEnabled(new PhoneStore(ctx.storage).get()),false);
});
test('default OFF makes no status/model request; explicit ON permits a reply',async()=>{
 const ctx=fixture(),previous=globalThis.fetch;let requests=0;
 globalThis.fetch=async url=>{requests++;return String(url).endsWith('/status')?status():response('刚忙完。');};
 try{
  assert.equal(await replyToOuroboros(ctx,cid,source),0);assert.equal(requests,0);
  setMirageAIEnabled(ctx.store,true);
  assert.equal(await replyToOuroboros(ctx,cid,source),1);assert.equal(requests,2);
  assert.equal(ctx.store.get().content.conversations.mirage.find(c=>c.id===cid).messages.at(-1).text,'刚忙完。');
 }finally{globalThis.fetch=previous;setMirageAuthenticated(false);}
});
test('turning OFF then ON discards a model result already in flight',async()=>{
 const ctx=fixture(),previous=globalThis.fetch;let release,started;
 const ready=new Promise(resolve=>started=resolve);
 globalThis.fetch=async url=>{
  if(String(url).endsWith('/status'))return status();
  started();return new Promise(resolve=>release=()=>resolve(response('不应该送达的旧回复')));
 };
 try{
  setMirageAIEnabled(ctx.store,true);const pending=replyToOuroboros(ctx,cid,source);await ready;
  setMirageAIEnabled(ctx.store,false);setMirageAIEnabled(ctx.store,true);release();
  assert.equal(await pending,0);
  assert.equal(ctx.store.get().content.conversations.mirage.find(c=>c.id===cid).messages.length,1);
 }finally{globalThis.fetch=previous;setMirageAuthenticated(false);}
});
test('closing the switch stops the remaining bubbles of a multi-message reply',async()=>{
 const ctx=fixture(),previous=globalThis.fetch;
 globalThis.fetch=async url=>String(url).endsWith('/status')?status():new Response(JSON.stringify({text:JSON.stringify({messages:[{text:'第一条。',mode:'text'},{text:'第二条。',mode:'text'}]})}));
 try{
  setMirageAIEnabled(ctx.store,true);
  assert.equal(await replyToOuroboros(ctx,cid,source,{wait:async()=>setMirageAIEnabled(ctx.store,false)}),1);
  assert.equal(ctx.store.get().content.conversations.mirage.find(c=>c.id===cid).messages.length,2);
 }finally{globalThis.fetch=previous;setMirageAuthenticated(false);}
});
test('MIRAGE scripted dialogue can progress while AI is OFF',()=>{
 const s=activateStory55(initialState());previewNode55(s,'invitation');
 assert.equal(mirageAIEnabled(s),false);advanceScene55(s,'invitation');
 assert.ok(s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.some(m=>m.id==='s55-invitation-0'));
});

test('Story55 D15 free Mirage chat now responds while online, but developer OFF and older days remain respected',async()=>{
 const s=activateStory55(initialState());
 s.day=16;s.clock='08:54';s.story55.activeScene=null;
 s.story55.config={...s.story55.config,nodes:[]};
 const c=s.content.conversations.mirage.find(x=>x.id==='s55-ouroboros')||
  {id:'s55-ouroboros',name:'Dr Ouroboros',messages:[],unread:0};
 if(!s.content.conversations.mirage.includes(c))s.content.conversations.mirage.push(c);
 const id='human-hello';
 c.messages.push({id,from:'me',text:'厲害',kind:'text',actual:true,day:s.day,time:s.clock});
 const ctx={store:{get:()=>s,update:fn=>fn(s)}};
 assert.equal(mirageAIEnabled(s),true,'online Story55 free chat should not require developer opt-in');
 const previous=globalThis.fetch;
 let n=0;
 globalThis.fetch=async url=>{n++;return String(url).includes('/api/ai/status')?status():response('當然。')};
 setMirageAuthenticated(true);
 try{
  assert.equal(await replyToOuroboros(ctx,c.id,id),1);
  assert.equal(c.messages.at(-1).text,'當然。');
  assert.equal(n,2);
  setMirageAIEnabled(ctx.store,false);
  const after=c.messages.length;
  assert.equal(await replyToOuroboros(ctx,c.id,id),0);
  assert.equal(c.messages.length,after);
  s.day=14;delete s.developerSettings?.mirageAIReplies;
  assert.equal(mirageAIEnabled(s),false,'D01-D14 remain unchanged');
 }finally{globalThis.fetch=previous;setMirageAuthenticated(false);}
});
