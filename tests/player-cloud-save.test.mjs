import test from 'node:test';
import assert from 'node:assert/strict';
import {PlayerCloudSave,connectPlayerSave} from '../src/services/storage/cloud/index.js';
import {verifySaveEmail,takeEmailCallback,cloudRequest} from '../src/services/storage/cloud/api.js';
import {taiCloudSession,SESSION_KEY} from '../src/services/ai/supabase-gateway.js';
import {cloudSaveView,cloudSaveAction} from '../src/apps/settings/features/cloud-save/index.js';
import {snapshotVoiceMedia} from '../src/services/storage/cloud/media.js';
import {saveClip} from '../src/services/voice/audio-store.js';

const memory=()=>{const entries=new Map();return {getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,String(v)),removeItem:k=>entries.delete(k)};};
const state=day=>({version:2,day,clock:'18:00',content:{conversations:{}},story55:{}});
const validate=s=>{assert.equal(s.version,2);assert.ok(s.day>0);return s;};
function phone(day=8,{storage=memory(),existing=true}={}){
 let value=state(day);
 const store={storage,hasExistingSave:existing,get:()=>value,
  replace(s){value=structuredClone(s);store.cloud?.schedule(JSON.stringify(value));},
  advance(day){value={...value,day};store.cloud?.schedule(JSON.stringify(value));}};
 return store;
}
function server(){
 let row=null,writeCount=0;const backups=[];
 return {get row(){return row;},get writes(){return writeCount;},backups,
  api:{player:async()=>({id:'player-a',is_anonymous:true}),read:async()=>structuredClone(row),
   media:async()=>({media:{},missing:0}),useMedia(){},backups:async()=>structuredClone(backups),
   write:async({revision,writeId,state})=>{
    writeCount++;
    if(row?.client_write_id===writeId)return {...row,status:'saved'};
    if(revision!==(row?.revision||0))return {status:'conflict'};
    if(row)backups.push(structuredClone(row));
    row={id:'save-a',revision:revision+1,client_write_id:writeId,game_state:structuredClone(state),updated_at:'2026-11-23T12:00:00Z'};
    return {...row,status:'saved'};
   }}
 };
}
function client(t,backend,store=phone(),options={}){
 const cloud=new PlayerCloudSave(store,{key:'phone',validate,api:backend.api,factory:null,delay:60000,...options});
 store.cloud=cloud;t.after(()=>cloud.close());return cloud;
}
test('first cloud save uploads existing progress; offline changes retain the latest local state',async t=>{
 const backend=server(),store=phone(31),cloud=client(t,backend,store);
 await cloud.start();await cloud.flush();assert.equal(backend.row.game_state.day,31);
 const write=cloud.api.write;cloud.api.write=async()=>{throw Error('offline');};
 store.advance(32);assert.equal(await cloud.flush(),false);assert.equal(store.get().day,32);assert.equal(cloud.status.phase,'offline');
 store.advance(33);cloud.api.write=write;await cloud.flush();
 assert.equal(backend.row.game_state.day,33);assert.equal(cloud.revision,2);
});
test('simultaneous devices preserve both saves until the player chooses; replacing archives the old cloud state',async t=>{
 const backend=server(),a=client(t,backend);await a.start();await a.flush();
 const storage=memory();for(const k of ['phone:cloud-owner','phone:cloud:player-a:1'])storage.setItem(k,a.store.storage.getItem(k));
 const b=client(t,backend,phone(8,{storage}));await b.start();
 a.store.advance(9);await a.flush();b.store.advance(10);
 assert.equal(await b.flush(),false);assert.equal(b.status.phase,'conflict');assert.equal(b.store.get().day,10);assert.equal(backend.row.game_state.day,9);
 await b.resolve('local');assert.equal(backend.row.game_state.day,10);assert.equal(backend.backups.at(-1).game_state.day,9);
 assert.ok(b.store.storage.getItem('phone:before-cloud-restore:player-a'));
});
test('an acknowledgement lost in transit is retried idempotently after reload',async t=>{
 const backend=server(),a=client(t,backend),write=a.api.write;await a.start();
 a.api.write=async args=>{await write(args);throw Error('connection dropped');};await a.flush();
 assert.equal(backend.row.revision,1);
 const b=client(t,backend,phone(8,{storage:a.store.storage}));await b.start();await b.flush();
 assert.equal(b.status.phase,'synced');assert.equal(backend.row.revision,1);assert.equal(backend.backups.length,0);
});
test('changes made during an upload remain queued for the next save',async t=>{
 const backend=server(),cloud=client(t,backend);await cloud.start();
 let release;const gate=new Promise(r=>release=r),write=cloud.api.write;
 cloud.api.write=async args=>{await gate;return write(args);};
 const saving=cloud.flush();await new Promise(r=>setImmediate(r));cloud.store.advance(17);release();await saving;
 cloud.api.write=write;await cloud.flush();assert.equal(backend.row.game_state.day,17);
});
test('a second flush during an in-flight upload saves its newer edit rather than reporting the old upload as complete',async t=>{
 const backend=server(),cloud=client(t,backend);await cloud.start();await cloud.flush();
 const write=cloud.api.write;
 let allowWrite,signalWrite;
 const gate=new Promise(resolve=>allowWrite=resolve);
 const entered=new Promise(resolve=>signalWrite=resolve);
 cloud.api.write=async args=>{signalWrite();await gate;return write(args);};
 cloud.store.advance(9);
 const first=cloud.flush();await entered;
 cloud.store.advance(10);
 const second=cloud.flush();
 allowWrite();
 assert.equal(await first,true);
 assert.equal(await second,true);
 assert.equal(backend.row.game_state.day,10);
 assert.equal(backend.row.revision,3);
});

test('a clean device restores newer cloud progress, but a dirty device does not',async t=>{
 const backend=server(),a=client(t,backend);await a.start();await a.flush();
 const copied=memory();for(const k of ['phone:cloud-owner','phone:cloud:player-a:1'])copied.setItem(k,a.store.storage.getItem(k));
 a.store.advance(25);await a.flush();
 const b=client(t,backend,phone(8,{storage:copied}));await b.start();assert.equal(b.store.get().day,25);
 b.store.advance(26);a.store.advance(27);await a.flush();
 const c=client(t,backend,phone(26,{storage:copied}));await c.start();assert.equal(c.status.phase,'conflict');assert.equal(c.store.get().day,26);
});
test('fresh device can restore cloud, and backup failure cannot overwrite local progress',async t=>{
 const backend=server(),a=client(t,backend);await a.start();await a.flush();
 const b=client(t,backend,phone(1,{existing:false}));await b.start();assert.equal(b.store.get().day,8);
 const c=client(t,backend,phone(30));await c.start();assert.equal(c.status.phase,'conflict');
 c.backupLocal=async()=>{throw Error('quota');};await assert.rejects(c.resolve('remote'),/quota/);assert.equal(c.store.get().day,30);
});
test('refresh to D01 restores newer owned cloud checkpoint without overwriting it',async t=>{
 const backend=server(),first=client(t,backend,phone(28));
 await first.start();await first.flush();
 const storage=memory();for(const k of ['phone:cloud-owner','phone:cloud:player-a:1'])storage.setItem(k,first.store.storage.getItem(k));
 const reboot=client(t,backend,phone(1,{storage}));
 assert.equal(await reboot.start(),true);
 assert.equal(reboot.store.get().day,28);
 assert.equal(backend.row.game_state.day,28);
 const writes=backend.writes;await reboot.flush();assert.equal(backend.writes,writes);
});
test('an accidental day rewind cannot silently overwrite a newer cloud checkpoint',async t=>{
 const backend=server(),cloud=client(t,backend,phone(23));
 await cloud.start();await cloud.flush();
 cloud.store.advance(1);
 assert.equal(await cloud.flush(),false);
 assert.equal(cloud.status.phase,'conflict');
 assert.equal(backend.row.game_state.day,23);
 // Explicit selection is still supported after the old cloud state is archived.
 assert.equal(await cloud.resolve('local'),true);
 assert.equal(backend.row.game_state.day,1);
 assert.equal(backend.backups.at(-1).game_state.day,23);
});
test('a late cloud read cannot replace gameplay started while the connection was slow',async t=>{
 const backend=server(),a=client(t,backend);await a.start();await a.flush();
 const b=client(t,backend,phone(1,{existing:false}));let release;
 b.api.read=()=>new Promise(r=>{release=()=>r(backend.row);});
 const starting=b.start();await new Promise(r=>setImmediate(r));b.store.advance(2);release();await starting;
 assert.equal(b.status.phase,'conflict');assert.equal(b.store.get().day,2);
});
test('an unrelated account cannot silently upload existing local history; deleted cloud saves are not recreated',async t=>{
 const backend=server(),storage=memory();storage.setItem('phone:cloud-owner','another-player');
 const cloud=client(t,backend,phone(33,{storage}));await cloud.start();await cloud.flush();
 assert.equal(backend.writes,0);assert.equal(cloud.status.phase,'conflict');
 const own=memory();own.setItem('phone:cloud-owner','player-a');own.setItem('phone:cloud:player-a:1',JSON.stringify({id:'deleted',revision:3}));
 const b=client(t,backend,phone(33,{storage:own}));await b.start();await b.flush();assert.equal(backend.writes,0);
});
test('preview saves are disabled by default; explicit preview QA uses an isolated slot',async t=>{
 const backend=server();
 for(const [hostname,search,preview,enabled,slot] of [['bbbtai.pages.dev','',false,true,1],['abc.bbbtai.pages.dev','',false,false,1],['abc.bbbtai.pages.dev','?saveTest=1',false,true,2],['bbbtai.pages.dev','',true,false,1],['other.pages.dev','',false,false,1]]){
  const cloud=await connectPlayerSave(phone(),{key:'phone',validate,api:backend.api,factory:null,location:{hostname,search},preview});
  t.after(()=>cloud.close());assert.equal(cloud.enabled,enabled);assert.equal(cloud.slot,slot);
 }
});
test('anonymous cloud identity survives localStorage eviction using the existing IndexedDB journal',async()=>{
 const previous={fetch:globalThis.fetch,localStorage:globalThis.localStorage,indexedDB:globalThis.indexedDB};
 const storage=memory(),records=new Map();let created=false,signupCalls=0;
 const db={
  objectStoreNames:{contains:()=>created},
  createObjectStore(){created=true;},
  close(){},
  transaction(){
   let complete=false;const tx={objectStore:()=>({
    get(key){const req={};queueMicrotask(()=>{
     req.result=records.get(key);req.onsuccess?.();
     if(!complete){complete=true;queueMicrotask(()=>tx.oncomplete?.());}
    });return req;},
    put(value){records.set(value.key,structuredClone(value));}
   })};return tx;
  }
 };
 const indexedDB={open(){const req={};queueMicrotask(()=>{
  req.result=db;if(!created)req.onupgradeneeded?.();req.onsuccess?.();
 });return req;}};
 globalThis.localStorage=storage;globalThis.indexedDB=indexedDB;
 globalThis.fetch=async url=>{
  assert.match(String(url),/\/auth\/v1\/signup/);signupCalls++;
  return Response.json({access_token:'saved-access',refresh_token:'saved-refresh',
   expires_in:3600,user:{id:'same-player'}});
 };
 try{
  const first=await taiCloudSession();
  assert.equal(first.user.id,'same-player');
  assert.equal(signupCalls,1);
  storage.removeItem(SESSION_KEY);
  const restored=await taiCloudSession();
  assert.equal(restored.user.id,'same-player');
  assert.equal(signupCalls,1,'must not sign up a second anonymous player');
  assert.equal(JSON.parse(storage.getItem(SESSION_KEY)).refresh_token,'saved-refresh');
 }finally{Object.assign(globalThis,previous);}
});
test('expired identity refresh failure keeps the original session instead of creating a new player',async()=>{
 const previous={fetch:globalThis.fetch,localStorage:globalThis.localStorage};const storage=memory();globalThis.localStorage=storage;
 const old=JSON.stringify({access_token:'old',refresh_token:'old-refresh',expires_at:1});storage.setItem(SESSION_KEY,old);let calls=0;
 globalThis.fetch=async url=>{calls++;assert.ok(String(url).includes('grant_type=refresh_token'));return Response.json({error:'offline'},{status:503});};
 try{await assert.rejects(taiCloudSession,/已保留本機進度/);assert.equal(calls,1);assert.equal(storage.getItem(SESSION_KEY),old);}
 finally{Object.assign(globalThis,previous);}
});
test('email verification accepts only this backend confirmation URL and correct verification type',async()=>{
 const previous=globalThis.fetch;let sent;
 globalThis.fetch=async(url,init)=>{sent=JSON.parse(init.body);return Response.json({access_token:'verified',refresh_token:'refresh'});};
 try{
  await assert.rejects(verifySaveEmail({email:'a@example.test',type:'email_change'},'https://evil.test/auth/v1/verify?token=x&type=email_change'));
  await assert.rejects(verifySaveEmail({email:'a@example.test',type:'email_change'},'https://zmnufhswpnreeseyamlv.supabase.co/auth/v1/verify?token=x&type=magiclink'));
  await verifySaveEmail({email:'a@example.test',type:'email_change'},'123456');assert.deepEqual(sent,{email:'a@example.test',type:'email_change',token:'123456'});
 }finally{globalThis.fetch=previous;}
});
test('confirmation callback strips access tokens and preserves unsynced progress for the same player',async t=>{
 const previous=globalThis.localStorage;globalThis.localStorage=memory();
 try{
  let clean;assert.equal(takeEmailCallback({hash:'#access_token=x&refresh_token=y',pathname:'/',search:'?saveTest=1'},{replaceState:(_,__,url)=>clean=url}),true);assert.equal(clean,'/?saveTest=1');
  const backend=server(),cloud=client(t,backend);await cloud.start();await cloud.flush();cloud.store.advance(40);
  await cloud.start({switchAccount:true});assert.equal(cloud.store.get().day,40);await cloud.flush();assert.equal(backend.row.game_state.day,40);
 }finally{globalThis.localStorage=previous;}
});
test('settings shows actual synchronization state without changing the fictional Apple account',async t=>{
 const backend=server(),cloud=client(t,backend);await cloud.start();await cloud.flush();
 const html=cloudSaveView(cloud.store);assert.match(html,/已同步/);assert.match(html,/綁定郵箱/);assert.match(html,/歷史備份/);
 assert.doesNotMatch(html,/player-a|access_token/);
});
test('manual sync reports an unconfirmed upload and then confirms a successful retry',async()=>{
 const store={get:()=>state(18),cloud:{enabled:true,revision:1,status:{phase:'offline',message:'雲端回應逾時'},flush:async()=>false}};
 const act=()=>new Promise(resolve=>{
  let renders=0;
  assert.equal(cloudSaveAction('cloud-sync',{}, {store,refresh(){if(++renders===2)resolve();}}),true);
 });
 await act();
 assert.match(cloudSaveView(store),/雲端回應逾時/);
 assert.doesNotMatch(cloudSaveView(store),/已確認同步至雲端/);
 store.cloud.status={phase:'synced'};
 store.cloud.flush=async()=>true;
 await act();
 assert.match(cloudSaveView(store),/已確認同步至雲端/);
 store.cloud.status={phase:'pending'};
 assert.doesNotMatch(cloudSaveView(store),/已確認同步至雲端/);
 store.cloud.status={phase:'offline',message:'最新請求已失敗'};
 assert.match(cloudSaveView(store),/最新請求已失敗/);
});
test('offline failure cause is visible before a manual retry',()=>{
 const store={get:()=>state(11),cloud:{enabled:true,status:{phase:'offline',message:'身份更新失敗'}}};
 assert.match(cloudSaveView(store),/身份更新失敗/);
});

test('private audio duplicates are reused; unavailable audio does not prevent the progress snapshot',async()=>{
 const previous={fetch:globalThis.fetch,localStorage:globalThis.localStorage};globalThis.localStorage=memory();
 globalThis.localStorage.setItem(SESSION_KEY,JSON.stringify({access_token:'audio-test',refresh_token:'refresh',user:{id:'player-a'},expires_at:Date.now()/1000+3600}));
 await saveClip('cloud-audio-test',new Blob(['test-voice'],{type:'audio/mpeg'}));
 const s=state(1);s.content.conversations.noapp=[{messages:[{audioId:'cloud-audio-test'}]}];
 try{
  globalThis.fetch=async()=>Response.json({error:'Duplicate',code:'KeyAlreadyExists'},{status:400});
  const result=await snapshotVoiceMedia(s,'player-a');assert.equal(result.missing,0);assert.match(result.media['cloud-audio-test'].path,/^player-a\/[a-f0-9]{64}$/);
  globalThis.fetch=async()=>Response.json({message:'storage unavailable'},{status:503});
  const failed=await snapshotVoiceMedia(s,'player-a');assert.equal(failed.missing,1);assert.deepEqual(failed.media,{});
 }finally{Object.assign(globalThis,previous);}
});

test('another tab changing account cannot send the previous player save to the new account',async()=>{
 const previous={fetch:globalThis.fetch,localStorage:globalThis.localStorage};globalThis.localStorage=memory();
 globalThis.localStorage.setItem(SESSION_KEY,JSON.stringify({access_token:'new-account-token',refresh_token:'r',user:{id:'player-b'},expires_at:Date.now()/1000+3600}));
 let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({});};
 try{await assert.rejects(cloudRequest('/rest/v1/rpc/sync_phone_save',{method:'POST',expectedPlayer:'player-a',body:{}}),/登入身份已變更/);assert.equal(calls,0);}
 finally{Object.assign(globalThis,previous);}
});
