# D13 錢包與系統電話

D13 的語音定稿以 `src/story/d13/content.js` 為準，MP3 與台詞雜湊見 `public/assets/story55/d13/voice-manifest.json`。

## 已設計與已實作

- Story55 三個前置節點：`d13-wallet-mail` → `d13-wallet-bind` → `d13-wallet-transfer` → 原 `intrusion` → 原 D14 `code`。配置驗證與 nodeLink 同步支援 wallet。
- KIRA 顯示 MIRAGE Wallet 的數位資產入帳通知。22:10 只寄一次，深連結至 `/wallet`。
- BTC 列表、原主 BTC 兌換、PACIFIC 唯讀美元帳戶、新錢包綁定與二次確認。登入視覺沿用 MIRAGE，密碼不寫進狀態。
- 固定 `s55-d13-wallet-50btc`、虛構地址 `MIR-WLT-0013`，轉帳後凍結，不產生 USD，不修改 D06 10 BTC。
- 三秒無字綠幕與減少動態效果；重載直接進聊天，固定唯讀 divider，密文和解密視圖都可見，不產生未讀／通知。
- `PhoneStore` 內 `phoneCall`，所有公開 API 透過 update 交易；強制未知來電、八秒自動接聽、可拒接或掛斷、未完成時重撥、每通各有一筆通話記錄。普通撥號只響鈴後失敗，不假接通。
- 通話中可切換 App；靈動島返回聊天、計時與閃爍的紅點。通話／綠幕暫停時鐘與耗電。鎖屏、闹鐘、低電／關機／長充優先。
- 熙泰開口時 MIRAGE 顯示他的頭像，播放完成後才允許玩家手動 Send；刷新要求點擊繼續。iOS 使用第4行 Send 預先 prime 的同一 Audio。載入失敗時暫停在當句，點擊繼續通話可重試。
- 舊完成存檔不補播；舊未完存檔重回新錢包流程，保留已實發消息和固定 ID，不新增重複的玩家消息；清除 lockedCall。
- MIRAGE 管理入口、表單、路由移除，developer 全局編輯保留；系統分割線唯讀。
- 開發者「預覽 D13 流程」開啟獨立的記憶體存檔，不讀寫既有 localStorage。

## 共享層修改說明

`src/main.js` 僅加入 telephony 初始化與讓舊聊天計時器跳過 telephony 管理的劇本行。後者必要，否則舊計時器會在配音未完成時提前推進。未修改 `src/system/shell.js`；新 UI 接在既有 powerFullscreen／alarm 覆蓋層，保留電源、低電與鬧鐘優先權。

## 文本來源與配音

按使用者本輪「做啊」繼續執行先前已解釋的完整長稿方案，採用已存《D10–D13 群聊與通話／稱呼修訂版》（2026-11-07 14:40:23 UTC，`libfile_2fc50bddc858819190faed543e2825a8`）。`src/story/d13/content.js` 逐句保留原文，不把七輪熙泰對話壓成舊兩輪。原7／8／9行的技術位置改為新稿：來電7，熙泰8/10/12/14/16/18/20，熙蒙9/11/13/17。預先 prime 的最後文字 Send 仍是第4行。

精確比對兩版已發布十行舊稿後才替換配置，自訂文本不覆寫。新稿用 `s55-intrusion-v2-<index>` 避免新行號撞上舊玩家消息；舊玩家泡泡與歷史 ID 永久保留。完成者不重播，未完成者重回錢包步驟並清除舊電話鎖。

七段正式錄音使用既定熙泰音色與 MiniMax speech-2.8-hd，含定稿結尾「晚安，nya，或者我該叫你，熙蒙……」。送往合成器時將 nya 唸作「奈亞」。內建錄音可直接播放；開發者另存的本機配音優先。

重新生成時，由本機環境提供 MINIMAX_API_KEY，依序執行以下指令。

```sh
node scripts/generate-d13-call-voice.mjs
node scripts/publish-d13-bundled-voice.mjs
```

## 驗收

- `docs/story-packets/d13-wallet-call.json` 列出 D13 的 24 個事件與 11 項驗收。
- `scripts/d13-wallet-call-mobile-smoke.mjs` 從 KIRA 點至錢包、確認轉帳、進入 MIRAGE、接聽來電並完成六次手動發送。測試涵蓋拒接、掛斷、重撥、刷新續通及電話記錄。
- 手機尺寸瀏覽器必須從正式 MP3 收到七次依序播放及結束事件，並檢查輸入鎖定、頭像、D06 餘額及銀行資料。每次執行結果見對應 PR 的 d13-mobile-evidence。
