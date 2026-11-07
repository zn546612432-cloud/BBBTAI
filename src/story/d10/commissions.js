// D10 · 2025-05-28. 全新MIRAGE地下委託文案，不修改金额、密钥或 Ghost 阶段。
export const D10_CONTRACTS=[
  {
    "id": "d10-spectrum-test",
    "day": 10,
    "title": "B 級委託",
    "owner": "SPECTRUM / 12",
    "grade": "B",
    "amount": 4000,
    "reward": "4,000 USD",
    "deadline": {
      "day": 12,
      "clock": "23:00"
    },
    "stages": [
      "cipher",
      "route",
      "veil",
      "extract"
    ],
    "key": "SPECTRUM-D10-0528",
    "attachment": "spectrum_0528.pkg",
    "description": "一個用於匿名交易的隔離節點突然失去完整性標記。需要確認檔案是否被更動，恢復可供核對的回執。\\n\\n交付：完整性報告、傳輸回執。",
    "letter": "附件給出了隔離鏡像與測試資料。依次解開參數、接通節點、清理標記，最後回收證據。\\n\\n附件：spectrum_0528.pkg\\n執行程序：破譯 → 連結 → 隱匿 → 竊取。"
  },
  {
    "id": "d10-grey-index",
    "day": 10,
    "title": "C 級委託",
    "owner": "GREY INDEX / 19",
    "grade": "C",
    "amount": 1400,
    "reward": "1,400 USD",
    "deadline": {
      "day": 13,
      "clock": "20:00"
    },
    "stages": [
      "cipher",
      "extract"
    ],
    "key": "GREY-D10-0528",
    "attachment": "index_0528.enc",
    "description": "舊交易資料庫的索引多了一批找不到來源的編號。委託人要能核對的部分，其他另列。\\n\\n交付：有效索引與未確認編號。",
    "letter": "只處理附件提供的封存副本，原始條目不修改。解開索引後取回核驗內容。\\n\\n附件：index_0528.enc\\n執行程序：破譯 → 竊取。"
  },
  {
    "id": "d10-echo-port",
    "day": 10,
    "title": "B 級委託",
    "owner": "ECHO PORT / 03",
    "grade": "B",
    "amount": 3000,
    "reward": "3,000 USD",
    "deadline": {
      "day": 13,
      "clock": "23:00"
    },
    "stages": [
      "route",
      "veil",
      "extract"
    ],
    "key": "ECHO-D10-0528",
    "attachment": "echo_0528.pkg",
    "description": "一條匿名文件交接鏈路缺少最後的簽收回執。重建測試連接並取回遺失的驗證結果。\\n\\n交付：傳輸簽收記錄、校驗摘要。",
    "letter": "連接附件內的測試鏡像，排除多餘標記後取回回執即可。\\n\\n附件：echo_0528.pkg\\n執行程序：連結 → 隱匿 → 竊取。"
  }
];
