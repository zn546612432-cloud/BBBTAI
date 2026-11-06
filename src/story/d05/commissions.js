// Two daily orders, both published at midnight. No D06 wallet prize or contact.
export const D05_CONTRACTS=[
 {id:'d05-backup-check',day:5,title:'C 級委託',owner:'COLD STORAGE / 09',grade:'C',
  amount:1800,reward:'1,800 USD',deadline:{day:7,clock:'00:00'},stages:['cipher','extract'],
  key:'BACKUP-D05-0523',attachment:'backup_0523.enc',
  description:'核對一份加密備份與原始索引，找出缺失及重複的資料。\n\n交付：可恢復資料清單、完整性核對記錄。\n限期：48小時。',
  letter:'清單和備份放在同一個封包裡。先解開索引，再找回能確認的資料。無法恢復的列出來，不需要猜。\n\n附件：backup_0523.enc\n執行程序：破譯 → 竊取。'},
 {id:'d05-relay-validation',day:5,title:'B 級委託',owner:'RELAY / 18',grade:'B',
  amount:4200,reward:'4,200 USD',deadline:{day:8,clock:'00:00'},stages:['route','extract','veil'],
  key:'RELAY-D05-0523',attachment:'relay_0523.enc',
  description:'對一組測試節點進行授權鏈路檢查，核對傳輸記錄，整理不一致的回執。\n\n交付：鏈路檢查報告、有效回執及異常清單。\n限期：72小時。',
  letter:'節點列表與樣本回執都在附件內。把連結接通，取回測試記錄，完成後封存結果。只需要附件列出的範圍。\n\n附件：relay_0523.enc\n執行程序：連結 → 竊取 → 隱匿。'}
];
