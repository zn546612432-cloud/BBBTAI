// Developer-only savepoints. Kept in separate storage so timeline resets never
// mutate or remove snapshots. These are NOT canonical story configuration files.
const reviewNamespace=(globalThis.location?.pathname||'').match(/\/review\/([a-z0-9-]+)\//i)?.[1]||'';
const INDEX_KEY='ximeng-phone-story55-snapshots-index-v1'+(reviewNamespace?':review:'+reviewNamespace:'');
const DATA_PREFIX='ximeng-phone-story55-snapshot-v1:'+(reviewNamespace?'review:'+reviewNamespace+':':'');
const clone=value=>structuredClone(value);

export function storySourceVersion(s){
  // Only immutable authored content belongs to a story version. Runtime chat
  // delivery, NPC replies, payouts and read receipts must NOT change it.
  const conversations=Object.fromEntries(
    Object.entries(s.content?.conversations||{}).map(([channel,items])=>[
      channel,items.map(c=>({
        id:c.id,
        ...(c.authored===true?{name:c.name,members:c.members}:{}),
        messages:(c.messages||[])
         .filter(m=>!m.story55&&!m.demo&&!/^preset-/.test(m.id||'')&&
           (m.authored===true||m.storyImported===true||m.schedule?.mode==='game-time'||typeof m.sentDate==='string'&&m.sentDate<'2025-05-19'))
         .map(m=>({id:m.id,from:m.from,text:m.text,sentDate:m.sentDate,schedule:m.schedule,kind:m.kind}))
      })).filter(c=>c.messages.length||c.name)
    ]).filter(([,items])=>items.length)
  );
  const linked=Object.values(s.content?.mirage?.linkedMissions||{}).map(m=>{
    const {stage,submitted,deliveredAt,failed,...definition}=m;
    return definition;
  }).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  const source=JSON.stringify({
    config:s.story55?.config,
    presets:s.storyPresets?.rules,
    conversations,linked,
    moments:s.content?.moments?.posts
  });
  // FNV-1a change detector, NOT an authenticity or cryptographic signature.
  let hash=2166136261;
  for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return 'v2-'+(hash>>>0).toString(16).padStart(8,'0');
}
function readIndex(storage){
  try{const parsed=JSON.parse(storage.getItem(INDEX_KEY)||'[]');return Array.isArray(parsed)?parsed.filter(x=>x&&typeof x.id==='string'):[];}
  catch{return [];}
}
// Keep v1 localStorage snapshots readable forever; v2 stores full snapshots
// in IndexedDB, which does not duplicate large photos in the tiny localStorage quota.
const DATABASE_NAME='ximeng-phone-story55-snapshots-idb-v2'+(reviewNamespace?':review:'+reviewNamespace:'');
let indexedEntries=[]; // only metadata, hydrated once when the phone boots
export function listTestSnapshots(storage){
 const entries=new Map();
 for(const item of readIndex(storage))entries.set(item.id,item);
 for(const item of indexedEntries)entries.set(item.id,item);
 return [...entries.values()].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
}
function saveIndex(storage,index){storage.setItem(INDEX_KEY,JSON.stringify(index));}
export function saveTestSnapshot(storage,state,label='自动保存 · 日期跳转前'){
  if(!storage?.setItem)throw Error('没有可用的本机快照存储');
  const id=String(Date.now())+'-'+Math.random().toString(36).slice(2,9);
  const entry={id,label:String(label).slice(0,70),day:state.day,clock:state.clock,createdAt:new Date().toISOString(),sourceVersion:storySourceVersion(state)};
  const key=DATA_PREFIX+id;
  const data=JSON.stringify({format:'ximeng-story55-test-snapshot-v1',entry,state:clone(state)});
  try{
    storage.setItem(key,data);
    try{saveIndex(storage,[entry,...readIndex(storage)]);}catch(error){storage.removeItem?.(key);throw error;}
  }catch{
    throw Error('测试快照保存失败：本机空间可能不足。时间跳转已取消，请先导出存档备份。');
  }
  return entry;
}
export function getTestSnapshot(storage,id){
  const entry=readIndex(storage).find(x=>x.id===id);
  if(!entry)throw Error('找不到这份测试快照');
  let saved;
  try{saved=JSON.parse(storage.getItem(DATA_PREFIX+id)||'null');}catch{}
  if(saved?.format!=='ximeng-story55-test-snapshot-v1'||saved.entry?.id!==id||!saved.state)throw Error('快照文件缺失或已损坏');
  return saved;
}
export function restoreTestSnapshot(store,id,{allowDifferentVersion=false}={}){
  const saved=getTestSnapshot(store.storage,id);
  const currentVersion=storySourceVersion(store.get());
  if(saved.entry.sourceVersion!==currentVersion&&!allowDifferentVersion){
    throw Error('剧情版本不同：请选择按旧版恢复，或重新生成当前日期。');
  }
  // Always preserve the current authoring draft before replacing runtime state.
  saveTestSnapshot(store.storage,store.get(),'恢复前自动备份');
  store.replace(saved.state);
  return {entry:saved.entry,versionChanged:saved.entry.sourceVersion!==currentVersion};
}
export function deleteTestSnapshot(storage,id){
  const index=readIndex(storage);
  if(!index.some(x=>x.id===id))return false;
  saveIndex(storage,index.filter(x=>x.id!==id));
  storage.removeItem?.(DATA_PREFIX+id);
  return true;
}


// IndexedDB is the durable browser backend used by developer actions.
// Legacy synchronous APIs above stay intact to restore older localStorage saves
// and to support non-browser tooling/tests with an explicit storage adapter.
function dbOpen(factory){
 return new Promise((resolve,reject)=>{
  if(!factory?.open){reject(Error('当前浏览器没有可用的 IndexedDB，请先导出存档备份'));return;}
  let request;
  try{request=factory.open(DATABASE_NAME,1);}catch(error){reject(error);return;}
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots',{keyPath:'id'});
   if(!db.objectStoreNames.contains('entries'))db.createObjectStore('entries',{keyPath:'id'});
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('IndexedDB 打开失败'));
  request.onblocked=()=>reject(Error('测试快照数据库被其他页面占用'));
 });
}

function inTransaction(db,names,mode,operate){
 return new Promise((resolve,reject)=>{
  let tx;
  try{tx=db.transaction(names,mode);}catch(error){reject(error);return;}
  let output;
  tx.oncomplete=()=>resolve(output);
  tx.onabort=()=>reject(tx.error||Error('IndexedDB 事务已取消'));
  tx.onerror=()=>reject(tx.error||Error('IndexedDB 读写失败'));
  try{operate(tx,value=>{output=value;});}catch(error){
   try{tx.abort();}catch{}
   reject(error);
  }
 });
}

async function inDb(factory,names,mode,operate){
 const db=await dbOpen(factory);
 try{return await inTransaction(db,names,mode,operate);}
 finally{db.close();}
}

function rememberEntry(entry){
 indexedEntries=[entry,...indexedEntries.filter(x=>x.id!==entry.id)];
}

export async function primeTestSnapshots(storage,{factory=globalThis.indexedDB}={}){
 if(!factory?.open)return listTestSnapshots(storage);
 const entries=await inDb(factory,['entries'],'readonly',(tx,resolve)=>{
  const req=tx.objectStore('entries').getAll();
  req.onsuccess=()=>resolve(req.result);
 });
 indexedEntries=Array.isArray(entries)?entries:[];
 return listTestSnapshots(storage);
}

export async function saveTestSnapshotDurable(storage,state,label='自动保存 · 日期跳转前',{factory=globalThis.indexedDB}={}){
 // In node/older browsers the existing full-safe behavior remains available.
 if(!factory?.open)return saveTestSnapshot(storage,state,label);
 const id=String(Date.now())+'-'+Math.random().toString(36).slice(2,9);
 const entry={id,label:String(label).slice(0,70),day:state.day,clock:state.clock,createdAt:new Date().toISOString(),sourceVersion:storySourceVersion(state)};
 const saved={id,format:'ximeng-story55-test-snapshot-v1',entry,state:clone(state)};
 try{
  // Two stores in ONE transaction: a savepoint is never listed before it exists.
  await inDb(factory,['snapshots','entries'],'readwrite',tx=>{
   tx.objectStore('snapshots').put(saved);
   tx.objectStore('entries').put(entry);
  });
 }catch(error){
  throw Error('无法安全保存测试快照，已取消跳转。当前手机数据未被修改。'+(error?.message?' '+error.message:''));
 }
 rememberEntry(entry);
 return entry;
}

export async function getTestSnapshotDurable(storage,id,{factory=globalThis.indexedDB}={}){
 if(factory?.open){
  const saved=await inDb(factory,['snapshots'],'readonly',(tx,resolve)=>{
   const req=tx.objectStore('snapshots').get(id);
   req.onsuccess=()=>resolve(req.result);
  });
  if(saved){
   if(saved.format!=='ximeng-story55-test-snapshot-v1'||saved.entry?.id!==id||!saved.state)
    throw Error('快照文件缺失或已损坏');
   return saved;
  }
 }
 return getTestSnapshot(storage,id);
}

export async function restoreTestSnapshotDurable(store,id,{allowDifferentVersion=false,factory=globalThis.indexedDB}={}){
 const saved=await getTestSnapshotDurable(store.storage,id,{factory});
 const currentVersion=storySourceVersion(store.get());
 if(saved.entry.sourceVersion!==currentVersion&&!allowDifferentVersion)
  throw Error('剧情版本不同：请选择按旧版恢复，或重新生成当前日期。');
 // Back up the CURRENT phone before replacing with a historical snapshot.
 await saveTestSnapshotDurable(store.storage,store.get(),'恢复前自动备份',{factory});
 store.replace(saved.state);
 return {entry:saved.entry,versionChanged:saved.entry.sourceVersion!==currentVersion};
}

export async function deleteTestSnapshotDurable(storage,id,{factory=globalThis.indexedDB}={}){
 if(factory?.open){
  // Remove only the selected v2 record. Never vacuum or prune another snapshot.
  const exists=await inDb(factory,['snapshots'],'readonly',(tx,resolve)=>{
   const req=tx.objectStore('snapshots').getKey(id);
   req.onsuccess=()=>resolve(req.result!==undefined);
  });
  if(exists){
   await inDb(factory,['snapshots','entries'],'readwrite',tx=>{
    tx.objectStore('snapshots').delete(id);
    tx.objectStore('entries').delete(id);
   });
   indexedEntries=indexedEntries.filter(x=>x.id!==id);
   return true;
  }
 }
 return deleteTestSnapshot(storage,id);
}
