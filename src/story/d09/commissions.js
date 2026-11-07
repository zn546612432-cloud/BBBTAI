// D09 · 2025-05-27. Three independent optional MIRAGE commissions.
// Authored data only. The existing D04–D55 commission runner owns acceptance,
// one KIRA attachment, sequential GHOST stages, manual submission and payout.
export const D09_CONTRACTS=[
 {"id":"d09-mute-records","day":9,"title":"C 級委託","owner":"MUTE / 31","grade":"C","amount":1500,"reward":"1,500 USD","deadline":{"day":11,"clock":"20:00"},"stages":["cipher","extract"],"key":"MUTE-D09-0527","attachment":"mute_0527.enc","description":"從一組加密記錄中找出重複條目，核對時間標記，保留能確認來源的資料。\n\n交付：去重清單、時間標記、有效記錄。","letter":"記錄已按批次打包。請從索引開始解密，核對時間標記並取回有效條目。\n\n附件：mute_0527.enc\n執行程序：破譯 → 竊取。"},
 {"id":"d09-relay-validation","day":9,"title":"B 級委託","owner":"RELAY / 22","grade":"B","amount":3600,"reward":"3,600 USD","deadline":{"day":12,"clock":"18:00"},"stages":["route","route","extract"],"key":"RELAY-D09-0527","attachment":"relay_0527.pkg","description":"一組測試節點的連線結果與預期不符。依照配置重新連接並完成指定範圍的驗證。\n\n交付：節點驗證記錄、完整回執。","letter":"兩段授權鏈路需要逐一核對。兩段都建立成功後，再取回測試回執。\n\n附件：relay_0527.pkg\n執行程序：連結 → 連結 → 竊取。"},
 {"id":"d09-null-table","day":9,"title":"C 級委託","owner":"NULL TABLE / 06","grade":"C","amount":1700,"reward":"1,700 USD","deadline":{"day":12,"clock":"22:00"},"stages":["cipher","veil","extract"],"key":"TABLE-D09-0527","attachment":"table_0527.enc","description":"兩份加密資料表需要交叉核對。找出欄位不一致的項目，保留可確認的內容。\n\n交付：差異清單、驗證資料。","letter":"解開索引後對照兩份資料表。排除測試時留下的冗餘標記，再取回需要核對的欄位。\n\n附件：table_0527.enc\n執行程序：破譯 → 隱匿 → 竊取。"}
];
