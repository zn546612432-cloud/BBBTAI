# 熙泰动态世界书

参考：SillyTavern [World Info 文档](https://docs.sillytavern.app/usage/core-concepts/worldinfo/) 与 [06bde939 源码](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/public/scripts/world-info.js)。上游为 AGPL-3.0；本模块为 BBBTAI 自行实现，不引入酒馆源码、服务器、存档或第三方人物文案。

入口 `src/services/ai/worldbook/entries.js` 存放条目；`index.js` 是纯选择器，实际连接到 `taiActionDecisionPrompt` 与 `buildTaiPrompt`。原作者已确认的底层人格、固定剧情、身份锁及 MiniMax 声线不变。新增条目不是对话历史，也不执行动作。

支持常驻、关键词、近期真实玩家消息持续窗口、真实游戏事件、频道/公开身份限制、优先顺序、表达/决策阶段、1800 字符可选条目预算（常驻不裁剪）。匹配仅扫描真实玩家消息，不扫描模型自己的回复和系统回执。事件条目通过 NoApp 运行代码提供的事件标识激活，不由玩家输入的关键词伪造。当前不实现酒馆的完整 JSON 导入、递归激活、概率、独立定时冷却及向量检索；没有新增时钟或消息系统。

当前电话结束条目在刚挂电话后的首条真实文字消息中根据通话回执触发，而不是自动发出新消息。来电拒接、主动挂断后的即时追发、持久化情绪状态属于后续电话执行层能力，不由提示词假装完成。对现有主动联系、语音拒绝和通话中主动挂断则补充决策依据。

验证：`node --test tests/xitai-dynamic-worldbook.test.mjs`；覆盖常驻、预算、关键词窗口、事件、身份、两阶段注入、繁体请求及模拟供应商请求。
