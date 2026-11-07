// D08 · 2025-05-26. Three independent optional MIRAGE commissions.
// Authored data only. The existing D04–D55 commission runner owns acceptance,
// one KIRA attachment, sequential GHOST stages, manual submission and payout.
export const D08_CONTRACTS=[
 {"id":"d08-archive-index","day":8,"title":"C 級委託","owner":"ARCHIVE / 17","grade":"C","amount":1400,"reward":"1,400 USD","deadline":{"day":10,"clock":"22:00"},"stages":["cipher","extract"],"key":"ARCHIVE-D08-0526","attachment":"archive_0526.enc","description":"一份加密歸檔的索引與原始記錄出現偏差。請重新核對檔案序列，找出缺失區塊，整理可恢復的部分。\n\n交付：完整索引、差異清單、恢復記錄。","letter":"原始記錄和索引都在加密封包中。解開索引，核對序列，保留能恢復的部分；缺失資料如實列出。\n\n附件：archive_0526.enc\n執行程序：破譯 → 竊取。"},
 {"id":"d08-north-node","day":8,"title":"B 級委託","owner":"NORTH NODE / 04","grade":"B","amount":3200,"reward":"3,200 USD","deadline":{"day":10,"clock":"23:00"},"stages":["route","veil","extract"],"key":"NORTH-D08-0526","attachment":"node_0526.pkg","description":"測試鏈路在切換節點後出現不穩定情況。依照測試配置重新建立連結，核對傳輸異常，回收驗證資料。\n\n交付：有效鏈路記錄、傳輸回執、異常節點清單。","letter":"已附上測試節點配置。先連接指定鏈路，再清理暴露的測試標記，取回回執並標記異常。\n\n附件：node_0526.pkg\n執行程序：連結 → 隱匿 → 竊取。"},
 {"id":"d08-white-static","day":8,"title":"C 級委託","owner":"WHITE STATIC / 08","grade":"C","amount":1900,"reward":"1,900 USD","deadline":{"day":11,"clock":"18:00"},"stages":["cipher","extract"],"key":"STATIC-D08-0526","attachment":"static_0526.enc","description":"一份封存資料需要最終校驗。確認指定密鑰與加密檔案一致，提取可驗證內容並提交結果。\n\n交付：校驗摘要、有效資料包。","letter":"這份封存記錄不需要重新編寫。核對密鑰、還原有效條目，提交校驗結果即可。\n\n附件：static_0526.enc\n執行程序：破譯 → 竊取。"}
];
