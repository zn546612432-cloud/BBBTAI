// D10 · 2025-05-28. Three independent optional MIRAGE commissions.
// Authored data only. The existing D04–D55 commission runner owns acceptance,
// one KIRA attachment, sequential GHOST stages, manual submission and payout.
export const D10_CONTRACTS=[
 {"id":"d10-spectrum-test","day":10,"title":"B 級委託","owner":"SPECTRUM / 12","grade":"B","amount":4000,"reward":"4,000 USD","deadline":{"day":12,"clock":"23:00"},"stages":["cipher","route","veil","extract"],"key":"SPECTRUM-D10-0528","attachment":"spectrum_0528.pkg","description":"對隔離測試環境進行完整性驗證。依照配置建立鏈路，取得測試結果，確認資料無誤後封存。\n\n交付：完整測試回執、驗證報告。","letter":"請在授權的隔離環境內完成驗證。依序解開參數、連接節點、清理測試標記，再回收測試資料。\n\n附件：spectrum_0528.pkg\n執行程序：破譯 → 連結 → 隱匿 → 竊取。"},
 {"id":"d10-grey-index","day":10,"title":"C 級委託","owner":"GREY INDEX / 19","grade":"C","amount":1400,"reward":"1,400 USD","deadline":{"day":13,"clock":"20:00"},"stages":["cipher","extract"],"key":"GREY-D10-0528","attachment":"index_0528.enc","description":"舊資料索引需要重新整理。核對密鑰、恢復有效條目，將無法確認的部分單獨列出。\n\n交付：有效索引、異常條目清單。","letter":"檔案內的原始條目不可修改。只需要解密索引，提取能確認的部分，附上異常清單。\n\n附件：index_0528.enc\n執行程序：破譯 → 竊取。"},
 {"id":"d10-echo-port","day":10,"title":"B 級委託","owner":"ECHO PORT / 03","grade":"B","amount":3000,"reward":"3,000 USD","deadline":{"day":13,"clock":"23:00"},"stages":["route","veil","extract"],"key":"ECHO-D10-0528","attachment":"echo_0528.pkg","description":"一組測試傳輸記錄缺少最終驗證結果。請重建指定連結、回收測試資料並核對完整性。\n\n交付：有效傳輸記錄、校驗結果。","letter":"連接附件指定的測試節點，確認鏈路未遺留額外標記，取回記錄並提交摘要。\n\n附件：echo_0528.pkg\n執行程序：連結 → 隱匿 → 竊取。"}
];
