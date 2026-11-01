import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {handleStory55Action} from '../src/services/story55/controller.js';
import {
 saveTestSnapshotDurable,getTestSnapshotDurable,listTestSnapshots,
 restoreTestSnapshotDurable,deleteTestSnapshotDurable,primeTestSnapshots
} from '../src/services/story55/test-snapshots.js';

function memoryStorage(){
 const data=new Map();
 return {
  getItem:key=>data.get(key)??null,
  setItem:(key,value)=>{throw Error('QuotaExceededError: localStorage is full');},
  removeItem:key=>data.delete(key)
 };
}
// A tiny asynchronous, transactional IndexedDB double.
// A transaction never commits if its second put fails.
function fakeIndexedDB(){
 const stores=new Map();
 let failWrites=false;
 const db={
  objectStoreNames:{contains:name=>stores.has(name)},
  createObjectStore(name){stores.set(name,new Map());},
  close(){},
  transaction(names,mode){
   const copies=new Map(names.map(name=>[name,new Map(stores.get(name))]));
   let pending=false,aborted=false;
   const tx={
    objectStore(name){
     const map=copies.get(name);
     if(!map)throw Error('Unknown object store '+name);
     const request=compute=>{
      const req={};
      queueMicrotask(()=>{
       if(aborted)return;
       req.result=compute();req.onsuccess?.();
      });
      schedule();
      return req;
     };
     return {
      put(record){
       if(failWrites)throw Error('QuotaExceededError: IndexedDB too');
       map.set(record.id,structuredClone(record));schedule();
      },
      get:id=>request(()=>map.get(id)),
      getKey:id=>request(()=>map.has(id)?id:undefined),
      getAll:()=>request(()=>[...map.values()].map(x=>structuredClone(x))),
      delete(id){map.delete(id);schedule();}
     };
    },
    abort(){aborted=true;queueMicrotask(()=>tx.onabort?.());}
   };
   function schedule(){
    if(pending)return;
    pending=true;
    queueMicrotask(()=>{
     if(aborted)return;
     if(mode==='readwrite')for(const [name,copy] of copies)stores.set(name,copy);
     tx.oncomplete?.();
    });
   }
   return tx;
  }
 };
 let created=false;
 return {
  factory:{
   open(){
    const req={};
    queueMicrotask(()=>{
     req.result=db;
     if(!created){req.onupgradeneeded?.();created=true;}
     req.onsuccess?.();
    });
    return req;
   }
  },
  fail(value){failWrites=value;}
 };
}

function phone(){
 const s=initialState();
 activateStory55(s);
 return s;
}

test('date-jump backups succeed in IndexedDB even when localStorage is completely full',async()=>{
 const storage=memoryStorage(),idb=fakeIndexedDB(),s=phone();
 await primeTestSnapshots(storage,{factory:idb.factory});
 const first=await saveTestSnapshotDurable(storage,s,'跳转前 D1',{factory:idb.factory});
 assert.equal(first.day,1);
 assert.equal(listTestSnapshots(storage).length,1);
 const saved=await getTestSnapshotDurable(storage,first.id,{factory:idb.factory});
 assert.equal(saved.state.day,1);
 s.day=12;s.story55.config.nodes[0].day=2;
 assert.equal(saved.state.day,1);
 assert.equal(saved.state.story55.config.nodes[0].day,1);
 await primeTestSnapshots(storage,{factory:idb.factory});
 assert.equal(listTestSnapshots(storage)[0].id,first.id);
});

test('browser snapshot failure cancels without publishing an incomplete backup or mutating the phone',async()=>{
 const storage=memoryStorage(),idb=fakeIndexedDB(),s=phone();
 await primeTestSnapshots(storage,{factory:idb.factory});
 const before=s.day;
 idb.fail(true);
 await assert.rejects(saveTestSnapshotDurable(storage,s,'must fail',{factory:idb.factory}),/已取消跳转/);
 assert.equal(s.day,before);
 assert.deepEqual(listTestSnapshots(storage),[]);
 idb.fail(false);
 const entry=await saveTestSnapshotDurable(storage,s,'retry',{factory:idb.factory});
 assert.ok(entry.id);
 assert.equal(listTestSnapshots(storage).length,1);
});

test('restore first safely backs up the current phone, and manual deletion affects only selected snapshot',async()=>{
 const storage=memoryStorage(),idb=fakeIndexedDB(),original=phone();
 await primeTestSnapshots(storage,{factory:idb.factory});
 const first=await saveTestSnapshotDurable(storage,original,'D1',{factory:idb.factory});
 const second=await saveTestSnapshotDurable(storage,original,'D1b',{factory:idb.factory});
 let current=structuredClone(original);
 current.day=12;
 const store={storage,get:()=>current,replace:next=>{current=next;}};
 const outcome=await restoreTestSnapshotDurable(store,first.id,{factory:idb.factory});
 assert.equal(outcome.entry.id,first.id);
 assert.equal(current.day,1);
 assert.equal(listTestSnapshots(storage).length,3);
 assert.equal(listTestSnapshots(storage)[0].day,12);
 assert.equal(await deleteTestSnapshotDurable(storage,second.id,{factory:idb.factory}),true);
 assert.equal(listTestSnapshots(storage).length,2);
 assert.equal((await getTestSnapshotDurable(storage,first.id,{factory:idb.factory})).state.day,1);
});

test('developer D55 date button awaits durable backup then changes the target day',async()=>{
 const storage=memoryStorage(),idb=fakeIndexedDB(),s=phone();
 const old=globalThis.indexedDB;globalThis.indexedDB=idb.factory;
 let state=s;
 const ctx={store:{storage,get:()=>state,update:fn=>{const copy=structuredClone(state);fn(copy);state=copy;}}};
 try{
  await primeTestSnapshots(storage,{factory:idb.factory});
  const done=await handleStory55Action('s55-day',{dataset:{day:'3'}},ctx);
  assert.equal(done,true);
  assert.equal(state.day,3);
  assert.equal(listTestSnapshots(storage).length,1);
  assert.equal(listTestSnapshots(storage)[0].day,1);
  idb.fail(true);
  await assert.rejects(handleStory55Action('s55-day',{dataset:{day:'55'}},ctx),/已取消跳转/);
  assert.equal(state.day,3);
  assert.equal(listTestSnapshots(storage).length,1);
 }finally{
  if(old===undefined)delete globalThis.indexedDB;
  else globalThis.indexedDB=old;
 }
});
