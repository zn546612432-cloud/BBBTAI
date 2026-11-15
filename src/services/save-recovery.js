// Storage mechanics only; PhoneStore remains the sole owner of phone state.
export const saveBackupKey=key=>key+'-last-good';
export function readPhoneSave(storage,key,validate){
 let raw,backup;
 try{raw=storage.getItem(key);backup=storage.getItem(saveBackupKey(key));}
 catch{throw Error('無法讀取本機存檔，請重新開啟頁面。原進度未被覆蓋。');}
 if(raw===null&&backup===null)return null;
 for(const candidate of [raw,backup]){
  if(candidate===null)continue;
  try{
   const state=validate(JSON.parse(candidate));
   if(candidate!==raw&&raw!==null){
    // Keep the failed original for diagnosis/recovery before repairing the slot.
    try{storage.setItem(key+'-unreadable',raw);}catch{}
   }
   return state;
  }catch{}
 }
 throw Error('存檔暫時無法讀取，已保留原資料，沒有重新開始。請勿清除網站資料。');
}
export function writePhoneSave(storage,key,state,{backup=false}={}){
 const raw=JSON.stringify(state);
 // Commit first. A failed write must leave both the old state and backup intact.
 storage.setItem(key,raw);
 if(backup){try{storage.setItem(saveBackupKey(key),raw);}catch{}}
}
