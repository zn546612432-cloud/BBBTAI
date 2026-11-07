# D13 錢包／系統電話：待審實作

基線 main `536e0d3`，開發分支 `feature/d13-wallet-intrusion-call`。不合併、不部署 main。

## 已設計與已實作

- Story55 三個前置節點：`d13-wallet-mail` → `d13-wallet-bind` → `d13-wallet-transfer` → 原 `intrusion` → 原 D14 `code`。配置驗證與 nodeLink 同步支援 wallet。
- 郵件正文直接使用本輪任務提供的一句提示。22:10 只寄一次，深連結至 `/wallet`。
- BTC 列表、原主 BTC 兌換、PACIFIC 唯讀美元帳戶、新錢包綁定與二次確認。登入視覺沿用 MIRAGE，密碼不寫進狀態。
- 固定 `s55-d13-wallet-50btc`、虛構地址 `MIR-WLT-0013`，轉帳後凍結，不產生 USD，不修改 D06 10 BTC。
- 三秒低頻綠幕與減少動態效果；重載直接進聊天，固定唯讀 divider，密文和解密視圖都可見，不產生未讀／通知。
- `PhoneStore` 內 `phoneCall`，所有公開 API 透過 update 交易；強制未知來電、八秒自動接聽、沒有拒接／掛斷、遠端結束、唯一電話記錄。普通撥號只響鈴後失敗，不假接通。
- 通話中可切換 App；靈動島返回聊天、計時、REMOTE OVERRIDE。通話／綠幕暫停時鐘與耗電。鎖屏、闹鐘、低電／關機／長充優先。
- 熙泰音訊開始才寫文字，播放完成後才允許玩家手動 Send；刷新要求點擊繼續。iOS 使用第4行 Send 預先 prime 的同一 Audio。無檔案／載入失敗轉文字。
- 舊完成存檔不補播；舊未完存檔重回新錢包流程，保留已實發消息和固定 ID，不新增重複的玩家消息；清除 lockedCall。
- MIRAGE 管理入口、表單、路由移除，developer 全局編輯保留；系統分割線唯讀。
- 開發者「預覽 D13 流程」開啟獨立的記憶體存檔，不讀寫既有 localStorage。

## 共享層修改說明

`src/main.js` 僅加入 telephony 初始化與讓舊聊天計時器跳過 telephony 管理的劇本行。後者必要，否則舊計時器會在配音未完成時提前推進。未修改 `src/system/shell.js`；新 UI 接在既有 powerFullscreen／alarm 覆蓋層，保留電源、低電與鬧鐘優先權。

## 尚未解決：正式文本與配音

本輪指令的文本來源仍是 `〔貼 D13 原文〕` 佔位，沒有附入十行替換正文。查到的最新《D10–D13 群聊與通話／稱呼修訂版》電話為多輪長稿，與「不動 call 行號／只生成7、9行」不一致。因此沒有自行縮寫，也沒有把舊 catalog 十行冒充使用者最終稿。本分支只用現存台詞測試流程，不是故事內容定稿。

`MINIMAX_API_KEY` 在此環境不存在；未生成或偽造 MP3。已提供本機腳本：

```
node scripts/generate-d13-call-voice.mjs --script /absolute/path/to/approved-config.json
```

只讀環境變數，不紀錄 key，不使用 getUserMedia。驗證第6行 call、第8行 me、第7／9行配音角色後，生成兩檔 <1MB MP3 及文字 SHA256 清單；不會自動拿舊 catalog 合成。正式稿確認並精確比對遷移、生成 MP3 後才能解除草稿狀態。

## 驗證狀態

- 十項 D13 自動回歸通過；完整本機測試 902 項，901 過，1 項既有 D06 遠端圖片 HEAD 驗證因連線逾時失敗，未略過或更改。
- Story skill audit 與 Pages 構建通過。
- 本機 Chromium 被執行環境禁止建立 socket；共享瀏覽器無法連到本機服務。已將同一真實 iPhone 尺寸點擊腳本接入 PR CI，CI 結果與截圖另行更新；不能將單元測試稱作瀏覽器驗收。
- 目前沒有正式發布，main 未改。
