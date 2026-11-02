import test from 'node:test';
import assert from 'node:assert/strict';
import {saveClip,loadClip,clipIsTemporary} from '../src/services/voice/audio-store.js';
import {chatView} from '../src/components/chat.js';
import {initialState} from '../src/services/storage.js';

const records=new Map();let failWrites=false,blobWrites=0;
const database={close(){},transaction(){
 const tx={error:null,objectStore:()=>({
  put(value,id){
   if(value instanceof Blob){blobWrites++;throw Error('Error preparing Blob/File data to be stored in object store');}
   if(failWrites)throw Object.assign(Error('Storage unavailable'),{name:'UnknownError'});
   records.set(id,structuredClone(value));queueMicrotask(()=>tx.oncomplete?.());return {error:null};
  },
  get(id){const request={result:records.get(id)};queueMicrotask(()=>request.onsuccess?.());return request;}
 })};return tx;
}};
async function withIDB(run){
 const previous=globalThis.indexedDB;
 globalThis.indexedDB={open(){const request={result:database};queueMicrotask(()=>request.onsuccess?.());return request;}};
 try{await run();}finally{failWrites=false;if(previous===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=previous;}
}

test('Safari Blob-clone failure is avoided: byte records survive a fresh module session',async()=>{
 await withIDB(async()=>{
  const source=new Blob([Uint8Array.from([73,68,51,255,0,123])],{type:'audio/mpeg'});
  assert.equal(await saveClip('byte-record',source),'byte-record');
  assert.equal(blobWrites,0);assert.equal(clipIsTemporary('byte-record'),false);
  const stored=records.get('byte-record');assert.equal(stored.format,'audio-bytes-v1');
  assert.ok(stored.bytes instanceof ArrayBuffer);assert.equal(stored.type,'audio/mpeg');
  const fresh=await import('../src/services/voice/audio-store.js?reload=byte-regression');
  const audio=await fresh.loadClip('byte-record');assert.ok(audio instanceof Blob);
  assert.equal(audio.type,'audio/mpeg');assert.deepEqual([...new Uint8Array(await audio.arrayBuffer())],[73,68,51,255,0,123]);
 });
});
test('existing Blob recordings remain readable without deleting or migrating old audio',async()=>{
 await withIDB(async()=>{
  const old=new Blob(['original recording'],{type:'audio/mp4'});records.set('legacy',old);
  const audio=await loadClip('legacy');assert.equal(audio.type,'audio/mp4');assert.equal(await audio.text(),'original recording');
  assert.equal(records.get('legacy'),old);
 });
});
test('a total disk write failure still yields playable audio and an honest temporary-storage notice',async()=>{
 await withIDB(async()=>{
  failWrites=true;const audio=new Blob(['playable'],{type:'audio/mpeg'});
  assert.equal(await saveClip('temporary-note',audio),'temporary-note');
  assert.equal(clipIsTemporary('temporary-note'),true);assert.equal(await (await loadClip('temporary-note')).text(),'playable');
  const state=initialState(),chat=state.content.conversations.noapp.find(c=>c.id==='tai');
  chat.messages=[{id:'m',from:'tai',text:'听着呢',kind:'voice',audioId:'temporary-note',actual:true,day:state.day,time:state.clock}];
  const html=chatView(state,'noapp','tai');assert.match(html,/播放熙泰语音/);assert.match(html,/本次未能保存/);assert.doesNotMatch(html,/语音生成失败/);
  failWrites=false;await saveClip('temporary-note',audio);assert.equal(clipIsTemporary('temporary-note'),false);
  assert.doesNotMatch(chatView(state,'noapp','tai'),/本次未能保存/);
 });
});
test('no IndexedDB support does not discard audio already generated in the current session',async()=>{
 const previous=globalThis.indexedDB;delete globalThis.indexedDB;
 try{
  await saveClip('no-idb',new Blob(['still playable']));
  assert.equal(clipIsTemporary('no-idb'),true);assert.equal(await (await loadClip('no-idb')).text(),'still playable');
 }finally{if(previous!==undefined)globalThis.indexedDB=previous;}
});
