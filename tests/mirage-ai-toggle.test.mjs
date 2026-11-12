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
test('MIRAGE stays OFF for old saves and every Story55 day, regardless of a saved opt-in',()=>{
 for(const day of [1,14,15,16,24,55]){
  const s=activateStory55(initialState());s.day=day;
  for(const enabled of [undefined,false,true]){
   s.developerSettings={mirageAIReplies:enabled};
   assert.equal(mirageAIEnabled(s),false);
  }
 }
 assert.equal(mirageAIEnabled(initialState()),false);
});
test('obsolete developer enable cannot restore Mirage AI or change NoApp configuration',()=>{
 const ctx=fixture(),before=structuredClone(ctx.store.get().aiDraft);
 ctx.store.update(s=>{s.developerSettings={mirageAIReplies:true,mirageAIRevision:3};});
 assert.doesNotMatch(aiVoicePanel(ctx.store.get()),/data-mirage-ai/);
 assert.match(aiVoicePanel(ctx.store.get()),/MIRAGE · 固定對話/);
 change({dataset:{mirageAi:''},checked:true},ctx);
 assert.equal(mirageAIEnabled(new PhoneStore(ctx.storage).get()),false);
 assert.equal(ctx.store.get().developerSettings.mirageAIReplies,false);
 assert.equal(ctx.store.get().developerSettings.mirageAIRevision,4);
 assert.deepEqual(ctx.store.get().aiDraft,before);
});
test('even direct legacy reply entry makes no status/model request or generated bubble',async()=>{
 const ctx=fixture(),previous=globalThis.fetch;let requests=0;
 globalThis.fetch=async()=>{requests++;throw Error('MIRAGE must not call AI');};
 try{
  ctx.store.update(s=>{s.day=16;s.developerSettings={mirageAIReplies:true};});
  assert.equal(await replyToOuroboros(ctx,cid,source),0);
  setMirageAIEnabled(ctx.store,true);
  assert.equal(await replyToOuroboros(ctx,cid,source),0);
  assert.equal(requests,0);
  assert.equal(ctx.store.get().content.conversations.mirage.find(c=>c.id===cid).messages.length,1);
 }finally{globalThis.fetch=previous;setMirageAuthenticated(false);}
});
test('MIRAGE authored dialogue still progresses while AI is OFF',()=>{
 const s=activateStory55(initialState());previewNode55(s,'invitation');
 assert.equal(mirageAIEnabled(s),false);advanceScene55(s,'invitation');
 assert.ok(s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.some(m=>m.id==='s55-invitation-0'));
});
