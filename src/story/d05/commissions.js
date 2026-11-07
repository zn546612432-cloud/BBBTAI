// Two daily orders, both published at midnight. No D06 wallet prize or contact.
export const D05_CONTRACTS=[
 {id:'d05-backup-check',day:5,title:'C 級委託',owner:'COLD STORAGE / 09',grade:'C',
  amount:1800,reward:'1,800 USD',deadline:{day:7,clock:'00:00'},stages:['cipher','extract'],
  key:'BACKUP-D05-0523',attachment:'backup_0523.enc',
  description:"棄用伺服器的加密備份只剩碎片，索引表和版本號對不上。恢復能核驗的資料，保留損壞段的記錄。\\n\\n交付：恢復索引、完整性差異表。",
  letter:"文件在封包裏。解開索引，取回可讀碎片，無法確認的不要猜。\\n\\n附件：backup_0523.enc\\n執行程序：破譯 → 竊取。"},
 {id:'d05-relay-validation',day:5,title:'B 級委託',owner:'RELAY / 18',grade:'B',
  amount:4200,reward:'4,200 USD',deadline:{day:8,clock:'00:00'},stages:['route','extract','veil'],
  key:'RELAY-D05-0523',attachment:'relay_0523.enc',
  description:"一條匿名傳輸鏈路被改過路由，委託方收到兩份互相矛盾的回執。確認哪條記錄可信，再做一次無痕比對。\\n\\n交付：鏈路結果、有效回執與異常記錄。",
  letter:"測試鏡像和回執都在唯一附件內。先核對連線，再提取有效記錄，最後隔離測試標記。\\n\\n附件：relay_0523.enc\\n執行程序：連結 → 竊取 → 隱匿。"}
];
