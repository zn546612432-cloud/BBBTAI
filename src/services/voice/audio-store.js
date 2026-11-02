// Local audio blobs stay on the device, outside the JSON game save.
const DB='ximeng-noapp-audio-v1',STORE='voice-clips';
let dbPromise;
const storageError=(error,stage)=>Object.assign(new Error('Safari 语音存储'+stage+'：'+(error?.message||error?.name||'IndexedDB 未返回错误详情')),{name:error?.name||'AudioStorageError'});
function openDB(){
 if(!('indexedDB' in globalThis))return Promise.reject(Error('浏览器未开放语音存储'));
 if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};
  r.onsuccess=()=>{const db=r.result;db.onversionchange=()=>{db.close();dbPromise=undefined;};resolve(db);};
  r.onerror=()=>reject(storageError(r.error,'打开失败'));
  r.onblocked=()=>reject(storageError(null,'被其他页面占用，请关闭其他游戏标签页后重试'));
 });
 return dbPromise.catch(error=>{dbPromise=undefined;throw error;});
}
export async function saveClip(id,blob){
 if(!id||!(blob instanceof Blob)||blob.size>4_000_000)throw Error('语音过大或格式错误（最多4MB）');
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),request=tx.objectStore(STORE).put(blob,id);
  tx.oncomplete=()=>resolve(id);
  tx.onerror=()=>reject(storageError(request.error||tx.error,'写入失败'));
  tx.onabort=()=>reject(storageError(tx.error||request.error,'写入被中止'));
 });
}
export async function loadClip(id){
 const db=await openDB();return new Promise((resolve,reject)=>{
  const r=db.transaction(STORE,'readonly').objectStore(STORE).get(id);
  r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);
 });
}
