# Supabase / 熙蒙的手機

## AI 提供商代理（2026-11-13）

已部署到項目 `ximeng-phone-ai` 的 `tai-provider-gateway`。

- DeepSeek 使用 Supabase Secret `DEEPSEEK_API_KEY`；MiniMax 使用 `MINIMAX_API_KEY`。**不要把任何服務商私鑰放進 GitHub、GitHub Pages 或 browser localStorage。**
- GitHub Pages 只帶 Supabase **publishable** key，首次訪問時使用 Supabase Auth 匿名登入取得有效 JWT。該 JWT 保存在本瀏覽器的 localStorage，Mirage / NoApp / Ghost 分享之間共用會話，**不要求重複登入**。
- Edge Function 同時驗證 Supabase JWT、授權來源域名、請求大小、模型/音色/語言參數。真實 Secret 僅在受保護的 Edge Runtime 讀取。
- `tai_ai_gateway_quotas` 原子限制每個用戶每天的模型和配音次數，並設有全局上限；僅 service_role 可調用配額 RPC。
- DeepSeek 文字、決策、MiniMax TTS 與 NoApp 語音識別統一走現有 `src/services/ai/gateway.js`。這是一個 **提供商代理**，不是新建消息調度、時鐘、劇情、銀行或存檔系統。
- Supabase 原有 `tai-brain` (save/JWT foundation) 及 `tai-v8-persona` (只讀 V8 人設) 未被取代。
- 開發機本地的 `server/ai-gateway.mjs` 和 session-only BYOK 模式仍可用；公開 Pages 預設改用受保護的 Supabase 後端。
- `supabase/functions/tai-provider-gateway/index.ts` 是已部署功能的源碼。實際部署修改後要同步更新 Supabase Function，不能只合併 GitHub。
- MiniMax ASR 的真實供應商受支持格式需按手機所錄容器驗收；不支持的格式不應虛構文字。DeepSeek 圖片描述仍為原有 BYOK 路徑，尚未聲稱雲端接入。

## 安全和用量

目前允許符合 JWT 驗證的匿名 Supabase Auth 用戶透過公網站使用有限額付費接口，因此在公開高流量上線前應進一步配置 Auth CAPTCHA 與更嚴格的用戶允許名單／費用報警。不要關閉 `verify_jwt`，也不要為方便測試將 service role 或 DeepSeek/MiniMax Keys 寫入前端。

後端可用性診斷：`.github/test-scripts/tai-cloud-provider-smoke.mjs`。它只讀取是否配置的標誌，不消耗付費語音／推理；實際提供商首次調用曾完成一次人工驗收。
