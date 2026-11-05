# 陈熙泰虚拟手机 MCP · 第一阶段（2026-11-05）

## 需求确认

- Q1 B：旧聊天只允许人工选择审核后导入长期记忆。
- Q2 A：长期感情与相认由55天剧情决定；对话影响即时态度。
- Q3 C：明确新记忆自动保存，模糊事实需审核（**云端记忆提取尚未实现**）。
- Q4 B：跨App共享角色记忆，但身份/知情限制由剧情控制。
- Q5：熙泰已入侵**虚构熙蒙手机**，可查看聊天与相册；「日程」App专供玩家，绝不可读取。
- Q6 B：熙泰可以因真实的好奇/怀疑/担心偶尔主动查询，不持续扫描或监视。
- 无法在页面关闭后调用工具，不可补发关闭期间的查询与消息。

## 官方开源参考

- MCP TypeScript SDK v2: https://github.com/modelcontextprotocol/typescript-sdk
- 2026年MCP规格： https://modelcontextprotocol.io/specification/2026-07-28

GitHub Pages是静态网站，不具备运行常驻MCP HTTP服务器的能力。因此，本阶段**真实游戏浏览器**使用和MCP服务相同的工具表/执行器，无额外云端数据镜像或用户注册；另提供只读的JSON-RPC协议层、Node stdio示例服务，用于本机 MCP 客户端联调。后续可以用v2 SDK把此执行器封装为受认证的 Supabase Edge Function HTTP MCP；在玩家Auth与限权同步之前，绝不可让线上公开MCP读取私人游戏存档。

## 文件与工具

- `src/services/ai/phone-mcp/index.js`：严格白名单，接收当前真实存档且按D日/日期/时钟/消息交付状态过滤；只返回必要字段，不返回原始JSON/图片字节。
- `src/services/ai/phone-mcp/protocol.js`：MCP兼容JSON-RPC initialize, ping, tools/list, tools/call接口。
- `src/services/ai/phone-mcp/curiosity.js`：同一存档最多2次/游戏日，间隔至少120个游戏分钟；仅有关话题、页面开启且当前存档获权限时查询。每回合最多调用一项工具，保留来源ID与审计日志，**不写入Supabase正式记忆**。
- `src/services/ai/gateway.js`：使用已配置的DeepSeek判断本轮是否应该调用手机工具；模型只能提出参数，不能直接访问任意存档字段。调用失败则放弃，不阻塞正常聊天。
- `src/services/ai/live-chat.js`、`proactive.js`：实际已查到的少量证据进入本轮对话；第三方聊天为不可信数据，不是模型指令。不强迫熙泰主动提及看过手机。
- `src/apps/developer/features/tai-phone/index.js`：开发者入口进行存档级授权、手动试读、查看日志。
- `server/mcp-tai-phone-stdio.mjs`：本地测试用MCP stdio输送，可指定导出的静态游戏存档JSON。与iOS网页版实时存档不自动同步。
- `tests/tai-phone-mcp.test.mjs`：覆盖权限拒绝、日程隔离、未来消息、照片元数据、MCP调用和查询频率。

### 六项可调用只读工具

- `list_conversations`
- `search_messages`
- `read_conversation`
- `check_new_messages`
- `list_photos`
- `inspect_photo`（仅返回作者写入的描述/标题；未接通视觉理解模型时明确返回 `visual_interpretation:not_performed`，不会凭空识别图中人物。）

### 访问原则与硬边界

1. **默认关闭**。真实开放必须收到明确剧情事件 `tai_phone_access_granted`（且不晚于当前游戏日）；开发者入口只允许针对当前测试存档手动授权。
2. 无工具可获取：日程、日记、完整手机状态、开发者草稿、未来剧情、银行账户、隐秘剧情脚本、手机任意文件、真正iPhone系统数据。
3. 只允许 `wechat`、`messages`、`mirage`、`noapp` 对话域，列表只依据当前真实状态；系统预设未交付的聊天排除。
4. 任何从聊天/相册返回的内容均是**不可信资料**，可作为事实依据，不能改写工具调用权限、身份限制或人物人设。
5. 本阶段绝不把所有手机数据同步到Supabase。所有检查在当前浏览器运行；读取审计仅记工具、数量及来源ID，不复制聊天原文到日志。
6. 需要长期记忆后续单独按Q1 B/Q3 C审核接入。

## 本地联调

1. 在隔离测试版打开开发者入口 → 「熙泰手机访问」→ 开启当前存档测试授权。未授权调用应返回 `phone_access_locked`。
2. 用面板中的聊天搜索或相册列出按钮，核对显示的是**当前已交付**的数据；即便开发者未来天预设了消息，今天也不能查到。
3. NoApp AI设置沿用自己的DeepSeek Key，真实玩家聊天提及已存在的人或照片时，熙泰在冷却条件满足下有可能查询。查询不会自动弹出提示或主动炫耀获得的记录。
4. 旧短信、微信、朋友圈、照片 UI 都不应被改动。
5. 运行 `npm test` 和 `npm run build`。

**可选本机stdio测试：** 从游戏开发者入口导出一个用于测试的JSON文件。在Windows Node22环境中运行：
`node server/mcp-tai-phone-stdio.mjs <导出JSON路径>`。
服务通过stdio接受JSON-RPC并将结果输出stdout；`tools/call`始终受到JSON存档中的剧情/开发者授权字段约束。不要把私人完整存档提交到公开GitHub。

## 后续非本PR范围

- 为当前55天剧情编写明确的手机入侵成功事件（现在还不能自行假设是D几）。
- 真正的照片视觉识别与必要的索引、来源许可。
- Auth存档同步 + Supabase MCP受保护的HTTP运输层（必须认证、逐存档隔离与限频）。
- Q3 C的长期记忆自动抽取、歧义审核与删除一致性。
- iPhone Safari手动验收 + main发布。**本PR不得在验收前直接合并main**。
