import {openSaveJournal} from '../../services/storage/recovery.js';

// The 0000 reset is intentionally irreversible. Keep the new D01 checkpoint,
// but remove the previous run and any pre-cloud-restore shadow backups.
export async function purgeRestartBackups(store,{key,factory=globalThis.indexedDB}={}){
 if(!key)throw Error('缺少存檔名稱');
 const raw=JSON.stringify(store.get());
 let journal=store.journal,temporary=false;
 if(!journal){journal=await openSaveJournal(factory,key);temporary=true;}
 try{await journal?.reset(raw);}
 finally{if(temporary)journal?.close();}
 const owner=store.storage.getItem(key+':cloud-owner');
 const oldCloudCopy=owner?key+':before-cloud-restore:'+owner:null;
 if(oldCloudCopy){
  let shadow;
  try{
   shadow=await openSaveJournal(factory,oldCloudCopy);
   await shadow?.clear();
  }finally{shadow?.close();}
  store.storage.removeItem(oldCloudCopy);
 }
 store.storage.removeItem(key+':before-checkpoint-recovery');
 store.storage.removeItem(key+':explicit-restart');
 return true;
}
