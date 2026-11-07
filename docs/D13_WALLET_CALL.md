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

## 文本來源與配音

按使用者本輪「做啊」繼續執行先前已解釋的完整長稿方案，採用已存《D10–D13 群聊與通話／稱呼修訂版》（2026-11-07 14:40:23 UTC，`libfile_2fc50bddc858819190faed543e2825a8`）。`src/story/d13/content.js` 逐句保留原文，不把七輪熙泰對話壓成舊兩輪。原7／8／9行的技術位置改為新稿：來電7，熙泰8/10/12/14/16/18/20，熙蒙9/11/13/17。預先 prime 的最後文字 Send 仍是第4行。

精確比對兩版已發布十行舊稿後才替換配置，自訂文本不覆寫。新稿用 `s55-intrusion-v2-<index>` 避免新行號撞上舊玩家消息；舊玩家泡泡與歷史 ID 永久保留。完成者不重播，未完成者重回錢包步驟並清除舊電話鎖。

七段正式 MiniMax MP3 已生成並接入：同一熙泰音色、speech-2.8-hd、32kHz，合計 674,412 bytes／約 41.4 秒，每段皆小於 1MB。全部經 ffprobe／ffmpeg 驗證可解碼且非靜音。Key 僅由單次本機程序的環境變數讀取，程序已結束並清除，不寫入檔案、前端或 Git。重新生成時本機執行：

```
node scripts/generate-d13-call-voice.mjs
```

只讀本機環境變數，不紀錄 key，不使用 getUserMedia。預設從已接入的完整修訂稿生成七段 <1MB MP3 與文字 SHA256 清單；台詞修改後須重跑。預設沿用遊戲國內接口（cn）；國際帳號可設定 MINIMAX_REGION=intl。無音檔或載入失敗仍保留完整文字後備。

## 驗證狀態

- 十一項 D13 自動回歸通過；首次完整本機測試 902 項，901 過，既有遠端圖片測試逾時；GitHub CI 已實際通過全部 903 項，未略過任何測試。
- Story skill audit 與 Pages 構建通過。
- iPhone 13 尺寸的真實 Chromium 點擊驗收已於 GitHub Actions #42406797335 通過：KIRA 郵件、綁定、確認轉帳、綠幕、八秒自動接聽、連線刷新、主屏切換再返回、全部六次手動 Send、唯一電話記錄；bank 與 D06 BTC 不變，無任何 getUserMedia 呼叫，無頁面錯誤。截圖／狀態檔為該次執行的 d13-mobile-evidence。這是瀏覽器模擬手機尺寸，不是實體 iPhone Safari。
- 目前沒有正式發布，main 未改。

- D13 v2 事件包：`docs/story-packets/d13-wallet-call.json`，24 個事件、11 項驗收；能力僅標記 D13 已接通，不宣稱任意日期通用。

## 配音驗收補充

- 新增 MP3／文字 hash／配置一致性回歸。
- 手機瀏覽器腳本監聽真實 HTMLMediaElement 的 playing／ended／error，要求七段按劇本順序開始並正常結束；開始播放時文字泡泡已寫入且輸入框鎖定，不能僅靠文字後備通過。跨刷新保留驗收事件，六次玩家 Send 仍由原生按鈕點擊。最新結果以 PR CI 為準。
