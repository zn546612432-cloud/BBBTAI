// The existing PhoneStore remains the only state owner. This journal mirrors
// successful saves outside localStorage's small quota, in the same namespace.
const DATABASE='ximeng-phone-autosave-v1',TABLE='saves',TIMEOUT=3000;

// A D01 scene can hold the clock while the player makes real progress.
// The revision breaks same-day/same-clock ties without inspecting user text.
const checkpointInfo=raw=>{
 try{
  const s=JSON.parse(raw);
  if(s?.version!==2||!Number.isSafeInteger(s.day)||s.day<1||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.clock))return null;
  const [hour,minute]=s.clock.split(':').map(Number);
  return [s.day,hour*60+minute,
   Number.isSafeInteger(s._localSaveRevision)&&s._localSaveRevision>0?s._localSaveRevision:0];
 }catch{return null;}
};
export function compareSavedProgress(left,right){
 const a=checkpointInfo(left),b=checkpointInfo(right);
 if(!a||!b)return a?1:b?-1:0;
 return a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
}
export const saveReadError=()=>Error('無法安全讀取存檔，已保留原資料。請重新載入重試，勿清除網站資料。');

export function readPhoneSave(storage,key,validate){
 let raw;
 try{raw=storage.getItem(key);}catch{throw saveReadError();}
 if(raw===null||raw===undefined)return null;
 try{return validate(JSON.parse(raw));}catch{throw saveReadError();}
}

export function openSaveJournal(factory,key){
 if(!factory?.open)return Promise.resolve(null);
 return new Promise((resolve,reject)=>{
  let request,settled=false;
  const finish=(error,value)=>{
   if(settled){value?.close();return;}
   settled=true;clearTimeout(timer);error?reject(error):resolve(value);
  };
  const timer=setTimeout(()=>finish(saveReadError()),TIMEOUT);
  try{request=factory.open(DATABASE,1);}catch(error){finish(error);return;}
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains(TABLE))db.createObjectStore(TABLE,{keyPath:'key'});
  };
  request.onerror=()=>finish(request.error||saveReadError());
  request.onblocked=()=>finish(saveReadError());
  request.onsuccess=()=>finish(null,createJournal(request.result,key));
 });
}

function createJournal(db,key){
 let pending=null,timer=null,active=null,closed=false,lastRaw=null;
 const transact=(mode,operate)=>new Promise((resolve,reject)=>{
  let tx,result,done=false;
  const finish=error=>{if(done)return;done=true;clearTimeout(deadline);error?reject(error):resolve(result);};
  const deadline=setTimeout(()=>{finish(saveReadError());try{tx?.abort();}catch{}},TIMEOUT);
  try{
   tx=db.transaction([TABLE],mode);
   tx.oncomplete=()=>finish();
   tx.onerror=tx.onabort=()=>finish(tx.error||saveReadError());
   operate(tx.objectStore(TABLE),value=>{result=value;});
  }catch(error){finish(error);}
 });
 const journal={
  async read(){
   const entry=await transact('readonly',(table,output)=>{
    const req=table.get(key);req.onsuccess=()=>output(req.result);
   });
   lastRaw=entry?.raw||null;
   return entry;
  },
  schedule(raw){
   if(closed||raw===lastRaw&&!pending&&!active)return;
   pending=raw;
   if(!timer)timer=setTimeout(()=>{timer=null;journal.flush().catch(()=>{});},200);
  },
  flush(){
   clearTimeout(timer);timer=null;
   if(active)return active.then(()=>journal.flush());
   if(!pending||closed)return Promise.resolve();
   const raw=pending;pending=null;
   active=transact('readwrite',(table)=>{
    const req=table.get(key);
    req.onsuccess=()=>{
     const old=req.result;
     let guardedRaw=old?.guardedRaw||null;
     // A replayed D01 must not evict a later checkpoint after repeated writes.
     if(compareSavedProgress(old?.raw,raw)>0&&compareSavedProgress(old.raw,guardedRaw)>0)
      guardedRaw=old.raw;
     if(guardedRaw&&compareSavedProgress(raw,guardedRaw)>=0)guardedRaw=null;
     table.put({key,raw,previous:old?.raw!==raw?old?.raw:old?.previous,
      guardedRaw,savedAt:Date.now()});
    };
   }).then(()=>{lastRaw=raw;},error=>{if(!pending)pending=raw;throw error;}).finally(()=>{active=null;});
   return active;
  },
  // Replace the run atomically and discard the older recovery snapshot.
  // Ordinary autosaves still retain a previous checkpoint.
  async reset(raw){
   if(closed)throw saveReadError();
   clearTimeout(timer);timer=null;
   if(active)try{await active;}catch{}
   pending=null;
   await transact('readwrite',table=>{table.put({key,raw,previous:null,guardedRaw:null,savedAt:Date.now()});});
   lastRaw=raw;
  },
  async clear(){
   if(closed)throw saveReadError();
   clearTimeout(timer);timer=null;
   if(active)try{await active;}catch{}
   pending=null;
   await transact('readwrite',table=>{table.delete(key);});
   lastRaw=null;
  },
  close(){closed=true;clearTimeout(timer);db.close();}
 };
 db.onversionchange=()=>journal.close();
 return journal;
}

// Hidden is the last reliable mobile lifecycle signal. pagehide and freeze
// cover navigation/BFCache and browser suspension without touching story time.
export function mountSaveLifecycle(store,{doc=globalThis.document,win=globalThis.window,manager=globalThis.navigator?.storage}={}){
 const flush=()=>{try{store.persist();}catch(error){console.error('存檔保存失敗',error);}store.journal?.flush().catch(error=>console.warn('存檔備份暫時不可用',error));void store.cloud?.flush();};
 const hidden=()=>{if(doc.hidden)flush();};
 doc?.addEventListener('visibilitychange',hidden);
 doc?.addEventListener('freeze',flush);
 win?.addEventListener('pagehide',flush);
 // Best effort only: denial never resets a save or prevents gameplay.
 try{Promise.resolve(manager?.persist?.()).catch(()=>{});}catch{}
 return ()=>{
  doc?.removeEventListener('visibilitychange',hidden);
  doc?.removeEventListener('freeze',flush);
  win?.removeEventListener('pagehide',flush);
 };
}
