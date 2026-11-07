// D08 · 2025-05-26. 全新MIRAGE地下委託文案，不修改金额、密钥或 Ghost 阶段。
export const D08_CONTRACTS=[
  {
    "id": "d08-archive-index",
    "day": 8,
    "title": "C 級委託",
    "owner": "ARCHIVE / 17",
    "grade": "C",
    "amount": 1400,
    "reward": "1,400 USD",
    "deadline": {
      "day": 10,
      "clock": "22:00"
    },
    "stages": [
      "cipher",
      "extract"
    ],
    "key": "ARCHIVE-D08-0526",
    "attachment": "archive_0526.enc",
    "description": "一批匿名檔案的交易索引被分成數段，在交割前有人改動了時間標記。重新拼合可追溯的部分，缺失段單獨標註。\\n\\n交付：索引、錯位記錄、可核驗檔案。",
    "letter": "整包加密資料放在附件裏。先解開索引，取回能比對的片段。其餘不用推測。\\n\\n附件：archive_0526.enc\\n執行程序：破譯 → 竊取。"
  },
  {
    "id": "d08-north-node",
    "day": 8,
    "title": "B 級委託",
    "owner": "NORTH NODE / 04",
    "grade": "B",
    "amount": 3200,
    "reward": "3,200 USD",
    "deadline": {
      "day": 10,
      "clock": "23:00"
    },
    "stages": [
      "route",
      "veil",
      "extract"
    ],
    "key": "NORTH-D08-0526",
    "attachment": "node_0526.pkg",
    "description": "匿名中繼網絡換過一次入口，留下幾份來源不同的回執。委託人只要知道哪一段鏈路還能工作。\\n\\n交付：路由圖、有效回執、斷點清單。",
    "letter": "提供的是隔離節點鏡像。建立鏈路，遮蔽測試標記，取回結果即可。\\n\\n附件：node_0526.pkg\\n執行程序：連結 → 隱匿 → 竊取。"
  },
  {
    "id": "d08-white-static",
    "day": 8,
    "title": "C 級委託",
    "owner": "WHITE STATIC / 08",
    "grade": "C",
    "amount": 1900,
    "reward": "1,900 USD",
    "deadline": {
      "day": 11,
      "clock": "18:00"
    },
    "stages": [
      "cipher",
      "extract"
    ],
    "key": "STATIC-D08-0526",
    "attachment": "static_0526.enc",
    "description": "一份準備交給下家的封存記錄無法正常讀取。確認密鑰和包內摘要是否匹配。\\n\\n交付：可讀內容與密鑰核驗摘要。",
    "letter": "封裝版本沒有改過，問題可能出在索引。按附件驗證，再提取需要的條目。\\n\\n附件：static_0526.enc\\n執行程序：破譯 → 竊取。"
  }
];
