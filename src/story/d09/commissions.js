// D09 · 2025-05-27. 全新MIRAGE地下委託文案，不修改金额、密钥或 Ghost 阶段。
export const D09_CONTRACTS=[
  {
    "id": "d09-mute-records",
    "day": 9,
    "title": "C 級委託",
    "owner": "MUTE / 31",
    "grade": "C",
    "amount": 1500,
    "reward": "1,500 USD",
    "deadline": {
      "day": 11,
      "clock": "20:00"
    },
    "stages": [
      "cipher",
      "extract"
    ],
    "key": "MUTE-D09-0527",
    "attachment": "mute_0527.enc",
    "description": "匿名信使留下多份重複記錄，其中幾個時間標記被挪動過。把同源資料整合，保留差異。\\n\\n交付：去重記錄、時間線、無法確認項目。",
    "letter": "先從加密索引開始，對照每份時間標記，再取回可互證的記錄。\\n\\n附件：mute_0527.enc\\n執行程序：破譯 → 竊取。"
  },
  {
    "id": "d09-relay-validation",
    "day": 9,
    "title": "B 級委託",
    "owner": "RELAY / 22",
    "grade": "B",
    "amount": 3600,
    "reward": "3,600 USD",
    "deadline": {
      "day": 12,
      "clock": "18:00"
    },
    "stages": [
      "route",
      "route",
      "extract"
    ],
    "key": "RELAY-D09-0527",
    "attachment": "relay_0527.pkg",
    "description": "兩段中繼鏈路的收件回執不一致。委託方不關心原因，只要一份可信的傳輸結果。\\n\\n交付：兩段鏈路驗證與回執。",
    "letter": "兩段節點分開核對，全部通過後再取回完整的測試結果。\\n\\n附件：relay_0527.pkg\\n執行程序：連結 → 連結 → 竊取。"
  },
  {
    "id": "d09-null-table",
    "day": 9,
    "title": "C 級委託",
    "owner": "NULL TABLE / 06",
    "grade": "C",
    "amount": 1700,
    "reward": "1,700 USD",
    "deadline": {
      "day": 12,
      "clock": "22:00"
    },
    "stages": [
      "cipher",
      "veil",
      "extract"
    ],
    "key": "TABLE-D09-0527",
    "attachment": "table_0527.enc",
    "description": "兩批匿名買賣名冊出現衝突，部分欄位被手動覆寫。比對加密表並隔離無效標記。\\n\\n交付：差異表與有效欄位。",
    "letter": "解開兩份表的索引，清理不屬於本次交割的標記，留下核驗資料。\\n\\n附件：table_0527.enc\\n執行程序：破譯 → 隱匿 → 竊取。"
  }
];
