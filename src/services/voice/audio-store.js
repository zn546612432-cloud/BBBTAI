// Local audio blobs stay on the device, outside the JSON game save.
const DB='ximeng-noapp-audio-v1',STORE='voice-clips';
let dbPromise;
function openDB(){
 if(!('indexedDB' in globalThis))return Promise.reject(Error('浏览器未开放语音存储'));
 if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
 });
 return dbPromise;
}
export async function saveClip(id,blob){
 if(!id||!(blob instanceof Blob)||blob.size>4_000_000)throw Error('语音过大或格式错误（最多4MB）');
 const db=await openDB();
 return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(blob,id);tx.oncomplete=()=>resolve(id);tx.onerror=()=>reject(tx.error);});
}
export async function loadClip(id){
 const db=await openDB();return new Promise((resolve,reject)=>{
  const r=db.transaction(STORE,'readonly').objectStore(STORE).get(id);
  r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);
 });
}
