// Audio stays outside the JSON save. Store bytes, not Blob/File objects:
// WebKit can reject Blob backing files with "Error preparing Blob/File data".
const DB='ximeng-noapp-audio-v1',STORE='voice-clips',TIMEOUT=5000;
const temporary=new Map(),MAX_TEMP_BYTES=24_000_000;
let dbPromise,tempBytes=0;
const storageError=(error,stage)=>Object.assign(new Error('Safari 语音存储'+stage+'：'+(error?.message||error?.name||'IndexedDB 未返回错误详情')),{name:error?.name||'AudioStorageError'});
function retain(id,blob){
 const old=temporary.get(id);if(old)tempBytes-=old.size;
 temporary.delete(id);temporary.set(id,blob);tempBytes+=blob.size;
 while(tempBytes>MAX_TEMP_BYTES&&temporary.size>1){const key=temporary.keys().next().value;tempBytes-=temporary.get(key).size;temporary.delete(key);}
}
function forget(id,blob){if(temporary.get(id)===blob){temporary.delete(id);tempBytes-=blob.size;}}
export const clipIsTemporary=id=>temporary.has(id);
function openDB(){
 if(!('indexedDB' in globalThis))return Promise.reject(Error('浏览器未开放语音存储'));
 if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
  let settled=false;
  const finish=(error,db)=>{if(settled){db?.close?.();return;}settled=true;clearTimeout(timer);error?reject(error):resolve(db);};
  const timer=setTimeout(()=>finish(storageError(null,'打开超时')),TIMEOUT);timer.unref?.();
  let request;
  try{request=indexedDB.open(DB,1);}catch(error){finish(storageError(error,'打开失败'));return;}
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();dbPromise=undefined;};finish(null,db);};
  request.onerror=()=>finish(storageError(request.error,'打开失败'));
  request.onblocked=()=>finish(storageError(null,'被其他页面占用'));
 });
 return dbPromise.catch(error=>{dbPromise=undefined;throw error;});
}
export async function saveClip(id,blob){
 if(!id||!(blob instanceof Blob)||blob.size>4_000_000)throw Error('语音过大或格式错误（最多4MB）');
 // Keep the generated audio available even if persistence fails. Retrying a
 // database write must never require another paid speech-synthesis request.
 retain(id,blob);
 try{
  const bytes=await blob.arrayBuffer(),db=await openDB();
  await new Promise((resolve,reject)=>{
   let tx,request,settled=false;
   const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve();};
   const timer=setTimeout(()=>{finish(storageError(null,'写入超时'));try{tx?.abort?.();}catch{}},TIMEOUT);timer.unref?.();
   try{
    tx=db.transaction(STORE,'readwrite');
    tx.oncomplete=()=>finish();
    tx.onerror=()=>finish(storageError(request?.error||tx.error,'写入失败'));
    tx.onabort=()=>finish(storageError(tx.error||request?.error,'写入被中止'));
    request=tx.objectStore(STORE).put({format:'audio-bytes-v1',type:blob.type||'audio/mpeg',bytes},id);
   }catch(error){finish(storageError(error,'写入失败'));}
  });
  forget(id,blob);
 }catch{
  // The original playable Blob is retained only in memory for this session.
  // The bubble displays that it has not been saved across page refreshes.
 }
 return id;
}
export async function loadClip(id){
 if(temporary.has(id)){const blob=temporary.get(id);retain(id,blob);return blob;}
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  let settled=false;
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(value);};
  const timer=setTimeout(()=>finish(storageError(null,'读取超时')),TIMEOUT);timer.unref?.();
  try{
   const request=db.transaction(STORE,'readonly').objectStore(STORE).get(id);
   request.onsuccess=()=>{
    try{
     const value=request.result;
     if(value instanceof Blob){finish(null,value);return;} // Existing recordings.
     if(value?.format==='audio-bytes-v1'&&value.bytes instanceof ArrayBuffer){finish(null,new Blob([value.bytes],{type:value.type||'audio/mpeg'}));return;}
     finish(null,null);
    }catch(error){finish(storageError(error,'读取失败'));}
   };
   request.onerror=()=>finish(storageError(request.error,'读取失败'));
  }catch(error){finish(storageError(error,'读取失败'));}
 });
}
