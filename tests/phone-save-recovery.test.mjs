import test from 'node:test';
import assert from 'node:assert/strict';
import {PhoneStore,openPhoneStore,KEY,initialState} from '../src/services/storage.js';
import {openSaveJournal,mountSaveLifecycle} from '../src/services/storage/recovery.js';

function memoryStorage(){
 const data=new Map();
 return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
}
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
       if(failWrites){tx.abort();return;}
       map.set(record.key,structuredClone(record));schedule();
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

async function setup(){
 const storage=memoryStorage(),idb=fakeIndexedDB();
 const store=await openPhoneStore({storage,factory:idb.factory});
 await store.journal.flush();
 return {storage,idb,store};
}
function changeProgress(store){
 store.update(s=>{
  s.day=24;s.clock='22:16';s.batteryPercent=37;
  s.content.notes.push({id:'player-note',title:'尚未完成的計畫',text:'保留這份記錄'});
  s.bankData.balance=527;
  s.drafts.wechat='還沒發出的話';
 });
}

test('every normal save survives a fresh store with day, chats, tasks and balances intact',async()=>{
 const {storage,store}=await setup();
 changeProgress(store);
 const before=structuredClone(store.get());
 const reload=new PhoneStore(storage);
 for(const key of ['day','clock','batteryPercent','bankData','drafts','content'])assert.deepEqual(reload.get()[key],before[key]);
 await store.journal.flush();store.journal.close();
});

test('missing or corrupt primary recovers the latest durable progress before constructor writes',async()=>{
 for(const damaged of [null,'{broken',JSON.stringify({...initialState(),version:999})]){
  const {storage,idb,store}=await setup();changeProgress(store);
  await store.journal.flush();store.journal.close();
  if(damaged===null)storage.data.delete(KEY);else storage.data.set(KEY,damaged);
  const recovered=await openPhoneStore({storage,factory:idb.factory});
  assert.equal(recovered.get().day,24);assert.equal(recovered.get().clock,'22:16');
  assert.equal(recovered.get().bankData.balance,527);
  assert.equal(recovered.get().drafts.wechat,'還沒發出的話');
  assert.ok(recovered.get().content.notes.some(n=>n.id==='player-note'));
  assert.equal(JSON.parse(storage.getItem(KEY)).day,24);
  await recovered.journal.flush();recovered.journal.close();
 }
});

test('stale D01 primary restores later IndexedDB checkpoint without losing the original primary',async()=>{
 const {storage,idb,store}=await setup();changeProgress(store);
 await store.journal.flush();store.journal.close();
 const day1=initialState();storage.setItem(KEY,JSON.stringify(day1));
 const recovered=await openPhoneStore({storage,factory:idb.factory});
 assert.equal(recovered.get().day,24);
 assert.equal(recovered.get().clock,'22:16');
 assert.equal(JSON.parse(storage.getItem(KEY+':before-checkpoint-recovery')).day,1);
 assert.equal(JSON.parse(storage.getItem(KEY)).day,24);
 await recovered.journal.flush();recovered.journal.close();
});

test('an accidentally journaled D01 recovers its last advanced previous checkpoint',async()=>{
 const {storage,idb,store}=await setup();changeProgress(store);
 await store.journal.flush();
 store.journal.schedule(JSON.stringify(initialState()));
 await store.journal.flush();store.journal.close();
 storage.setItem(KEY,JSON.stringify(initialState()));
 const recovered=await openPhoneStore({storage,factory:idb.factory});
 assert.equal(recovered.get().day,24);
 assert.equal(recovered.get().clock,'22:16');
 await recovered.journal.flush();recovered.journal.close();
});

test('confirmed D01 restart is not mistaken for a stale local save',async()=>{
 const {storage,idb,store}=await setup();changeProgress(store);
 await store.journal.flush();store.journal.close();
 storage.setItem(KEY+':explicit-restart','1');
 storage.setItem(KEY,JSON.stringify(initialState()));
 const reboot=await openPhoneStore({storage,factory:idb.factory});
 assert.equal(reboot.get().day,1);
 await reboot.journal.flush();reboot.journal.close();
 assert.equal(storage.getItem(KEY+':explicit-restart'),'1');
 const again=await openPhoneStore({storage,factory:idb.factory});
 assert.equal(again.get().day,1);
 again.update(current=>{current.day=2;current.clock='10:00';});
 assert.equal(storage.getItem(KEY+':explicit-restart'),null);
 await again.journal.flush();again.journal.close();
});

test('unreadable existing save is preserved byte for byte instead of replaced with D01',async()=>{
 const storage=memoryStorage();storage.data.set(KEY,'{damaged-player-save');
 assert.throws(()=>new PhoneStore(storage),/已保留原資料/);
 await assert.rejects(openPhoneStore({storage,factory:fakeIndexedDB().factory}),/已保留原資料/);
 assert.equal(storage.getItem(KEY),'{damaged-player-save');
});

test('a corrupt latest checkpoint falls back to the previous valid checkpoint',async()=>{
 const {storage,idb,store}=await setup();changeProgress(store);
 await store.journal.flush();store.journal.schedule('{bad-checkpoint');
 await store.journal.flush();store.journal.close();storage.data.delete(KEY);
 const recovered=await openPhoneStore({storage,factory:idb.factory});
 assert.equal(recovered.get().day,24);
 await recovered.journal.flush();recovered.journal.close();
});

test('unavailable database uses valid primary; unreadable database plus missing primary never starts over',async()=>{
 const {storage,store}=await setup();changeProgress(store);
 await store.journal.flush();store.journal.close();
 const denied={open(){throw Error('SecurityError');}};
 const recovered=await openPhoneStore({storage,factory:denied});
 assert.equal(recovered.get().day,24);
 const empty=memoryStorage();
 await assert.rejects(openPhoneStore({storage:empty,factory:denied}),/已保留原資料/);
 assert.equal(empty.getItem(KEY),null);
});

test('journal failure cannot roll back a successful primary save and can retry without losing progress',async()=>{
 const {storage,idb,store}=await setup();idb.fail(true);changeProgress(store);
 await assert.rejects(store.journal.flush());
 assert.equal(JSON.parse(storage.getItem(KEY)).day,24);
 idb.fail(false);await store.journal.flush();store.journal.close();storage.data.delete(KEY);
 const recovered=await openPhoneStore({storage,factory:idb.factory});
 assert.equal(recovered.get().day,24);
 await recovered.journal.flush();recovered.journal.close();
});

test('quota failure preserves both the old in-memory progress and the old primary save',()=>{
 const storage=memoryStorage(),store=new PhoneStore(storage);
 const before=structuredClone(store.get()),raw=storage.getItem(KEY);
 storage.setItem=()=>{throw Error('QuotaExceededError');};
 assert.throws(()=>changeProgress(store),/本机空间不足/);
 assert.deepEqual(store.get(),before);assert.equal(storage.getItem(KEY),raw);
});

test('checkpoint namespaces cannot recover production progress into a review or another origin',async()=>{
 const idb=fakeIndexedDB();
 const production=await openSaveJournal(idb.factory,KEY);
 production.schedule('production-save');await production.flush();production.close();
 const review=await openSaveJournal(idb.factory,KEY+'-review');
 assert.equal(await review.read(),undefined);review.close();
});

test('background/freeze/pagehide flush immediately and never alter the story clock',async()=>{
 const {storage,idb,store}=await setup();
 const doc=new EventTarget(),win=new EventTarget();doc.hidden=false;
 const unmount=mountSaveLifecycle(store,{doc,win,manager:{persist:()=>Promise.reject(Error('denied'))}});
 changeProgress(store);
 doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));
 doc.dispatchEvent(new Event('freeze'));win.dispatchEvent(new Event('pagehide'));
 await store.journal.flush();
 assert.equal(store.get().clock,'22:16');assert.equal(store.get().batteryPercent,37);
 unmount();store.journal.close();storage.data.delete(KEY);
 const recovered=await openPhoneStore({storage,factory:idb.factory});
 assert.equal(recovered.get().day,24);
 await recovered.journal.flush();recovered.journal.close();
});

test('latest primary wins even when the player restores the previous state during an active checkpoint write',async()=>{
 const journal=await openSaveJournal(fakeIndexedDB().factory,KEY);
 journal.schedule('original');await journal.flush();
 journal.schedule('intermediate');const writing=journal.flush();
 journal.schedule('original');
 await writing;await journal.flush();
 assert.equal((await journal.read()).raw,'original');journal.close();
});
