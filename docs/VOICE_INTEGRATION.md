# DeepSeek × MiniMax 本地接口（2026-10-30）

已按之前的 TTS 截图提供：接口地址、模型、音色 ID、语种、语速和试听。“记忆向量”是独立的语义检索模块，暂未接入。

## 本轮已完成

- GET /api/ai/status：检查本地代理配置（不暴露密钥）。
- POST /api/ai/chat：调用 DeepSeek Chat Completions，测试熙泰文字回复。
- POST /api/voice/tts：调用 MiniMax Speech 2.8 HTTP T2A，返回 MP3。
- 设置 → 开发者模式 → AI / 语音：端口状态、音色设置、DeepSeek 试聊、MiniMax 试听。

这只是接口与试听实验室；AI 不会自动插入 noapp/MIRAGE/国际象棋聊天，也不会生成长期记忆，直到剧情规则与权限完成。

## Windows PC 操作

1. 在仓库根目录复制 .env.example 为 .env.local。后者已被 .gitignore 排除。
2. 在 .env.local 写入 DEEPSEEK_API_KEY=实际密钥 和 MINIMAX_API_KEY=实际密钥；不要把密钥发送到聊天或上传 GitHub。
3. 用 Node.js 22+ 执行 npm ci、npm run build、npm run dev。
4. 浏览器打开 http://localhost:5173 ，进入设置 → 开发者模式 → AI / 语音。
5. 点“检查连接”确定本地密钥是否已配置。检查状态本身不调用收费模型。
6. 从 MiniMax 控制台复制实际 voice_id，选择 speech-2.8-turbo / speech-2.8-hd、普通话 / 粤语、语速，保存后点击试听。试聊及试听会产生 API 费用。

## 接口示例

POST /api/ai/chat
请求 JSON：{"day":56,"channel":"noapp","messages":[{"role":"user","content":"在吗？"}]}
返回 JSON：{"text":"…","day":56,"channel":"noapp"}。
可用 channel：mirage、noapp、chess。D56 前禁止 noapp。

POST /api/voice/tts
请求 JSON：{"text":"文件发我。","model":"speech-2.8-turbo","voiceId":"真实voice_id","language":"Chinese,Yue","speed":1}
返回 audio/mpeg；language 支持 Chinese、Chinese,Yue、auto。

## 安全与上线限制

- 本地服务默认仅监听 127.0.0.1:5173，未提供面向公众的登录、用量限制和权限。**不能直接向互联网暴露本地代理**。
- GitHub Pages 不运行 Node 服务。静态游戏页面在未部署有鉴权的后端前无法使用这组 API。
- 不要把 API Key 放在 public/runtime-config.js、浏览器 localStorage 或可导出的剧情 JSON。
- 目前没有用户实际的 MiniMax / DeepSeek Key 和 MiniMax voice_id，无法声称已连通服务商。
- 实时通话、MiniMax WebSocket 双向流、麦克风 ASR、角色跨 App 记忆、主动消息与持久化待后续实现。

## 官方依据

- DeepSeek https://api-docs.deepseek.com/api/create-chat-completion/
- MiniMax Speech HTTP https://platform.minimax.io/docs/api-reference/speech-t2a-http
- MiniMax Speech WebSocket https://platform.minimax.io/docs/api-reference/speech-t2a-websocket
- MiniMax Voice Design https://platform.minimax.io/docs/api-reference/voice-design-design
